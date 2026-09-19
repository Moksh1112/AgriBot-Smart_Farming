const mongoose = require('mongoose');

const robotDataSchema = new mongoose.Schema(
  {
    sensors: {
      soilMoisture: {
        type: Number,
        required: true,
      },
      temperature: {
        type: Number,
        required: true,
      },
      humidity: {
        type: Number,
        required: true,
      },
    },
    robot: {
      status: {
        type: String,
        required: true,
        trim: true,
      },
      lastUpdated: {
        type: Date,
        required: true,
      },
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('RobotData', robotDataSchema);
