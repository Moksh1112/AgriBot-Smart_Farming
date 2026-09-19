const jwt = require('jsonwebtoken');

const User = require('../models/User');

async function authenticateSocket(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token || !process.env.JWT_SECRET) {
    return next(new Error('Socket authentication failed.'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('name email createdAt');

    if (!user) {
      return next(new Error('Socket authentication failed.'));
    }

    socket.user = user;
    return next();
  } catch {
    return next(new Error('Socket authentication failed.'));
  }
}

module.exports = authenticateSocket;
