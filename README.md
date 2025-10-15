# Decentralized Q&A Workshop

A real-time Q&A application built with Waku - demonstrating peer-to-peer messaging without centralized servers.

## 🎯 What is this?

This is a **live Q&A application** designed for workshops, conferences, and training sessions. What makes it special? It runs entirely **peer-to-peer** using the Waku network - no backend servers, no database, just direct communication between participants.

### Key Features

- **Admin Dashboard**: Create and manage questions, view responses in real-time
- **Attendee View**: Join sessions via Instance ID or QR code, submit answers
- **Real-time Sync**: All updates propagate automatically across all participants
- **Persistent Storage**: Questions and answers saved locally in browser
- **Connection Monitoring**: Live status of network connectivity
- **Developer Console**: View message delivery events in real-time

## 🏗️ Architecture Overview

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────────┐
│  Admin Device   │         │  Waku Network│         │ Attendee Device │
│                 │         │   (P2P Mesh) │         │                 │
│  - Create Q's   │◄───────►│              │◄───────►│  - View Q's     │
│  - Activate Q's │         │  Relays &    │         │  - Submit A's   │
│  - View Results │         │  Light Nodes │         │                 │
└─────────────────┘         └──────────────┘         └─────────────────┘
        │                                                      │
        └──────────────► Local Storage ◄──────────────────────┘
```

### How It Works

1. **Instance Creation**: Admin creates a unique instance ID (e.g., "YG1I32")
2. **Topic Subscription**: Both admin and attendees subscribe to `/qa-app/{instanceId}`
3. **Message Broadcasting**: Actions (new questions, activations, answers) are broadcast as messages
4. **Reliable Delivery**: Waku's reliable channel ensures messages reach all participants
5. **Local Persistence**: Browser localStorage caches data for offline resilience

## 🌐 Why Waku?

[Waku](https://waku.org) is a decentralized communication protocol designed for Web3 applications. Here's why we use it:

### Traditional Approach vs. Waku

| Traditional (Client-Server) | Waku (Peer-to-Peer) |
|----------------------------|---------------------|
| ❌ Requires backend server | ✅ No server needed |
| ❌ Single point of failure | ✅ Distributed network |
| ❌ Privacy concerns (centralized data) | ✅ Messages routed through relays |
| ❌ Scaling costs | ✅ Scales with participants |
| ❌ Setup complexity (database, hosting) | ✅ Just JavaScript |

### Key Waku Concepts

**1. Pub/Sub Messaging**
- Applications publish messages to topics (like `/qa-app/YG1I32`)
- All subscribers receive messages in real-time

**2. Reliable Channels**
- Built on top of pub/sub for guaranteed delivery
- Implements acknowledgements and retries
- Tracks message delivery status

**3. Light Node Architecture**
- Runs directly in the browser
- Connects to relay nodes for message routing
- Minimal resource usage

**4. Content Topics**
- Namespaced message routing
- Format: `/{app-name}/{version}/{instance-id}/{message-type}`
- Allows filtering and organization

## 📁 Project Structure

```
src/
├── pages/
│   ├── Index.tsx           # Home/landing page
│   ├── InstanceManager.tsx # List all instances
│   ├── Admin.tsx           # Admin dashboard
│   └── Attendee.tsx        # Attendee view
├── components/
│   ├── QuestionManager.tsx # Question creation/management UI
│   ├── QuestionCard.tsx    # Individual question display
│   ├── ResultsView.tsx     # Answer visualization (word cloud, charts)
│   ├── ConnectionStatus.tsx# Network status indicator
│   └── DevConsole.tsx      # SDS event viewer
├── hooks/
│   └── useWaku.ts          # React hook for Waku functionality
├── lib/
│   ├── waku.ts             # WakuService class (core logic)
│   └── storage.ts          # localStorage helpers
└── types/
    └── waku.ts             # TypeScript definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ & npm
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Internet connection (for Waku relay network)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:8080` to see the app.

### Quick Demo

1. **Create Instance**: Click "Create New Instance" on home page
2. **Open Admin**: Navigate to admin dashboard (auto-redirect)
3. **Add Questions**: Type questions and click "Add Question"
4. **Open Attendee**: Open new browser tab/window at `/attendee/{instanceId}` or scan QR code
5. **Activate Question**: Click "Next Question" in admin view
6. **Submit Answer**: Type answer in attendee view and submit
7. **View Results**: Switch to "Results" tab in admin dashboard

## 🔧 Technical Implementation

### Message Types

The app uses typed messages for different actions:

```typescript
enum MessageType {
  QUESTION_ADDED = 'QUESTION_ADDED',
  QUESTION_ACTIVATED = 'QUESTION_ACTIVATED',
  QUESTION_DEACTIVATED = 'QUESTION_DEACTIVATED',
  ANSWER_SUBMITTED = 'ANSWER_SUBMITTED'
}
```

### Waku Integration

**Initialization**:
```typescript
// Create Waku node
const node = await createLightNode({ defaultBootstrap: true });
await node.start();

