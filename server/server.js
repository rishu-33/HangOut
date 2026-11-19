import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import User from './models/User.js';
import Room from './models/Room.js';
import jwt from 'jsonwebtoken';
import { setIO, userRoom } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to database


const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true
    },
    perMessageDeflate: false
});
setIO(io);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/games', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.username = user.username;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Store active users and their rooms
const activeUsers = new Map(); // userId -> { socketId, rooms: Set() }
const roomTyping = new Map(); // roomId -> Set of userIds
const voiceRooms = new Map(); // roomCode -> Map(userId -> { username, avatar, isMuted, socketId })

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.username} (${socket.userId})`);

  // Personal channel so membership updates arrive even from the rooms list
  socket.join(userRoom(socket.userId));

  // Store active user
  activeUsers.set(socket.userId, {
    socketId: socket.id,
    rooms: new Set()
  });

  // Update user status to online
  User.findByIdAndUpdate(socket.userId, { 
    status: 'online',
    lastSeen: Date.now()
  }).exec();

  const roomCode = (roomId) => String(roomId || '').toUpperCase();

  // Join room
  socket.on('join-room', async (roomId) => {
    const code = roomCode(roomId);
    if (!code) return;

    try {
      const room = await Room.findOne({ roomId: code, isActive: true });
      const isMember = room?.members.some(
        (member) => member.user.toString() === socket.userId
      );
      if (!isMember) {
        socket.emit('room-access-denied', { roomId: code });
        return;
      }
    } catch (error) {
      console.error('Failed to authorize socket room join:', error);
      socket.emit('room-access-denied', { roomId: code });
      return;
    }

    const userData = activeUsers.get(socket.userId);
    const alreadyInRoom = userData?.rooms.has(code);

    socket.join(code);
    
    if (userData) {
      userData.rooms.add(code);
    }

    if (!alreadyInRoom) {
      socket.to(code).emit('user-joined', {
        userId: socket.userId,
        username: socket.username
      });
    }

    // Send current online users in room to ALL clients in the room
    // so every member's sidebar stays up-to-date
    const onlineUsersInRoom = [];
    for (const [userId, data] of activeUsers.entries()) {
      if (data.rooms.has(code)) {
        onlineUsersInRoom.push(userId);
      }
    }

    // Broadcast to entire room so everyone gets the updated online list
    io.in(code).emit('room-users', onlineUsersInRoom);
  });

  // Leave room
  socket.on('leave-room', (roomId) => {
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;

    socket.leave(code);
    
    const userData = activeUsers.get(socket.userId);
    if (userData) {
      userData.rooms.delete(code);
    }

    socket.to(code).emit('user-left', {
      userId: socket.userId,
      username: socket.username
    });

    // Broadcast updated online list to remaining members
    const onlineUsersInRoom = [];
    for (const [userId, data] of activeUsers.entries()) {
      if (data.rooms.has(code)) {
        onlineUsersInRoom.push(userId);
      }
    }
    io.in(code).emit('room-users', onlineUsersInRoom);
  });

  // New message
  socket.on('send-message', (data) => {
    if (!data) return;
    const { roomId, message } = data;
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;
    socket.to(code).emit('new-message', message);
  });

  // Typing indicator
  socket.on('typing-start', (roomId) => {
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;

    if (!roomTyping.has(code)) {
      roomTyping.set(code, new Set());
    }
    
    roomTyping.get(code).add(socket.userId);
    
    socket.to(code).emit('user-typing', {
      userId: socket.userId,
      username: socket.username
    });
  });

  socket.on('typing-stop', (roomId) => {
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;

    if (roomTyping.has(code)) {
      roomTyping.get(code).delete(socket.userId);
    }
    
    socket.to(code).emit('user-stop-typing', {
      userId: socket.userId,
      username: socket.username
    });
  });

  // Message deleted — server controller is the source of truth.
  // Keep this for older clients, but always target the public room code.
  socket.on('delete-message', (data) => {
    if (!data) return;
    const { roomId, messageId } = data;
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;
    io.in(code).emit('message-deleted', { messageId });
  });

  // Message reaction — server controller broadcasts the saved reactions.
  // This remains so a client emit still lands in the room people actually joined.
  socket.on('message-reaction', (data) => {
    if (!data) return;
    const { roomId, messageId, reactions } = data;
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;
    io.in(code).emit('reaction-added', { messageId, reactions });
  });

  // Game events
  socket.on('game-created', (data) => {
    if (!data) return;
    const { roomId, game } = data;
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;
    socket.to(code).emit('new-game', game);
  });

  socket.on('game-updated', (data) => {
    if (!data) return;
    const { roomId, game } = data;
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;
    socket.to(code).emit('game-update', game);
  });

  socket.on('player-joined-game', (data) => {
    if (!data) return;
    const { roomId, game } = data;
    const code = roomCode(roomId);
    if (!socket.rooms.has(code)) return;
    socket.to(code).emit('game-update', game);
  });

  // ─── Voice Chat Signaling ───────────────────────────────────

  // Join voice channel
  socket.on('voice-join', ({ roomId }) => {
    const code = roomCode(roomId);
    if (!code) return;

    // Make sure this socket is in the chat room before voice events are broadcast.
    socket.join(code);
    const chatUser = activeUsers.get(socket.userId);
    if (chatUser) chatUser.rooms.add(code);

    if (!voiceRooms.has(code)) {
      voiceRooms.set(code, new Map());
    }

    const room = voiceRooms.get(code);
    const isFirstUser = room.size === 0;

    room.set(socket.userId, {
      username: socket.username,
      avatar: null,
      isMuted: false,
      socketId: socket.id
    });

    // Send current participants to the joining user
    const participantsList = [];
    room.forEach((data, id) => {
      participantsList.push({
        userId: id,
        username: data.username,
        avatar: data.avatar,
        isMuted: data.isMuted
      });
    });
    socket.emit('voice-participants', participantsList);

    // Notify everyone else in the room
    socket.to(code).emit('voice-user-joined', {
      userId: socket.userId,
      username: socket.username,
      avatar: null
    });

    // Voice call notification: first user starts the call, others update the count
    if (isFirstUser) {
      // Broadcast "voice call started" to everyone in the chat room (not just voice)
      socket.to(code).emit('voice-call-started', {
        userId: socket.userId,
        username: socket.username,
        participantCount: room.size
      });
    } else {
      // Update participant count for the existing card
      io.in(code).emit('voice-call-update', {
        participantCount: room.size
      });
    }

    console.log(`🎙️ ${socket.username} joined voice in ${code} (${room.size} users)`);
  });

  // Leave voice channel
  socket.on('voice-leave', ({ roomId }) => {
    const code = roomCode(roomId);
    if (!code) return;

    const room = voiceRooms.get(code);
    if (!room?.has(socket.userId)) return;

    room.delete(socket.userId);
    if (room.size === 0) {
      voiceRooms.delete(code);
      io.in(code).emit('voice-call-ended', {});
    } else {
      io.in(code).emit('voice-call-update', {
        participantCount: room.size
      });
    }

    socket.to(code).emit('voice-user-left', {
      userId: socket.userId,
      username: socket.username
    });

    console.log(`🔇 ${socket.username} left voice in ${code}`);
  });

  // WebRTC Offer
  socket.on('voice-offer', ({ roomId, targetUserId, offer }) => {
    const code = roomCode(roomId);
    const room = voiceRooms.get(code);
    const target = room?.get(targetUserId);
    if (room?.has(socket.userId) && target) {
      io.to(target.socketId).emit('voice-offer', {
        fromUserId: socket.userId,
        fromUsername: socket.username,
        offer
      });
    }
  });

  // WebRTC Answer
  socket.on('voice-answer', ({ roomId, targetUserId, answer }) => {
    const code = roomCode(roomId);
    const room = voiceRooms.get(code);
    const target = room?.get(targetUserId);
    if (room?.has(socket.userId) && target) {
      io.to(target.socketId).emit('voice-answer', {
        fromUserId: socket.userId,
        answer
      });
    }
  });

  // ICE Candidate
  socket.on('voice-ice-candidate', ({ roomId, targetUserId, candidate }) => {
    const code = roomCode(roomId);
    const room = voiceRooms.get(code);
    const target = room?.get(targetUserId);
    if (room?.has(socket.userId) && target) {
      io.to(target.socketId).emit('voice-ice-candidate', {
        fromUserId: socket.userId,
        candidate
      });
    }
  });

  // Mute toggle
  socket.on('voice-mute-toggle', ({ roomId, isMuted }) => {
    const code = roomCode(roomId);
    if (!code) return;

    const room = voiceRooms.get(code);
    if (!room?.has(socket.userId)) return;
    room.get(socket.userId).isMuted = isMuted;

    socket.to(code).emit('voice-mute-toggle', {
      userId: socket.userId,
      isMuted
    });
  });

  // ─── End Voice Chat ─────────────────────────────────────────

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.username}`);

    const userData = activeUsers.get(socket.userId);
    if (userData) {
      // Notify all rooms user was in
      userData.rooms.forEach(rid => {
        socket.to(rid).emit('user-left', {
          userId: socket.userId,
          username: socket.username
        });

        // Remove from typing indicators
        if (roomTyping.has(rid)) {
          roomTyping.get(rid).delete(socket.userId);
        }

        // Remove from voice chat in this room
        const voiceRoom = voiceRooms.get(rid);
        if (voiceRoom && voiceRoom.has(socket.userId)) {
          voiceRoom.delete(socket.userId);
          if (voiceRoom.size === 0) {
            voiceRooms.delete(rid);
            // Last person disconnected — notify chat room the call ended
            io.in(rid).emit('voice-call-ended', {});
          } else {
            // Update participant count
            io.in(rid).emit('voice-call-update', {
              participantCount: voiceRoom.size
            });
          }

          // Notify remaining voice users
          socket.to(rid).emit('voice-user-left', {
            userId: socket.userId,
            username: socket.username
          });
        }

        // Broadcast updated online list to remaining room members
        const onlineUsersInRoom = [];
        for (const [uid, udata] of activeUsers.entries()) {
          if (uid === socket.userId) continue; // skip the disconnecting user
          if (udata.rooms.has(rid)) {
            onlineUsersInRoom.push(uid);
          }
        }
        io.in(rid).emit('room-users', onlineUsersInRoom);
      });
    }

    activeUsers.delete(socket.userId);

    // Update user status to offline
    User.findByIdAndUpdate(socket.userId, { 
      status: 'offline',
      lastSeen: Date.now()
    }).exec();
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
// Start server only after MongoDB connects
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();