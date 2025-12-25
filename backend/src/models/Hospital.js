/**
 * Hospital Schema
 * Stores hospital information for patient preferences and emergency routing
 */

const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
    maxlength: [200, 'Hospital name too long']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  state: {
    type: String,
    default: 'Maharashtra',
    trim: true
  },
  pincode: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  // Location for geo queries
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  // Capacity
  totalBeds: {
    type: Number,
    default: 0
  },
  availableBeds: {
    type: Number,
    default: 0
  },
  icuBeds: {
    type: Number,
    default: 0
  },
  availableIcuBeds: {
    type: Number,
    default: 0
  },
  // Facilities
  hasEmergency: {
    type: Boolean,
    default: true
  },
  hasICU: {
    type: Boolean,
    default: false
  },
  hasTraumaCenter: {
    type: Boolean,
    default: false
  },
  hasCardiacCare: {
    type: Boolean,
    default: false
  },
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Timestamps
  lastBedUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Geo index for location-based queries
hospitalSchema.index({ location: '2dsphere' });

// Compound index for active hospitals in a city
hospitalSchema.index({ isActive: 1, city: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
