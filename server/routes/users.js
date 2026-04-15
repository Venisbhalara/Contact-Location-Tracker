const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
} = require("../controllers/usersController");
const { protect } = require("../middleware/auth");

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/update-password", protect, updateUserPassword);
router.delete("/delete-account", protect, deleteUserAccount);

module.exports = router;
