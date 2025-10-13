/**
 * Waku Reliable Channels integration
 * 
 * This module handles p2p communication using Waku Reliable Channels.
 * Each instance has its own channel identified by instanceId.
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
 */
export class WakuService {
  private node: any = null;
  private channel: any = null;
  private senderId: string;
  private isHealthy: boolean = false;
  private messageListeners: Set<(message: WakuMessage) => void> = new Set();
  private healthListeners: Set<(isHealthy: boolean) => void> = new Set();
  private processedMessageIds: Set<string> = new Set(); // Track processed messages for deduplication
  private readonly MAX_PROCESSED_IDS = 1000; // Prevent memory leak

  constructor(senderId: string) {
    this.senderId = senderId;
  }

  /**
   * Initialize Waku node and connect to the network
   * Uses defaultBootstrap for automatic peer discovery
   */
  async initialize(): Promise<void> {
    console.log('[Waku] Initializing light node...');
    
    // Create a light node - efficient for browser environments
    this.node = await createLightNode({ defaultBootstrap: true });
    
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
   * Join a channel (instance)
   * Each instance has its own channel for isolated communication
   */
  async joinChannel(instanceId: string): Promise<void> {
    if (!this.node) {
      throw new Error('Node not initialized. Call initialize() first.');
    }

    console.log(`[Waku] Joining channel: ${instanceId}`);
    
    // Content topic for this channel - follows Waku convention
    const contentTopic = `/audience-qa/1/instance-${instanceId}/proto`;
    
    // Create encoder and decoder for this channel
    const encoder = this.node.createEncoder({ contentTopic });
    const decoder = this.node.createDecoder({ contentTopic });
    
    // Create reliable channel - handles message delivery guarantees
    this.channel = await ReliableChannel.create(
      this.node,
      instanceId,
      this.senderId,
      encoder,
      decoder
    );

    // Listen for incoming messages
    this.channel.addEventListener('message-received', (event: any) => {
      try {
        const wakuMessage = event.detail;
        
        // Generate a unique message ID from the Waku message
        // Use message hash if available, otherwise create from timestamp + payload
        const messageId = this.getMessageId(wakuMessage);
        
        // Check for duplicates
        if (this.processedMessageIds.has(messageId)) {
          console.log('[Waku] Duplicate message detected, skipping:', messageId.substring(0, 8));
          return;
        }
        
        // Mark as processed
        this.processedMessageIds.add(messageId);
        
        // Prevent memory leak - keep only recent message IDs
        if (this.processedMessageIds.size > this.MAX_PROCESSED_IDS) {
          const idsArray = Array.from(this.processedMessageIds);
          const toRemove = idsArray.slice(0, this.processedMessageIds.size - this.MAX_PROCESSED_IDS);
          toRemove.forEach(id => this.processedMessageIds.delete(id));
        }
        
        const decoded = DataPacket.decode(wakuMessage.payload) as any;
        
        const message: WakuMessage = {
          type: decoded.type as MessageType,
          timestamp: Number(decoded.timestamp),
          senderId: decoded.senderId as string,
          payload: JSON.parse(decoded.payload as string)
        };
        
        console.log('[Waku] Message received (ID:', messageId.substring(0, 8), '):', message.type, 'from:', message.senderId);
        
        // Notify all listeners
        this.messageListeners.forEach(listener => listener(message));
      } catch (error) {
        console.error('[Waku] Error decoding message:', error);
      }
    });

    console.log(`[Waku] Successfully joined channel: ${instanceId}`);
  }

  /**
   * Send a message to the current channel
   * Returns the message ID for tracking delivery status
   */
  async sendMessage(message: WakuMessage): Promise<string> {
    if (!this.channel) {
      throw new Error('Not connected to a channel. Call joinChannel() first.');
    }

    console.log('[Waku] Sending message:', message.type);

    // Encode message using Protobuf
    const protoMessage = DataPacket.create({
      type: message.type,
      timestamp: message.timestamp,
      senderId: this.senderId,
      payload: JSON.stringify(message.payload)
    });

    const serialized = DataPacket.encode(protoMessage).finish();
    
    // Send via reliable channel
    const messageId = this.channel.send(serialized);

    // Setup listeners for delivery status
    this.channel.addEventListener('message-sent', (event: any) => {
      if (messageId === event.detail) {
        console.log('[Waku] Message sent:', messageId);
      }
    });

    this.channel.addEventListener('message-acknowledged', (event: any) => {
      if (messageId === event.detail) {
        console.log('[Waku] Message acknowledged by peers:', messageId);
      }
    });

    this.channel.addEventListener('sending-message-irrecoverable-error', (event: any) => {
      if (messageId === event.detail.messageId) {
        console.error('[Waku] Failed to send message:', event.detail.error);
      }
    });

    return messageId;
  }

  /**
   * Subscribe to incoming messages
   */
  onMessage(listener: (message: WakuMessage) => void): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
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
    // Try to use Waku's message hash/ID if available
    if (wakuMessage.messageHash) {
      return wakuMessage.messageHash;
    }
    if (wakuMessage.hash) {
      return wakuMessage.hash;
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
   * Cleanup resources
   */
  async stop(): Promise<void> {
    console.log('[Waku] Stopping service...');
    if (this.node) {
      await this.node.stop();
    }
    this.messageListeners.clear();
    this.healthListeners.clear();
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
