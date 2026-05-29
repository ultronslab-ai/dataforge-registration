const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

/**
 * Generate a signed JWT token for an admin user.
 * @param {number} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

/**
 * POST /api/auth/login
 * Validates username + password and returns a JWT token.
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    // Find admin by username
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await User.verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login timestamp
    await user.update({ last_login: new Date() });

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated admin's profile.
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Logout is handled client-side by removing the JWT token.
 * This endpoint exists for future server-side token blacklisting.
 */
exports.logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
