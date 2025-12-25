const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    let user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = await User.create({
      name,
      phone,
      password, // In production, hash this!
      role: 'patient'
    });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Check for user
    const user = await User.findOne({ phone }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password (simple comparison for prototype)
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/auth/google
// @desc    Login/Register with Google
router.post('/google', async (req, res) => {
  try {
    const { email, name, googleId, photoUrl } = req.body;

    // In a real app, verify the firebase ID token here using firebase-admin
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // const { email, uid } = decodedToken;

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId,
        role: 'patient'
      });
    } else if (!user.googleId) {
      // Link google ID if exists by email but not linked
      user.googleId = googleId;
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
