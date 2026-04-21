const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { User, TrackingRequest, AccessRequest, ActivityLog } = require("../models/index");
const sendEmail = require("../utils/sendEmail");

// Middleware to protect admin routes
const isAdmin = async (req, res, next) => {
  try {
    // If auth middleware already set req.user
    if (!req.user || req.user.email !== "vasu@gmail.com") {
      return res.status(403).json({ message: "Forbidden: Admin access only" });
    }
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Apply auth middleware and admin check to all admin routes
const { protect } = require("../middleware/auth");
router.use(protect, isAdmin);

// GET /api/admin/dashboard
router.get("/dashboard", async (req, res) => {
  try {
    // 1. Total users
    const totalUsers = await User.count();

    // 2. Total active tracking sessions
    const activeSessions = await TrackingRequest.count({
      where: { status: "active" },
    });

    // 3. Pending access approval count
    const pendingApprovals = await TrackingRequest.count({
      where: { status: "pending" },
    });

    // 4. Total location updates collected today
    const locationUpdatesToday = global.locationUpdatesToday || 0;

    // 5. New signups in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const newSignups24h = await User.count({
      where: {
        createdAt: {
          [Op.gte]: oneDayAgo,
        },
      },
    });

    // 6. Chart of activity over last 7 days (mock/aggregated data)
    // For simplicity, we'll fetch the last 7 days of signups and tracking requests
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentUsers = await User.findAll({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      attributes: ["createdAt"],
    });

    const recentRequests = await TrackingRequest.findAll({
      where: { createdAt: { [Op.gte]: sevenDaysAgo } },
      attributes: ["createdAt"],
    });

    // Format data into 7 days array
    const activityChart = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
      
      const signups = recentUsers.filter(
        (u) => u.createdAt.toISOString().split("T")[0] === dateStr
      ).length;
      
      const requests = recentRequests.filter(
        (r) => r.createdAt.toISOString().split("T")[0] === dateStr
      ).length;

      // Make date more readable (e.g. "Mon", "Tue")
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      activityChart.push({
        date: dateStr,
        day: dayName,
        signups,
        requests,
      });
    }

    // Metrics for Donut Charts
    const [offlineSessions, expiredSessions, adminUsers, standardUsers, totalTrackRequests, bannedUsers] = await Promise.all([
      TrackingRequest.count({ where: { status: "pending" } }).catch(() => 0),
      TrackingRequest.count({ where: { status: "expired" } }).catch(() => 0),
      User.count({ where: { role: "admin" } }).catch(() => 0),
      User.count({ 
        where: { 
          [Op.or]: [
            { role: "user" },
            { role: { [Op.is]: null } }
          ] 
        } 
      }).catch(() => 0),
      TrackingRequest.count().catch(() => 0),
      User.count({ where: { trackingAccess: false } }).catch(() => 0)
    ]);
    
    // Mini Stats calculations
    const successRate = totalTrackRequests > 0 ? Math.round((activeSessions / totalTrackRequests) * 100) : 0;

    // Recent Activity Feed
    const recentActivity = await ActivityLog.findAll({
      order: [["createdAt", "DESC"]],
      limit: 50,
      attributes: ["id", "type", "label", "detail1", "detail2", "color", "alert", ["createdAt", "time"]]
    }).catch(() => []);

    res.json({
      totalUsers,
      activeSessions,
      pendingApprovals,
      locationUpdatesToday,
      newSignups24h,
      activityChart,
      // newly added DB real-time data
      offlineSessions,
      expiredSessions,
      adminUsers,
      standardUsers,
      totalTrackRequests,
      successRate,
      bannedUsers,
      recentActivity,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch admin dashboard data" });
  }
});



// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ["password"] } });
    
    const usersWithCounts = await Promise.all(
      users.map(async (u) => {
        const sessionCount = await TrackingRequest.count({ where: { userId: u.id } });
        return { ...u.toJSON(), sessionCount };
      })
    );
    res.json(usersWithCounts);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// PUT /api/admin/users/:id/role
router.put("/users/:id/role", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.email === "vasu@gmail.com") return res.status(400).json({ message: "Cannot modify master admin" });
    
    user.role = req.body.role || 'user';
    await user.save();
    res.json({ message: "Role updated successfully", user: user.toSafeJSON() });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ message: "Server error updating role" });
  }
});

