const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ActivityLog = sequelize.define("ActivityLog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    // e.g., 'signup', 'login', 'tracking_start', 'failed_login', 'pending_access'
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  detail1: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  detail2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'border-[#3B82F6]',
  },
  alert: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "user_id",
  }
});

module.exports = ActivityLog;
