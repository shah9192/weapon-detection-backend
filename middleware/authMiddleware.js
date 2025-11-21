const jwt = require('jsonwebtoken');

// JWT Secret Key (same as in auth.js)
const JWT_SECRET_KEY = 'adeel';  // Make sure this matches the one in auth.js

const authenticate = (req, res, next) => {
  const token = req.header('Authorization') && req.header('Authorization').split(' ')[1];

  console.log("auth token", token)

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET_KEY);
    req.user = decoded; // Add the decoded information (userId, email) to the request object
    next(); // Continue to the next middleware or route handler
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticate;
