# PulseCheck - Waku Reliable Channels Workshop Guide

## Workshop Overview
In this hands-on workshop, you'll build **PulseCheck** - implementing real-time peer-to-peer communication using **Waku Reliable Channels**. You'll start with a UI-only app and add decentralized messaging to enable live question/answer exchange without a central server.

**Duration:** 90-120 minutes

## Learning Objectives
By the end of this workshop, you will:
1. ✅ Understand Waku's Light Node architecture
2. ✅ Implement Reliable Channels for guaranteed message delivery
3. ✅ Handle Protobuf message encoding/decoding
4. ✅ Manage channel lifecycle (create, join, leave)
5. ✅ Track message delivery status with callbacks
6. ✅ Prevent duplicate message processing
7. ✅ Build a custom React hook for Waku integration

## Prerequisites
- Basic understanding of React and TypeScript
- Familiarity with async/await and promises
- Understanding of pub/sub messaging patterns

---

## Part 1: Setting Up Waku Service (30 mins)

### Step 1.1: Initialize the Waku Light Node

**File:** `src/lib/waku.ts`

**What you'll build:**
- Initialize a Waku light node using `createLightNode()`
- Set up content topic for message routing
- Create encoder/decoder for message serialization

**Key Concepts:**
- **Light Node**: Browser-optimized Waku node that doesn't store full message history
- **Content Topic**: Routing path for messages (format: `/app-name/version/type/encoding`)
- **defaultBootstrap**: Automatically discovers and connects to Waku network peers

**TODO Locations:**
```typescript
// TODO 1.1: Create Waku light node with default bootstrap
// TODO 1.2: Define content topic for message routing
// TODO 1.3: Create encoder and decoder for the content topic
// TODO 1.4: Set up health status listener
```

**Expected Outcome:**
```typescript
this.node = await createLightNode({ defaultBootstrap: true });
const contentTopic = `/pulsecheck/1/data/proto`;
this.encoder = this.node.createEncoder({ contentTopic });
this.decoder = this.node.createDecoder({ contentTopic });
```

**Testing:**
- Console should log: `[Waku] Light node initialized successfully`
- Check browser console for connection status

---

### Step 1.2: Create Reliable Channels

**File:** `src/lib/waku.ts` → `getOrCreateChannel()` method

**What you'll build:**
- Create a ReliableChannel instance for an instance ID
- Set up event listeners for delivery tracking
- Initialize message processing structures

**Key Concepts:**
- **ReliableChannel**: Guarantees message delivery with acknowledgments
- **Instance ID**: Unique identifier for each PulseCheck session (like a "room")
- **Sender ID**: Unique identifier for each participant

**TODO Locations:**
```typescript
// TODO 1.5: Create ReliableChannel with encoder/decoder
// TODO 1.6: Set up message delivery event listeners
// TODO 1.7: Set up incoming message listener
```

**Expected Outcome:**
```typescript
const channel = await ReliableChannel.create(
  this.node,
  instanceId,
  senderId,
  this.encoder,
  this.decoder
);
```

**Testing:**
- Join an instance and check console: `[Waku] Successfully joined channel: [instanceId]`
- Verify no errors in browser console

---

### Step 1.3: Implement Message Sending

**File:** `src/lib/waku.ts` → `sendMessage()` method

**What you'll build:**
- Encode messages using Protobuf
- Send via ReliableChannel
- Store callbacks for delivery tracking

**Key Concepts:**
- **Protobuf**: Efficient binary serialization format
- **Message ID**: Unique identifier returned for tracking delivery
- **Callbacks**: Functions called at different delivery stages

**TODO Locations:**
```typescript
// TODO 1.8: Encode message using Protobuf DataPacket
// TODO 1.9: Send message via channel and get message ID
// TODO 1.10: Store callbacks for delivery tracking
```

**Expected Outcome:**
```typescript
const protoMessage = DataPacket.create({
  type: message.type,
  timestamp: message.timestamp,
  senderId: senderId,
  payload: JSON.stringify(message.payload)
});
const serialized = DataPacket.encode(protoMessage).finish();
const messageId = channel.send(serialized);
```

