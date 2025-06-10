# Reveal Chat Server

A Node.js chat server using Socket.IO for real-time direct messaging between two users, MySQL for message persistence, and Redis for online user tracking.

## Features

- Real-time direct messaging using Socket.IO
- Message persistence in MySQL database
- User-to-user conversations
- Redis-based online user tracking
- Real-time user status updates
- RESTful API endpoints for conversations and messages
- CORS enabled for cross-origin requests

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- Redis Server
- npm or yarn

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure the database and Redis:
   - Update the database configuration in `config.js`
   - Update the Redis configuration in `config.js` if needed
   - Run the SQL schema:
```bash
mysql -u root -p < schema.sql
```

3. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## API Endpoints

- `GET /api/conversations/:userId` - Get all conversations for a user
- `GET /api/messages/:conversationId` - Get messages for a specific conversation
- `GET /api/online-users` - Get list of currently online users

## Socket.IO Events

### Client to Server
- `user_connected` - Connect a user to the chat system
- `start_conversation` - Start or resume a conversation with another user
- `send_message` - Send a message in a conversation

### Server to Client
- `conversation_started` - Notify when a conversation is started/resumed
- `receive_message` - Receive a new message
- `user_status_change` - Notify when a user's online status changes
- `error` - Receive error notifications

## Message Format

```javascript
{
    conversationId: number,
    senderId: number,
    message: string
}
```

## Conversation Format

```javascript
{
    id: number,
    user1_id: number,
    user2_id: number,
    user1_username: string,
    user2_username: string,
    last_message: string,
    last_message_time: timestamp
}
```

## User Status Format

```javascript
{
    userId: number,
    status: "online" | "offline"
}
``` 