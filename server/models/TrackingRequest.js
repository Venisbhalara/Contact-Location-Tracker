const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const TrackingRequest = sequelize.define(
  "TrackingRequest",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Phone number is required" },
      },
    },
    trackingType: {
      type: DataTypes.ENUM("location"),
      allowNull: false,
      defaultValue: "location",
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      defaultValue: null,
    },
    longitude: {
      type: DataTypes.DECIMAL(12, 8),
      allowNull: true,
      defaultValue: null,
    },
    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "completed", "expired"),
      allowNull: false,
      defaultValue: "pending",
    },
    // ── Neural Ping / Stitch-and-Switch fields ──────────────────────────────
    // locationMode: how the last known location was obtained
    locationMode: {
      type: DataTypes.ENUM("gps", "ip", "offline"),
      allowNull: false,
      defaultValue: "offline",
    },
    // sharerOnline: true when the sharer's socket is connected
    sharerOnline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // IP-based fallback location (approximate, from mobile internet)
    ipLatitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      defaultValue: null,
    },
    ipLongitude: {
      type: DataTypes.DECIMAL(12, 8),
      allowNull: true,
      defaultValue: null,
    },
    ipCity: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    ipRegion: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    ipCountry: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    ipIsp: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    // Timestamp of the last successful IP-based location fetch
    lastIpUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    lastUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    pushSubscription: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
    },
    // lastKnownIp: the sharer's real IP from their last location update call.
    // Captured passively on every REST POST to /api/tracking/update-location.
    // Used for instant IP-based geolocation when they go offline (no push needed).
    lastKnownIp: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "tracking_requests",
    timestamps: true,
    // Note: indexes are omitted here to avoid MySQL's 64-key-per-table limit during
    // alter:true sync. The token uniqueness is enforced by the field's unique:true property.
  },
);

module.exports = TrackingRequest;
