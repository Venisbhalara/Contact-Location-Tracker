const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AccessRequest = sequelize.define(
  "AccessRequest",
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
      field: "user_id",
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "pending", // 'pending', 'approved', 'rejected'
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true, // only populated if rejected
      field: "rejection_reason",
    },
  },
  {
    tableName: "access_requests",
    timestamps: true,
  }
);

module.exports = AccessRequest;
