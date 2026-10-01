require('dotenv').config({ quiet: true });

const http = require('http');
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const connectDatabase = require('./config/db');
const loadEnv = require('./config/env');
const authenticateSocket = require('./middleware/socket-auth.middleware');
const authRoutes = require('./routes/auth.routes');
const { startPresenceMonitor } = require('./services/robot-presence');
const testRoutes = require('./routes/test.routes');

let env;
try {
  env = loadEnv();
} catch (error) {
  console.error(`AgriBot backend configuration error: ${error.message}`);
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);
const corsOptions = { origin: env.corsOrigins };
const io = new Server(httpServer, { cors: corsOptions });

// Hosting platforms (Render, Railway, Fly, Heroku) terminate HTTPS at a proxy;
// trusting it gives the real client IP for rate limiting.
app.set('trust proxy', 1);
app.disable('x-powered-by');

io.use(authenticateSocket);
io.on('connection', () => {
  console.log('Socket.IO client connected.');
});

app.use(cors(corsOptions));
// Scans carry a downscaled annotated JPEG, so allow slightly larger bodies.
app.use(express.json({ limit: '3mb' }));

app.get('/', (req, res) => res.json({ success: true, service: 'agribot-backend', health: '/api/health' }));
app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/robot', require('./routes/robot.routes')(io));
app.use((req, res) => res.status(404).json({ success: false, message: 'Endpoint not found.' }));
// Malformed JSON and oversized bodies return JSON instead of an HTML stack trace.
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || error.statusCode || 500;
  if (status >= 500) console.error('Unhandled request error:', error.message);
  const messages = { 'entity.parse.failed': 'Request body must be valid JSON.', 'entity.too.large': 'Request body is too large.' };
  const message = status >= 500 ? 'Internal server error.' : messages[error.type] || error.message;
  return res.status(status).json({ success: false, message });
});
startPresenceMonitor(io);

async function startServer() {
  try {
    await connectDatabase();
    httpServer.listen(env.port, '0.0.0.0', () => {
      console.log(`AgriBot backend started successfully on port ${env.port}${env.isProduction ? ' (production)' : ''}.`);
    });
  } catch (error) {
    console.error('AgriBot backend could not connect to MongoDB.');
    console.error(error.message);
    process.exit(1);
  }
}

// Platforms send SIGTERM on deploy/restart: stop accepting work, then exit.
function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  io.close();
  httpServer.close(async () => {
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
