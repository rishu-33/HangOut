
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a room name'],
    trim: true,
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },

  roomId: {
    type: String,
    required: [true, 'Please provide a room ID'],
    unique: true,
    uppercase: true,
    trim: true
  },

  password: {
    type: String,
    required: [true, 'Please provide a room password'],
    select: false
  },

  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      joinedAt: {
        type: Date,
        default: Date.now
      },
      role: {
        type: String,
        enum: ['admin', 'member'],
        default: 'member'
      }
    }
  ],

  maxMembers: {
    type: Number,
    default: 50,
    min: 1
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash room password before saving
roomSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with stored hash
roomSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Check whether a user is an admin
roomSchema.methods.isAdmin = function (userId) {
  const member = this.members.find(
    (m) => m.user && m.user.toString() === userId.toString()
  );

  return member?.role === 'admin';
};

const Room = mongoose.model('Room', roomSchema);

export default Room;
