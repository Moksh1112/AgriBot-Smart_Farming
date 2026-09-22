// DEVELOPMENT/TEST ONLY: simulates one AgriBot for local pipeline testing.
require('dotenv').config();

const ROBOT_DATA_URL = 'http://192.168.0.103:5000/api/robot/data';
const DEFAULT_INTERVAL_MS = 5000;

const configuredInterval = Number.parseInt(process.env.ROBOT_SIM_INTERVAL_MS, 10);
const intervalMs = Number.isFinite(configuredInterval) && configuredInterval > 0
  ? configuredInterval
  : DEFAULT_INTERVAL_MS;

let robotState = {
  soilMoisture: 48,
  temperature: 29,
  humidity: 64,
  rainfall: 0,
  latitude: 19.076,
  longitude: 72.8777,
};
let isSending = false;
let simulatorStopped = false;
let intervalId;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function vary(value, step, minimum, maximum) {
  const change = (Math.random() * 2 - 1) * step;
  return clamp(value + change, minimum, maximum);
}

function nextRobotState() {
  robotState = {
    soilMoisture: vary(robotState.soilMoisture, 1.5, 0, 100),
    temperature: vary(robotState.temperature, 0.3, -40, 60),
    humidity: vary(robotState.humidity, 1.2, 0, 100),
    rainfall: vary(robotState.rainfall, 3, 0, 100),
    latitude: vary(robotState.latitude, 0.00015, -90, 90),
    longitude: vary(robotState.longitude, 0.00015, -180, 180),
  };

  return {
    sensors: {
      soilMoisture: Number(robotState.soilMoisture.toFixed(1)),
      temperature: Number(robotState.temperature.toFixed(1)),
      humidity: Number(robotState.humidity.toFixed(1)),
      rainfall: Number(robotState.rainfall.toFixed(1)),
      ph: null,
    },
    robot: {
      status: 'online',
    },
    location: {
      latitude: Number(robotState.latitude.toFixed(6)),
      longitude: Number(robotState.longitude.toFixed(6)),
    },
  };
}

function printRobotData(data) {
  console.log('Sending robot data...');
  console.log('Soil Moisture:', `${data.sensors.soilMoisture}%`);
  console.log('Temperature:', `${data.sensors.temperature}°C`);
  console.log('Humidity:', `${data.sensors.humidity}%`);
  console.log('Rainfall:', `${data.sensors.rainfall}%`);
  console.log('Location:', `${data.location.latitude}, ${data.location.longitude}`);
}

async function sendRobotData() {
  if (simulatorStopped || isSending) return;

  isSending = true;
  const data = nextRobotState();

  try {
    const response = await fetch(ROBOT_DATA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-robot-key': process.env.ROBOT_INGEST_KEY || '',
      },
      body: JSON.stringify(data),
    });

    const responseText = await response.text();
    let responseBody;

    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }

    console.log('Status:', response.status);

    if (!response.ok) {
      console.log('Robot data request was rejected.');
    } else if (!responseBody || responseBody.success !== true) {
      console.log('Backend returned a malformed response.');
    } else {
      printRobotData(data);
    }
  } catch {
    console.log('Backend unavailable. Will retry on the next interval.');
  } finally {
    isSending = false;
  }
}

function stopSimulator() {
  if (simulatorStopped) return;

  simulatorStopped = true;
  clearInterval(intervalId);
  console.log('Robot simulator stopped');
  process.exitCode = 0;
}

if (!process.env.ROBOT_INGEST_KEY) {
  console.error('ROBOT_INGEST_KEY is not configured. Simulator cannot start.');
  process.exitCode = 1;
} else {
  console.log('Robot simulator started (DEVELOPMENT/TEST ONLY)');
  console.log(`Sending updates every ${intervalMs} ms`);

  process.on('SIGINT', stopSimulator);
  process.on('SIGTERM', stopSimulator);

  sendRobotData();
  intervalId = setInterval(sendRobotData, intervalMs);
}
