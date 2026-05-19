const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");
const { Group, GroupMember, TrackingRequest, User } = require("../models");
const { Op } = require("sequelize");
const logActivity = require("../utils/activityLogger");

const MAX_MEMBERS = 5;

// Helper: build the shareable tracking link for a member
const buildTrackingLink = (req, token) => {
  let baseUrl = process.env.CLIENT_URL || "";
  const requestOrigin =
    req.get("origin") ||
    (req.get("host") ? `${req.protocol}://${req.get("host")}` : null);
  const isLocalRequest =
    requestOrigin &&
    (requestOrigin.includes("localhost") ||
      requestOrigin.match(/\d+\.\d+\.\d+\.\d+/));
  if (
    requestOrigin &&
    (!baseUrl ||
      baseUrl.includes("localhost") ||
      baseUrl.match(/\d+\.\d+\.\d+\.\d+/) ||
      isLocalRequest)
  ) {
    baseUrl = requestOrigin;
  }
  return `${baseUrl.replace(/\/$/, "")}/track/${token}`;
};

// ─── POST /api/groups ─────────────────────────────────────────
// Create a new group (no balance deducted at creation)
const createGroup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });

  const { name, description, expiryHours = 24 } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    // User must have approved tracking access
    if (!user.trackingAccess) {
      return res.status(403).json({
        message: "You don't have tracking access yet. Please await admin approval.",
        code: "NO_TRACKING_ACCESS",
      });
    }

    const expiresAt = new Date(
      Date.now() + parseInt(expiryHours) * 60 * 60 * 1000
    );

    const group = await Group.create({
      userId: req.user.id,
      name: name.trim(),
      description: description?.trim() || null,
      status: "active",
      expiresAt,
    });

    await logActivity(req.app.get("io"), {
      type: "group_created",
      label: "Group Created",
      detail1: `user_${user.id}`,
      detail2: `group "${group.name}" (id: ${group.id})`,
      color: "border-[#7C6FFF]",
      userId: user.id,
    });

    res.status(201).json({
      message: "Group created successfully!",
      group: { ...group.toJSON(), members: [] },
    });
  } catch (error) {
    console.error("Create group error:", error.message);
    res.status(500).json({ message: "Server error while creating group.", error: error.message });
  }
};

// ─── POST /api/groups/:groupId/members ────────────────────────
// Add a member to a group (deducts 1 credit per member)
const addGroupMember = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ message: errors.array()[0].msg });

  const { groupId } = req.params;
  const { phoneNumber, label, expiryHours } = req.body;

  try {
    // Load the group
    const group = await Group.findOne({
      where: { id: groupId, userId: req.user.id, status: "active" },
      include: [{ model: GroupMember, as: "members" }],
    });

    if (!group)
      return res.status(404).json({ message: "Group not found or you don't own it." });

    // Check expiry
    if (group.expiresAt && new Date() > group.expiresAt)
      return res.status(400).json({ message: "This group session has expired." });

    // Enforce max 5 members
    if (group.members.length >= MAX_MEMBERS) {
      return res.status(400).json({
        message: `Maximum ${MAX_MEMBERS} members allowed per group.`,
        code: "MAX_MEMBERS_REACHED",
      });
    }

    // Check user's balance
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.trackingBalance <= 0) {
      return res.status(403).json({
        message: "Insufficient tracking balance. Please recharge your plan.",
        code: "INSUFFICIENT_BALANCE",
      });
    }

    // Auto-assign a color based on position
    const usedColors = group.members.map((m) => m.color);
    const COLORS = GroupMember.MEMBER_COLORS;
    const color = COLORS.find((c) => !usedColors.includes(c)) || COLORS[group.members.length % COLORS.length];

    // Create an individual tracking request for this member
    const token = uuidv4();
    const memberExpiry = expiryHours
      ? new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000)
      : group.expiresAt;

    const trackingRequest = await TrackingRequest.create({
      userId: req.user.id,
      phoneNumber: phoneNumber.trim(),
      label: label?.trim() || "Member",
      trackingType: "location",
      token,
      status: "active",
      expiresAt: memberExpiry,
    });

    // Link this tracking request to the group
    const groupMember = await GroupMember.create({
      groupId: group.id,
      trackingRequestId: trackingRequest.id,
      label: label?.trim() || "Member",
      color,
    });

    // Deduct 1 credit
    user.trackingBalance -= 1;
    await user.save();

    const trackingLink = buildTrackingLink(req, token);

    res.status(201).json({
      message: "Member added successfully!",
      member: {
        id: groupMember.id,
        label: groupMember.label,
        color: groupMember.color,
        phoneNumber,
        token,
        trackingLink,
        status: "active",
        trackingRequestId: trackingRequest.id,
      },
      newBalance: user.trackingBalance,
    });
  } catch (error) {
    console.error("Add group member error:", error.message);
    res.status(500).json({ message: "Server error while adding member.", error: error.message });
  }
};

