const mongoose = require('mongoose');

// One crop-disease scan from the robot camera, produced by the Pi's YOLO model.
const detectionSchema = new mongoose.Schema(
  {
    summary: {
      status: { type: String, enum: ['healthy', 'disease', 'none'], required: true },
      label: { type: String, required: true },
      confidence: { type: Number, required: true },
    },
    detections: [
      {
        _id: false,
        classId: Number,
        label: String,
        confidence: Number,
        box: [Number],
      },
    ],
    width: Number,
    height: Number,
    inferenceMs: Number,
    source: { type: String, default: 'camera' },
    // Annotated JPEG as a data URI (downscaled by the Pi to ~800px).
    image: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Detection', detectionSchema);
