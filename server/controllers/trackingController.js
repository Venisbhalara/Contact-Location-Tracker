const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const { TrackingRequest, User } = require("../models");
const { Op } = require("sequelize");
const logActivity = require("../utils/activityLogger");

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
    // Check if user has approved tracking access
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate a unique UUID token
    const token = uuidv4();

    // Calculate expiry time
    const expiresAt = new Date(
      Date.now() + parseInt(expiryHours) * 60 * 60 * 1000,
    );

    // Set status based on user's access approval
    const initialStatus = user.trackingAccess ? "active" : "pending";

    const tracking = await TrackingRequest.create({
      userId: req.user.id,
      phoneNumber,
      trackingType: trackingType || "location",
      token,
      status: initialStatus,
      expiresAt,
    });

    await logActivity(req.app.get("io"), {
      type: "tracking_start",
      label: initialStatus === "active" ? "Tracking Start" : "Pending Access",
      detail1: `user_${user.id}`,
      detail2: initialStatus === "active" ? `session #${tracking.id}` : "Awaiting approval",
      color: initialStatus === "active" ? "border-[#7C6FFF]" : "border-[#EAB308]",
      userId: user.id
    });

    // Build the shareable tracking URL
    // Use Origin/Host header if CLIENT_URL is not set or looks like a local IP,
    // to make it work seamlessly with tunnels.
    let baseUrl = process.env.CLIENT_URL || "";

    // If we're hitting this from a tunnel or different IP, or running locally, adjust baseUrl
    const requestOrigin =
      req.get("origin") ||
      (req.get("host") ? `${req.protocol}://${req.get("host")}` : null);

    const isLocalRequest =
      requestOrigin &&
      (requestOrigin.includes("localhost") ||
        requestOrigin.match(/\d+\.\d+\.\d+\.\d+/));

    if (
      requestOrigin &&
      (!baseUrl ||
        baseUrl.includes("localhost") ||
        baseUrl.match(/\d+\.\d+\.\d+\.\d+/) ||
        isLocalRequest)
    ) {
      baseUrl = requestOrigin;
    }

    const trackingLink = `${baseUrl.replace(/\/$/, "")}/track/${token}`;

    res.status(201).json({
      message: user.trackingAccess 
        ? "Tracking link created successfully!" 
        : "Tracking link created! Awaiting admin approval.",
      trackingLink,
      token,
      tracking,
      requiresApproval: !user.trackingAccess,
    });
  } catch (error) {
    console.error("Create tracking error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({
      message: "Server error while creating tracking link.",
      error:
        process.env.NODE_ENV === "production" ? error.message : error.stack,
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

    // Update location
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
    res.status(500).json({
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

    res.status(200).json({ tracking });
  } catch (error) {
    console.error("Get tracking error:", error);
    res.status(500).json({
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
    res.status(500).json({
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
    res.status(500).json({
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
