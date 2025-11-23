const router = require("express").Router();
const Detection = require("../models/Detection");
const verifyToken = require("../middleware/verifyToken");
const admin = require("../config/firebaseAdmin");
router.post("/", verifyToken, async (req, res) => {
  try {
    const { class_name, confidence, s3_url, s3_key, timestamp } = req.body;

    const detection = new Detection({
      userId: req.userId,
      class_name,
      confidence,
      s3_url,
      s3_key,
      timestamp: timestamp ? new Date(timestamp) : undefined,
    });

    await detection.save();
    const title = "Detection Found!";
    const body = `${class_name} detected (${(confidence * 100).toFixed(
      1
    )}% confidence)`;
    await Notification.create({
      userId: req.userId,
      title,
      body,
      imageUrl: s3_url,
      data: {
        detectionId: detection._id.toString(),
        s3_url,
        type: "detection_result",
      },
    });
    try {
      const user = await UsersModel.findById(req.userId).select("fcmToken");

      if (user?.fcmToken) {
        const message = {
          token: user.fcmToken,
          notification: {
            title,
            body,
            image: s3_url,
          },
          data: {
            detectionId: detection._id.toString(),
            s3_url: s3_url,
            type: "detection_result",
          },
          android: {
            priority: "high",
            notification: {
              channelId: "detection_channel",
              sound: "default",
              image: s3_url,
            },
          },
        };

        await admin.messaging().send(message);
        console.log("FCM push sent to user:", req.userId);
      }
    } catch (fcmError) {
      console.warn("FCM push failed (non-critical):", fcmError.message);
    }

    res.json({
      success: true,
      id: detection._id,
      message: "Detection saved successfully",
      notification: "sent_or_skipped",
    });
  } catch (err) {
    console.error("Detection save error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;