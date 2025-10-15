/**
 * Waku Reliable Channels integration - WORKSHOP STARTER
 * 
 * In this workshop, you'll implement p2p communication using Waku Reliable Channels.
 * Follow the TODOs in order and refer to WORKSHOP_GUIDE.md for detailed instructions.
 * 
 * Architecture:
 * - Single Waku node initialized once per app
 * - Single content topic: /audience-qa/1/data/proto
 * - Multiple ReliableChannels managed in a Map (key: instanceId)
 * - Each instance (Q&A session) has its own channel
 */

import { createLightNode, ReliableChannel, HealthStatus } from '@waku/sdk';
import protobuf from 'protobufjs';
import type { WakuMessage } from '@/types/waku';
import { MessageType } from '@/types/waku';

/**
 * Message delivery callbacks
 * These allow tracking message status through its lifecycle
 */
interface MessageCallbacks {
  onSending?: () => void;
  onSent?: () => void;
  onAcknowledged?: () => void;
  onError?: (error: any) => void;
}

/**
 * SDS Event types for developer console monitoring
 */
export interface SDSEvent {
  type: 'out' | 'in' | 'error';
  event: string;
  timestamp: number;
  details: any;
  instanceId?: string;
}

/**
 * Message structure using Protobuf
 * Defines how messages are serialized for transmission over Waku
 */
const DataPacket = new protobuf.Type('DataPacket')
  .add(new protobuf.Field('type', 1, 'string'))
  .add(new protobuf.Field('timestamp', 2, 'uint64'))
  .add(new protobuf.Field('senderId', 3, 'string'))
  .add(new protobuf.Field('payload', 4, 'string'));

/**
 * WakuService handles all Waku node operations and message passing
 * Singleton pattern ensures one node manages multiple channels
 */
export class WakuService {
  private node: any = null;
  private channels: Map<string, any> = new Map(); // instanceId -> ReliableChannel
  private encoder: any = null;
  private decoder: any = null;
  private isHealthy: boolean = false;
  private healthListeners: Set<(isHealthy: boolean) => void> = new Set();
  private channelListeners: Map<string, Set<(message: WakuMessage) => void>> = new Map();
  private processedMessageIds: Map<string, Set<string>> = new Map();
  private messageCallbacks: Map<string, Map<string, MessageCallbacks>> = new Map();
  private readonly MAX_PROCESSED_IDS = 1000; // Prevent memory leak
  private sdsEventListeners: Set<(event: SDSEvent) => void> = new Set();
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
   * PART 1: Initialize Waku node and connect to the network
   * 
   * This method sets up the foundation for all P2P communication.
   * It only needs to be called once for the entire app.
   */
  async initialize(): Promise<void> {
    if (this.node) {
      console.log('[Waku] Node already initialized');
      return;
    }

    console.log('[Waku] Initializing light node...');
    
    // TODO 1.1: Create a Waku light node with default bootstrap
    // This creates a browser-optimized node that automatically discovers peers
    
    // TODO 1.2: Define the content topic for message routing
    // Format: /app-name/version/type/encoding
    
    // TODO 1.3: Create encoder and decoder for the content topic
    // These are used to serialize/deserialize messages
    
    // TODO 1.4: Set up health status listener
    // Listen to 'waku:health' events and update this.isHealthy
    // Notify healthListeners when status changes
    
    console.log('[Waku] Light node initialized successfully');
  }

  /**
   * Emit SDS event to all listeners (for DevConsole monitoring)
   */
  private emitSDSEvent(event: SDSEvent): void {
    this.sdsEventListeners.forEach(listener => listener(event));
  }

  /**
   * Subscribe to SDS events for monitoring
   */
  onSDSEvent(listener: (event: SDSEvent) => void): () => void {
    this.sdsEventListeners.add(listener);
    return () => this.sdsEventListeners.delete(listener);
  }

