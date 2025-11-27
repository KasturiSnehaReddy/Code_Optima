const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const secret = process.env.JWT_SECRET || "secret-123";

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header or body
    const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, secret);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

module.exports = authMiddleware;
