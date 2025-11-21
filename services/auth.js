const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsersModel = require('../models/Users');

// JWT Secret Key (Directly included in the code)
const JWT_SECRET_KEY = 'adeel';  // You can change this secret key

// Admin Credentials (hardcoded or fetched from the DB in real scenarios)
const ADMIN_EMAIL = "admin@example.com"; // Set Admin Email
const ADMIN_PASSWORD = "adminpassword"; // Set Admin Password (hashed in real projects)

const registerUser = async (email, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    // Create and save new user
    const newUser = await UsersModel.create({
      email,
      password: hashedPassword,
    });

    return newUser; // Return the created user
  } catch (err) {
    throw new Error('Error hashing password or saving user: ' + err.message);
  }
};

const loginUser = async (email, password, res) => {
  try {
    const user = await UsersModel.findOne({ email });

    if (!user) {
      throw new Error('No user found with this email');
    }

    // Compare the password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      throw new Error('Incorrect password');
    }

    // Generate JWT token if credentials are valid
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET_KEY, // Secret key included directly in the code
      { expiresIn: '1h' } // Token expiry time (1 hour)
    );

    // Set token in the cookie
    res.cookie('Authorization', token, {
    httpOnly: true,
  secure: false,
  sameSite: 'lax', // 'none' only if you need true cross-site (HTTPS required)
  maxAge: 3600000,
    });

    return token; // Return success message
  } catch (err) {
    throw err;
  }
};

// Admin Login Service
const adminLogin = async (email, password, res) => {
  if (email === ADMIN_EMAIL) {
    // Compare password (for simplicity, plain text here)
    const isPasswordCorrect = password === ADMIN_PASSWORD;

    if (!isPasswordCorrect) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    // Admin authenticated, generate JWT token
    const token = jwt.sign(
      { role: "admin", email: ADMIN_EMAIL },
      JWT_SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Set token in cookie
    res.cookie("adminAuth", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set to true in production
      sameSite: "None",
      maxAge: 3600000, // Token expires in 1 hour
    });

    return res.status(200).json({ message: "Admin login successful" });
  } else {
    return res.status(401).json({ error: "Not authorized" });
  }
};

// User Routes
const userRoutes = (router) => {
  // Register route
  router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
      const newUser = await registerUser(email, password);
      res.status(201).json({ message: 'User registered successfully', user: newUser });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Login route
  // router.post('/login', async (req, res) => {
  //   const { email, password } = req.body;
  //   try {
  //     const result = await loginUser(email, password, res);
  //     res.status(200).json({ message: result });
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // });
};

// Admin Routes
const adminRoutes = (router) => {
  router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    await adminLogin(email, password, res);
  });
};
const getUserProfile = async (userId) => {
  try {
    const user = await UsersModel.findById(userId).select('firstName lastName email'); // Only select required fields
    if (!user) {
      throw new Error('User not found');
    }

    return user; // Send fresh user data
  } catch (err) {
    throw new Error('Error fetching user profile: ' + err.message);
  }
};

module.exports = {
  adminLogin,
  userRoutes,
  adminRoutes,
  registerUser,
  loginUser,
  getUserProfile
};
