const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Pre-defined color palette for group members (auto-assigned, max 5)
const MEMBER_COLORS = [
  "#22c55e", // Emerald
  "#38bdf8", // Sky Blue
  "#f59e0b", // Amber
  "#fb7185", // Rose
  "#a78bfa", // Violet
];

const GroupMember = sequelize.define(
  "GroupMember",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "groups",
        key: "id",
      },
      onDelete: "CASCADE",
      field: "group_id",
    },
    trackingRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "tracking_requests",
        key: "id",
      },
      onDelete: "CASCADE",
      field: "tracking_request_id",
    },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Member",
      validate: {
        notEmpty: { msg: "Member label is required" },
        len: { args: [1, 50], msg: "Label must be between 1 and 50 characters" },
      },
    },
    color: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "#22c55e",
    },
  },
  {
    tableName: "group_members",
    timestamps: true,
  }
);

GroupMember.MEMBER_COLORS = MEMBER_COLORS;

module.exports = GroupMember;
