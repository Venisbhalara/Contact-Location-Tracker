const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const { TrackingRequest } = require("../models");
const { Op } = require("sequelize");

// ─── Helper: expiry time (24 hours from now by default) ───────
const getExpiryDate = (hours = 24) => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
};

// ─── @route   POST /api/tracking/create ──────────────────────
// ─── @desc    Generate a new tracking link with a unique token
// ─── @access  Private
const createTracking = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { phoneNumber, trackingType, expiryHours = 24 } = req.body;

  try {
    // Generate a unique UUID token
    const token = uuidv4();

    const tracking = await TrackingRequest.create({
      userId: req.user.id,
      phoneNumber,
      trackingType: trackingType || "location",
      token,
      status: "pending",
      expiresAt: getExpiryDate(parseInt(expiryHours)),
    });

    // Build the shareable tracking URL
    // Use Origin/Host header if CLIENT_URL is not set or looks like a local IP,
    // to make it work seamlessly with tunnels.
    let baseUrl = process.env.CLIENT_URL || "";

    // If we're hitting this from a tunnel or different IP, adjust baseUrl
    const requestOrigin =
      req.get("origin") ||
      (req.get("host") ? `${req.protocol}://${req.get("host")}` : null);
    if (
      requestOrigin &&
      (!baseUrl ||
        baseUrl.includes("localhost") ||
        baseUrl.match(/\d+\.\d+\.\d+\.\d+/))
    ) {
      baseUrl = requestOrigin;
    }

    const trackingLink = `${baseUrl.replace(/\/$/, "")}/track/${token}`;

    res.status(201).json({
      message: "Tracking link created successfully!",
      trackingLink,
      token,
      tracking,
    });
  } catch (error) {
    console.error("Create tracking error:", error);
    res
      .status(500)
      .json({
        message: "Server error while creating tracking link.",
        error: error.message,
      });
  }
};

// ─── @route   POST /api/tracking/update-location ─────────────
// ─── @desc    Target user sends GPS coords to backend
// ─── @access  Public (only needs valid token)
const updateLocation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { token, latitude, longitude, accuracy } = req.body;

  try {
    const tracking = await TrackingRequest.findOne({ where: { token } });

    if (!tracking) {
      return res
        .status(404)
        .json({ message: "Tracking request not found. Invalid token." });
    }

    // Check expiry
    if (tracking.isExpired()) {
      await tracking.update({ status: "expired" });
      return res
        .status(410)
        .json({ message: "This tracking link has expired." });
    }

    // Update location and mark as active
    await tracking.update({
      latitude,
      longitude,
      accuracy: accuracy || null,
      status: "active",
      lastUpdatedAt: new Date(),
    });

    // Emit real-time location update via Socket.IO
    const io = req.app.get("io");
    if (io) {
      console.log(`📡 Emitting location update for token: ${token}`);
      io.to(token).emit("location-update", {
        latitude,
        longitude,
        accuracy,
        timestamp: new Date(),
      });
    }

    res
      .status(200)
      .json({ message: "Location updated successfully!", latitude, longitude });
  } catch (error) {
    console.error("Update location error for token:", token, error);
    res
      .status(500)
      .json({
        message: "Server error while updating location. Please try again.",
        error: error.message,
      });
  }
};

// ─── @route   GET /api/tracking/:token ───────────────────────
// ─── @desc    Get tracking info by token (target user or requester)
// ─── @access  Public
const getTrackingByToken = async (req, res) => {
  try {
    const tracking = await TrackingRequest.findOne({
      where: { token: req.params.token },
      attributes: [
        "id",
        "phoneNumber",
        "trackingType",
        "token",
        "latitude",
        "longitude",
        "accuracy",
        "status",
        "expiresAt",
        "lastUpdatedAt",
        "createdAt",
      ],
    });

    if (!tracking) {
      return res.status(404).json({ message: "Tracking request not found." });
    }

    // Auto-expire if past expiry date
    if (tracking.isExpired() && tracking.status !== "expired") {
      await tracking.update({ status: "expired" });
      tracking.status = "expired";
    }

    res.status(200).json({ tracking });
  } catch (error) {
    console.error("Get tracking error:", error);
    res
      .status(500)
      .json({
        message: "Server error while fetching tracking info.",
        error: error.message,
      });
  }
};

// ─── @route   GET /api/tracking ──────────────────────────────
// ─── @desc    Get all tracking requests for logged-in user
// ─── @access  Private
const getUserTrackings = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = { userId: req.user.id };
    if (status) where.status = status;

    const { count, rows: trackings } = await TrackingRequest.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset,
    });

    res.status(200).json({
      trackings,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get user trackings error:", error);
    res
      .status(500)
      .json({
        message: "Server error while fetching tracking requests.",
        error: error.message,
      });
  }
};

// ─── @route   DELETE /api/tracking/:id ───────────────────────
// ─── @desc    Delete a tracking request by ID
// ─── @access  Private
const deleteTracking = async (req, res) => {
  try {
    const tracking = await TrackingRequest.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!tracking) {
      return res.status(404).json({ message: "Tracking request not found." });
    }

    const { token } = tracking;
    await tracking.destroy();

    // Notify the sharer (and any viewers) that this tracking session is over
    const io = req.app.get("io");
    if (io) {
      io.to(token).emit("tracking-stopped", { token, reason: "deleted" });
    }

    res.status(200).json({ message: "Tracking request deleted successfully." });
  } catch (error) {
    console.error("Delete tracking error:", error);
    res
      .status(500)
      .json({
        message: "Server error while deleting tracking request.",
        error: error.message,
      });
  }
};

module.exports = {
  createTracking,
  updateLocation,
  getTrackingByToken,
  getUserTrackings,
  deleteTracking,
};
