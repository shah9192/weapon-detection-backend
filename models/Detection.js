const mongoose = require("mongoose");

const DetectionSchema = new mongoose.Schema({
  class_name: { type: String, required: true },
  confidence: { type: Number, required: true },
  s3_url: { type: String, required: true },
  s3_key: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Detection", DetectionSchema);
