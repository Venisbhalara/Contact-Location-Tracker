const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.toSafeJSON());
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      email,
      phoneNumber,
      emergencyContacts,
      homeBaseLocation,
      defaultTrackingExpiration,
    } = req.body;

    user.name = name || user.name;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber !== undefined ? phoneNumber : user.phoneNumber;
    user.emergencyContacts = emergencyContacts !== undefined ? emergencyContacts : user.emergencyContacts;
    user.homeBaseLocation = homeBaseLocation !== undefined ? homeBaseLocation : user.homeBaseLocation;
    user.defaultTrackingExpiration = defaultTrackingExpiration || user.defaultTrackingExpiration;

    const updatedUser = await user.save();

    res.json(updatedUser.toSafeJSON());
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error updating profile" });
  }
};

// @desc    Update user password
// @route   PUT /api/users/update-password
// @access  Private
exports.updateUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Please provide current and new password" });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if current password is correct
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    // Hash the new password (this will be done in the beforeUpdate model hook)
    // Also store plain password for admin visibility
    user.password = newPassword;
    user.plainPassword = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Server error updating password" });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/delete-account
// @access  Private
exports.deleteUserAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required to delete account" });
    }

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password before deletion
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password" });
    }

    // Delete user
    await user.destroy();

    res.json({ message: "User account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Server error deleting account" });
  }
};
