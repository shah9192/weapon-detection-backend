const express = require('express');
const bcrypt = require('bcryptjs');
const { registerUser, loginUser, getUserProfile } = require('../services/auth');
const verifyToken = require('../middleware/verifyToken');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/Users');  // Use the correct model here
const router = express.Router();

// Get user profile route (protected by JWT authentication)
router.get('/profile', async (req, res) => {
  try {
    const token = req.cookies.Authorization;  // Access the cookie from req.cookies
    console.log("token:", token)
    const decodedToken = jwt.verify(token, "adeel")
    console.log("decodedToken", decodedToken)

    // Find the user by ID from the decoded token
    const user = await UsersModel.findById(decodedToken.userId);  // Use UsersModel here instead of User
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user); // Send back user profile data (firstName, lastName, email)
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user profile', error: err.message });
  }
});

// Update user password route
router.post('/update-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const token = req.cookies.Authorization;  // The token should be in the cookies
  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    // Decode the token to get userId
    const decodedToken = jwt.verify(token, "adeel");

    // Find the user from the decoded token's userId
    const user = await UsersModel.findById(decodedToken.userId);  // Use UsersModel here instead of User
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Compare the current password with the stored password
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10); // 10 is the salt rounds for bcrypt

    // Update the user's password in the database
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating password', error: err.message });
  }
});
//Update user profile picture route
router.post('/update-profile-picture', async (req, res) => {
  const { profilePicture } = req.body;  // base64 image string
  const token = req.cookies.Authorization;

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }

  try {
    const decodedToken = jwt.verify(token, "adeel");
    const user = await UsersModel.findById(decodedToken.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile picture
    user.profilePicture = profilePicture;
    await user.save();

    res.status(200).json({ message: 'Profile picture updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile picture', error: err.message });
  }
});

module.exports = router;