// PUT /api/admin/users/:id/access
router.put("/users/:id/access", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.email === "vasu@gmail.com") return res.status(400).json({ message: "Cannot modify master admin access" });
    
    const newAccessStatus = req.body.accessStatus || 'approved';
    user.accessStatus = newAccessStatus;
    
    // If approving access, also set trackingAccess to true and activate pending requests
    if (newAccessStatus === 'approved') {
      user.trackingAccess = true;
      
      // Auto-activate any pending tracking requests for this user
      await TrackingRequest.update(
        { status: "active" },
        { 
          where: { 
            userId: user.id, 
            status: "pending" 
          } 
        }
      );
    }
    
    await user.save();
    res.json({ message: "Access status updated successfully", user: user.toSafeJSON() });
  } catch (error) {
    console.error("Update access error:", error);
    res.status(500).json({ message: "Server error updating access status" });
  }
});

// DELETE /api/admin/users/:id
router.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.email === "vasu@gmail.com") return res.status(400).json({ message: "Cannot delete master admin" });
    
    await user.destroy(); // Associated tracking requests will cascade
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error deleting user" });
  }
});

// GET /api/admin/access-requests
router.get("/access-requests", async (req, res) => {
  try {
    const requests = await AccessRequest.findAll({
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(requests);
  } catch (error) {
    console.error("Fetch access requests error:", error);
    res.status(500).json({ message: "Server error fetching access requests" });
  }
});

// PUT /api/admin/access-requests/:id
router.put("/access-requests/:id", async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const request = await AccessRequest.findByPk(req.params.id, {
      include: [{ model: User, as: "user" }],
    });

    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = status;
    if (status === "rejected") {
      request.rejectionReason = rejectionReason || "No specific reason provided.";
    }
    await request.save();

    // If approved, grant tracking access to the associated user
    if (status === "approved") {
      const user = request.user;
      user.trackingAccess = true;
      await user.save();

      // Auto-activate any pending tracking requests for this user
      await TrackingRequest.update(
        { status: "active" },
        { 
          where: { 
            userId: user.id, 
            status: "pending" 
          } 
        }
      );

      await sendEmail({
        to: user.email,
        subject: "Location Tracker: Access Approved!",
        html: `<h3>Hello ${user.name},</h3><p>Good news! Your request for location tracking access has been <strong>approved</strong>.</p><p>You can now log in and start generating secure tracking links immediately.</p>`,
      });
    } else if (status === "rejected") {
      await sendEmail({
        to: request.user.email,
        subject: "Location Tracker: Access Request Update",
        html: `<h3>Hello ${request.user.name},</h3><p>Your recent request for location tracking access was reviewed and unfortunately <strong>not approved</strong> at this time.</p><p>Reason provided: <em>${request.rejectionReason}</em></p><p>You may submit a new request via the platform if circumstances change.</p>`,
      });
    }

    res.json({ message: `Request successfully marked as ${status}`, request });
  } catch (error) {
    console.error("Update access request error:", error);
    res.status(500).json({ message: "Server error processing access request" });
  }
});

// GET /api/admin/tracking-sessions
router.get("/tracking-sessions", async (req, res) => {
  try {
    const sessions = await TrackingRequest.findAll({
      include: [{ model: User, as: "user", attributes: ["name", "email"] }],
      order: [["updatedAt", "DESC"]],
    });
    res.json(sessions);
  } catch (error) {
    console.error("Fetch tracking sessions error:", error);
    res.status(500).json({ message: "Server error fetching tracking sessions" });
  }
});

// DELETE /api/admin/tracking-sessions/:id
router.delete("/tracking-sessions/:id", async (req, res) => {
  try {
    const session = await TrackingRequest.findByPk(req.params.id);
    if (!session) return res.status(404).json({ message: "Tracking session not found" });
    
    await session.destroy();
    res.json({ message: "Tracking session proactively terminated." });
  } catch (error) {
    console.error("Delete tracking session error:", error);
    res.status(500).json({ message: "Server error deleting tracking session" });
  }
});

// POST /api/admin/user-credentials
// Requires re-authentication: admin must supply their email & password again
// Returns all users' emails and plain-text passwords
const bcrypt = require("bcryptjs");

// In-memory lockout tracker for credentials route
const credentialLockouts = {};

