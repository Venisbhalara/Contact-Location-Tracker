const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id",
    },
    orderId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "order_id",
    },
    paymentId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "payment_id",
    },
    signature: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: "INR",
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "created", // created, paid, failed
    },
    planDetails: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "plan_details",
    },
  },
  {
    tableName: "payments",
    timestamps: true,
  }
);

module.exports = Payment;