  /**
   * PART 2: Get or create a channel for an instance
   * 
   * Each Q&A instance (room) has its own ReliableChannel.
   * Channels ensure messages are delivered and acknowledged.
   */
  async getOrCreateChannel(instanceId: string, senderId: string): Promise<void> {
    if (!this.node || !this.encoder || !this.decoder) {
      throw new Error('Node not initialized. Call initialize() first.');
    }

    if (this.channels.has(instanceId)) {
      console.log(`[Waku] Already in channel: ${instanceId}`);
      return;
    }

    console.log(`[Waku] Creating channel: ${instanceId}`);
    
    // TODO 1.5: Create a ReliableChannel
    // The channel handles message delivery guarantees and acknowledgments

    // Initialize data structures for this channel
    this.channelListeners.set(instanceId, new Set());
    this.messageCallbacks.set(instanceId, new Map());
    
    const storedIds = this.loadProcessedIds(instanceId);
    this.processedMessageIds.set(instanceId, storedIds);
    console.log(`[Waku] Loaded ${storedIds.size} processed message IDs from storage`);

    // TODO 1.6: Set up message delivery event listeners
    // These track the message lifecycle: sending → sent → acknowledged
    // Events to handle:
    // - 'sending-message': When message starts sending
    // - 'message-sent': When message is sent to network
    // - 'message-possibly-acknowledged': Pre-confirmation
    // - 'message-acknowledged': Full acknowledgment from recipient
    // - 'sending-message-irrecoverable-error': Send errors
    // - 'irretrievable-message': Messages that couldn't be retrieved
    // For each event: emit SDS event and call appropriate callback

    // TODO 1.7: Set up incoming message listener
    // Handle 'message-received' event:
    // TODO 1.11: Decode the Protobuf payload
    // TODO 1.12: Create content-based message ID for deduplication
    // TODO 1.13: Check for duplicates and skip if already processed
    // TODO 1.14: Mark as processed, save to localStorage, notify all listeners

    // TODO: Store the channel in the channels Map
    console.log(`[Waku] Successfully joined channel: ${instanceId}`);
  }

  /**
   * Leave a channel (cleanup when leaving an instance)
   */
  async leaveChannel(instanceId: string): Promise<void> {
    const channel = this.channels.get(instanceId);
    if (!channel) return;

    console.log(`[Waku] Leaving channel: ${instanceId}`);
    
    this.channels.delete(instanceId);
    this.channelListeners.delete(instanceId);
    this.processedMessageIds.delete(instanceId);
    this.messageCallbacks.delete(instanceId);
    
    console.log(`[Waku] Left channel: ${instanceId}`);
  }

  /**
   * PART 3: Send a message to a specific channel
   * 
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

    // TODO 1.8: Encode message using Protobuf DataPacket
    // Create a DataPacket with type, timestamp, senderId, and stringified payload
    // Then encode it to bytes
    
    // TODO 1.9: Send via reliable channel and get message ID
    // Use channel.send() with the serialized message
    
    // TODO 1.10: Store callbacks for delivery tracking
    // Save the callbacks in messageCallbacks Map using the messageId
    
    throw new Error('sendMessage not implemented - see TODO 1.8-1.10');
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
   * Helper: Create a reliable message ID based on message content
   * This ensures consistent IDs across page reloads for deduplication
   */
  private createContentMessageId(
    type: string,
    timestamp: bigint | number,
    senderId: string,
    payload: string
  ): string {
    const content = `${type}:${timestamp}:${senderId}:${payload}`;
    
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `${hash.toString(16)}_${timestamp}`;
  }

  /**
   * Helper: Load processed message IDs from localStorage
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
   * Helper: Save processed message IDs to localStorage
   */
  private saveProcessedIds(instanceId: string, ids: Set<string>): void {
    try {
      const key = `waku_processed_${instanceId}`;
      const idsArray = Array.from(ids);
      const toStore = idsArray.slice(-this.MAX_PROCESSED_IDS);
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch (error) {
      console.warn('[Waku] Failed to save processed IDs to storage:', error);
    }
  }

  /**
   * Cleanup all resources (called on app shutdown)
   */
  async stop(): Promise<void> {
    console.log('[Waku] Stopping service...');
    
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
    this.sdsEventListeners.clear();
    this.isHealthy = false;
    
    console.log('[Waku] Service stopped');
  }
}

/**
 * Helper: Generate a unique sender ID for this client
 */
export function generateSenderId(): string {
  return `user-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Helper: Generate a random instance ID (for creating new Q&A sessions)
 */
export function generateInstanceId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
