const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { User, TrackingRequest, AccessRequest } = require("../models/index");
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

    res.json({
      totalUsers,
      activeSessions,
      pendingApprovals,
      locationUpdatesToday,
      newSignups24h,
      activityChart,
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
    
    user.accessStatus = req.body.accessStatus || 'approved';
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

module.exports = router;
