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

  if (typeof providedKey !== 'string' || providedKey !== expectedKey) {
    return res.status(401).json({
      success: false,
      message: 'Robot authentication failed.',
    });
  }

  return next();
}

module.exports = authenticateRobot;
