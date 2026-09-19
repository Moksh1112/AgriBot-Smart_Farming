const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AgriBot backend is running',
    service: 'backend',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
