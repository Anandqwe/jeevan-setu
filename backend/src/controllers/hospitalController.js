/**
 * Hospital Controller
 * Handles hospital listing and bed availability updates
 */

const Hospital = require('../models/Hospital');

/**
 * @desc    Get all active hospitals
 * @route   GET /api/hospitals
 * @access  Public
 */
const getHospitals = async (req, res) => {
  try {
    const { city, hasICU, hasEmergency, search } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    if (hasICU === 'true') {
      query.hasICU = true;
    }
    if (hasEmergency === 'true') {
      query.hasEmergency = true;
    }
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') }
      ];
    }

    const hospitals = await Hospital.find(query)
      .select('name address city phone availableBeds availableIcuBeds hasICU hasEmergency hasTraumaCenter hasCardiacCare')
      .sort({ name: 1 })
      .limit(100);

    res.json({
      success: true,
      count: hospitals.length,
      hospitals
    });
  } catch (error) {
    console.error('Get hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospitals',
      error: error.message
    });
  }
};

/**
 * @desc    Get hospital by ID
 * @route   GET /api/hospitals/:id
 * @access  Public
 */
const getHospitalById = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.json({
      success: true,
      hospital
    });
  } catch (error) {
    console.error('Get hospital error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hospital',
      error: error.message
    });
  }
};

/**
 * @desc    Get nearby hospitals by coordinates
 * @route   GET /api/hospitals/nearby
 * @access  Public
 */
const getNearbyHospitals = async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000 } = req.query; // maxDistance in meters

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const hospitals = await Hospital.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    })
      .select('name address city phone availableBeds availableIcuBeds hasICU hasEmergency location')
      .limit(20);

    res.json({
      success: true,
      count: hospitals.length,
      hospitals
    });
  } catch (error) {
    console.error('Get nearby hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby hospitals',
      error: error.message
    });
  }
};

/**
 * @desc    Update hospital bed availability (for hospital admins)
 * @route   PATCH /api/hospitals/:id/beds
 * @access  Private (Hospital role)
 */
const updateBedAvailability = async (req, res) => {
  try {
    const { availableBeds, availableIcuBeds } = req.body;

    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          availableBeds: availableBeds !== undefined ? availableBeds : undefined,
          availableIcuBeds: availableIcuBeds !== undefined ? availableIcuBeds : undefined,
          lastBedUpdate: new Date()
        }
      },
      { new: true }
    );

    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }

    res.json({
      success: true,
      message: 'Bed availability updated',
      hospital: {
        id: hospital._id,
        name: hospital.name,
        availableBeds: hospital.availableBeds,
        availableIcuBeds: hospital.availableIcuBeds,
        lastBedUpdate: hospital.lastBedUpdate
      }
    });
  } catch (error) {
    console.error('Update beds error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bed availability',
      error: error.message
    });
  }
};

/**
 * @desc    Seed initial hospitals (development only)
 * @route   POST /api/hospitals/seed
 * @access  Private (Admin)
 */
