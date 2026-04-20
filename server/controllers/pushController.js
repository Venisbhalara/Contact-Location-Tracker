const webpush = require("web-push");
const { TrackingRequest } = require("../models");
const { getLocationFromIp } = require("../utils/ipGeocode");

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@contact-tracker.local",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Helper: get real client IP (handles proxies like Render/Vercel)
function getRealIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first is the client
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
}

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

    // Mark sharer as online and save their push subscription
    await tracking.update({
      pushSubscription: subscription,
      sharerOnline: true,
      locationMode: "gps",
    });

    res.status(200).json({ message: "Push subscription saved successfully" });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    res.status(500).json({ message: "Server error saving push subscription" });
  }
};

// ─── @route   POST /api/push/ping ────────────────────────────
// ─── @desc    Send a visible push notification to ping the user's location
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
      return res
        .status(400)
        .json({ message: "No push subscription exists for this user." });
    }

    const API_BASE =
      process.env.RENDER_EXTERNAL_URL ||
      process.env.CLIENT_URL?.replace(/\/$/, "") ||
      "https://contact-location-tracker.onrender.com";

    // Prepare Push payload — visible notification for manual admin ping
    const payload = JSON.stringify({
      type: "user-ping",
      title: "📍 Location Update Required",
      body: "Someone is requesting your location. Tap to open the tracker.",
      icon: "/favicon.svg",
      data: {
        url: `/track/${token}`,
        token,
        apiBase: `${API_BASE}/api`,
      },
    });

    // Send the push
    await webpush.sendNotification(tracking.pushSubscription, payload);

    res.status(200).json({ message: "Ping sent successfully!" });
  } catch (error) {
    console.error("Push notification error:", error);
    if (error.statusCode === 410 || error.statusCode === 404) {
      await TrackingRequest.update(
        { pushSubscription: null },
        { where: { token } }
      );
      return res
        .status(410)
        .json({ message: "Push subscription expired and was removed." });
    }
    res.status(500).json({ message: "Failed to send ping." });
  }
};

// ─── INTERNAL: getApiBase ────────────────────────────────────────
// Returns the correct API base URL for push payloads.
// IMPORTANT: The Ghost page (/ghost) and tracking page (/track/:token) are
// both served by the same frontend server (Vite dev / Vercel in prod).
// Using a relative "/api" URL means the Vite proxy routes it to the correct
// backend — this works on both PC browsers AND phones on the same WiFi.
// In production (Render), we use the absolute URL so the SW can reach it
// even when opened from a push notification (no proxy in that context).
function getApiBase() {
  // Production: Render sets this, SW needs absolute URL
  if (process.env.RENDER_EXTERNAL_URL) {
    return `${process.env.RENDER_EXTERNAL_URL}/api`;
  }
  // Development: use relative path — Vite proxy handles it for all devices
  // The Ghost window is opened by clients.openWindow() which opens it in
  // the same browser origin (the Vite dev server), so /api works perfectly.
  return "/api";
}

// ─── INTERNAL: triggerBackgroundPing ─────────────────────────
// ─── @desc    Called internally (from server.js disconnect handler)
// ─── @param   token - the tracking session token
// ─── @param   io    - the Socket.IO instance for live emit
const triggerBackgroundPing = async (token, io) => {
  try {
    const tracking = await TrackingRequest.findOne({ where: { token } });
    if (!tracking) return;

    // Mark sharer as offline in the DB
    await tracking.update({ sharerOnline: false, locationMode: "offline" });

    if (!tracking.pushSubscription) {
      console.log(
        `[NeuralPing] No push subscription for token ${token} — cannot background ping`
      );
      return;
    }

    const API_BASE = getApiBase();

    // Send a SILENT push — no notification shown, just wakes the SW
    const payload = JSON.stringify({
      type: "silent-ghost-ping", // SW checks this type and stays silent
      title: "Background sync",
      body: "silent",
      token,
      apiBase: API_BASE,
    });

    await webpush.sendNotification(tracking.pushSubscription, payload);
    console.log(`[NeuralPing] Silent push sent for token: ${token} → apiBase: ${API_BASE}`);
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Expired subscription — clean it up
      await TrackingRequest.update(
        { pushSubscription: null },
        { where: { token } }
      );
      console.log(`[NeuralPing] Cleaned up expired push subscription for: ${token}`);
    } else {
      console.warn(`[NeuralPing] Background ping failed for ${token}:`, error.message);
    }
  }
};

