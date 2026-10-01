const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Used by hosting platforms as the health check. Returns 503 while the
// database is disconnected so the platform can restart or hold traffic.
router.get('/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected ? 'AgriBot backend is running' : 'Database is not connected',
    service: 'backend',
    database: databaseConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
