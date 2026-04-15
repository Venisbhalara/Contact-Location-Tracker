const webpush = require("web-push");
const { TrackingRequest } = require("../models");

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@contact-tracker.local",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ─── @route   POST /api/push/subscribe ───────────────────────
// ─── @desc    Save the push subscription for a tracking session
// ─── @access  Public (needs token)
const subscribePush = async (req, res) => {
  const { token, subscription } = req.body;

  if (!token || !subscription) {
    return res.status(400).json({ message: "Token and subscription required" });
  }

  try {
    const tracking = await TrackingRequest.findOne({ where: { token } });
    
    if (!tracking) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    // Save subscription in DB
    await tracking.update({ pushSubscription: subscription });
    
    res.status(200).json({ message: "Push subscription saved successfully" });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    res.status(500).json({ message: "Server error saving push subscription" });
  }
};

// ─── @route   POST /api/push/ping ────────────────────────────
// ─── @desc    Send a push notification to ping the user's location
// ─── @access  Private / Public (requires token)
const pingUser = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token required" });
  }

  try {
    const tracking = await TrackingRequest.findOne({ where: { token } });
    
    if (!tracking) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    if (!tracking.pushSubscription) {
      return res.status(400).json({ message: "No push subscription exists for this user." });
    }

    // Prepare Push payload
    const payload = JSON.stringify({
      title: "Location Update Required 📍",
      body: "Admin is requesting your current location. Tap to update.",
      icon: "/vite.svg", // Fallback icon
      data: {
        url: `/track/${token}`
      }
    });

    // Send the push
    await webpush.sendNotification(tracking.pushSubscription, payload);
    
    res.status(200).json({ message: "Ping sent successfully!" });
  } catch (error) {
    console.error("Push notification error:", error);
    // If subscription is expired/invalid, web-push throws an error. We should ideally clean it up.
    if (error.statusCode === 410 || error.statusCode === 404) {
      await TrackingRequest.update({ pushSubscription: null }, { where: { token } });
      return res.status(410).json({ message: "Push subscription expired and was removed." });
    }
    
    res.status(500).json({ message: "Failed to send ping." });
  }
};

module.exports = {
  subscribePush,
  pingUser
};
