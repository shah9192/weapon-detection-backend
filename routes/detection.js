const router = require("express").Router();
const Detection = require("../models/Detection");

router.post("/", async (req, res) => {
  try {
    const { class_name, confidence, s3_url, s3_key, timestamp } = req.body;

    const detection = new Detection({
      class_name,
      confidence,
      s3_url,
      s3_key,
      timestamp: timestamp ? new Date(timestamp) : undefined,
    });

    await detection.save();
    res.json({ success: true, id: detection._id });
  } catch (err) {
    console.error("Detection save error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
