
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import uploadToCloudinary from '../utils/uploadToCloudinary.js';
import { getIO, userRoom } from '../socket.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const username =
      typeof req.body.username === 'string'
        ? req.body.username.trim()
        : '';

    const email =
      typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password = req.body.password;

    if (!username || !email || typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: 'Username, email and password are required'
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        message: 'Username must be between 3 and 30 characters'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    const userExists = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (userExists) {
      return res.status(400).json({
        message:
          userExists.email === email
            ? 'Email already registered'
            : 'Username already taken'
      });
    }

    const user = await User.create({
      username,
      email,
      password
    });

    return res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: error.keyPattern?.email
          ? 'Email already registered'
          : 'Username already taken'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: 'Server error during registration'
    });
  }
};


// @desc    Authenticate user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const email =
      typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';

    const password = req.body.password;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    user.status = 'online';
    user.lastSeen = new Date();

    await user.save();

    return res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status,
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Server error during login'
    });
  }
};


// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    return res.json(user);

  } catch (error) {
    console.error('Get user error:', error);

    return res.status(500).json({
      message: 'Server error'
    });
  }
};


// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    const username =
      typeof req.body.username === 'string'
        ? req.body.username.trim()
        : '';

    if (username && username !== user.username) {
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({
          message: 'Username must be between 3 and 30 characters'
        });
      }

      const usernameExists = await User.findOne({
        username,
        _id: { $ne: user._id }
      });

      if (usernameExists) {
        return res.status(400).json({
          message: 'Username already taken'
        });
      }

      user.username = username;
    }

    if (req.file) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        'hangout/avatars',
        req.file.originalname
      );

      if (!result?.secure_url) {
        return res.status(500).json({
          message: 'Avatar upload failed'
        });
      }

      user.avatar = result.secure_url;

    } else if (
      req.body.removeAvatar === 'true' ||
      req.body.removeAvatar === true
    ) {
      user.avatar = null;
    }

    await user.save();

    const profile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      status: user.status
    };

    const io = getIO();

    if (io) {
      const sockets = await io
        .in(userRoom(user._id.toString()))
        .fetchSockets();

      sockets.forEach((socket) => {
        socket.username = user.username;
      });

      io.emit('profile-updated', {
        userId: user._id.toString(),
        username: user.username,
        avatar: user.avatar
      });
    }

    return res.json(profile);

  } catch (error) {
    console.error('Profile update error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Username already taken'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message
      });
    }

    return res.status(500).json({
      message: 'Server error'
    });
  }
};
