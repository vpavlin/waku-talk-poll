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
  const wakuServiceRef = useRef<WakuService | null>(null);
  const senderIdRef = useRef<string>(generateSenderId());

  // Initialize Waku when instanceId is provided
  useEffect(() => {
    if (!instanceId) return;

    const initWaku = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Create Waku service if not already created
        if (!wakuServiceRef.current) {
          wakuServiceRef.current = new WakuService(senderIdRef.current);
          
          // Setup health listener
          wakuServiceRef.current.onHealthChange(setIsConnected);
        }

        // Initialize and join channel
        await wakuServiceRef.current.initialize();
        await wakuServiceRef.current.joinChannel(instanceId);

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
    };
  }, [instanceId]);

  // Send message function
  const sendMessage = useCallback(async (message: WakuMessage) => {
    if (!wakuServiceRef.current) {
      throw new Error('Waku not initialized');
    }
    return wakuServiceRef.current.sendMessage(message);
  }, []);

  // Subscribe to messages
  const onMessage = useCallback((listener: (message: WakuMessage) => void) => {
    if (!wakuServiceRef.current) {
      return () => {};
    }
    return wakuServiceRef.current.onMessage(listener);
  }, []);

  return {
    isConnected,
    isInitializing,
    error,
    sendMessage,
    onMessage,
    senderId: senderIdRef.current
  };
}