router.post("/user-credentials", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // Check lockout status based on email
    const now = Date.now();
    const lockoutData = credentialLockouts[email];
    
    if (lockoutData && lockoutData.lockedUntil && now < lockoutData.lockedUntil) {
      const remainingMinutes = Math.ceil((lockoutData.lockedUntil - now) / 60000);
      return res.status(403).json({ 
        message: `Too many failed attempts. This section is locked for ${remainingMinutes} more minute(s).` 
      });
    }

    // Helper to handle failed attempts
    const handleFailedAttempt = () => {
      if (!credentialLockouts[email]) {
        credentialLockouts[email] = { attempts: 1, lockedUntil: null };
      } else {
        credentialLockouts[email].attempts += 1;
      }

      const attempts = credentialLockouts[email].attempts;
      
      if (attempts >= 5) {
        credentialLockouts[email].lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins
        return res.status(403).json({ 
          message: "Too many failed attempts. This section is locked for 15 minutes." 
        });
      }

      return res.status(403).json({ 
        message: `Invalid admin credentials. You have ${5 - attempts} attempt(s) remaining.` 
      });
    };

    // Re-verify admin identity (must be the master admin)
    const admin = await User.findOne({ where: { email } });
    if (!admin || admin.email !== "vasu@gmail.com") {
      return handleFailedAttempt();
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return handleFailedAttempt();
    }

    // On success, reset attempts
    if (credentialLockouts[email]) {
      credentialLockouts[email].attempts = 0;
      credentialLockouts[email].lockedUntil = null;
    }

    // Fetch all users with their plain passwords
    const users = await User.findAll({
      attributes: ["id", "name", "email", "plainPassword", "role", "createdAt", "lastLoginAt"],
      order: [["createdAt", "DESC"]],
    });

    res.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      password: u.plainPassword || "—",
      role: u.role,
      joinedAt: u.createdAt,
      lastLogin: u.lastLoginAt,
    })));
  } catch (error) {
    console.error("User credentials endpoint error:", error);
    res.status(500).json({ message: "Server error fetching credentials." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/analytics  — Premium real-time analytics endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.get("/analytics", async (req, res) => {
  try {
    const { range = "7" } = req.query; // "7", "30", "90"
    const days = parseInt(range) || 7;

    const now = new Date();

    // ── Helper: start of a day offset from today ───────────────────────────
    const dayStart = (offsetDays) => {
      const d = new Date(now);
      d.setDate(d.getDate() - offsetDays);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    const rangeStart   = dayStart(days - 1);
    const prevStart    = dayStart(days * 2 - 1);
    const prevEnd      = dayStart(days);
    const todayStart   = dayStart(0);
    const weekAgo      = dayStart(7);

    // ── 1. Stat Cards ──────────────────────────────────────────────────────
    const [
      totalUsers,
      todaySignups,
      prevWeekSignups,
      todayTracking,
      prevWeekTracking,
      activeNow,
    ] = await Promise.all([
      User.count().catch(() => 0),
      User.count({ where: { createdAt: { [Op.gte]: todayStart } } }).catch(() => 0),
      User.count({ where: { createdAt: { [Op.between]: [weekAgo, todayStart] } } }).catch(() => 0),
      TrackingRequest.count({ where: { createdAt: { [Op.gte]: todayStart } } }).catch(() => 0),
      TrackingRequest.count({ where: { createdAt: { [Op.between]: [weekAgo, todayStart] } } }).catch(() => 0),
      TrackingRequest.count({ where: { status: "active", sharerOnline: true } }).catch(() => 0),
    ]);

    // Previous period totals for weekly change  
    const [prevTotalUsers] = await Promise.all([
      User.count({ where: { createdAt: { [Op.lt]: todayStart } } }).catch(() => 0),
    ]);

    const pct = (curr, prev) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

    const stats = {
      totalUsers,
      todaySignups,
      todayTrackingRequests: todayTracking,
      activeNow,
      weeklyChange: {
        signups:  pct(todaySignups,  prevWeekSignups),
        tracking: pct(todayTracking, prevWeekTracking),
        users:    pct(totalUsers,    prevTotalUsers > 0 ? prevTotalUsers : 1),
        activeNow: 0,
      },
    };

    // ── 2. Chart Data (grouped by day) ────────────────────────────────────
    const [recentUsers, recentRequests] = await Promise.all([
      User.findAll({ where: { createdAt: { [Op.gte]: rangeStart } }, attributes: ["createdAt"] }),
      TrackingRequest.findAll({ where: { createdAt: { [Op.gte]: rangeStart } }, attributes: ["createdAt"] }),
    ]);

    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      chartData.push({
        date: dateStr,
        day: dayName,
        signups: recentUsers.filter(u => u.createdAt.toISOString().split("T")[0] === dateStr).length,
        trackingRequests: recentRequests.filter(r => r.createdAt.toISOString().split("T")[0] === dateStr).length,
      });
    }

    // ── 3. Heatmap (hour × weekday) ───────────────────────────────────────
    // We query last 90 days of data for a useful heatmap
    const heatmapCutoff = dayStart(89);
    const [hmUsers, hmReqs] = await Promise.all([
      User.findAll({ where: { createdAt: { [Op.gte]: heatmapCutoff } }, attributes: ["createdAt"] }),
      TrackingRequest.findAll({ where: { createdAt: { [Op.gte]: heatmapCutoff } }, attributes: ["createdAt"] }),
    ]);
    const heatGrid = {};
    const allEvents = [...hmUsers.map(r => r.createdAt), ...hmReqs.map(r => r.createdAt)];
    allEvents.forEach(dt => {
      const day  = dt.getDay();   // 0=Sun … 6=Sat
      const hour = dt.getHours(); // 0-23
      const key  = `${day}_${hour}`;
      heatGrid[key] = (heatGrid[key] || 0) + 1;
    });
    const heatmapData = [];
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmapData.push({ day: d, hour: h, count: heatGrid[`${d}_${h}`] || 0 });
      }
    }

    // ── 4. Geo Data (from tracking requests ipCountry) ────────────────────
    const geoRaw = await TrackingRequest.findAll({
      attributes: ["ipCountry"],
      where: { ipCountry: { [Op.ne]: null } },
    });
    const geoMap = {};
    geoRaw.forEach(r => {
      const c = (r.ipCountry || "").trim().toUpperCase().slice(0, 2);
      if (c) geoMap[c] = (geoMap[c] || 0) + 1;
    });
    const geoData = Object.entries(geoMap).map(([country, count]) => ({ country, count }));

    // ── 5. Live Events (last 20 from ActivityLog) ─────────────────────────
    const liveEvents = await ActivityLog.findAll({
      order: [["createdAt", "DESC"]],
      limit: 20,
      attributes: ["id", "type", "label", "detail1", "detail2", "createdAt"],
    });

    // ── 6. User Journey Funnel ────────────────────────────────────────────
    const [visited, signedup, usedTracking, returned] = await Promise.all([
      User.count(),                                                                   // visited ≈ all signups (proxy)
      User.count(),                                                                   // signed up
      User.count({ where: { trackingAccess: true } }),                               // used tracking
      User.count({ where: { lastLoginAt: { [Op.gte]: dayStart(30) } } }),            // returned in 30d
    ]);
    const funnel = [
      { stage: "Visited",         count: Math.round(signedup * 3.4) },
      { stage: "Signed Up",       count: signedup },
      { stage: "Used Tracking",   count: usedTracking },
      { stage: "Returned",        count: returned },
    ];

    // ── 7. Anomaly Detection ─────────────────────────────────────────────
    const anomalies = [];
    if (chartData.length >= 3) {
      const avg = chartData.reduce((s, d) => s + d.signups + d.trackingRequests, 0) / chartData.length;
      const latest = chartData[chartData.length - 1];
      const latestTotal = latest.signups + latest.trackingRequests;
      if (avg > 0 && latestTotal >= avg * 3) {
        anomalies.push({
          severity: "high",
          message: `⚠️ ${Math.round((latestTotal / avg - 1) * 100)}% activity spike detected on ${latest.day} — possible campaign or bot activity`,
        });
      }
      // Check for any individual day spike in chart
      chartData.forEach(d => {
        const total = d.signups + d.trackingRequests;
        if (avg > 0 && total >= avg * 3.4 && d.date !== latest.date) {
          anomalies.push({
            severity: "medium",
            message: `⚠️ Unusual spike on ${d.day} (${d.date}) — ${total} events vs avg ${Math.round(avg)}`,
          });
        }
      });
    }

    res.json({ stats, chartData, heatmapData, geoData, liveEvents, funnel, anomalies });
  } catch (error) {
    console.error("Analytics endpoint error:", error);
    res.status(500).json({ message: "Failed to fetch analytics data" });
  }
});

module.exports = router;

