const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { createOrder, verifyPayment } = require("../controllers/paymentController");

// Create a new Razorpay order
router.post("/create-order", protect, createOrder);

// Verify payment signature
router.post("/verify", protect, verifyPayment);

module.exports = router;
