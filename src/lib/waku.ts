/**
 * Waku Reliable Channels integration
 * 
 * This module handles p2p communication using Waku Reliable Channels.
 * Uses a singleton WakuService with a single node that manages multiple channels.
 * Each instance has its own ReliableChannel identified by instanceId.
 * 
 * Architecture:
 * - Single Waku node initialized once per app
 * - Single content topic: /audience-qa/1/data/proto
 * - Multiple ReliableChannels managed in a Map (key: instanceId)
 * - Switching instances is fast - just switch active channel
 */

import { createLightNode, ReliableChannel, HealthStatus } from '@waku/sdk';
import protobuf from 'protobufjs';
import type { WakuMessage } from '@/types/waku';
import { MessageType } from '@/types/waku';

/**
 * Message delivery callbacks
 */
interface MessageCallbacks {
  onSending?: () => void;
  onSent?: () => void;
  onAcknowledged?: () => void;
  onError?: (error: any) => void;
}

/**
 * Message structure using Protobuf
 * This defines how messages are serialized for transmission over Waku
 */
const DataPacket = new protobuf.Type('DataPacket')
  .add(new protobuf.Field('type', 1, 'string'))
  .add(new protobuf.Field('timestamp', 2, 'uint64'))
  .add(new protobuf.Field('senderId', 3, 'string'))
  .add(new protobuf.Field('payload', 4, 'string'));

/**
 * WakuService handles all Waku node operations and message passing
 * Singleton pattern - one node manages multiple channels
 */
