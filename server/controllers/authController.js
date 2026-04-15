const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { User } = require("../models");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");

const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        role: user.role,
        trackingAccess: user.trackingAccess,
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
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Register active login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trackingAccess: user.trackingAccess,
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
        role: req.user.role,
        trackingAccess: req.user.trackingAccess,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// ─── @route   POST /api/auth/google ───────────────────────────
// ─── @desc    Google OAuth login/register
// ─── @access  Public
const googleAuth = async (req, res) => {
  const { credential, access_token } = req.body;
  
  if (!credential && !access_token) {
    return res.status(400).json({ message: "No Google credential or token provided." });
  }

  try {
    let email, name;

    if (credential) {
      const ticket = await oauthClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
    } else {
      // Use native fetch to get user info from access_token
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      if (!userInfoRes.ok) {
        throw new Error("Failed to fetch user info from Google");
      }
      const data = await userInfoRes.json();
      email = data.email;
      name = data.name;
    }

    // Check if user exists
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Create user with a random unguessable password
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({ name, email, password: randomPassword });
    }

    // Register active login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      message: "Google login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        trackingAccess: user.trackingAccess,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Google Auth error:", error);
    res.status(500).json({ message: "Google authentication failed.", error: error.message });
  }
};

module.exports = { register, login, getMe, googleAuth };