// Create reliable channel for guaranteed delivery
const channel = new ReliableChannel(node, contentTopic);
```

**Sending Messages**:
```typescript
const messageId = await channel.sendMessage(
  utf8ToBytes(JSON.stringify(message))
);
```

**Receiving Messages**:
```typescript
channel.addEventListener('message-received', (event) => {
  const decoded = JSON.parse(bytesToUtf8(event.detail.payload));
  handleMessage(decoded);
});
```

### Delivery Status Tracking

The reliable channel emits events for message lifecycle:

- `sending-message`: Message being sent over wire
- `message-sent`: Successfully sent (not yet acknowledged)
- `message-possibly-acknowledged`: Bloom filter indicates likely receipt
- `message-acknowledged`: Fully acknowledged by recipients
- `sending-message-irrecoverable-error`: Permanent send failure
- `irretrievable-message`: Missing message can't be retrieved

These are visualized in the Developer Console (bottom panel).

## 🎓 Workshop Learning Objectives

By building/exploring this application, attendees will learn:

### 1. **Decentralized Architecture**
   - How P2P networks eliminate server dependencies
   - Trade-offs between centralized and decentralized systems

### 2. **Waku Protocol**
   - Pub/sub messaging patterns
   - Reliable message delivery
   - Content topic routing

### 3. **React Best Practices**
   - Custom hooks for complex logic
   - State management without external libraries
   - Component composition patterns

### 4. **Real-time Communication**
   - Event-driven architecture
   - Handling asynchronous message delivery
   - Local state synchronization

### 5. **Browser Storage**
   - localStorage for persistence
   - Data serialization/deserialization
   - Offline-first patterns

## 🔍 Key Code Sections to Explore

### 1. Waku Service (`src/lib/waku.ts`)
The core integration with Waku - initialization, message sending/receiving, channel management.

### 2. useWaku Hook (`src/hooks/useWaku.ts`)
React hook that wraps WakuService for easy component integration.

### 3. Admin Page (`src/pages/Admin.tsx`)
State management for questions, broadcasting updates, handling incoming answers.

### 4. Attendee Page (`src/pages/Attendee.tsx`)
Subscribing to questions, submitting answers with delivery tracking.

### 5. DevConsole (`src/components/DevConsole.tsx`)
Real-time visualization of Waku network events.

## 🛠️ Extending the App

### Ideas for Workshop Exercises

1. **Add Multiple Choice Questions**
   - Modify question type to support options
   - Update UI to show radio buttons
   - Aggregate results by option

2. **Implement Live Polls**
   - Add countdown timer
   - Show real-time vote counts
   - Auto-close after time expires

3. **Add User Identities**
   - Generate anonymous IDs for attendees
   - Track participation rates
   - Show "who answered" (anonymously)

4. **Export Results**
   - Add CSV/JSON export
   - Generate PDF reports
   - Email results to admin

5. **Enhanced Visualizations**
   - Sentiment analysis of answers
   - Time-series charts of response rates
   - Geographic distribution (if location shared)

## 📚 Resources

### Waku Documentation
- [Waku Official Docs](https://docs.waku.org/)
- [JavaScript SDK](https://docs.waku.org/guides/js-waku/)
- [Reliable Channel Guide](https://docs.waku.org/guides/reliable-channel/)

### Technologies Used
- **Waku SDK**: `@waku/sdk` - Decentralized messaging
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI components
- **React Router**: Navigation
- **Recharts**: Data visualization
- **React WordCloud**: Word cloud visualization

## 🐛 Troubleshooting

### Connection Issues
- **Symptom**: Red "Disconnected" status
- **Solution**: Check internet connection, firewall settings. Waku needs access to relay nodes.

### Messages Not Syncing
- **Symptom**: Changes in admin not appearing in attendee view
- **Solution**: Ensure both are on same instance ID. Check DevConsole for delivery events.

### Local Storage Full
- **Symptom**: Can't create new instances
- **Solution**: Clear browser storage or delete old instances via Instance Manager.

### Performance Issues
- **Symptom**: Slow message delivery
- **Solution**: Close unused tabs. Light nodes use browser resources.

## 🤝 Contributing

This is a workshop project! Feel free to:
- Fork and experiment
- Add new features
- Improve documentation
- Share workshop experiences

## 📄 License

MIT License - See LICENSE file for details

## 🙋 Support

- Issues: [GitHub Issues](YOUR_REPO_ISSUES_URL)
- Discussions: [GitHub Discussions](YOUR_REPO_DISCUSSIONS_URL)
- Waku Community: [Discord](https://discord.waku.org/)

---

**Built with ❤️ for decentralized communication workshops**
