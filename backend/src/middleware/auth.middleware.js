const jwt = require('jsonwebtoken');

const User = require('../models/User');

async function authenticateToken(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization token is required.',
    });
  }

  const token = authorizationHeader.slice(7);

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured in the environment.');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('name email createdAt');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account was not found.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is invalid.',
      });
    }

    console.error('Authentication middleware error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication could not be completed.',
    });
  }
}

module.exports = authenticateToken;