const seedHospitals = async (req, res) => {
  try {
    // Check if hospitals already exist
    const count = await Hospital.countDocuments();
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: `${count} hospitals already exist. Seed skipped.`
      });
    }

    // Sample hospitals in Maharashtra
    const sampleHospitals = [
      {
        name: 'Lilavati Hospital',
        address: 'A-791, Bandra Reclamation, Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        phone: '022-26751000',
        email: 'info@lilavatihospital.com',
        location: { type: 'Point', coordinates: [72.8296, 19.0505] },
        totalBeds: 300,
        availableBeds: 45,
        icuBeds: 50,
        availableIcuBeds: 8,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Kokilaben Dhirubhai Ambani Hospital',
        address: 'Rao Saheb Achutrao Patwardhan Marg, Four Bunglows, Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
        phone: '022-30999999',
        email: 'info@kokilabenhospital.com',
        location: { type: 'Point', coordinates: [72.8347, 19.1308] },
        totalBeds: 750,
        availableBeds: 120,
        icuBeds: 100,
        availableIcuBeds: 15,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Breach Candy Hospital',
        address: '60-A, Bhulabhai Desai Road, Breach Candy',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400026',
        phone: '022-23667788',
        email: 'info@breachcandyhospital.org',
        location: { type: 'Point', coordinates: [72.8053, 18.9715] },
        totalBeds: 200,
        availableBeds: 30,
        icuBeds: 40,
        availableIcuBeds: 5,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: false,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Hinduja Hospital',
        address: 'Veer Savarkar Marg, Mahim',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400016',
        phone: '022-24452222',
        email: 'info@hindujahospital.com',
        location: { type: 'Point', coordinates: [72.8402, 19.0368] },
        totalBeds: 350,
        availableBeds: 55,
        icuBeds: 60,
        availableIcuBeds: 10,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Nanavati Super Speciality Hospital',
        address: 'S.V. Road, Vile Parle West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400056',
        phone: '022-26267500',
        email: 'info@nanavatihospital.org',
        location: { type: 'Point', coordinates: [72.8478, 19.0990] },
        totalBeds: 400,
        availableBeds: 65,
        icuBeds: 70,
        availableIcuBeds: 12,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Ruby Hall Clinic',
        address: '40, Sassoon Road, Sangamvadi',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        phone: '020-66455000',
        email: 'info@rubyhall.com',
        location: { type: 'Point', coordinates: [73.8857, 18.5362] },
        totalBeds: 550,
        availableBeds: 80,
        icuBeds: 90,
        availableIcuBeds: 14,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Sahyadri Hospital',
        address: '30-C, Karve Road, Erandwane',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411004',
        phone: '020-67212121',
        email: 'info@sahyadrihospitals.com',
        location: { type: 'Point', coordinates: [73.8262, 18.5074] },
        totalBeds: 320,
        availableBeds: 48,
        icuBeds: 55,
        availableIcuBeds: 9,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'KEM Hospital',
        address: 'Acharya Donde Marg, Parel',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400012',
        phone: '022-24136051',
        email: 'info@kem.edu',
        location: { type: 'Point', coordinates: [72.8421, 19.0023] },
        totalBeds: 1800,
        availableBeds: 200,
        icuBeds: 150,
        availableIcuBeds: 20,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Wockhardt Hospital',
        address: '1877, Dr. Anand Rao Nair Marg, Mumbai Central',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400011',
        phone: '022-61784444',
        email: 'info@wockhardthospitals.com',
        location: { type: 'Point', coordinates: [72.8205, 18.9716] },
        totalBeds: 250,
        availableBeds: 40,
        icuBeds: 45,
        availableIcuBeds: 7,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: false,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      },
      {
        name: 'Apollo Hospitals',
        address: 'Plot No 13, Parsik Hill Road, CBD Belapur',
        city: 'Navi Mumbai',
        state: 'Maharashtra',
        pincode: '400614',
        phone: '022-33503350',
        email: 'info@apollohospitals.com',
        location: { type: 'Point', coordinates: [73.0297, 19.0178] },
        totalBeds: 200,
        availableBeds: 35,
        icuBeds: 40,
        availableIcuBeds: 6,
        hasEmergency: true,
        hasICU: true,
        hasTraumaCenter: true,
        hasCardiacCare: true,
        isActive: true,
        isVerified: true
      }
    ];

    const hospitals = await Hospital.insertMany(sampleHospitals);

    res.status(201).json({
      success: true,
      message: `${hospitals.length} hospitals seeded successfully`,
      count: hospitals.length
    });
  } catch (error) {
    console.error('Seed hospitals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed hospitals',
      error: error.message
    });
  }
};

module.exports = {
  getHospitals,
  getHospitalById,
  getNearbyHospitals,
  updateBedAvailability,
  seedHospitals
};
