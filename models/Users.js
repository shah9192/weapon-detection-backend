const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');  // For password hashing
const jwt = require('jsonwebtoken'); // For generating tokens
const crypto = require('crypto'); // For generating reset password tokens

// Define the User Schema
const UsersSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Ensure email is always stored in lowercase
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: 'Member', // Default role is Member
    },
    profilePicture: { 
      type: String, 
      default: '/path/to/default/avatar.png' // Set a default avatar path if not provided
    },
    resetPasswordToken: { type: String },  // Field to store the reset password token
    resetPasswordExpire: { type: Date },   // Field to store when the reset password token expires
  },
  { timestamps: true }
);

// // Pre-save hook to hash password before saving it to the database
// UsersSchema.pre('save', async function (next) {
//   if (this.isModified('password')) {
//     this.password = await bcrypt.hash(this.password, 10); // Hash the password
//   }
//   next();
// });

// // Method to check password validity (to be used during login)
// UsersSchema.methods.isPasswordValid = async function (password) {
//   return await bcrypt.compare(password, this.password); // Compare provided password with stored hash
// };

// Method to generate reset password token
UsersSchema.methods.getResetPasswordToken = function () {
  // Generate a token using crypto
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Set the resetPasswordToken and resetPasswordExpire fields
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 3600000; // Token expires in 1 hour

  return resetToken;
};

const UsersModel = mongoose.model('Users', UsersSchema);

module.exports = UsersModel;
