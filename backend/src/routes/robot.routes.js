const express = require('express');

const authenticateToken = require('../middleware/auth.middleware');
const authenticateRobot = require('../middleware/robot-auth.middleware');
const RobotData = require('../models/RobotData');

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateRobotData(body) {
  const sensors = body?.sensors;
  const robot = body?.robot;
  const location = body?.location;

  if (!isNumber(sensors?.soilMoisture)) return 'sensors.soilMoisture must be a number.';
  if (!isNumber(sensors?.temperature)) return 'sensors.temperature must be a number.';
  if (!isNumber(sensors?.humidity)) return 'sensors.humidity must be a number.';
  if (typeof robot?.status !== 'string' || !robot.status.trim()) return 'robot.status is required.';
  if (!isNumber(location?.latitude)) return 'location.latitude must be a number.';
  if (!isNumber(location?.longitude)) return 'location.longitude must be a number.';

  return null;
}

function dashboardData(robotData) {
  return {
    sensors: {
      soilMoisture: robotData.sensors.soilMoisture,
      temperature: robotData.sensors.temperature,
      humidity: robotData.sensors.humidity,
    },
    robot: {
      status: robotData.robot.status,
      lastUpdated: robotData.robot.lastUpdated,
    },
    location: {
      latitude: robotData.location.latitude,
      longitude: robotData.location.longitude,
    },
  };
}

module.exports = function createRobotRoutes(io) {
  const router = express.Router();

  router.post('/data', authenticateRobot, async (req, res) => {
  // Hardware authentication and ingestion security will be defined before real deployment.
  const validationError = validateRobotData(req.body);

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError,
    });
  }

  try {
    const robotData = await RobotData.create({
      sensors: req.body.sensors,
      robot: {
        status: req.body.robot.status.trim(),
        lastUpdated: new Date(),
      },
      location: req.body.location,
    });
    const data = dashboardData(robotData);

    io.emit('robot:data', data);

    return res.status(201).json({
      success: true,
      message: 'Robot data stored successfully.',
      data,
    });
  } catch (error) {
    console.error('Robot data storage error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not store robot data.',
    });
  }
  });

  router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const latestRobotData = await RobotData.findOne().sort({ createdAt: -1 });

    if (!latestRobotData) {
      return res.status(404).json({
        success: false,
        message: 'No robot data available',
      });
    }

    return res.json({
      success: true,
      data: dashboardData(latestRobotData),
    });
  } catch (error) {
    console.error('Robot dashboard query error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Could not retrieve robot dashboard data.',
    });
  }
  });

  return router;
};
