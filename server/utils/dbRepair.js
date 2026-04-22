/**
 * utils/dbRepair.js
 * 
 * Automatically ensures all required columns exist in the database.
 * This runs every time the server starts to prevent "Unknown column" errors.
 */
const sequelize = require("../config/db");

const tablesToRepair = [
  {
    tableName: "tracking_requests",
    columns: [
      { name: "user_id", sql: "INT NOT NULL AFTER id" },
      { name: "phone_number", sql: "VARCHAR(20) NOT NULL AFTER user_id" },
      { name: "tracking_type", sql: "ENUM('location') NOT NULL DEFAULT 'location' AFTER phone_number" },
      { name: "location_mode", sql: "ENUM('gps','ip','offline') NOT NULL DEFAULT 'offline'" },
      { name: "sharer_online", sql: "TINYINT(1) NOT NULL DEFAULT 0" },
      { name: "ip_latitude", sql: "DECIMAL(11,8) NULL DEFAULT NULL" },
      { name: "ip_longitude", sql: "DECIMAL(12,8) NULL DEFAULT NULL" },
      { name: "ip_city", sql: "VARCHAR(100) NULL DEFAULT NULL" },
      { name: "ip_region", sql: "VARCHAR(100) NULL DEFAULT NULL" },
      { name: "ip_country", sql: "VARCHAR(100) NULL DEFAULT NULL" },
      { name: "ip_isp", sql: "VARCHAR(255) NULL DEFAULT NULL" },
      { name: "last_ip_updated_at", sql: "DATETIME NULL DEFAULT NULL" },
      { name: "push_subscription", sql: "JSON NULL DEFAULT NULL" },
      { name: "last_known_ip", sql: "VARCHAR(64) NULL DEFAULT NULL" }
    ]
  },
  {
    tableName: "access_requests",
    columns: [
      { name: "user_id", sql: "INT NOT NULL AFTER id" },
      { name: "rejection_reason", sql: "TEXT NULL AFTER status" }
    ]
  },
  {
    tableName: "activity_logs",
    columns: [
      { name: "user_id", sql: "INT NULL AFTER alert" }
    ]
  }
];

async function runMigrations() {
  try {
    for (const table of tablesToRepair) {
      // Check existing columns
      const [rows] = await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table.tableName}'`
      );
      
      if (rows.length === 0) continue; // Table doesn't exist yet

      const existingCols = rows.map((r) => r.COLUMN_NAME.toLowerCase());

      for (const col of table.columns) {
        if (!existingCols.includes(col.name)) {
          console.log(`[Database Repair] ➕ Adding missing column: ${table.tableName}.${col.name}`);
          await sequelize.query(
            `ALTER TABLE ${table.tableName} ADD COLUMN \`${col.name}\` ${col.sql}`
          );
        }
      }
    }
  } catch (err) {
    console.warn("[Database Repair] Warning: Could not complete auto-migration:", err.message);
  }
}

module.exports = runMigrations;