**Testing:**
- Send a test message from Admin view
- Console should show: `[Waku] Sending message: [type]`
- Check DevConsole tab for SDS events

---

### Step 1.4: Handle Incoming Messages

**File:** `src/lib/waku.ts` → Inside `getOrCreateChannel()` event listener

**What you'll build:**
- Listen for `message-received` events
- Decode Protobuf payload
- Prevent duplicate processing
- Notify all listeners

**Key Concepts:**
- **Deduplication**: Prevent processing same message multiple times
- **Content-based ID**: Create reliable message ID from content
- **Persistence**: Save processed IDs to localStorage

**TODO Locations:**
```typescript
// TODO 1.11: Decode Protobuf payload
// TODO 1.12: Create content-based message ID
// TODO 1.13: Check for duplicates and skip if already processed
// TODO 1.14: Notify all registered listeners
```

**Expected Outcome:**
```typescript
const decoded = DataPacket.decode(wakuMessage.payload);
const messageId = this.createContentMessageId(/*...*/);
if (processedIds.has(messageId)) return;
processedIds.add(messageId);
listeners.forEach(listener => listener(message));
```

**Testing:**
- Open Admin and Attendee in different browser tabs
- Add a question in Admin
- Verify it appears in Attendee view
- Reload page - question should not duplicate

---

## Part 2: Building the React Hook (20 mins)

### Step 2.1: Initialize Hook with Instance

**File:** `src/hooks/useWaku.ts`

**What you'll build:**
- Get singleton WakuService instance
- Initialize node on mount
- Join instance channel
- Clean up on unmount

**TODO Locations:**
```typescript
// TODO 2.1: Get WakuService singleton
// TODO 2.2: Initialize Waku node
// TODO 2.3: Join/create channel for instance
// TODO 2.4: Cleanup - leave channel on unmount
```

**Expected Outcome:**
```typescript
const wakuService = WakuService.getInstance();
await wakuService.initialize();
await wakuService.getOrCreateChannel(instanceId, senderId);
// cleanup:
return () => wakuService.leaveChannel(instanceId);
```

**Testing:**
- Navigate to an instance
- Check console: `[useWaku] Channel ready, listeners can now be registered`
- Navigate away - verify cleanup message

---

### Step 2.2: Implement sendMessage

**File:** `src/hooks/useWaku.ts`

**What you'll build:**
- Wrap WakuService sendMessage with React callback
- Forward delivery callbacks
- Handle errors

**TODO Locations:**
```typescript
// TODO 2.5: Implement sendMessage using WakuService
```

**Expected Outcome:**
```typescript
const sendMessage = useCallback(async (message, callbacks) => {
  if (!instanceId) throw new Error('No instance ID');
  return wakuService.sendMessage(instanceId, message, senderId, callbacks);
}, [instanceId, wakuService]);
```

**Testing:**
- Submit an answer as Attendee
- Verify delivery status changes: Sending → Sent → Acknowledged
- Check DevConsole for events

---

### Step 2.3: Implement onMessage Listener

**File:** `src/hooks/useWaku.ts`

**What you'll build:**
- Register message listeners with WakuService
- Return cleanup function
- Only allow registration when ready

**TODO Locations:**
```typescript
// TODO 2.6: Register message listener with WakuService
// TODO 2.7: Return unsubscribe function
```

**Expected Outcome:**
```typescript
const onMessage = useCallback((listener) => {
  if (!instanceId) return () => {};
  return wakuService.onMessage(instanceId, listener);
}, [isReady, instanceId, wakuService]);
```

**Testing:**
- Add question in Admin
- Verify Attendee receives it immediately
- Check console for listener registration logs

---

## Part 3: Testing & Verification (15 mins)

### Test Scenarios

#### 3.1 Basic Message Flow
1. Open Admin view in one tab
2. Open Attendee view in another (same instanceId)
3. Add question in Admin → Should appear in Attendee
4. Activate question → Should update in Attendee
5. Submit answer in Attendee → Should appear in Admin Results

