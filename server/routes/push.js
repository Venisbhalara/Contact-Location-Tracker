const express = require("express");
const router = express.Router();
const {
  subscribePush,
  pingUser,
  reportGpsRestored,
  markSharerOnline,
} = require("../controllers/pushController");

// POST /api/push/subscribe    — Target user subscribes to background pings
router.post("/subscribe", subscribePush);

// POST /api/push/ping         — Admin manually pings the user (visible notification)
router.post("/ping", pingUser);

// (IP Report route removed)

// POST /api/push/gps-report   — Called by the main window when GPS is re-enabled.
//                              Updates DB with fresh precise coordinates.
router.post("/gps-report", reportGpsRestored);

// POST /api/push/sharer-online — Called when sharer's socket reconnects.
router.post("/sharer-online", markSharerOnline);

module.exports = router;
