require("dotenv").config(); // Must be FIRST, before anything else

const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const dotenv = require("dotenv");

// Load env vars FIRST
dotenv.config();

// Import sequelize instance
const sequelize = require("./config/db");

// Import models to register them with Sequelize (must happen before sync)
const { User, Contact, TrackingRequest } = require("./models/index");

const app = express();
const server = http.createServer(app);

// Allow requests from localhost AND any local network IP (for mobile testing on same Wi-Fi)
const allowedOrigin = (origin, callback) => {
  // No origin (curl, Postman, same-origin): allow
  if (!origin) return callback(null, true);

  // If explicitly allowed to bypass CORS for testing
  if (process.env.ALLOW_ALL_ORIGINS === "true") return callback(null, true);

  // Clean up the env var (remove trailing slash if user added it)
  const clientUrl = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.trim().replace(/\/$/, "")
    : null;
  const normalizedOrigin = origin.trim().replace(/\/$/, "");

  // Exact match with CLIENT_URL env var
  if (clientUrl && normalizedOrigin === clientUrl) return callback(null, true);

  // More robust Vercel check: allow anything ending in .vercel.app
  if (normalizedOrigin.endsWith(".vercel.app")) return callback(null, true);

  // Tunnel support: allow common tunnel providers like ngrok, cloudflare, etc.
  if (
    normalizedOrigin.endsWith(".ngrok-free.app") ||
    normalizedOrigin.endsWith(".ngrok.io") ||
    normalizedOrigin.endsWith(".trycloudflare.com") ||
    normalizedOrigin.endsWith(".loca.lt")
  ) {
    return callback(null, true);
  }

  // Always allow localhost (any port)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin))
    return callback(null, true);

  // Allow local network IPs: 192.168.x.x, 10.x.x.x, 172.16-31.x.x
  if (
    /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(
      normalizedOrigin,
    )
  )
    return callback(null, true);

  console.error(`❌ CORS REJECTED: ${origin}`);
  callback(new Error("CORS: origin not allowed — " + origin));
};

// Socket.IO setup with CORS
const io = socketio(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible in controllers
app.set("io", io);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/contacts", require("./routes/contacts"));
app.use("/api/tracking", require("./routes/tracking"));

// Health check
app.get("/", (req, res) => {
  res.json({
    message: " Location Tracker API is running!",
    status: "OK",
    database: "MySQL",
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO handlers
io.on("connection", (socket) => {
  console.log(` Client connected: ${socket.id}`);

  socket.on("join-tracking", (token) => {
    socket.join(token);
    console.log(` ${socket.id} joined room: ${token}`);
  });

  // Sharer registers themselves so we know who is actively sharing
  socket.on("register-sharer", (token) => {
    socket.join(token);
    socket.data.sharerToken = token;
    console.log(` Sharer ${socket.id} registered for token: ${token}`);
  });

  socket.on("send-location", ({ token, latitude, longitude, accuracy }) => {
    io.to(token).emit("location-update", {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", () => {
    console.log(` Client disconnected: ${socket.id}`);
  });
});

// 404
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

// Connect to MySQL then start server
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log(" MySQL Connected.");

    // Create/update all tables automatically
    await sequelize.sync();
    console.log(" Tables synced: users, contacts, tracking_requests");

    // Bind to 0.0.0.0 so the server is reachable from phones on the same Wi-Fi
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n Server running at http://localhost:${PORT}`);
      console.log(` Network access: http://10.126.122.217:${PORT}`);
      console.log(
        ` Database: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`,
      );
      console.log(` Socket.IO ready`);

      // ── Keep-alive pinger (Render free tier) ──────────────────────────
      // Render spins down free instances after ~15 min of inactivity.
      // We self-ping every 14 min so the server never goes to sleep.
      if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
        const pingUrl = process.env.RENDER_EXTERNAL_URL;
        const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

        setInterval(() => {
          const protocol = pingUrl.startsWith("https") ? require("https") : require("http");
          protocol.get(pingUrl, (res) => {
            console.log(` Keep-alive ping → ${res.statusCode}`);
          }).on("error", (err) => {
            console.error(" Keep-alive ping failed:", err.message);
          });
        }, PING_INTERVAL_MS);

        console.log(` Keep-alive pinger active (every 14 min) → ${pingUrl}`);
      }
    });
  } catch (err) {
    console.error(" Failed to start server:", err.message);
    console.error(
      "\n Check your .env database credentials and make sure MySQL is running.\n",
    );
    process.exit(1);
  }
};

start();
