// Load env vars FIRST — must be before any other require that reads process.env
require("dotenv").config();

// ── Startup environment variable validation ────────────────────────────────
// Fail fast with a clear message instead of a cryptic crash deep in the code.
const REQUIRED_ENV_VARS = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_SECRET",
];
const missingVars = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    `\n❌ STARTUP FAILED: Missing required environment variables:\n   ${missingVars.join(', ')}\n` +
    `   Please set them in your .env file (local) or Render dashboard (production).\n`
  );
  process.exit(1);
}

const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");

// Import sequelize instance
const sequelize = require("./config/db");
const runMigrations = require("./utils/dbRepair");

// Track location updates for the admin dashboard
global.locationUpdatesToday = 0;

// Import models to register them with Sequelize (must happen before sync)
const { User, TrackingRequest } = require("./models/index");
const { triggerBackgroundPing } = require("./controllers/pushController");

const app = express();
const server = http.createServer(app);

// Trust proxy for express-rate-limit (useful for Render/Vercel/Heroku)
app.set("trust proxy", 1);

// Allow requests from localhost AND any local network IP (for mobile testing on same Wi-Fi)
const allowedOrigin = (origin, callback) => {
  // No origin (curl, Postman, same-origin): allow
  if (!origin) return callback(null, true);

  // If explicitly allowed to bypass CORS for testing
  if (process.env.ALLOW_ALL_ORIGINS === "true") return callback(null, true);

  // Clean up the env vars (remove trailing slash if user added it)
  const clientUrl = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.trim().replace(/\/$/, "").toLowerCase()
    : null;
  const adminUrl = process.env.ADMIN_URL
    ? process.env.ADMIN_URL.trim().replace(/\/$/, "").toLowerCase()
    : null;
  const normalizedOrigin = origin.trim().replace(/\/$/, "").toLowerCase();

  // Exact match with CLIENT_URL or ADMIN_URL env var
  if (clientUrl && normalizedOrigin === clientUrl) return callback(null, true);
  if (adminUrl && normalizedOrigin === adminUrl) return callback(null, true);

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

  console.error(`❌ CORS REJECTED: "${origin}" (Normalized: "${normalizedOrigin}"). Expected Client: "${clientUrl}", Admin: "${adminUrl}"`);
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
app.use("/api/users", require("./routes/users")); // New profile routes
app.use("/api/tracking", require("./routes/tracking"));
app.use("/api/access", require("./routes/access"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/push", require("./routes/push"));

// Root check
app.get("/", (req, res) => {
  res.json({
    message: "Location Tracker API is running!",
    status: "OK",
    database: "MySQL",
    timestamp: new Date().toISOString(),
  });
});

// ── /api/health — ping this on Render to verify server + DB are alive ─────
app.get("/api/health", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      success: true,
      status: "healthy",
      database: "connected",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (dbErr) {
    console.error("[/api/health] DB connection failed:", dbErr.message);
    res.status(503).json({
      success: false,
      status: "unhealthy",
      database: "disconnected",
      error: dbErr.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Periodic Offline Ping Scheduler ─────────────────────────────────────────
// When a sharer goes offline (tab closed), we keep sending periodic push pings
// every 2 minutes so their phone's Service Worker can wake up, detect GPS status,
// and show a 'resume tracking' notification if GPS is back on.
// Map<sharerToken, intervalId>
const offlinePingIntervals = new Map();

// Socket.IO handlers
io.on("connection", (socket) => {
  console.log(` Client connected: ${socket.id}`);

  socket.on("join-tracking", (token) => {
    socket.join(token);
    console.log(` ${socket.id} joined room: ${token}`);
  });

  socket.on("join-admin-global", () => {
    socket.join("admin_global");
    console.log(` Admin ${socket.id} joined admin_global room`);
  });

  socket.on("permission-denied", ({ token }) => {
    console.log(` Permission denied for token: ${token}`);
    io.to(token).emit("permission-denied");
  });

  // Sharer registers themselves so we know who is actively sharing
  socket.on("register-sharer", async (token) => {
    socket.join(token);
    socket.data.sharerToken = token;
    console.log(` Sharer ${socket.id} registered for token: ${token}`);

    // ── Clear any ongoing periodic offline ping for this token ──
    if (offlinePingIntervals.has(token)) {
      clearInterval(offlinePingIntervals.get(token));
      offlinePingIntervals.delete(token);
      console.log(`[NeuralPing] ✅ Cleared periodic ping — sharer reconnected: ${token}`);
    }

    // Mark sharer as online in DB so viewers can read the mode
    try {
      await TrackingRequest.update(
        { sharerOnline: true, locationMode: "gps" },
        { where: { token } }
      );
      // Notify any active viewers that the sharer is online
      io.to(token).emit("sharer-online", { token, timestamp: new Date() });
    } catch (e) {
      console.warn("[NeuralPing] Could not mark sharer online in DB:", e.message);
    }
  });

  socket.on("send-location", ({ token, latitude, longitude, accuracy }) => {
    // Admin dashboard tracking
    global.locationUpdatesToday = (global.locationUpdatesToday || 0) + 1;

    const payload = {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date(),
    };

    io.to(token).emit("location-update", payload);

    // Broadcast directly to God-mode room
    io.to("admin_global").emit("admin-location-update", {
      token,
      ...payload,
    });
  });

  socket.on("disconnect", async () => {
    console.log(` Client disconnected: ${socket.id}`);

    const sharerToken = socket.data.sharerToken;
    if (sharerToken) {
      console.log(`[NeuralPing] Sharer disconnected for token: ${sharerToken}`);

      // ── Step 1: Instantly notify ALL viewers ──────────────────────────────
      io.to(sharerToken).emit("sharer-offline", {
        token: sharerToken,
        timestamp: new Date(),
        message: "The target has closed the tab or lost connection.",
      });

      try {
        const tracking = await TrackingRequest.findOne({ where: { token: sharerToken } });
        if (tracking) {
          // Mark as offline
          await tracking.update({ sharerOnline: false, locationMode: "offline" });
        }
      } catch (err) {
        console.warn("[NeuralPing] Error updating offline status:", err.message);
      }

      // ── Step 3: Also trigger push ping (for ghost window / GPS restoration) ──
      // Secondary mechanism — fires in background, doesn't block instant IP mode
      triggerBackgroundPing(sharerToken, io).catch((e) =>
        console.warn("[NeuralPing] Background ping error:", e.message)
      );

      // ── Step 4: Periodic pings every 2 min (GPS restoration when GPS turns back on) ──
      const PING_INTERVAL_MS = 2 * 60 * 1000;

      const pingInterval = setInterval(async () => {
        try {
          const tracking = await TrackingRequest.findOne({ where: { token: sharerToken } });

          if (!tracking) {
            clearInterval(pingInterval);
            offlinePingIntervals.delete(sharerToken);
            console.log(`[NeuralPing] Session deleted, stopping pings for: ${sharerToken}`);
            return;
          }

          if (tracking.sharerOnline) {
            clearInterval(pingInterval);
            offlinePingIntervals.delete(sharerToken);
            console.log(`[NeuralPing] Sharer reconnected, stopping pings for: ${sharerToken}`);
            return;
          }

          // Send resume-ping → SW opens Ghost Window if GPS is back on
          const { triggerResumePing } = require("./controllers/pushController");
          await triggerResumePing(sharerToken);
          console.log(`[NeuralPing] Resume ping sent for: ${sharerToken}`);
        } catch (err) {
          console.warn(`[NeuralPing] Periodic ping error for ${sharerToken}:`, err.message);
          if (err.statusCode === 410 || err.statusCode === 404) {
            clearInterval(pingInterval);
            offlinePingIntervals.delete(sharerToken);
          }
        }
      }, PING_INTERVAL_MS);

      offlinePingIntervals.set(sharerToken, pingInterval);
      console.log(`[NeuralPing] Periodic ping started for: ${sharerToken} (every 2 min)`);
    }
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

// ── Startup Diagnostics ─────────────────────────────────────────────────────
function printStartupDiagnostics() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  LOCATION TRACKER — STARTUP DIAGNOSTICS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const c = (k, v) => console.log(`  ${k.padEnd(22)}: ${v}`);
  c("NODE_ENV",            process.env.NODE_ENV             || "❌ NOT SET");
  c("PORT",                PORT);
  c("DB_HOST",             process.env.DB_HOST              || "❌ NOT SET");
  c("DB_PORT",             process.env.DB_PORT              || "❌ NOT SET");
  c("DB_NAME",             process.env.DB_NAME              || "❌ NOT SET");
  c("DB_USER",             process.env.DB_USER              || "❌ NOT SET");
  c("DB_PASSWORD",         process.env.DB_PASSWORD          ? `✅ SET (${process.env.DB_PASSWORD.length} chars)` : "❌ NOT SET");
  c("JWT_SECRET",          process.env.JWT_SECRET           ? `✅ SET (${process.env.JWT_SECRET.length} chars)` : "❌ NOT SET");
  c("CLIENT_URL",          process.env.CLIENT_URL           || "⚠️  NOT SET");
  c("ADMIN_URL",           process.env.ADMIN_URL            || "⚠️  NOT SET");
  c("RENDER_EXTERNAL_URL", process.env.RENDER_EXTERNAL_URL  || "⚠️  NOT SET");
  c("SUPER_ADMIN_EMAIL",   process.env.SUPER_ADMIN_EMAIL    || "vasu@gmail.com (default)");
  c("VAPID_PUBLIC_KEY",    process.env.VAPID_PUBLIC_KEY     ? "✅ SET" : "⚠️  NOT SET");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

// Connect to MySQL then start server
const start = async () => {
  printStartupDiagnostics();
  try {
    // 1. DB Connection
    console.log("⏳ Connecting to MySQL...");
    await sequelize.authenticate();
    console.log("✅ MySQL Connected.\n");

    // 2. Schema repair
    console.log("⏳ Running schema migration...");
    await runMigrations();

    // 3. Sync models — creates tables if they don't exist
    console.log("⏳ Syncing models to DB...");
    try {
      await sequelize.sync();
      console.log("✅ Tables synced.");
      // Verify critical tables
      for (const t of ["users","tracking_requests","access_requests","activity_logs"]) {
        const [rows] = await sequelize.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${t}'`).catch(()=>[[]]);
        console.log(`  ${rows.length ? "✅" : "❌"} Table '${t}' ${rows.length ? "exists" : "MISSING"}`);
      }

    } catch (syncErr) {
      console.error("❌ SYNC FAILED:", syncErr.message);
      console.error("   SQL:", syncErr.original?.sqlMessage);
    }

    // 4. Admin bootstrapping
    try {
      const adminEmail = process.env.SUPER_ADMIN_EMAIL || "vasu@gmail.com";
      const adminPass  = process.env.SUPER_ADMIN_PASSWORD || "123456";
      const [admin, created] = await User.findOrCreate({
        where: { email: adminEmail },
        defaults: { name:"Administrator", password:adminPass, plainPassword:adminPass, role:"admin", accessStatus:"approved", trackingAccess:true },
      });
      if (!created) {
        let changed = false;
        if (admin.role !== "admin") { admin.role="admin"; admin.trackingAccess=true; admin.accessStatus="approved"; changed=true; }
        if (process.env.RESET_ADMIN_ON_START === "true") { admin.password=adminPass; admin.plainPassword=adminPass; changed=true; }
        if (changed) await admin.save();
      }
      console.log(`✅ Admin ${created?"created":"verified"}: ${adminEmail}`);
    } catch (adminErr) {
      console.error("❌ Admin bootstrap failed (non-fatal):", adminErr.message);
    }

    // 5. Start listening
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`\n🚀 Server live at http://localhost:${PORT}`);
      console.log(`   DB     : ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`   Health : http://localhost:${PORT}/api/health\n`);

      // Keep-alive pinger for Render free tier
      if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
        const pingUrl = process.env.RENDER_EXTERNAL_URL;
        setInterval(() => {
          const proto = pingUrl.startsWith("https") ? require("https") : require("http");
          proto.get(pingUrl, (r) => console.log(`  Keep-alive → ${r.statusCode}`))
               .on("error", (e) => console.error("  Keep-alive failed:", e.message));
        }, 14 * 60 * 1000);
        console.log(`  Keep-alive active → ${pingUrl}`);
      }
    });
  } catch (err) {
    console.error("\n❌ FATAL: Server failed to start");
    console.error("   Error:", err.message);
    console.error("   SQL  :", err.original?.sqlMessage || "N/A");
    console.error("   → Ensure DB_HOST, DB_PASSWORD, JWT_SECRET are set in Render dashboard\n");
    process.exit(1);
  }
};

start();
