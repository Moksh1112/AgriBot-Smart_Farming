const crypto = require('crypto');

function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authenticateRobot(req, res, next) {
  const expectedKey = process.env.ROBOT_INGEST_KEY;
  const providedKey = req.headers['x-robot-key'];

  if (!expectedKey) {
    console.error('Robot ingestion authentication is not configured on the server.');
    return res.status(500).json({
      success: false,
      message: 'Robot ingestion authentication is not configured.',
    });
  }

  if (typeof providedKey !== 'string' || !safeEqual(providedKey, expectedKey)) {
    return res.status(401).json({
      success: false,
      message: 'Robot authentication failed.',
    });
  }

  return next();
}

module.exports = authenticateRobot;
