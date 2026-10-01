const express = require('express');

const authenticateToken = require('../middleware/auth.middleware');
const authenticateRobot = require('../middleware/robot-auth.middleware');
const Detection = require('../models/Detection');
const RobotData = require('../models/RobotData');
const presence = require('../services/robot-presence');

const HISTORY_RANGES = { hour: 3600e3, day: 86400e3, week: 7 * 86400e3 };
const MAX_IMAGE_LENGTH = 1.5 * 1024 * 1024;

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
  if (!isNumber(sensors?.rainfall)) return 'sensors.rainfall must be a number.';
  if (sensors?.ph !== null && sensors?.ph !== undefined && !isNumber(sensors.ph)) return 'sensors.ph must be a number or null.';
  if (typeof robot?.status !== 'string' || !robot.status.trim()) return 'robot.status is required.';
  if (!isNumber(location?.latitude)) return 'location.latitude must be a number.';
  if (!isNumber(location?.longitude)) return 'location.longitude must be a number.';

  return null;
}

function validateDetection(body) {
  const summary = body?.summary;
  if (!['healthy', 'disease', 'none'].includes(summary?.status)) return 'summary.status must be healthy, disease or none.';
  if (typeof summary?.label !== 'string') return 'summary.label is required.';
  if (!isNumber(summary?.confidence)) return 'summary.confidence must be a number.';
  if (!Array.isArray(body.detections)) return 'detections must be an array.';
  for (const item of body.detections) {
    if (typeof item?.label !== 'string' || !isNumber(item?.confidence)) return 'Each detection needs a label and confidence.';
    if (!Array.isArray(item.box) || item.box.length !== 4 || !item.box.every(isNumber)) return 'Each detection box must be [x1, y1, x2, y2].';
  }
  if (body.image != null) {
    if (typeof body.image !== 'string' || !body.image.startsWith('data:image/jpeg;base64,')) return 'image must be a JPEG data URI.';
    if (body.image.length > MAX_IMAGE_LENGTH) return 'image is too large.';
  }
  return null;
}

const HISTORY_BUCKETS = 48;
const HISTORY_FIELDS = ['soilMoisture', 'temperature', 'humidity', 'rainfall', 'ph'];

// Averages readings into fixed time buckets so charts stay light for any range.
function bucketReadings(readings, since, spanMs) {
  const size = spanMs / HISTORY_BUCKETS;
  const buckets = new Map();
  for (const reading of readings) {
    const index = Math.min(HISTORY_BUCKETS - 1, Math.floor((reading.createdAt - since) / size));
    const bucket = buckets.get(index) ?? { count: 0, sums: {}, counts: {} };
    bucket.count += 1;
    for (const field of HISTORY_FIELDS) {
      const value = reading.sensors[field];
      if (isNumber(value)) {
        bucket.sums[field] = (bucket.sums[field] ?? 0) + value;
        bucket.counts[field] = (bucket.counts[field] ?? 0) + 1;
      }
    }
    buckets.set(index, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, bucket]) => {
      const point = { at: new Date(since.getTime() + (index + 0.5) * size).toISOString(), samples: bucket.count };
      for (const field of HISTORY_FIELDS) {
        point[field] = bucket.counts[field] ? Math.round((bucket.sums[field] / bucket.counts[field]) * 10) / 10 : null;
      }
      return point;
    });
}

