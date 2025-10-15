# PulseCheck Workshop Solutions Guide

This guide contains the complete solutions for all TODO tasks in the PulseCheck Waku P2P workshop. Use this only if you get stuck or want to verify your implementation.

## Part 1: WakuService Implementation (`src/lib/waku.ts`)

### TODO 1.1: Create Waku Light Node

```typescript
this.node = await createLightNode({ defaultBootstrap: true });
```

### TODO 1.2: Define Content Topic

```typescript
const contentTopic = `/pulsecheck/1/data/proto`;
```

### TODO 1.3: Create Encoder and Decoder

```typescript
this.encoder = this.node.createEncoder({ contentTopic });
this.decoder = this.node.createDecoder({ contentTopic });
```

### TODO 1.4: Health Status Listener

```typescript
this.node.events.addEventListener('waku:health', (event: any) => {
  const health = event.detail;
  const wasHealthy = this.isHealthy;
  this.isHealthy = health === HealthStatus.SufficientlyHealthy;
  
  if (wasHealthy !== this.isHealthy) {
    this.healthListeners.forEach(listener => listener(this.isHealthy));
  }
});
```

### TODO 1.5: Create ReliableChannel

```typescript
const channel = await ReliableChannel.create(
  this.node,
  instanceId,
  senderId,
  this.encoder,
  this.decoder
);
```

### TODO 1.6: Message Delivery Event Listeners

```typescript
// Track when message sending begins
channel.addEventListener('sending-message', (event: any) => {
  const messageId = event.detail;
  console.log('[Waku] Sending message:', messageId);
  
  this.emitSDSEvent({
    type: 'out',
    event: 'sending-message',
    timestamp: Date.now(),
    details: { messageId },
    instanceId
  });
  
  const callbacks = this.messageCallbacks.get(instanceId)?.get(messageId);
  callbacks?.onSending?.();
});

// Message successfully sent to the network
channel.addEventListener('message-sent', (event: any) => {
  const messageId = event.detail;
  console.log('[Waku] Message sent:', messageId);
  
  this.emitSDSEvent({
    type: 'out',
    event: 'message-sent',
    timestamp: Date.now(),
    details: { messageId },
    instanceId
  });
  
  const callbacks = this.messageCallbacks.get(instanceId)?.get(messageId);
  callbacks?.onSent?.();
});

// Message possibly acknowledged (pre-confirmation)
channel.addEventListener('message-possibly-acknowledged', (event: any) => {
  const messageId = event.detail;
  console.log('[Waku] Message possibly acknowledged:', messageId);
  
  this.emitSDSEvent({
    type: 'out',
    event: 'message-possibly-acknowledged',
    timestamp: Date.now(),
    details: { messageId },
    instanceId
  });
});

// Message fully acknowledged by recipient
channel.addEventListener('message-acknowledged', (event: any) => {
  const messageId = event.detail;
  console.log('[Waku] Message acknowledged:', messageId);
  
  this.emitSDSEvent({
    type: 'out',
    event: 'message-acknowledged',
    timestamp: Date.now(),
    details: { messageId },
    instanceId
  });
  
  const callbacks = this.messageCallbacks.get(instanceId)?.get(messageId);
  callbacks?.onAcknowledged?.();
  
  // Clean up callbacks after acknowledgment
  this.messageCallbacks.get(instanceId)?.delete(messageId);
});

// Handle irrecoverable send errors
channel.addEventListener('sending-message-irrecoverable-error', (event: any) => {
  const { messageId, error } = event.detail;
  console.error('[Waku] Irrecoverable send error:', messageId, error);
  
  this.emitSDSEvent({
    type: 'error',
    event: 'sending-message-irrecoverable-error',
    timestamp: Date.now(),
    details: { messageId, error },
    instanceId
  });
  
  const callbacks = this.messageCallbacks.get(instanceId)?.get(messageId);
  callbacks?.onError?.(error);
  
  // Clean up callbacks after error
  this.messageCallbacks.get(instanceId)?.delete(messageId);
});

// Handle messages that couldn't be retrieved
channel.addEventListener('irretrievable-message', (event: any) => {
  const messageId = event.detail;
  console.warn('[Waku] Irretrievable message:', messageId);
  
  this.emitSDSEvent({
    type: 'error',
    event: 'irretrievable-message',
    timestamp: Date.now(),
    details: { messageId },
    instanceId
  });
});
```

### TODO 1.7: Incoming Message Listener

