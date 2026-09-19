require('dotenv').config();

const http = require('http');
const cors = require('cors');
const express = require('express');
const { Server } = require('socket.io');

const connectDatabase = require('./config/db');
const authenticateSocket = require('./middleware/socket-auth.middleware');
const authRoutes = require('./routes/auth.routes');
const testRoutes = require('./routes/test.routes');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});
const port = process.env.PORT || 5000;

io.use(authenticateSocket);
io.on('connection', () => {
  console.log('Socket.IO client connected.');
});

app.use(cors());
app.use(express.json());

app.use('/api', testRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/robot', require('./routes/robot.routes')(io));

async function startServer() {
  try {
    await connectDatabase();

    httpServer.listen(port, () => {
      console.log(`AgriBot backend started successfully on port ${port}.`);
    });
  } catch (error) {
    console.error('AgriBot backend could not connect to MongoDB.');
    console.error(error.message);
    process.exitCode = 1;
  }
}

startServer();
