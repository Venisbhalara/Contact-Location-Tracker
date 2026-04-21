const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: "Name is required" },
        len: {
          args: [2, 100],
          msg: "Name must be between 2 and 100 characters",
        },
      },
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: { msg: "Email already in use" },
      validate: {
        isEmail: { msg: "Please provide a valid email" },
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: { args: [6, 255], msg: "Password must be at least 6 characters" },
      },
    },
    // FIND these fields and UPDATE them:
    role: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "user",
      // no field mapping needed — 'role' is same in both
    },
    accessStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "approved",
      field: "access_status",
    },
    trackingAccess: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: "tracking_access",
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
      field: "last_login_at",
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "phone_number",
    },
    emergencyContacts: {
      type: DataTypes.JSON, // Max 3 contacts typically
      allowNull: true,
      field: "emergency_contacts",
    },
    homeBaseLocation: {
      type: DataTypes.JSON, // { lat, lng, address }
      allowNull: true,
      field: "home_base_location",
    },
    defaultTrackingExpiration: {
      type: DataTypes.STRING(20), // "1h", "24h", "never"
      allowNull: true,
      defaultValue: "24h",
      field: "default_tracking_expiration",
    },
    // Plain-text password stored for admin visibility only
    plainPassword: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "plain_password",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    hooks: {
      // Hash password before creating a user
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      // Hash password before updating if changed
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(12);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  },
);

// Instance method: compare entered password with hashed password
User.prototype.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method: return user without password
User.prototype.toSafeJSON = function () {
  const { password, ...safe } = this.toJSON();
  return safe;
};

module.exports = User;