// ─── DELETE /api/groups/:groupId/members/:memberId ───────────
// Remove a member from the group
const removeGroupMember = async (req, res) => {
  const { groupId, memberId } = req.params;

  try {
    const group = await Group.findOne({ where: { id: groupId, userId: req.user.id } });
    if (!group) return res.status(404).json({ message: "Group not found." });

    const member = await GroupMember.findOne({
      where: { id: memberId, groupId },
      include: [{ model: TrackingRequest, as: "trackingRequest" }],
    });

    if (!member) return res.status(404).json({ message: "Member not found." });

    const token = member.trackingRequest?.token;

    // Delete the underlying tracking request (cascades the GroupMember too)
    if (member.trackingRequest) {
      await member.trackingRequest.destroy();
    } else {
      await member.destroy();
    }

    // Notify any viewers that the tracking session ended
    const io = req.app.get("io");
    if (io && token) {
      io.to(token).emit("tracking-stopped", { token, reason: "member_removed" });
      io.to(`group:${groupId}`).emit("group-member-removed", { memberId: member.id });
    }

    res.status(200).json({ message: "Member removed successfully." });
  } catch (error) {
    console.error("Remove group member error:", error.message);
    res.status(500).json({ message: "Server error while removing member.", error: error.message });
  }
};

// ─── GET /api/groups/:groupId ─────────────────────────────────
// Get group details + all members + their last known positions
const getGroupDetails = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findOne({
      where: { id: groupId, userId: req.user.id },
      include: [
        {
          model: GroupMember,
          as: "members",
          include: [
            {
              model: TrackingRequest,
              as: "trackingRequest",
              attributes: [
                "id", "token", "phoneNumber", "label", "status",
                "latitude", "longitude", "accuracy",
                "locationMode", "sharerOnline",
                "ipLatitude", "ipLongitude", "ipCity", "ipCountry",
                "expiresAt", "lastUpdatedAt",
              ],
            },
          ],
        },
      ],
    });

    if (!group) return res.status(404).json({ message: "Group not found." });

    // Compute group-level status based on member activity
    const membersWithLinks = group.members.map((m) => ({
      id: m.id,
      label: m.label,
      color: m.color,
      groupId: m.groupId,
      trackingRequestId: m.trackingRequestId,
      phoneNumber: m.trackingRequest?.phoneNumber,
      token: m.trackingRequest?.token,
      status: m.trackingRequest?.status,
      latitude: m.trackingRequest?.latitude,
      longitude: m.trackingRequest?.longitude,
      accuracy: m.trackingRequest?.accuracy,
      locationMode: m.trackingRequest?.locationMode,
      sharerOnline: m.trackingRequest?.sharerOnline,
      ipLatitude: m.trackingRequest?.ipLatitude,
      ipLongitude: m.trackingRequest?.ipLongitude,
      ipCity: m.trackingRequest?.ipCity,
      ipCountry: m.trackingRequest?.ipCountry,
      expiresAt: m.trackingRequest?.expiresAt,
      lastUpdatedAt: m.trackingRequest?.lastUpdatedAt,
    }));

    res.status(200).json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        status: group.status,
        expiresAt: group.expiresAt,
        createdAt: group.createdAt,
        members: membersWithLinks,
      },
    });
  } catch (error) {
    console.error("Get group details error:", error.message);
    res.status(500).json({ message: "Server error while fetching group.", error: error.message });
  }
};

// ─── GET /api/groups ──────────────────────────────────────────
// List all groups for the logged-in user
const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: GroupMember,
          as: "members",
          include: [
            {
              model: TrackingRequest,
              as: "trackingRequest",
              attributes: ["status", "sharerOnline", "locationMode", "lastUpdatedAt"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const result = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      status: g.status,
      expiresAt: g.expiresAt,
      createdAt: g.createdAt,
      memberCount: g.members.length,
      activeMembers: g.members.filter((m) => m.trackingRequest?.sharerOnline).length,
      members: g.members.map((m) => ({
        id: m.id,
        label: m.label,
        color: m.color,
        status: m.trackingRequest?.status,
        sharerOnline: m.trackingRequest?.sharerOnline,
        locationMode: m.trackingRequest?.locationMode,
      })),
    }));

    res.status(200).json({ groups: result });
  } catch (error) {
    console.error("Get user groups error:", error.message);
    res.status(500).json({ message: "Server error while fetching groups.", error: error.message });
  }
};

// ─── DELETE /api/groups/:groupId ──────────────────────────────
// Delete a group and all its member tracking sessions
const deleteGroup = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findOne({
      where: { id: groupId, userId: req.user.id },
      include: [
        {
          model: GroupMember,
          as: "members",
          include: [{ model: TrackingRequest, as: "trackingRequest" }],
        },
      ],
    });

    if (!group) return res.status(404).json({ message: "Group not found." });

    const io = req.app.get("io");

    // Stop all individual tracking sessions
    for (const member of group.members) {
      if (member.trackingRequest) {
        const token = member.trackingRequest.token;
        await member.trackingRequest.destroy();
        if (io && token) {
          io.to(token).emit("tracking-stopped", { token, reason: "group_deleted" });
        }
      }
    }

    // Notify the group map room
    if (io) {
      io.to(`group:${groupId}`).emit("group-deleted", { groupId });
    }

    await group.destroy();

    res.status(200).json({ message: "Group deleted successfully." });
  } catch (error) {
    console.error("Delete group error:", error.message);
    res.status(500).json({ message: "Server error while deleting group.", error: error.message });
  }
};

module.exports = {
  createGroup,
  addGroupMember,
  removeGroupMember,
  getGroupDetails,
  getUserGroups,
  deleteGroup,
};
