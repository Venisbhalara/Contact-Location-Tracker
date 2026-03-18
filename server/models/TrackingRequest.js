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
      type: DataTypes.ENUM("contact", "location"),
      allowNull: false,
      defaultValue: "location",
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(11, 8), // 11 total = 3 before decimal (handles -90 to 90 safely)
      allowNull: true,
      defaultValue: null,
    },
    longitude: {
      type: DataTypes.DECIMAL(12, 8), // 12 total = 4 before decimal (handles -180 to 180 safely)
      allowNull: true,
      defaultValue: null,
    },

    accuracy: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM("pending", "active", "expired"),
      allowNull: false,
      defaultValue: "pending",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    lastUpdatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "tracking_requests",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["token"] },
      { fields: ["userId"] },
      { fields: ["status"] },
    ],
  },
);

// Instance method: check if tracking link is expired
TrackingRequest.prototype.isExpired = function () {
  return new Date() > new Date(this.expiresAt);
};

module.exports = TrackingRequest;
