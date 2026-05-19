const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/auth");
const {
  createGroup,
  addGroupMember,
  removeGroupMember,
  getGroupDetails,
  getUserGroups,
  deleteGroup,
} = require("../controllers/groupController");

// ─── Validation ───────────────────────────────────────────────

const createGroupValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Group name is required")
    .isLength({ min: 1, max: 100 }).withMessage("Group name must be 1–100 characters"),
  body("expiryHours")
    .optional()
    .isInt({ min: 1, max: 720 }).withMessage("Expiry must be between 1 and 720 hours"),
];

const addMemberValidation = [
  body("phoneNumber")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .isLength({ min: 7, max: 20 }).withMessage("Phone must be between 7 and 20 characters"),
  body("label")
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage("Label must be 50 characters or less"),
];

// ─── Routes ───────────────────────────────────────────────────

// GET  /api/groups                          — List all user's groups
router.get("/", protect, getUserGroups);

// POST /api/groups                          — Create a new group
router.post("/", protect, createGroupValidation, createGroup);

// GET  /api/groups/:groupId                 — Get group details + members
router.get("/:groupId", protect, getGroupDetails);

// DELETE /api/groups/:groupId               — Delete group + all members
router.delete("/:groupId", protect, deleteGroup);

// POST /api/groups/:groupId/members         — Add a member to a group
router.post("/:groupId/members", protect, addMemberValidation, addGroupMember);

// DELETE /api/groups/:groupId/members/:memberId — Remove a member
router.delete("/:groupId/members/:memberId", protect, removeGroupMember);

module.exports = router;
