import Message from '../models/Message.js';
import Room from '../models/Room.js';
import uploadToCloudinary from '../utils/uploadToCloudinary.js';
import { getIO } from '../socket.js';

// In-memory room cache: roomId (uppercase) -> { _id, memberIds: Set }
// Avoids a DB roundtrip on every single message send
const roomCache = new Map();

async function getRoomCached(roomId) {
  const code = roomId.toUpperCase();
  if (roomCache.has(code)) return roomCache.get(code);

  const room = await Room.findOne({ roomId: code }).select('_id members').lean();
  if (!room) return null;

  const entry = {
    _id: room._id,
    memberIds: new Set(room.members.map(m => m.user.toString()))
  };
  roomCache.set(code, entry);

  // Invalidate after 60s so membership changes are picked up
  setTimeout(() => roomCache.delete(code), 60_000);
  return entry;
}

const isRoomMember = (room, userId) =>
  room.members.some((member) => member.user.toString() === userId.toString());

// @desc    Get messages for a room
// @route   GET /api/messages/:roomId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Find room and verify membership
    const room = await Room.findOne({ roomId: roomId.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(m => m.user.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Get messages
    const messages = await Message.find({ 
      room: room._id,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('sender', 'username email avatar status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar' }
      })
      .populate('reactions.user', 'username avatar');

    const total = await Message.countDocuments({ room: room._id, isDeleted: false });

    res.json({
      messages: messages.reverse(),
      total,
      hasMore: skip + messages.length < total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/messages/:roomId
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, replyTo } = req.body;

    // Use cached room to skip DB roundtrip for membership check
    const room = await getRoomCached(roomId);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (!room.memberIds.has(req.user._id.toString())) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Save to DB
    const message = await Message.create({
      room: room._id,
      sender: req.user._id,
      content,
      type: 'text',
      replyTo: replyTo || null
    });

    // ── Emit IMMEDIATELY using data already in memory (no extra DB queries) ──
    const io = getIO();
    const instantPayload = {
      _id: message._id,
      room: room._id,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
      reactions: [],
      replyTo: null, // will be updated below for the HTTP response
      sender: {
        _id: req.user._id,
        username: req.user.username,
        avatar: req.user.avatar,
        status: req.user.status
      }
    };
    if (io) {
      io.in(roomId.toUpperCase()).emit('new-message', instantPayload);
    }

    // Populate replyTo for the HTTP response (sender already in-memory above)
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar' }
      });
      instantPayload.replyTo = message.replyTo;
    }

    res.status(201).json({ ...instantPayload, sender: req.user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload file message
// @route   POST /api/messages/:roomId/upload
// @access  Private
export const uploadFile = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Find room and verify membership
    const room = await Room.findOne({ roomId: roomId.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(m => m.user.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, `hangout/${roomId}`, req.file.originalname);

    // Determine message type
    let messageType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    }

    // Create message
    const message = await Message.create({
      room: room._id,
      sender: req.user._id,
      content: req.body.content || '',
      type: messageType,
      file: {
        url: result.secure_url,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        cloudinaryId: result.public_id
      }
    });

    await message.populate('sender', 'username email avatar status');

    // Broadcast file message to room immediately
    const io = getIO();
    if (io) {
      io.in(roomId.toUpperCase()).emit('new-message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const room = await Room.findById(message.room);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    message.isDeleted = true;
    message.deletedAt = Date.now();
    await message.save();

    getIO()?.to(room.roomId).emit('message-deleted', {
      messageId: message._id.toString()
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add reaction to message
// @route   POST /api/messages/:messageId/react
// @access  Private
export const addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const room = await Room.findById(message.room);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!isRoomMember(room, req.user._id)) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction if already exists
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
      );
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        user: req.user._id
      });
    }

    await message.save();
    await message.populate('reactions.user', 'username avatar');

    getIO()?.to(room.roomId).emit('reaction-added', {
      messageId: message._id.toString(),
      reactions: message.toObject().reactions
    });

    res.json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
