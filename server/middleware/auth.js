
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  try {
    // Check for the Bearer token in the authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      // Extract token
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user using the ID stored in the token
      req.user = await User.findById(decoded.id);

      // Check whether the user exists
      if (!req.user) {
        return res.status(401).json({
          message: 'Not authorized, user not found'
        });
      }

      // Allow request to continue
      return next();
    }

    // No token provided
    return res.status(401).json({
      message: 'Not authorized, no token'
    });

  } catch (error) {
    console.error('Authentication error:', error.message);

    return res.status(401).json({
      message: 'Not authorized, token failed'
    });
  }
};
