// Validates configuration once at startup so a misconfigured host fails fast
// with a clear message instead of failing on the first request.
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET', 'ROBOT_INGEST_KEY'];

function parseOrigins(value) {
  if (!value || value.trim() === '*') return '*';
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

function loadEnv() {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  if (isProduction && process.env.ROBOT_INGEST_KEY.length < 24) {
    throw new Error('ROBOT_INGEST_KEY must be at least 24 characters in production.');
  }
  return {
    isProduction,
    port: Number.parseInt(process.env.PORT, 10) || 5000,
    corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  };
}

module.exports = loadEnv;
