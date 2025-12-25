/**
 * PatientProfile Schema
 * Stores comprehensive patient medical profile for emergency response
 * Sensitive medical fields are encrypted using AES-256-CBC
 */

const mongoose = require('mongoose');

// Emergency Contact sub-schema
const emergencyContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Emergency contact name is required'],
    trim: true
  },
  relation: {
    type: String,
    required: [true, 'Relation is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Emergency contact phone is required'],
    trim: true
  }
}, { _id: false });

// Medical Information sub-schema (contains encrypted fields)
const medicalInfoSchema = new mongoose.Schema({
  // Boolean conditions
  diabetes: {
    type: Boolean,
    default: false
  },
  bloodPressure: {
    type: Boolean,
    default: false
  },
  heartCondition: {
    type: Boolean,
    default: false
  },
  kidneyCondition: {
    type: Boolean,
    default: false
  },
  // Encrypted string fields
  allergies: {
    type: String,
    default: ''
  },
  regularMedications: {
    type: String,
    default: ''
  },
  disabilities: {
    type: String,
    default: ''
  },
  // Insurance
  insuranceAvailable: {
    type: Boolean,
    default: false
  },
  insuranceCardUrl: {
    type: String,
    default: ''
  },
  // Medical reports (encrypted metadata)
  medicalReportUrl: {
    type: String,
    default: ''
  },
  medicalReportMetadata: {
    type: String,
    default: ''
  }
}, { _id: false });

// Device & Consent Settings sub-schema
const consentSettingsSchema = new mongoose.Schema({
  allowLocation: {
    type: Boolean,
    default: true
  },
  allowSMS: {
    type: Boolean,
    default: true
  },
  allowFamilyNotification: {
    type: Boolean,
    default: true
  },
  allowMedicalShareInEmergency: {
    type: Boolean,
    default: true
  },
  consentAccepted: {
    type: Boolean,
    default: false
  },
  consentAcceptedAt: {
    type: Date
  }
}, { _id: false });

// Main PatientProfile Schema
const patientProfileSchema = new mongoose.Schema({
  // Reference to User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // ============ STEP 1: Personal Details ============
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age must be positive'],
    max: [150, 'Invalid age']
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    required: [true, 'Gender is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    maxlength: [500, 'Address too long']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
    required: [true, 'Blood group is required']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  emergencyContacts: {
    type: [emergencyContactSchema],
    validate: {
      validator: function(contacts) {
        return contacts && contacts.length >= 2;
      },
      message: 'At least 2 emergency contacts are required'
    }
  },

  // ============ STEP 2: Medical Information (Encrypted) ============
  medicalInfo: {
    type: medicalInfoSchema,
    default: () => ({})
  },

  // ============ STEP 3: Hospital Preferences ============
  preferredHospitals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  }],
  additionalHospitals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  }],

  // ============ STEP 4: Device & Consent ============
  consentSettings: {
    type: consentSettingsSchema,
    default: () => ({})
  },

  // ============ Profile Status ============
  currentStep: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  emergencyReady: {
    type: Boolean,
    default: false,
    index: true
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for quick emergency lookups
patientProfileSchema.index({ emergencyReady: 1, userId: 1 });

// Pre-save middleware to update lastUpdated
patientProfileSchema.pre('save', function() {
  this.lastUpdated = new Date();
});

// Method to check if profile is complete
patientProfileSchema.methods.isComplete = function() {
  return (
    this.fullName &&
    this.age &&
    this.gender &&
    this.address &&
    this.bloodGroup &&
    this.phoneNumber &&
    this.email &&
    this.emergencyContacts?.length >= 2 &&
    this.preferredHospitals?.length >= 2 &&
    this.consentSettings?.consentAccepted
  );
};

module.exports = mongoose.model('PatientProfile', patientProfileSchema);
