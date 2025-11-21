require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SibApiV3Sdk = require('sib-api-v3-sdk'); // Import Brevo SDK
const nodemailer = require('nodemailer'); // Import nodemailer
const UsersModel = require('../models/Users');  // Use your user model
const { loginUser } = require('../services/auth');

const router = express.Router();

// Brevo (formerly Sendinblue) Setup using environment variable
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.SENDINBLUE_API_KEY;  // Access API key from .env


const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'adeel';  // Fallback for local
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword'; // Get admin password from .env

// Forgot Password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  UsersModel.findOne({ email })
    .then(user => {
      if (!user) {
        return res.status(404).send({ Status: "User does not exist" });
      }

      const token = jwt.sign({ id: user._id }, JWT_SECRET_KEY, { expiresIn: '1d' });

      const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      sendSmtpEmail.sender = { email: 'adeel.techpro@gmail.com', name: 'Muhammad Adeel' };
      sendSmtpEmail.to = [{ email: user.email }];
      sendSmtpEmail.subject = 'Reset Password Link';
      sendSmtpEmail.textContent = `Click the following link to reset your password: http://localhost:5173/reset-password/${user._id}/${token}`;

      apiInstance.sendTransacEmail(sendSmtpEmail).then(
        function (data) {
          console.log('Email sent successfully: ', data);
          res.send({ Status: "Success", message: "Password reset email sent" });
        },
        function (error) {
          console.error('Error sending email: ', error);
          res.status(500).send({ Status: "Error sending email" });
        }
      );
    })
    .catch(err => {
      res.status(500).send({ Status: err.message });
    });
});

// Reset Password Route
router.post('/reset-password/:id/:token', (req, res) => {
  const { id, token } = req.params;
  const { password } = req.body;

  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(400).json({ Status: "Error", message: "Invalid or expired token." });
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ Status: "Error", message: "Error hashing the password." });
      }

      UsersModel.findByIdAndUpdate(decoded.id, { password: hashedPassword }, { new: true })
        .then((user) => {
          if (!user) {
            return res.status(404).json({ Status: "Error", message: "User not found." });
          }
          res.status(200).json({ Status: "Success", message: "Password updated successfully." });
        })
        .catch((err) => {
          res.status(500).json({ Status: "Error", message: "Error updating the password." });
        });
    });
  });
});


// Admin login
router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin', email: ADMIN_EMAIL }, JWT_SECRET_KEY, { expiresIn: '1h' });

    res.cookie("adminAuth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      maxAge: 3600000, // 1 hour
    });

    return res.status(200).json({ message: 'Admin login successful' });
  }

  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// Admin route to add a new user
router.post('/admin/add-user', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;

  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Hash the password before saving it to the DB
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UsersModel({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    });

    // Save the new user to the database
    await newUser.save();

    res.status(201).json({ message: 'User added successfully', user: newUser });
  } catch (err) {
    res.status(500).json({ error: 'Error adding user: ' + err.message });
  }
});

// User login (for all users, not just admins)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await loginUser(email, password, res);
    res.status(200).json({ message: 'success', token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (this should be protected, i.e., for admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await UsersModel.find();  // Fetch all users from the database
    res.status(200).json(users);  // Send users as response
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users: ' + err.message });
  }
});

// Update User (Edit User)
router.put('/admin/update-user/:id', async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email, password, role } = req.body;

  try {
    // Hash the password if it's being updated
    const updatedData = {
      firstName,
      lastName,
      email,
      role,
    };
    
    // If password is provided, hash it
    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await UsersModel.findByIdAndUpdate(id, updatedData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: 'Error updating user: ' + err.message });
  }
});

// Delete User
router.delete('/admin/delete-user/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await UsersModel.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting user: ' + err.message });
  }
});



// Export routes
module.exports = router;
