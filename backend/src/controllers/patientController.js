/**
 * Patient Profile Controller
 * Handles all patient profile CRUD operations with encryption for medical data
 */

const PatientProfile = require('../models/PatientProfile');
const { 
  encrypt, 
  decrypt, 
  encryptFields, 
  decryptFields, 
  ENCRYPTED_MEDICAL_FIELDS 
} = require('../utils/encryption');

/**
 * @desc    Get patient profile
 * @route   GET /api/patient/profile
 * @access  Private (Patient)
 */
const getProfile = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ userId: req.user._id })
      .populate('preferredHospitals', 'name address city phone')
      .populate('additionalHospitals', 'name address city phone');

    if (!profile) {
      // Return empty profile template for new users
      return res.json({
        success: true,
        exists: false,
        profile: null,
        message: 'No profile found. Please create one.'
      });
    }

    // Decrypt medical fields before sending to client
    const profileObj = profile.toObject();
    if (profileObj.medicalInfo) {
      profileObj.medicalInfo = decryptFields(profileObj.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
    }

    res.json({
      success: true,
      exists: true,
      profile: profileObj
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * @desc    Create patient profile
 * @route   POST /api/patient/profile
 * @access  Private (Patient)
 */
const createProfile = async (req, res) => {
  try {
    // Check if profile already exists
    const existingProfile = await PatientProfile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Profile already exists. Use PUT to update.'
      });
    }

    const profileData = {
      ...req.body,
      userId: req.user._id,
      email: req.body.email || req.user.email
    };

    // Encrypt medical fields if present
    if (profileData.medicalInfo) {
      profileData.medicalInfo = encryptFields(profileData.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
    }

    const profile = await PatientProfile.create(profileData);

    // Return decrypted version
    const profileObj = profile.toObject();
    if (profileObj.medicalInfo) {
      profileObj.medicalInfo = decryptFields(profileObj.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
    }

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      profile: profileObj
    });
  } catch (error) {
    console.error('Create profile error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create profile',
      error: error.message
    });
  }
};

/**
 * @desc    Update entire patient profile
 * @route   PUT /api/patient/profile
 * @access  Private (Patient)
 */
const updateProfile = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ userId: req.user._id });

    if (!profile) {
      // Create new if doesn't exist
      return createProfile(req, res);
    }

    const updateData = { ...req.body };
    delete updateData.userId; // Prevent userId modification
    delete updateData._id;

    // Encrypt medical fields if present
    if (updateData.medicalInfo) {
      updateData.medicalInfo = encryptFields(updateData.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
    }

    // Update profile
    profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('preferredHospitals', 'name address city phone')
      .populate('additionalHospitals', 'name address city phone');

    // Decrypt for response
    const profileObj = profile.toObject();
    if (profileObj.medicalInfo) {
      profileObj.medicalInfo = decryptFields(profileObj.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: profileObj
    });
  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

/**
 * @desc    Update medical information only
 * @route   PATCH /api/patient/profile/medical
 * @access  Private (Patient)
 */
const updateMedicalInfo = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Create profile first.'
      });
    }

    // Encrypt sensitive fields
    const encryptedMedicalInfo = encryptFields(req.body, ENCRYPTED_MEDICAL_FIELDS);

    // Merge with existing medical info
    const updatedMedicalInfo = {
      ...profile.medicalInfo.toObject(),
      ...encryptedMedicalInfo
    };

    profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { 
        $set: { 
          medicalInfo: updatedMedicalInfo,
          currentStep: Math.max(profile.currentStep, 2)
        } 
      },
      { new: true, runValidators: true }
    );

    // Decrypt for response
    const profileObj = profile.toObject();
    profileObj.medicalInfo = decryptFields(profileObj.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);

    res.json({
      success: true,
      message: 'Medical information updated',
      medicalInfo: profileObj.medicalInfo
    });
  } catch (error) {
    console.error('Update medical info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medical information',
      error: error.message
    });
  }
};

/**
 * @desc    Update hospital preferences
 * @route   PATCH /api/patient/profile/preferences
 * @access  Private (Patient)
 */
