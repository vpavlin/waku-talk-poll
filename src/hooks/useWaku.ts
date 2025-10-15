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
  // Hint: const wakuService = WakuService.getInstance();
  const wakuService = null as any; // Replace with actual service

  // Initialize Waku when instanceId is provided
  useEffect(() => {
    if (!instanceId) return;

    const initWaku = async () => {
      try {
        setIsInitializing(true);
        setIsReady(false);
        setError(null);

        console.log('[useWaku] Getting singleton Waku service');
        
        // Setup health listener
        // wakuService.onHealthChange(setIsConnected);

        // TODO 2.2: Initialize Waku node (idempotent - only happens once)
        // Hint: await wakuService.initialize();
        console.log('[useWaku] Initializing Waku node');
        
        // TODO 2.3: Get or create channel for this instance
        // Hint: await wakuService.getOrCreateChannel(instanceId, senderIdRef.current);
        console.log('[useWaku] Joining channel:', instanceId);
        
        console.log('[useWaku] Channel ready, listeners can now be registered');
        setIsReady(true);

      } catch (err) {
        console.error('[useWaku] Error initializing:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to Waku network');
      } finally {
        setIsInitializing(false);
      }
    };

    initWaku();

    // TODO 2.4: Cleanup on unmount - leave this specific channel
    // Hint: wakuService.leaveChannel(instanceId)
    return () => {
      if (instanceId) {
        console.log('[useWaku] Leaving channel:', instanceId);
        // Add cleanup code here
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
    // Implement message sending here
    throw new Error('sendMessage not implemented - see TODO 2.5');
  }, [instanceId, wakuService]);

  // TODO 2.6: Register message listener with WakuService
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
    
    // TODO 2.7: Return unsubscribe function from wakuService.onMessage
    // Hint: return wakuService.onMessage(instanceId, listener);
    
    console.log('[useWaku] Listener registered successfully');
    return () => {}; // Replace with actual unsubscribe
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
