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
        const decoded = DataPacket.decode(wakuMessage.payload) as any;
        
        const message: WakuMessage = {
          type: decoded.type as MessageType,
          timestamp: Number(decoded.timestamp),
          senderId: decoded.senderId as string,
          payload: JSON.parse(decoded.payload as string)
        };
        
        console.log('[Waku] Message received:', message.type, 'from:', message.senderId);
        
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
   * Cleanup resources
   */
  async stop(): Promise<void> {
    console.log('[Waku] Stopping service...');
    if (this.node) {
      await this.node.stop();
    }
    this.messageListeners.clear();
    this.healthListeners.clear();
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
