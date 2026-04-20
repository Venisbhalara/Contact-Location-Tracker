// Migration: add last_known_ip column to tracking_requests
require('dotenv').config();
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: false
});

(async () => {
  try {
    await seq.authenticate();
    console.log('DB connected');

    // Check if column already exists
    const [cols] = await seq.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tracking_requests' AND COLUMN_NAME = 'last_known_ip'",
      { replacements: [process.env.DB_NAME] }
    );

    if (cols.length > 0) {
      console.log('Column last_known_ip already exists — skipping.');
    } else {
      await seq.query('ALTER TABLE tracking_requests ADD COLUMN last_known_ip VARCHAR(64) NULL DEFAULT NULL');
      console.log('SUCCESS: Column last_known_ip added to tracking_requests');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await seq.close();
  }
})();
