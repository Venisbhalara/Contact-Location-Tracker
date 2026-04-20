/**
 * add_neural_ping_columns.js
 *
 * Migration script: adds the Neural Ping columns to tracking_requests table.
 * Run this ONCE with: node add_neural_ping_columns.js
 * This avoids Sequelize's alter:true which hits MySQL's 64-key limit.
 */
require("dotenv").config();
const sequelize = require("./config/db");

const columns = [
  {
    name: "location_mode",
    sql: "ENUM('gps','ip','offline') NOT NULL DEFAULT 'offline'",
  },
  {
    name: "sharer_online",
    sql: "TINYINT(1) NOT NULL DEFAULT 0",
  },
  {
    name: "ip_latitude",
    sql: "DECIMAL(11,8) NULL DEFAULT NULL",
  },
  {
    name: "ip_longitude",
    sql: "DECIMAL(12,8) NULL DEFAULT NULL",
  },
  {
    name: "ip_city",
    sql: "VARCHAR(100) NULL DEFAULT NULL",
  },
  {
    name: "ip_region",
    sql: "VARCHAR(100) NULL DEFAULT NULL",
  },
  {
    name: "ip_country",
    sql: "VARCHAR(100) NULL DEFAULT NULL",
  },
  {
    name: "ip_isp",
    sql: "VARCHAR(255) NULL DEFAULT NULL",
  },
  {
    name: "last_ip_updated_at",
    sql: "DATETIME NULL DEFAULT NULL",
  },
];

async function run() {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connected");

    // Check existing columns
    const [rows] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tracking_requests'`
    );
    const existingCols = rows.map((r) => r.COLUMN_NAME.toLowerCase());

    let added = 0;
    for (const col of columns) {
      if (existingCols.includes(col.name)) {
        console.log(`  ⏭️  Skipping '${col.name}' — already exists`);
        continue;
      }
      await sequelize.query(
        `ALTER TABLE tracking_requests ADD COLUMN \`${col.name}\` ${col.sql}`
      );
      console.log(`  ✅ Added column: ${col.name}`);
      added++;
    }

    console.log(`\n🎉 Migration complete! Added ${added} new column(s).`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

run();
