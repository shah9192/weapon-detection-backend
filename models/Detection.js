const mongoose = require("mongoose");

const DetectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  class_name: { type: String, required: true },
  confidence: { type: Number, required: true },
  s3_url: { type: String, required: true },
  s3_key: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
DetectionSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Detection", DetectionSchema);
