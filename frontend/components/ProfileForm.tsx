/**
 * Multi-Step Profile Form - Main Component
 * Orchestrates the patient profile wizard with auto-save functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, Loader2, AlertCircle, X } from 'lucide-react';
import { patientAPI, PatientProfile, hospitalAPI } from '../services/api';
import {
  PersonalDetailsStep,
  MedicalInfoStep,
  HospitalPreferencesStep,
  ConsentSettingsStep,
  ReviewStep,
} from './profile-steps';

interface ProfileFormProps {
  onComplete: () => void;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

// Step configuration
const STEPS = [
  { id: 1, title: 'Personal Details', shortTitle: 'Personal' },
  { id: 2, title: 'Medical Information', shortTitle: 'Medical' },
  { id: 3, title: 'Hospital Preferences', shortTitle: 'Hospitals' },
  { id: 4, title: 'Device & Consent', shortTitle: 'Consent' },
  { id: 5, title: 'Review & Submit', shortTitle: 'Review' },
];

// Initial empty profile state
const getInitialProfile = (email?: string, name?: string): Partial<PatientProfile> => ({
  fullName: name || '',
  age: 0,
  gender: 'prefer_not_to_say',
  address: '',
  bloodGroup: 'unknown',
  phoneNumber: '',
  email: email || '',
  emergencyContacts: [
    { name: '', relation: '', phone: '' },
    { name: '', relation: '', phone: '' },
  ],
  medicalInfo: {
    diabetes: false,
    bloodPressure: false,
    heartCondition: false,
    kidneyCondition: false,
    allergies: '',
    regularMedications: '',
    disabilities: '',
    insuranceAvailable: false,
    insuranceCardUrl: '',
    medicalReportUrl: '',
    medicalReportMetadata: '',
  },
  preferredHospitals: [],
  additionalHospitals: [],
  consentSettings: {
    allowLocation: true,
    allowSMS: true,
    allowFamilyNotification: true,
    allowMedicalShareInEmergency: true,
    consentAccepted: false,
  },
  currentStep: 1,
  emergencyReady: false,
});

export const ProfileForm: React.FC<ProfileFormProps> = ({
  onComplete,
  onClose,
  userEmail,
  userName,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState<Partial<PatientProfile>>(
    getInitialProfile(userEmail, userName)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Fetch existing profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await patientAPI.getProfile();
        
        if (response.exists && response.profile) {
          // Merge existing profile with defaults
          setProfile((prev) => ({
            ...prev,
            ...response.profile,
            email: response.profile!.email || userEmail || prev.email,
          }));
          setCurrentStep(response.profile.currentStep || 1);
        }
      } catch (err: any) {
        console.error('Failed to fetch profile:', err);
        // Don't show error for new profiles, just use initial state
        if (err.response?.status !== 404) {
          setError('Failed to load profile. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userEmail]);

  // Auto-save when step changes
  const autoSaveStep = useCallback(async (stepNumber: number, data: Partial<PatientProfile>) => {
    try {
      setSaving(true);
      await patientAPI.saveStep(stepNumber, data);
    } catch (err: any) {
      console.error('Auto-save failed:', err);
      // Don't block navigation on auto-save failure
    } finally {
      setSaving(false);
    }
  }, []);

  // Update profile data
  const updateProfile = useCallback((updates: Partial<PatientProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    setValidationErrors([]);
  }, []);

  // Validate current step
  const validateStep = useCallback((step: number): string[] => {
    const errors: string[] = [];
    
    switch (step) {
      case 1: // Personal Details
        if (!profile.fullName?.trim()) errors.push('Full name is required');
        if (!profile.age || profile.age < 1) errors.push('Valid age is required');
        if (!profile.gender || profile.gender === 'prefer_not_to_say') {
          // Allow prefer_not_to_say but warn
        }
        if (!profile.address?.trim()) errors.push('Address is required');
        if (!profile.bloodGroup || profile.bloodGroup === 'unknown') {
          errors.push('Blood group is required');
        }
        if (!profile.phoneNumber?.trim()) errors.push('Phone number is required');
        if (!profile.email?.trim()) errors.push('Email is required');
        
        // Validate emergency contacts
        const validContacts = profile.emergencyContacts?.filter(
          (c) => c.name?.trim() && c.phone?.trim() && c.relation?.trim()
        );
        if (!validContacts || validContacts.length < 2) {
          errors.push('At least 2 complete emergency contacts are required');
        }
        break;
        
      case 2: // Medical Info
        // Medical step is optional, no required fields
        break;
        
      case 3: // Hospital Preferences
        const hospitals = profile.preferredHospitals as string[];
        if (!hospitals || hospitals.length < 2) {
          errors.push('Please select at least 2 preferred hospitals');
        }
        break;
        
      case 4: // Consent
        if (!profile.consentSettings?.consentAccepted) {
          errors.push('You must accept the consent to proceed');
        }
        break;
        
      case 5: // Review - validate all
        if (!profile.fullName?.trim()) errors.push('Full name is missing');
        if (!profile.age || profile.age < 1) errors.push('Age is missing');
        if (!profile.bloodGroup || profile.bloodGroup === 'unknown') {
          errors.push('Blood group is missing');
        }
        const contacts = profile.emergencyContacts?.filter(
          (c) => c.name?.trim() && c.phone?.trim()
        );
        if (!contacts || contacts.length < 2) {
          errors.push('Emergency contacts incomplete');
        }
        const prefs = profile.preferredHospitals as string[];
        if (!prefs || prefs.length < 2) {
          errors.push('Hospital preferences incomplete');
        }
        if (!profile.consentSettings?.consentAccepted) {
          errors.push('Consent not accepted');
        }
        break;
    }
    
    return errors;
  }, [profile]);

  // Handle next step
  const handleNext = useCallback(async () => {
    const errors = validateStep(currentStep);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Auto-save current step
    await autoSaveStep(currentStep, profile);
    
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      setValidationErrors([]);
    }
  }, [currentStep, profile, validateStep, autoSaveStep]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setValidationErrors([]);
    }
  }, [currentStep]);

  // Handle final submit
  const handleSubmit = useCallback(async () => {
    const errors = validateStep(5);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Save final profile data
      await patientAPI.updateProfile(profile);
      
      // Activate emergency profile
      const response = await patientAPI.activateProfile();
      
      if (response.success) {
        onComplete();
      } else {
        setError(response.message || 'Failed to activate profile');
        setValidationErrors(response.errors || []);
      }
    } catch (err: any) {
      console.error('Submit failed:', err);
      setError(err.response?.data?.message || 'Failed to submit profile');
      setValidationErrors(err.response?.data?.errors || []);
    } finally {
      setSaving(false);
    }
  }, [profile, validateStep, onComplete]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PersonalDetailsStep profile={profile} updateProfile={updateProfile} />;
      case 2:
        return <MedicalInfoStep profile={profile} updateProfile={updateProfile} />;
      case 3:
        return <HospitalPreferencesStep profile={profile} updateProfile={updateProfile} />;
      case 4:
        return <ConsentSettingsStep profile={profile} updateProfile={updateProfile} />;
      case 5:
        return <ReviewStep profile={profile} onEditStep={setCurrentStep} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 pb-24">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Emergency Profile Setup
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Step {currentStep} of 5: {STEPS[currentStep - 1].title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block w-12 lg:w-20 h-1 mx-1 rounded ${
                      currentStep > step.id
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            {STEPS.map((step) => (
              <span key={step.id} className="hidden sm:inline">{step.shortTitle}</span>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {(error || validationErrors.length > 0) && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                {error && <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>}
                {validationErrors.length > 0 && (
                  <ul className="text-red-600 dark:text-red-400 text-sm mt-1 space-y-1">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>• {err}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {renderStepContent()}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1 || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Saving indicator */}
          {saving && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </div>
          )}

          {currentStep < 5 ? (
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Activate Emergency Profile</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
