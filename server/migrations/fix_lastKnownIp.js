require("dotenv").config();
const { Sequelize } = require("sequelize");

const seq = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

(async () => {
  try {
    await seq.authenticate();
    // Rename column (dropping last_known_ip and adding lastKnownIp)
    await seq.query(
      "ALTER TABLE tracking_requests CHANGE last_known_ip lastKnownIp VARCHAR(64) NULL DEFAULT NULL"
    );
    console.log("Column renamed from last_known_ip to lastKnownIp");
  } catch (err) {
    if (err.message.includes("Unknown column 'last_known_ip'")) {
      try {
        await seq.query(
          "ALTER TABLE tracking_requests ADD COLUMN lastKnownIp VARCHAR(64) NULL DEFAULT NULL"
        );
        console.log("Column lastKnownIp added directly.");
      } catch (e2) {
        console.log("lastKnownIp already exists or error:", e2.message);
      }
    } else {
      console.error("Migration failed:", err.message);
    }
  } finally {
    await seq.close();
  }
})();