// ─── INTERNAL: triggerResumePing ──────────────────────────────
// ─── @desc    Sent periodically (every 2 min) while sharer is offline.
//             Shows a Ghost Window (openWindow) when GPS is on + tab closed.
const triggerResumePing = async (token) => {
  try {
    const tracking = await TrackingRequest.findOne({ where: { token } });
    if (!tracking?.pushSubscription) {
      console.log(`[NeuralPing] No push sub for resume ping: ${token}`);
      return;
    }

    const API_BASE = getApiBase();

    const payload = JSON.stringify({
      type: "resume-ping",
      title: "📍 Resume Location Sharing",
      body: "GPS may be available. Tap to resume live tracking and share your location.",
      icon: "/favicon.svg",
      token,
      apiBase: API_BASE,
      data: {
        url: `/track/${token}?resume=1`,
        token,
        apiBase: API_BASE,
      },
    });

    await webpush.sendNotification(tracking.pushSubscription, payload);
    console.log(`[NeuralPing] Resume ping sent for token: ${token} → apiBase: ${API_BASE}`);
  } catch (error) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      await TrackingRequest.update(
        { pushSubscription: null },
        { where: { token } }
      );
      console.log(`[NeuralPing] Cleaned expired sub during resume ping for: ${token}`);
    }
    // Re-throw so the caller (setInterval) can handle 410 and stop the interval
    throw error;
  }
};

// ── IP Mode removed ──

// ─── @route   POST /api/push/gps-report ──────────────────────
// ─── @desc    Window/SW calls this when GPS is re-enabled.
//              Updates DB with precise coords and emits gps-restored.
// ─── @access  Public (requires token in body)
const reportGpsRestored = async (req, res) => {
  const { token, latitude, longitude, accuracy } = req.body;

  if (!token || latitude == null || longitude == null) {
    return res.status(400).json({ message: "Token, latitude and longitude required" });
  }

  try {
    const tracking = await TrackingRequest.findOne({ where: { token } });
    if (!tracking) {
      return res.status(404).json({ message: "Tracking session not found" });
    }

    // Save new precise GPS fix to DB
    await tracking.update({
      latitude,
      longitude,
      accuracy: accuracy || null,
      locationMode: "gps",
      sharerOnline: true,
      lastUpdatedAt: new Date(),
    });

    // Emit GPS restored event to viewer's room
    const io = req.app.get("io");
    if (io) {
      io.to(token).emit("gps-restored", {
        token,
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(),
      });
      console.log(`[NeuralPing] Emitted gps-restored for token: ${token}`);
    }

    res.status(200).json({ message: "GPS location restored and broadcast to viewers" });
  } catch (error) {
    console.error("[NeuralPing] GPS report error:", error);
    res.status(500).json({ message: "Server error during GPS restore report" });
  }
};

// ─── @route   POST /api/push/sharer-online ───────────────────
// ─── @desc    Marks sharer as online when they reconnect to socket
// ─── @access  Public
const markSharerOnline = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token required" });

  try {
    await TrackingRequest.update(
      { sharerOnline: true, locationMode: "gps" },
      { where: { token } }
    );
    res.status(200).json({ message: "Sharer marked online" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  subscribePush,
  pingUser,
  triggerBackgroundPing,
  triggerResumePing,
  reportGpsRestored,
  markSharerOnline,
};
