const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/auth");
const {
  createTracking,
  updateLocation,
  getTrackingByToken,
  getUserTrackings,
  deleteTracking,
} = require("../controllers/trackingController");

// ─── Validation Rules ─────────────────────────────────────────

const createValidation = [
  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .isLength({ min: 7, max: 20 })
    .withMessage("Phone must be between 7 and 20 characters"),
  body("trackingType")
    .optional()
    .isIn(["location"])
    .withMessage("Tracking type must be location"),
];

const locationValidation = [
  body("token").trim().notEmpty().withMessage("Tracking token is required"),
  body("latitude")
    .notEmpty()
    .withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("longitude")
    .notEmpty()
    .withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  body("accuracy")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Accuracy must be a positive number"),
];

// ─── Routes ───────────────────────────────────────────────────

// POST /api/tracking/create      — Generate tracking link (Protected)
router.post("/create", protect, createValidation, createTracking);

// POST /api/tracking/update-location — Target sends GPS coords (Public)
router.post("/update-location", locationValidation, updateLocation);

// GET  /api/tracking             — All trackings for logged-in user (Protected)
router.get("/", protect, getUserTrackings);

// GET  /api/tracking/:token      — Get tracking info by token (Public)
router.get("/:token", getTrackingByToken);

// DELETE /api/tracking/:id       — Delete a tracking request (Protected)
router.delete("/:id", protect, deleteTracking);

module.exports = router;
