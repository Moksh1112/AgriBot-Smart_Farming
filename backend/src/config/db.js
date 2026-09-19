const mongoose = require('mongoose');

async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is not configured in the environment.');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected successfully.');
}

module.exports = connectDatabase;
