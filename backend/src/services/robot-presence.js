const crypto = require('crypto');

// In-memory robot presence and command queue. A single AgriBot is assumed,
// matching the rest of the prototype. Commands are short-lived by design.
const ONLINE_WINDOW_MS = 15000;
const COMMAND_TTL_MS = 60000;
const COMMAND_TYPES = new Set(['scan', 'publish']);

let lastSeenAt = 0;
let info = null;
let pending = [];
let lastBroadcast = '';

function isOnline() {
  return Date.now() - lastSeenAt < ONLINE_WINDOW_MS;
}

function status() {
  return {
    online: isOnline(),
    lastSeenAt: lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
    info,
    pendingCommands: pending.map(({ id, type }) => ({ id, type })),
  };
}

function broadcastIfChanged(io) {
  const snapshot = status();
  // Ignore lastSeenAt so we only emit when something meaningful changes.
  const key = JSON.stringify({ ...snapshot, lastSeenAt: undefined });
  if (key !== lastBroadcast) {
    lastBroadcast = key;
    io.emit('robot:status', snapshot);
  }
}

function recordHeartbeat(io, payload) {
  lastSeenAt = Date.now();
  info = payload && typeof payload === 'object' ? payload : null;
  const now = Date.now();
  const deliver = pending.filter((command) => now - command.createdAt < COMMAND_TTL_MS);
  pending = [];
  broadcastIfChanged(io);
  return deliver.map(({ id, type }) => ({ id, type }));
}

function enqueueCommand(io, type) {
  if (!COMMAND_TYPES.has(type)) {
    const error = new Error(`Unknown command. Use one of: ${[...COMMAND_TYPES].join(', ')}.`);
    error.status = 400;
    throw error;
  }
  if (!isOnline()) {
    const error = new Error('AgriBot is offline. Check that the Pi is powered and connected to the network.');
    error.status = 409;
    throw error;
  }
  const existing = pending.find((command) => command.type === type);
  if (existing) return { id: existing.id, type };
  const command = { id: crypto.randomUUID(), type, createdAt: Date.now() };
  pending.push(command);
  broadcastIfChanged(io);
  return { id: command.id, type };
}

function startPresenceMonitor(io) {
  // Emits the offline transition when heartbeats stop arriving.
  return setInterval(() => broadcastIfChanged(io), 5000).unref();
}

module.exports = { status, recordHeartbeat, enqueueCommand, startPresenceMonitor };
