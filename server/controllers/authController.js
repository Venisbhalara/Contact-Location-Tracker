const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { User } = require("../models");

// ─── Helper: Generate JWT ─────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

// ─── @route   POST /api/auth/register ────────────────────────
// ─── @desc    Register a new user
// ─── @access  Public
const register = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists." });
    }

    // Create user (password hashed via Sequelize beforeCreate hook)
    const user = await User.create({ name, email, password });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: "Registration successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      message: "Server error during registration.",
      error: error.message,
    });
  }
};

// ─── @route   POST /api/auth/login ───────────────────────────
// ─── @desc    Login user and return JWT
// ─── @access  Public
const login = async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ message: errors.array()[0].msg, errors: errors.array() });
  }
  console.log("LOGIN BODY:", req.body); // 👈 ADD THIS LINE

  const { email, password } = req.body;

  try {
    // Find user by email (include password for comparison)
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ message: "Server error during login.", error: error.message });
  }
};

// ─── @route   GET /api/auth/me ────────────────────────────────
// ─── @desc    Get current logged-in user
// ─── @access  Private
const getMe = async (req, res) => {
  try {
    res.status(200).json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

module.exports = { register, login, getMe };
