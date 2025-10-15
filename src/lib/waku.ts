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

    // Initialize listener set and processed messages for this channel
    this.channelListeners.set(instanceId, new Set());
    this.processedMessageIds.set(instanceId, new Set());

    // Listen for incoming messages
    channel.addEventListener('message-received', (event: any) => {
      try {
        const wakuMessage = event.detail;
        
        // Generate a unique message ID from the Waku message
        const messageId = this.getMessageId(wakuMessage);
        
        // Get processed IDs for this channel
        const processedIds = this.processedMessageIds.get(instanceId)!;
        
        // Check for duplicates
        if (processedIds.has(messageId)) {
          console.log('[Waku] Duplicate message detected, skipping:', messageId.substring(0, 8));
          return;
        }
        
        // Mark as processed
        processedIds.add(messageId);
        
        // Prevent memory leak - keep only recent message IDs
        if (processedIds.size > this.MAX_PROCESSED_IDS) {
          const idsArray = Array.from(processedIds);
          const toRemove = idsArray.slice(0, processedIds.size - this.MAX_PROCESSED_IDS);
          toRemove.forEach(id => processedIds.delete(id));
        }
        
        const decoded = DataPacket.decode(wakuMessage.payload) as any;
        
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
    callbacks?: {
      onSending?: () => void;
      onSent?: () => void;
      onAcknowledged?: () => void;
      onError?: (error: any) => void;
    }
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

    // Setup listeners for delivery status
    channel.addEventListener('message-sent', (event: any) => {
      if (messageId === event.detail) {
        console.log('[Waku] Message sent:', messageId);
        callbacks?.onSent?.();
      }
    });

    channel.addEventListener('message-acknowledged', (event: any) => {
      if (messageId === event.detail) {
        console.log('[Waku] Message acknowledged by peers:', messageId);
        callbacks?.onAcknowledged?.();
      }
    });

    channel.addEventListener('sending-message-irrecoverable-error', (event: any) => {
      if (messageId === event.detail.messageId) {
        console.error('[Waku] Failed to send message:', event.detail.error);
        callbacks?.onError?.(event.detail.error);
      }
    });

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
   * Generate a unique message ID from a Waku message
   * Uses message hash if available, otherwise creates from content
   */
  private getMessageId(wakuMessage: any): string {
    // Convert Uint8Array hash to hex string
    const toHexString = (bytes: Uint8Array): string => {
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };
    
    // Try to use Waku's hash property (usually Uint8Array)
    if (wakuMessage.hash) {
      if (wakuMessage.hash instanceof Uint8Array) {
        return toHexString(wakuMessage.hash);
      }
      return String(wakuMessage.hash);
    }
    
    // Try hashStr if available
    if (wakuMessage.hashStr) {
      return String(wakuMessage.hashStr);
    }
    
    // Fallback: create ID from timestamp and payload hash
    // This ensures duplicate content is detected even without Waku hash
    const timestamp = wakuMessage.timestamp || Date.now();
    const payloadStr = new TextDecoder().decode(wakuMessage.payload);
    
    // Simple hash function for payload
    let hash = 0;
    for (let i = 0; i < payloadStr.length; i++) {
      const char = payloadStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${timestamp}_${hash}`;
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
