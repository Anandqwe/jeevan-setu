/**
 * Patient Profile Routes
 * All routes are protected and require JWT authentication
 */

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getProfile,
  createProfile,
  updateProfile,
  updateMedicalInfo,
  updatePreferences,
  activateProfile,
  saveStep
} = require('../controllers/patientController');

// All routes require authentication
router.use(protect);

// Profile CRUD
router.route('/profile')
  .get(getProfile)           // GET /api/patient/profile
  .post(createProfile)       // POST /api/patient/profile
  .put(updateProfile);       // PUT /api/patient/profile

// Partial updates
router.patch('/profile/medical', updateMedicalInfo);        // PATCH /api/patient/profile/medical
router.patch('/profile/preferences', updatePreferences);    // PATCH /api/patient/profile/preferences

// Step-wise auto-save
router.patch('/profile/step/:stepNumber', saveStep);        // PATCH /api/patient/profile/step/1

// Final activation
router.post('/profile/activate', activateProfile);          // POST /api/patient/profile/activate

module.exports = router;
