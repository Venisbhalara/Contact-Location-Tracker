/**
 * sync_db.js
 * 
 * UNIVERSAL DATABASE SYNCHRONIZER
 * Use this script to bring the live database schema in sync with the current models.
 * It adds missing columns and creates missing tables safely.
 */
require("dotenv").config();
const sequelize = require("./config/db");
const { User, TrackingRequest, ActivityLog, AccessRequest } = require("./models/index");

const TABLES = {
  users: [
    { name: "role", sql: "VARCHAR(20) DEFAULT 'user'" },
    { name: "access_status", sql: "VARCHAR(20) DEFAULT 'approved'" },
    { name: "tracking_access", sql: "TINYINT(1) DEFAULT 0" },
    { name: "last_login_at", sql: "DATETIME DEFAULT NULL" },
    { name: "phone_number", sql: "VARCHAR(20) DEFAULT NULL" },
    { name: "emergency_contacts", sql: "JSON DEFAULT NULL" },
    { name: "home_base_location", sql: "JSON DEFAULT NULL" },
    { name: "default_tracking_expiration", sql: "VARCHAR(20) DEFAULT '24h'" },
    { name: "plain_password", sql: "VARCHAR(255) DEFAULT NULL" },
  ],
  tracking_requests: [
    { name: "location_mode", sql: "ENUM('gps', 'ip', 'offline') NOT NULL DEFAULT 'offline'" },
    { name: "sharer_online", sql: "TINYINT(1) NOT NULL DEFAULT 0" },
    { name: "ip_latitude", sql: "DECIMAL(11, 8) DEFAULT NULL" },
    { name: "ip_longitude", sql: "DECIMAL(12, 8) DEFAULT NULL" },
    { name: "ip_city", sql: "VARCHAR(100) DEFAULT NULL" },
    { name: "ip_region", sql: "VARCHAR(100) DEFAULT NULL" },
    { name: "ip_country", sql: "VARCHAR(100) DEFAULT NULL" },
    { name: "ip_isp", sql: "VARCHAR(255) DEFAULT NULL" },
    { name: "last_ip_updated_at", sql: "DATETIME DEFAULT NULL" },
    { name: "push_subscription", sql: "JSON DEFAULT NULL" },
    { name: "last_known_ip", sql: "VARCHAR(64) DEFAULT NULL" },
    { name: "last_updated_at", sql: "DATETIME DEFAULT NULL" },
  ]
};

async function sync() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected.");

    // 1. Ensure tables exist (sync them)
    console.log("📦 Syncing tables...");
    await sequelize.sync(); 
    console.log("✅ Tables checked/created.");

    // 2. Add missing columns manually (to overcome alter:true limitations)
    for (const [tableName, columns] of Object.entries(TABLES)) {
      console.log(`\n🔍 Checking table: ${tableName}`);
      
      const [rows] = await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tableName}'`
      );
      const existingCols = rows.map((r) => r.COLUMN_NAME.toLowerCase());

      for (const col of columns) {
        if (existingCols.includes(col.name.toLowerCase())) {
          console.log(`  ⏭️  Column '${col.name}' already exists. Skipping.`);
          continue;
        }

        try {
          console.log(`  🔨 Adding column: ${col.name}...`);
          await sequelize.query(`ALTER TABLE ${tableName} ADD COLUMN \`${col.name}\` ${col.sql}`);
          console.log(`  ✅ Added column: ${col.name}`);

          // If the column has a default value, also update existing rows to that default
          if (col.sql.toUpperCase().includes("DEFAULT")) {
            let defVal = col.sql.match(/DEFAULT\s+([^ ]+)/i)?.[1];
            if (defVal && defVal.toUpperCase() !== 'NULL') {
              console.log(`  🔨 Initializing existing rows for '${col.name}' with ${defVal}...`);
              await sequelize.query(`UPDATE ${tableName} SET \`${col.name}\` = ${defVal} WHERE \`${col.name}\` IS NULL`);
            }
          }
        } catch (colErr) {
          console.error(`  ❌ Failed to add '${col.name}':`, colErr.message);
        }
      }
    }

    console.log("\n✨ Database synchronization complete!");
    process.exit(0);
  } catch (err) {
    console.error("\n💥 FATAL ERROR during sync:", err.message);
    process.exit(1);
  }
}

sync();
