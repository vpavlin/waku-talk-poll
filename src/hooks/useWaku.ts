/**
 * React hook for managing Waku connection
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WakuService, generateSenderId } from '@/lib/waku';
import type { WakuMessage } from '@/types/waku';

export function useWaku(instanceId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const wakuServiceRef = useRef<WakuService | null>(null);
  const senderIdRef = useRef<string>(generateSenderId());

  // Initialize Waku when instanceId is provided
  useEffect(() => {
    if (!instanceId) return;

    const initWaku = async () => {
      try {
        setIsInitializing(true);
        setIsReady(false);
        setError(null);

        // Create Waku service if not already created
        if (!wakuServiceRef.current) {
          console.log('[useWaku] Creating new Waku service');
          wakuServiceRef.current = new WakuService(senderIdRef.current);
          
          // Setup health listener
          wakuServiceRef.current.onHealthChange(setIsConnected);
        }

        // Initialize and join channel
        console.log('[useWaku] Initializing and joining channel:', instanceId);
        await wakuServiceRef.current.initialize();
        await wakuServiceRef.current.joinChannel(instanceId);
        
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

    // Cleanup on unmount
    return () => {
      if (wakuServiceRef.current) {
        wakuServiceRef.current.stop();
        wakuServiceRef.current = null;
      }
      setIsReady(false);
    };
  }, [instanceId]);

  // Send message function
  const sendMessage = useCallback(async (message: WakuMessage) => {
    if (!wakuServiceRef.current) {
      throw new Error('Waku not initialized');
    }
    return wakuServiceRef.current.sendMessage(message);
  }, []);

  // Subscribe to messages - only works after isReady is true
  const onMessage = useCallback((listener: (message: WakuMessage) => void) => {
    console.log('[useWaku] Registering message listener, ready:', isReady);
    if (!wakuServiceRef.current) {
      console.warn('[useWaku] Cannot register listener - service not initialized');
      return () => {};
    }
    const unsubscribe = wakuServiceRef.current.onMessage(listener);
    console.log('[useWaku] Listener registered successfully');
    return unsubscribe;
  }, [isReady]);

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
