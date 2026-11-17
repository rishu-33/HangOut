import Room from '../models/Room.js';
import Message from '../models/Message.js';
import Game from '../models/Game.js';
import generateRoomId from '../utils/generateRoomId.js';
import { emitToUsers, getIO, userRoom } from '../socket.js';

const memberUserId = (member) => (member.user?._id || member.user)?.toString();

const broadcastMembers = (room) => {
  const members = room.members.map((member) =>
    typeof member.toObject === 'function' ? member.toObject() : member
  );

  emitToUsers(
    room.members.map(memberUserId),
    'members-updated',
    { roomId: room.roomId, members }
  );
};

const broadcastSystemMessage = async (room, user, content) => {
  const systemMessage = await Message.create({
    room: room._id,
    sender: user._id,
    content,
    type: 'system'
  });

  await systemMessage.populate('sender', 'username email avatar status');
  getIO()?.to(room.roomId).emit('new-message', systemMessage.toObject());
  return systemMessage;
};

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
export const createRoom = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Please provide room name and password' });
    }

    // Generate unique room ID
    let roomId;
    let roomExists = true;

    while (roomExists) {
      roomId = generateRoomId();
      const existing = await Room.findOne({ roomId });
      if (!existing) roomExists = false;
    }

    // Create room
    const room = await Room.create({
      name,
      roomId,
      password,
      creator: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    // Populate creator and members
    await room.populate('creator', 'username email avatar');
    await room.populate('members.user', 'username email avatar status');

    // Create system message
    await Message.create({
      room: room._id,
      sender: req.user._id,
      content: `${req.user.username} created the room`,
      type: 'system'
    });

    res.status(201).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during room creation' });
  }
};

// @desc    Join a room
// @route   POST /api/rooms/join
// @access  Private
export const joinRoom = async (req, res) => {
  try {
    const { roomId, password } = req.body;

    if (!roomId || !password) {
      return res.status(400).json({ message: 'Please provide room ID and password' });
    }

    // Find room with password
    const room = await Room.findOne({ roomId: roomId.toUpperCase() }).select('+password');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(403).json({ message: 'Room is no longer active' });
    }

    // Check if already a member
    const isMember = room.members.some(m => m.user.toString() === req.user._id.toString());

    if (isMember) {
      await room.populate('creator', 'username email avatar');
      await room.populate('members.user', 'username email avatar status');
      return res.json(room);
    }

    // Check max members
    if (room.members.length >= room.maxMembers) {
      return res.status(403).json({ message: 'Room is full' });
    }

    // Check password
    const isMatch = await room.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Add user to room
    room.members.push({
      user: req.user._id,
      role: 'member'
    });

    await room.save();

    // Populate fields
    await room.populate('creator', 'username email avatar');
    await room.populate('members.user', 'username email avatar status');

    broadcastMembers(room);
    await broadcastSystemMessage(room, req.user, `${req.user.username} joined the room`);

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while joining room' });
  }
};

// @desc    Get user's rooms
// @route   GET /api/rooms
// @access  Private
export const getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      'members.user': req.user._id,
      isActive: true
    })
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar status')
      .sort('-createdAt');

    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get room by ID
// @route   GET /api/rooms/:roomId
// @access  Private
export const getRoomById = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() })
      .populate('creator', 'username email avatar')
      .populate('members.user', 'username email avatar status');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is a member
    const isMember = room.members.some(m => m.user._id.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Leave room
// @route   DELETE /api/rooms/:roomId/leave
// @access  Private
export const leaveRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is a member
    const memberIndex = room.members.findIndex(m => m.user.toString() === req.user._id.toString());

    if (memberIndex === -1) {
      return res.status(403).json({ message: 'You are not a member of this room' });
    }

    // If creator is leaving and there are other members, transfer admin to oldest member
    if (room.creator.toString() === req.user._id.toString() && room.members.length > 1) {
      const newAdmin = room.members.find(m => m.user.toString() !== req.user._id.toString());
      if (newAdmin) {
        newAdmin.role = 'admin';
        room.creator = newAdmin.user;
      }
    }

    // Remove member
    room.members.splice(memberIndex, 1);

    // If no members left, deactivate room
    if (room.members.length === 0) {
      room.isActive = false;
    }

    await room.save();
    await room.populate('members.user', 'username email avatar status');

    // Notify remaining members, and the person who left so their list stays in sync
    const remainingIds = room.members.map(memberUserId);
    emitToUsers(
      [...remainingIds, req.user._id.toString()],
      'members-updated',
      {
        roomId: room.roomId,
        members: room.members.map((member) =>
          typeof member.toObject === 'function' ? member.toObject() : member
        )
      }
    );
    await broadcastSystemMessage(room, req.user, `${req.user.username} left the room`);

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Remove member from room (admin only)
// @route   DELETE /api/rooms/:roomId/members/:userId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if requester is admin
    if (!room.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    // Cannot remove creator
    if (room.creator.toString() === req.params.userId) {
      return res.status(403).json({ message: 'Cannot remove room creator' });
    }

    // Find and remove member
    const memberIndex = room.members.findIndex(m => m.user.toString() === req.params.userId);

    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in room' });
    }

    const removedUserId = room.members[memberIndex].user.toString();
    room.members.splice(memberIndex, 1);
    await room.save();
    await room.populate('members.user', 'username email avatar status');

    emitToUsers(
      [...room.members.map(memberUserId), removedUserId],
      'members-updated',
      {
        roomId: room.roomId,
        members: room.members.map((member) =>
          typeof member.toObject === 'function' ? member.toObject() : member
        )
      }
    );
    const io = getIO();
    if (io) {
      io.to(userRoom(removedUserId)).emit('room-access-revoked', {
        roomId: room.roomId
      });
      io.in(userRoom(removedUserId)).socketsLeave(room.roomId);
    }
    await broadcastSystemMessage(room, req.user, 'A member was removed from the room');

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete room (creator or admin only)
// @route   DELETE /api/rooms/:roomId
// @access  Private
export const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId.toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if requester is creator or admin
    const isCreator = room.creator.toString() === req.user._id.toString();
    const isAdmin = isCreator || room.isAdmin(req.user._id);

    if (!isAdmin) {
      return res.status(403).json({ message: 'Only the room creator or admin can delete this room' });
    }

    const roomMemberIds = room.members.map(memberUserId);
    const roomCode = room.roomId;

    // Delete all messages, games, and the room document
    await Message.deleteMany({ room: room._id });
    await Game.deleteMany({ room: room._id });
    await Room.findByIdAndDelete(room._id);

    // Broadcast room-deleted via Socket.IO
    const io = getIO();
    if (io) {
      io.in(roomCode).emit('room-deleted', {
        roomId: roomCode,
        name: room.name,
        deletedBy: req.user.username
      });
    }

    emitToUsers(roomMemberIds, 'room-deleted', {
      roomId: roomCode,
      name: room.name,
      deletedBy: req.user.username
    });

    res.json({ message: 'Room deleted successfully', roomId: roomCode });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting room' });
  }
};