export class WakuService {
  private node: any = null;
  private channels: Map<string, any> = new Map(); // instanceId -> ReliableChannel
  private encoder: any = null;
  private decoder: any = null;
  private isHealthy: boolean = false;
  private healthListeners: Set<(isHealthy: boolean) => void> = new Set();
  private channelListeners: Map<string, Set<(message: WakuMessage) => void>> = new Map(); // instanceId -> listeners
  private processedMessageIds: Map<string, Set<string>> = new Map(); // instanceId -> Set<messageId>
  private messageCallbacks: Map<string, Map<string, MessageCallbacks>> = new Map(); // instanceId -> messageId -> callbacks
  private readonly MAX_PROCESSED_IDS = 1000; // Prevent memory leak per channel
  private static instance: WakuService | null = null;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): WakuService {
    if (!WakuService.instance) {
      WakuService.instance = new WakuService();
    }
    return WakuService.instance;
  }

  /**
   * Initialize Waku node and connect to the network
   * Uses defaultBootstrap for automatic peer discovery
   * Only needs to be called once for the entire app
   */
  async initialize(): Promise<void> {
    if (this.node) {
      console.log('[Waku] Node already initialized');
      return;
    }

    console.log('[Waku] Initializing light node...');
    
    // Create a light node - efficient for browser environments
    this.node = await createLightNode({ defaultBootstrap: true });
    
    // Single content topic - Reliable Channels handles instance separation
    const contentTopic = `/audience-qa/1/data/proto`;
    
    // Create encoder and decoder once for all channels
    this.encoder = this.node.createEncoder({ contentTopic });
    this.decoder = this.node.createDecoder({ contentTopic });
    
    // Listen to health status changes
    this.node.events.addEventListener('waku:health', (event: any) => {
      const health = event.detail;
      const wasHealthy = this.isHealthy;
      this.isHealthy = health === HealthStatus.SufficientlyHealthy;
      
      console.log('[Waku] Health status:', health, 'Healthy:', this.isHealthy);
      
      if (wasHealthy !== this.isHealthy) {
        this.healthListeners.forEach(listener => listener(this.isHealthy));
      }
    });
    
    console.log('[Waku] Light node initialized successfully');
  }

  /**
   * Get or create a channel for an instance
   * Reuses existing channel if already joined
   */
  async getOrCreateChannel(instanceId: string, senderId: string): Promise<void> {
    if (!this.node || !this.encoder || !this.decoder) {
      throw new Error('Node not initialized. Call initialize() first.');
    }

    // Return if already in this channel
    if (this.channels.has(instanceId)) {
      console.log(`[Waku] Already in channel: ${instanceId}`);
      return;
    }

    console.log(`[Waku] Creating channel: ${instanceId}`);
    
    // Create reliable channel - handles message delivery guarantees
    const channel = await ReliableChannel.create(
      this.node,
      instanceId,
      senderId,
      this.encoder,
      this.decoder
    );

    // Initialize listener set and callbacks for this channel
    this.channelListeners.set(instanceId, new Set());
    this.messageCallbacks.set(instanceId, new Map());
    
    // Load processed message IDs from localStorage
    const storedIds = this.loadProcessedIds(instanceId);
    this.processedMessageIds.set(instanceId, storedIds);
    console.log(`[Waku] Loaded ${storedIds.size} processed message IDs from storage`);

    // Setup delivery status listeners ONCE per channel
    channel.addEventListener('message-sent', (event: any) => {
      const messageId = event.detail;
      const callbacks = this.messageCallbacks.get(instanceId)?.get(messageId);
      if (callbacks?.onSent) {
        console.log('[Waku] Message sent:', messageId);
        callbacks.onSent();
      }
    });

    channel.addEventListener('message-acknowledged', (event: any) => {
      const messageId = event.detail;
      const callbacks = this.messageCallbacks.get(instanceId)?.get(messageId);
      if (callbacks?.onAcknowledged) {
        console.log('[Waku] Message acknowledged by peers:', messageId);
        callbacks.onAcknowledged();
        // Clean up callbacks after acknowledgment
        this.messageCallbacks.get(instanceId)?.delete(messageId);
      }
    });

    channel.addEventListener('sending-message-irrecoverable-error', (event: any) => {
      const messageId = event.detail.messageId;
      const callbacks = this.messageCallbacks.get(instanceId)?.get(messageId);
      if (callbacks?.onError) {
        console.error('[Waku] Failed to send message:', event.detail.error);
        callbacks.onError(event.detail.error);
        // Clean up callbacks after error
        this.messageCallbacks.get(instanceId)?.delete(messageId);
      }
    });

    // Listen for incoming messages
    channel.addEventListener('message-received', (event: any) => {
      try {
        const wakuMessage = event.detail;
        const decoded = DataPacket.decode(wakuMessage.payload) as any;
        
        // Create message ID based on actual content (more reliable than Waku hash)
        const messageId = this.createContentMessageId(
          decoded.type,
          decoded.timestamp,
          decoded.senderId,
          decoded.payload
        );
        
        // Get processed IDs for this channel (with safe fallback)
        let processedIds = this.processedMessageIds.get(instanceId);
        if (!processedIds) {
          console.warn('[Waku] ProcessedIds not found for instance, initializing:', instanceId);
          processedIds = new Set();
          this.processedMessageIds.set(instanceId, processedIds);
        }
        
        // Check for duplicates
        if (processedIds.has(messageId)) {
          console.log('[Waku] Duplicate message detected, skipping:', messageId.substring(0, 16));
          return;
        }
        
        // Mark as processed and persist to localStorage
        processedIds.add(messageId);
        this.saveProcessedIds(instanceId, processedIds);
        
        // Prevent memory leak - keep only recent message IDs
        if (processedIds.size > this.MAX_PROCESSED_IDS) {
          const idsArray = Array.from(processedIds);
          const toRemove = idsArray.slice(0, processedIds.size - this.MAX_PROCESSED_IDS);
          toRemove.forEach(id => processedIds.delete(id));
          this.saveProcessedIds(instanceId, processedIds);
        }
        
        const message: WakuMessage = {
          type: decoded.type as MessageType,
          timestamp: Number(decoded.timestamp),
          senderId: decoded.senderId as string,
          payload: JSON.parse(decoded.payload as string)
        };
        
        console.log('[Waku] Message received (ID:', messageId.substring(0, 8), '):', message.type, 'from:', message.senderId);
        
        // Notify all listeners for this channel
        const listeners = this.channelListeners.get(instanceId);
        if (listeners) {
          listeners.forEach(listener => listener(message));
        }
      } catch (error) {
        console.error('[Waku] Error decoding message:', error);
      }
    });

    this.channels.set(instanceId, channel);
    console.log(`[Waku] Successfully joined channel: ${instanceId}`);
  }

  /**
   * Leave a channel (instance)
   */
  async leaveChannel(instanceId: string): Promise<void> {
    const channel = this.channels.get(instanceId);
    if (!channel) {
      return;
    }

    console.log(`[Waku] Leaving channel: ${instanceId}`);
    
    // Clean up channel resources
    this.channels.delete(instanceId);
    this.channelListeners.delete(instanceId);
    this.processedMessageIds.delete(instanceId);
    this.messageCallbacks.delete(instanceId);
    
    console.log(`[Waku] Left channel: ${instanceId}`);
  }

  /**
   * Send a message to a specific channel
   * Returns the message ID for tracking delivery status
   */
  async sendMessage(
    instanceId: string, 
    message: WakuMessage, 
    senderId: string,
    callbacks?: MessageCallbacks
  ): Promise<string> {
    const channel = this.channels.get(instanceId);
    if (!channel) {
      throw new Error(`Not connected to channel: ${instanceId}. Call getOrCreateChannel() first.`);
    }

    console.log('[Waku] Sending message:', message.type, 'to channel:', instanceId);

    // Notify that we're starting to send
    callbacks?.onSending?.();

    // Encode message using Protobuf
    const protoMessage = DataPacket.create({
      type: message.type,
      timestamp: message.timestamp,
      senderId: senderId,
      payload: JSON.stringify(message.payload)
    });

    const serialized = DataPacket.encode(protoMessage).finish();
    
    // Send via reliable channel
    const messageId = channel.send(serialized);

    // Store callbacks for this message if provided
    if (callbacks) {
      const channelCallbacks = this.messageCallbacks.get(instanceId);
      if (channelCallbacks) {
        channelCallbacks.set(messageId, callbacks);
      }
    }

    return messageId;
  }

  /**
   * Subscribe to incoming messages for a specific channel
   */
  onMessage(instanceId: string, listener: (message: WakuMessage) => void): () => void {
    let listeners = this.channelListeners.get(instanceId);
    if (!listeners) {
      listeners = new Set();
      this.channelListeners.set(instanceId, listeners);
    }
    listeners.add(listener);
    return () => {
      const channelListeners = this.channelListeners.get(instanceId);
      if (channelListeners) {
        channelListeners.delete(listener);
      }
    };
  }

  /**
   * Subscribe to health status changes
   */
  onHealthChange(listener: (isHealthy: boolean) => void): () => void {
    this.healthListeners.add(listener);
    // Immediately notify of current status
    listener(this.isHealthy);
    return () => this.healthListeners.delete(listener);
  }

  /**
   * Get current connection status
   */
  isConnected(): boolean {
    return this.isHealthy;
  }

  /**
   * Create a reliable message ID based on message content
   * This ensures consistent IDs across page reloads
   */
  private createContentMessageId(
    type: string,
    timestamp: bigint | number,
    senderId: string,
    payload: string
  ): string {
    const content = `${type}:${timestamp}:${senderId}:${payload}`;
    
    // Create a hash from the content
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${hash.toString(16)}_${timestamp}`;
  }

  /**
   * Load processed message IDs from localStorage
   */
  private loadProcessedIds(instanceId: string): Set<string> {
    try {
      const key = `waku_processed_${instanceId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('[Waku] Failed to load processed IDs from storage:', error);
    }
    return new Set();
  }

  /**
   * Save processed message IDs to localStorage
   */
  private saveProcessedIds(instanceId: string, ids: Set<string>): void {
    try {
      const key = `waku_processed_${instanceId}`;
      // Only keep the most recent IDs to prevent localStorage from growing too large
      const idsArray = Array.from(ids);
      const toStore = idsArray.slice(-this.MAX_PROCESSED_IDS);
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch (error) {
      console.warn('[Waku] Failed to save processed IDs to storage:', error);
    }
  }

  /**
   * Cleanup all resources
   * Should only be called when shutting down the entire app
   */
  async stop(): Promise<void> {
    console.log('[Waku] Stopping service...');
    
    // Leave all channels
    const instanceIds = Array.from(this.channels.keys());
    for (const instanceId of instanceIds) {
      await this.leaveChannel(instanceId);
    }
    
    if (this.node) {
      await this.node.stop();
      this.node = null;
    }
    
    this.encoder = null;
    this.decoder = null;
    this.healthListeners.clear();
    this.channels.clear();
    this.channelListeners.clear();
    this.processedMessageIds.clear();
    this.messageCallbacks.clear();
  }
}

/**
 * Generate a random sender ID for a user
 * Each participant must have a unique ID for reliability tracking
 */
export function generateSenderId(): string {
  return `user_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
}

/**
 * Generate a random instance ID
 * Used when creating new Q&A instances
 */
export function generateInstanceId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