```typescript
channel.addEventListener('message-received', (event: any) => {
  console.log('[Waku] Raw message received');
  
  try {
    // TODO 1.11: Decode Protobuf payload
    const decoded = DataPacket.decode(event.detail.payload);
    const wakuMessage: WakuMessage = {
      type: decoded.type as MessageType,
      timestamp: Number(decoded.timestamp),
      senderId: decoded.senderId,
      payload: JSON.parse(decoded.payload)
    };
    
    // TODO 1.12: Create content-based ID for deduplication
    const messageId = this.createContentMessageId(
      decoded.type,
      decoded.timestamp,
      decoded.senderId,
      decoded.payload
    );
    
    // TODO 1.13: Check for duplicates
    const processedIds = this.processedMessageIds.get(instanceId);
    if (!processedIds) {
      console.warn('[Waku] No processed IDs set for instance:', instanceId);
      return;
    }
    
    if (processedIds.has(messageId)) {
      console.log('[Waku] Duplicate message detected, skipping:', messageId);
      return;
    }
    
    // TODO 1.14: Mark as processed and notify listeners
    console.log('[Waku] New message received:', wakuMessage.type, messageId);
    processedIds.add(messageId);
    this.saveProcessedIds(instanceId, processedIds);
    
    this.emitSDSEvent({
      type: 'in',
      event: 'message-received',
      timestamp: Date.now(),
      details: { messageId, message: wakuMessage },
      instanceId
    });
    
    const listeners = this.channelListeners.get(instanceId);
    if (listeners) {
      listeners.forEach(listener => listener(wakuMessage));
    }
  } catch (error) {
    console.error('[Waku] Error processing received message:', error);
    
    this.emitSDSEvent({
      type: 'error',
      event: 'message-decode-error',
      timestamp: Date.now(),
      details: { error },
      instanceId
    });
  }
});

this.channels.set(instanceId, channel);
```

### TODO 1.8-1.10: Send Message Implementation

```typescript
// TODO 1.8: Encode message using Protobuf
const protoMessage = DataPacket.create({
  type: message.type,
  timestamp: message.timestamp,
  senderId,
  payload: JSON.stringify(message.payload)
});
const serialized = DataPacket.encode(protoMessage).finish();

// TODO 1.9: Send via reliable channel
const messageId = channel.send(serialized);

// TODO 1.10: Store callbacks for tracking
if (callbacks) {
  this.messageCallbacks.get(instanceId)?.set(messageId, callbacks);
}

console.log('[Waku] Message queued with ID:', messageId);
return messageId;
```

## Part 2: useWaku Hook Implementation (`src/hooks/useWaku.ts`)

### TODO 2.1: Get WakuService Singleton

```typescript
const wakuService = WakuService.getInstance();
```

### TODO 2.2: Initialize Waku Node

```typescript
await wakuService.initialize();
```

### TODO 2.3: Get or Create Channel

```typescript
await wakuService.getOrCreateChannel(instanceId, senderIdRef.current);
```

### TODO 2.4: Cleanup on Unmount

```typescript
return () => {
  if (instanceId) {
    console.log('[useWaku] Leaving channel:', instanceId);
    wakuService.leaveChannel(instanceId);
  }
  setIsReady(false);
};
```

### TODO 2.5: Implement sendMessage

```typescript
const sendMessage = useCallback(async (
  message: WakuMessage,
  callbacks?: {
    onSending?: () => void;
    onSent?: () => void;
    onAcknowledged?: () => void;
    onError?: (error: any) => void;
  }
) => {
  if (!instanceId) {
    throw new Error('No instance ID');
  }
  
  return await wakuService.sendMessage(
    instanceId,
    message,
    senderIdRef.current,
    callbacks
  );
}, [instanceId, wakuService]);
```

### TODO 2.6-2.7: Implement onMessage

```typescript
const onMessage = useCallback((listener: (message: WakuMessage) => void) => {
  console.log('[useWaku] Registering message listener, ready:', isReady);
  
  if (!instanceId) {
    console.warn('[useWaku] Cannot register listener - no instance ID');
    return () => {};
  }
  
  return wakuService.onMessage(instanceId, listener);
}, [isReady, instanceId, wakuService]);
```

### Additional Setup Items

Don't forget to:
1. Set up health listener in the useEffect:
   ```typescript
   wakuService.onHealthChange(setIsConnected);
   ```

2. Set `isReady` to true after channel creation:
   ```typescript
   setIsReady(true);
   ```

## Testing Your Implementation

Once complete, test your implementation by:

1. **Single User Flow**
   - Create an instance as admin
   - Post questions and verify they appear
   - Check DevConsole for proper event flow

2. **Multi-User Flow**
   - Open multiple browser tabs/windows
   - Join same instance as attendee in one tab
   - Post questions from attendee tab
   - Verify admin sees them in real-time

3. **Delivery Tracking**
   - Watch for message status changes in UI
   - Check console logs for lifecycle events
   - Verify DevConsole shows proper event sequence

4. **Persistence**
   - Send messages, refresh page
   - Verify no duplicate messages appear
   - Check localStorage for processed message IDs

## Common Issues & Solutions

### Connection Issues
- Ensure node is fully initialized before creating channels
- Check browser console for bootstrap errors
- Verify network access (Waku uses WebSockets)

### Message Duplicates
- Verify content-based ID generation is working
- Check localStorage for processed IDs
- Ensure deduplication logic runs before notifying listeners

### Delivery Status Not Updating
- Confirm callbacks are properly stored in Map
- Check that event listeners are attached to channel
- Verify messageId matches between send and callbacks

### Performance Issues
- Implement MAX_PROCESSED_IDS limit
- Clean up callbacks after acknowledgment/error
- Use proper cleanup in useEffect returns
