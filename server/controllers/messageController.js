import Message from '../models/Message.js';
import Room from '../models/Room.js';
import uploadToCloudinary from '../utils/uploadToCloudinary.js';
import { getIO } from '../socket.js';

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

    // Find room and verify membership
    const room = await Room.findOne({ roomId: roomId.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const isMember = room.members.some(m => m.user.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // Create message
    const message = await Message.create({
      room: room._id,
      sender: req.user._id,
      content,
      type: 'text',
      replyTo: replyTo || null
    });

    await message.populate('sender', 'username email avatar status');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar' }
      });
    }

    res.status(201).json(message);
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
