/**
 * React hook for managing Waku connection - WORKSHOP STARTER
 * 
 * This hook provides a React-friendly interface to the WakuService.
 * Follow the TODOs and refer to WORKSHOP_GUIDE.md Part 2.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WakuService, generateSenderId } from '@/lib/waku';
import type { WakuMessage } from '@/types/waku';

export function useWaku(instanceId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const senderIdRef = useRef<string>(generateSenderId());
  
  // TODO 2.1: Get WakuService singleton instance
  const wakuService = null as any; // REPLACE THIS

  // Initialize Waku when instanceId is provided
  useEffect(() => {
    if (!instanceId) return;

    const initWaku = async () => {
      try {
        setIsInitializing(true);
        setIsReady(false);
        setError(null);

        console.log('[useWaku] Getting singleton Waku service');
        
        // TODO: Setup health listener to update connection status
        
        // TODO 2.2: Initialize Waku node (idempotent - only happens once)
        console.log('[useWaku] Initializing Waku node');
        
        // TODO 2.3: Get or create channel for this instance
        console.log('[useWaku] Joining channel:', instanceId);
        
        console.log('[useWaku] Channel ready, listeners can now be registered');
        // TODO: Set isReady to true after channel is created

      } catch (err) {
        console.error('[useWaku] Error initializing:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to Waku network');
      } finally {
        setIsInitializing(false);
      }
    };

    initWaku();

    // TODO 2.4: Cleanup on unmount - leave this specific channel
    return () => {
      if (instanceId) {
        console.log('[useWaku] Leaving channel:', instanceId);
        // TODO: Leave the channel using wakuService
      }
      setIsReady(false);
    };
  }, [instanceId, wakuService]);

  // TODO 2.5: Implement sendMessage function with delivery callbacks
  // This function should:
  // 1. Check if instanceId exists
  // 2. Call wakuService.sendMessage with the message and callbacks
  // 3. Return the message ID for tracking
  const sendMessage = useCallback(async (
    message: WakuMessage,
    callbacks?: {
      onSending?: () => void;
      onSent?: () => void;
      onAcknowledged?: () => void;
      onError?: (error: any) => void;
    }
  ) => {
    throw new Error('sendMessage not implemented - see TODO 2.5');
  }, [instanceId, wakuService]);

  // TODO 2.6-2.7: Register message listener with WakuService
  // This function should:
  // 1. Check if instanceId exists
  // 2. Call wakuService.onMessage to register the listener
  // 3. Return the unsubscribe function
  const onMessage = useCallback((listener: (message: WakuMessage) => void) => {
    console.log('[useWaku] Registering message listener, ready:', isReady);
    
    if (!instanceId) {
      console.warn('[useWaku] Cannot register listener - no instance ID');
      return () => {};
    }
    
    // TODO: Register the listener with wakuService and return unsubscribe function
    return () => {}; // REPLACE THIS
  }, [isReady, instanceId, wakuService]);

  return {
    isConnected,
    isInitializing,
    isReady,
    error,
    sendMessage,
    onMessage,
    senderId: senderIdRef.current
  };
}