#### 3.2 Delivery Status Tracking
1. Submit answer in Attendee
2. Watch status change: "Sending..." → "Sent" → "✓ Delivered"
3. Check DevConsole for SDS events:
   - `sending-message`
   - `message-sent`
   - `message-acknowledged`

#### 3.3 Deduplication
1. Submit answer in Attendee
2. Reload Admin page
3. Verify answer doesn't duplicate in results
4. Check console: `[Waku] Loaded X processed message IDs from storage`

#### 3.4 Multi-User Testing
1. Open 3+ Attendee tabs
2. Submit answer from one
3. Verify Admin receives exactly one answer
4. Check all Attendees see question updates

---

## Part 4: Extension Challenge (30+ mins)

### Challenge: Add Multiple Choice Questions

Extend the app to support single-choice questions instead of just text answers.

**New Message Type:**
```typescript
enum MessageType {
  // ... existing types
  MULTIPLE_CHOICE_QUESTION_ADDED = 'MULTIPLE_CHOICE_QUESTION_ADDED',
  CHOICE_SELECTED = 'CHOICE_SELECTED'
}
```

**Tasks:**
1. Update `Question` type to include optional choices array
2. Create new message types and payloads in `src/types/waku.ts`
3. Add UI in Admin to create multiple choice questions
4. Update QuestionCard to show radio buttons for choices
5. Modify answer submission to send choice index
6. Update ResultsView to show choice distribution (bar chart)

**Hints:**
- Reuse existing message flow
- Add `choices?: string[]` to Question interface
- Use Recharts BarChart for visualizing choice distribution
- Store choice index in Answer.text as `"choice:0"`, `"choice:1"`, etc.

**Bonus:**
- Add real-time vote counts (update as votes come in)
- Show percentage distribution
- Highlight most popular choice

---

## Debugging Tips

### Connection Issues
```typescript
// Check node health
console.log('Node connected:', wakuService.isConnected());

// Check channel exists
console.log('Channels:', Array.from(wakuService.channels.keys()));
```

### Message Not Received
- Verify both peers in same channel (same instanceId)
- Check content topic matches between sender/receiver
- Look for errors in `message-received` event handler
- Verify listener registered AFTER channel is ready (isReady === true)

### Duplicates Still Appearing
- Check localStorage for processed IDs: `waku_processed_[instanceId]`
- Verify `createContentMessageId()` generates consistent IDs
- Ensure deduplication check happens before state update

### Performance Issues
- Check processed IDs size: `processedMessageIds.get(instanceId).size`
- Should stay under MAX_PROCESSED_IDS (1000)
- Verify cleanup logic removes old IDs

---

## Key Takeaways

### Waku Concepts Learned
✅ **Light Node**: Efficient browser-based P2P messaging  
✅ **Reliable Channels**: Guaranteed delivery with acknowledgments  
✅ **Content Topics**: Message routing in pub/sub network  
✅ **Protobuf**: Efficient binary encoding  

### Best Practices
✅ **Singleton Pattern**: One node, many channels  
✅ **Deduplication**: Content-based message IDs  
✅ **Cleanup**: Always unsubscribe listeners  
✅ **Error Handling**: Graceful degradation  
✅ **Delivery Tracking**: User feedback with callbacks  

### Real-World Applications
- Live polls and voting
- Real-time collaboration tools
- Decentralized chat applications
- Event coordination platforms
- Peer-to-peer marketplaces

---

## Resources

- [Waku Documentation](https://docs.waku.org/)
- [Reliable Channels Guide](https://docs.waku.org/guides/reliable-channels/)
- [Protobuf.js Documentation](https://protobufjs.github.io/protobuf.js/)
- [React Hooks Best Practices](https://react.dev/reference/react)

## Next Steps

After completing this workshop:
1. Implement the multiple choice extension
2. Add user authentication (nicknames)
3. Build admin controls (delete questions, clear answers)
4. Deploy to production and test with real users
5. Explore other Waku features (Store, Filter, Light Push)

---

**Questions?** Check the main README.md for architecture details or open an issue.

Happy building with Waku! 🚀
