const { ActivityLog } = require("../models/index");

/**
 * Logs an activity to the DB and emits it to admin dashboard
 * @param {Object} io - Socket.io instance (e.g. req.app.get('io') or global io)
 * @param {Object} params - The activity details
 */
const logActivity = async (io, params) => {
  try {
    const { type, label, detail1, detail2, color, alert, userId } = params;

    // 1. Save to DB
    const newLog = await ActivityLog.create({
      type,
      label,
      detail1,
      detail2,
      color: color || "border-[#3B82F6]",
      alert: alert || false,
      userId: userId || null,
    });

    // 2. Format it precisely for the frontend
    // The frontend expects: { id, time, label, detail1, detail2, color, alert }
    // We compute a relative "time" on the frontend, but we pass ISO string
    
    const formattedEvent = {
      id: newLog.id,
      time: newLog.createdAt,
      label: newLog.label,
      detail1: newLog.detail1,
      detail2: newLog.detail2,
      color: newLog.color,
      alert: newLog.alert,
    };

    // 3. Emit to all admins connected to the 'admin_global' room
    if (io) {
      io.to("admin_global").emit("live-activity", formattedEvent);
    }
  } catch (error) {
    console.error("Error logging activity:", error.message);
  }
};

module.exports = logActivity;