const updatePreferences = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Create profile first.'
      });
    }

    const { preferredHospitals, additionalHospitals, consentSettings } = req.body;

    const updateData = {};
    
    if (preferredHospitals !== undefined) {
      updateData.preferredHospitals = preferredHospitals;
    }
    if (additionalHospitals !== undefined) {
      updateData.additionalHospitals = additionalHospitals;
    }
    if (consentSettings !== undefined) {
      updateData.consentSettings = {
        ...profile.consentSettings.toObject(),
        ...consentSettings
      };
      // Set consent timestamp if accepting
      if (consentSettings.consentAccepted && !profile.consentSettings.consentAccepted) {
        updateData.consentSettings.consentAcceptedAt = new Date();
      }
    }

    profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('preferredHospitals', 'name address city phone')
      .populate('additionalHospitals', 'name address city phone');

    res.json({
      success: true,
      message: 'Preferences updated',
      preferredHospitals: profile.preferredHospitals,
      additionalHospitals: profile.additionalHospitals,
      consentSettings: profile.consentSettings
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
    });
  }
};

/**
 * @desc    Activate emergency profile (final submit)
 * @route   POST /api/patient/profile/activate
 * @access  Private (Patient)
 */
const activateProfile = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Validate required fields
    const errors = [];
    
    if (!profile.fullName) errors.push('Full name is required');
    if (!profile.age) errors.push('Age is required');
    if (!profile.gender) errors.push('Gender is required');
    if (!profile.bloodGroup) errors.push('Blood group is required');
    if (!profile.phoneNumber) errors.push('Phone number is required');
    if (!profile.address) errors.push('Address is required');
    if (!profile.emergencyContacts || profile.emergencyContacts.length < 2) {
      errors.push('At least 2 emergency contacts are required');
    }
    if (!profile.preferredHospitals || profile.preferredHospitals.length < 2) {
      errors.push('At least 2 preferred hospitals are required');
    }
    if (!profile.consentSettings?.consentAccepted) {
      errors.push('Consent must be accepted');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Profile incomplete',
        errors
      });
    }

    // Activate profile
    profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { 
        $set: { 
          emergencyReady: true,
          profileCompleted: true,
          currentStep: 5
        } 
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Emergency profile activated',
      emergencyReady: true
    });
  } catch (error) {
    console.error('Activate profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate profile',
      error: error.message
    });
  }
};

/**
 * @desc    Save step progress (auto-save)
 * @route   PATCH /api/patient/profile/step/:stepNumber
 * @access  Private (Patient)
 */
const saveStep = async (req, res) => {
  try {
    const stepNumber = parseInt(req.params.stepNumber);
    
    if (stepNumber < 1 || stepNumber > 5) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step number (1-5)'
      });
    }

    let profile = await PatientProfile.findOne({ userId: req.user._id });

    // Create profile if doesn't exist
    if (!profile) {
      const createData = {
        userId: req.user._id,
        email: req.user.email,
        currentStep: stepNumber,
        ...req.body
      };

      // Encrypt medical fields if step 2
      if (stepNumber === 2 && createData.medicalInfo) {
        createData.medicalInfo = encryptFields(createData.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
      }

      profile = await PatientProfile.create(createData);
    } else {
      const updateData = { ...req.body };
      updateData.currentStep = Math.max(profile.currentStep, stepNumber);

      // Encrypt medical fields if step 2
      if (stepNumber === 2 && updateData.medicalInfo) {
        updateData.medicalInfo = encryptFields(updateData.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
      }

      profile = await PatientProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $set: updateData },
        { new: true, runValidators: true }
      );
    }

    // Decrypt for response
    const profileObj = profile.toObject();
    if (profileObj.medicalInfo) {
      profileObj.medicalInfo = decryptFields(profileObj.medicalInfo, ENCRYPTED_MEDICAL_FIELDS);
    }

    res.json({
      success: true,
      message: `Step ${stepNumber} saved`,
      currentStep: profile.currentStep,
      profile: profileObj
    });
  } catch (error) {
    console.error('Save step error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to save step',
      error: error.message
    });
  }
};

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
  updateMedicalInfo,
  updatePreferences,
  activateProfile,
  saveStep
};