function dashboardData(robotData) {
  return {
    sensors: {
      soilMoisture: robotData.sensors.soilMoisture,
      temperature: robotData.sensors.temperature,
      humidity: robotData.sensors.humidity,
      rainfall: robotData.sensors.rainfall,
      ph: robotData.sensors.ph,
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

function detectionData(detection, includeImage = true) {
  return {
    id: detection._id.toString(),
    summary: detection.summary,
    detections: detection.detections,
    width: detection.width,
    height: detection.height,
    inferenceMs: detection.inferenceMs,
    source: detection.source,
    createdAt: detection.createdAt,
    ...(includeImage ? { image: detection.image } : {}),
  };
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

module.exports = function createRobotRoutes(io) {
  const router = express.Router();

  // ---------------------------------------------------------------- robot ->
  router.post('/data', authenticateRobot, async (req, res) => {
    const validationError = validateRobotData(req.body);
    if (validationError) return sendError(res, 400, validationError);

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
      return sendError(res, 500, 'Could not store robot data.');
    }
  });

  // The Pi calls this every few seconds; the response carries queued app commands.
  router.post('/heartbeat', authenticateRobot, (req, res) => {
    const commands = presence.recordHeartbeat(io, req.body);
    return res.json({ success: true, commands });
  });

  router.post('/detections', authenticateRobot, async (req, res) => {
    const validationError = validateDetection(req.body);
    if (validationError) return sendError(res, 400, validationError);

    try {
      const detection = await Detection.create({
        summary: req.body.summary,
        detections: req.body.detections,
        width: req.body.width,
        height: req.body.height,
        inferenceMs: req.body.inferenceMs,
        source: req.body.source,
        image: req.body.image ?? null,
      });
      const data = detectionData(detection);
      io.emit('robot:detection', data);
      return res.status(201).json({ success: true, data: { id: data.id } });
    } catch (error) {
      console.error('Detection storage error:', error.message);
      return sendError(res, 500, 'Could not store detection.');
    }
  });

  router.post('/commands/:id/result', authenticateRobot, (req, res) => {
    io.emit('robot:command', {
      id: req.params.id,
      ok: req.body?.ok === true,
      message: typeof req.body?.message === 'string' ? req.body.message : null,
    });
    return res.json({ success: true });
  });

  // ---------------------------------------------------------------- farmer ->
  router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
      const latestRobotData = await RobotData.findOne().sort({ createdAt: -1 });
      if (!latestRobotData) return sendError(res, 404, 'No robot data available');
      return res.json({ success: true, data: dashboardData(latestRobotData) });
    } catch (error) {
      console.error('Robot dashboard query error:', error.message);
      return sendError(res, 500, 'Could not retrieve robot dashboard data.');
    }
  });

  router.get('/history', authenticateToken, async (req, res) => {
    const range = HISTORY_RANGES[req.query.range] ? req.query.range : 'day';
    try {
      const since = new Date(Date.now() - HISTORY_RANGES[range]);
      const readings = await RobotData.find({ createdAt: { $gte: since } })
        .sort({ createdAt: 1 })
        .select('sensors createdAt')
        .lean();
      return res.json({ success: true, data: { range, readings: bucketReadings(readings, since, HISTORY_RANGES[range]) } });
    } catch (error) {
      console.error('Robot history query error:', error.message);
      return sendError(res, 500, 'Could not retrieve reading history.');
    }
  });

  router.get('/status', authenticateToken, (req, res) => res.json({ success: true, data: presence.status() }));

  router.post('/commands', authenticateToken, (req, res) => {
    try {
      const command = presence.enqueueCommand(io, req.body?.type);
      return res.status(202).json({ success: true, data: command });
    } catch (error) {
      return sendError(res, error.status || 500, error.message);
    }
  });

  router.get('/detections', authenticateToken, async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 12, 1), 50);
    try {
      const detections = await Detection.find().sort({ createdAt: -1 }).limit(limit).select('-image');
      return res.json({ success: true, data: detections.map((item) => detectionData(item, false)) });
    } catch (error) {
      console.error('Detection list error:', error.message);
      return sendError(res, 500, 'Could not retrieve scans.');
    }
  });

  router.get('/detections/latest', authenticateToken, async (req, res) => {
    try {
      const detection = await Detection.findOne().sort({ createdAt: -1 });
      return res.json({ success: true, data: detection ? detectionData(detection) : null });
    } catch (error) {
      console.error('Latest detection error:', error.message);
      return sendError(res, 500, 'Could not retrieve the latest scan.');
    }
  });

  router.get('/detections/:id', authenticateToken, async (req, res) => {
    try {
      const detection = await Detection.findById(req.params.id);
      if (!detection) return sendError(res, 404, 'Scan not found.');
      return res.json({ success: true, data: detectionData(detection) });
    } catch (error) {
      if (error.name === 'CastError') return sendError(res, 404, 'Scan not found.');
      console.error('Detection lookup error:', error.message);
      return sendError(res, 500, 'Could not retrieve the scan.');
    }
  });

  return router;
};
