/**
 * React hook for managing Waku connection
 * Uses the singleton WakuService instance
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
  const wakuService = WakuService.getInstance();

  // Initialize Waku when instanceId is provided
  useEffect(() => {
    if (!instanceId) return;

    const initWaku = async () => {
      try {
        setIsInitializing(true);
        setIsReady(false);
        setError(null);

        console.log('[useWaku] Getting singleton Waku service');
        
        // Setup health listener (only once)
        wakuService.onHealthChange(setIsConnected);

        // Initialize node (idempotent - only happens once)
        console.log('[useWaku] Initializing Waku node');
        await wakuService.initialize();
        
        // Get or create channel for this instance
        console.log('[useWaku] Joining channel:', instanceId);
        await wakuService.getOrCreateChannel(instanceId, senderIdRef.current);
        
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

    // Cleanup on unmount - leave this specific channel
    return () => {
      if (instanceId) {
        console.log('[useWaku] Leaving channel:', instanceId);
        wakuService.leaveChannel(instanceId);
      }
      setIsReady(false);
    };
  }, [instanceId, wakuService]);

  // Send message function
  const sendMessage = useCallback(async (message: WakuMessage) => {
    if (!instanceId) {
      throw new Error('No instance ID provided');
    }
    return wakuService.sendMessage(instanceId, message, senderIdRef.current);
  }, [instanceId, wakuService]);

  // Subscribe to messages - only works after isReady is true
  const onMessage = useCallback((listener: (message: WakuMessage) => void) => {
    console.log('[useWaku] Registering message listener, ready:', isReady);
    if (!instanceId) {
      console.warn('[useWaku] Cannot register listener - no instance ID');
      return () => {};
    }
    const unsubscribe = wakuService.onMessage(instanceId, listener);
    console.log('[useWaku] Listener registered successfully');
    return unsubscribe;
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
