/**
 * Bystander Report Routes
 * Routes for handling incident reports from bystanders/witnesses
 */

const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/bystander/report
 * @desc    Submit an incident report with image and AI analysis
 * @access  Public
 */
router.post('/report', async (req, res) => {
  try {
    const { imageBase64, voiceText, aiReport, location } = req.body;

    // Validation
    if (!imageBase64 || !aiReport || !location) {
      return res.status(400).json({
        success: false,
        message: 'Image, AI report, and location are required'
      });
    }

    // Log the report (in production, save to database)
    console.log('[BYSTANDER] Incident Report Received:', {
      severity: aiReport.severity,
      type: aiReport.type,
      action: aiReport.immediateAction,
      location: location,
      voiceText: voiceText || 'none'
    });

    // Return success response
    res.json({
      success: true,
      message: 'Incident report submitted successfully',
      report: {
        id: Date.now().toString(),
        severity: aiReport.severity,
        type: aiReport.type,
        location: location,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[BYSTANDER] Report submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process incident report',
      error: error.message
    });
  }
});

module.exports = router;
