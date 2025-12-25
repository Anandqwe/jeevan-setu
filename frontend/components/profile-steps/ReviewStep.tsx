/**
 * Step 5: Review & Submit
 * Final review of all profile information before activation
 */

import React from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Droplets,
  Heart,
  Activity,
  AlertTriangle,
  Pill,
  Building2,
  Shield,
  CheckCircle,
  Edit2,
  Users,
} from 'lucide-react';
import { PatientProfile, Hospital } from '../../services/api';

interface ReviewStepProps {
  profile: Partial<PatientProfile>;
  onEditStep: (step: number) => void;
}

// Section component with edit button
const ReviewSection: React.FC<{
  title: string;
  step: number;
  onEdit: (step: number) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  status?: 'complete' | 'incomplete' | 'warning';
}> = ({ title, step, onEdit, icon, children, status = 'complete' }) => (
  <div
    className={`p-4 rounded-xl border-2 ${
      status === 'incomplete'
        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
        : status === 'warning'
        ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div
          className={`p-2 rounded-lg ${
            status === 'incomplete'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
              : status === 'warning'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          {icon}
        </div>
        <h4 className="font-semibold text-gray-900 dark:text-white">{title}</h4>
        {status === 'incomplete' && (
          <span className="text-xs text-red-500 font-medium">Incomplete</span>
        )}
      </div>
      <button
        onClick={() => onEdit(step)}
        className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-1"
      >
        <Edit2 className="w-4 h-4" />
        Edit
      </button>
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

// Info row component
const InfoRow: React.FC<{
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="flex items-start gap-2 text-sm">
    {icon && <span className="text-gray-400 mt-0.5">{icon}</span>}
    <span className="text-gray-500 dark:text-gray-400 min-w-[100px]">{label}:</span>
    <span className="text-gray-900 dark:text-white font-medium">{value || '-'}</span>
  </div>
);

export const ReviewStep: React.FC<ReviewStepProps> = ({ profile, onEditStep }) => {
  const medicalInfo = profile.medicalInfo || {};
  const consentSettings = profile.consentSettings || {};
  const emergencyContacts = profile.emergencyContacts || [];
  const preferredHospitals = (profile.preferredHospitals || []) as (string | Hospital)[];

  // Check completion status
  const isPersonalComplete =
    profile.fullName &&
    profile.age &&
    profile.bloodGroup &&
    profile.bloodGroup !== 'unknown' &&
    profile.phoneNumber &&
    profile.address &&
    emergencyContacts.filter((c) => c.name && c.phone).length >= 2;

  const isHospitalsComplete = preferredHospitals.length >= 2;
  const isConsentComplete = consentSettings.consentAccepted;

  // Get active medical conditions
  const activeMedicalConditions = [];
  if (medicalInfo.diabetes) activeMedicalConditions.push('Diabetes');
  if (medicalInfo.bloodPressure) activeMedicalConditions.push('Blood Pressure');
  if (medicalInfo.heartCondition) activeMedicalConditions.push('Heart Condition');
  if (medicalInfo.kidneyCondition) activeMedicalConditions.push('Kidney Condition');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Review Your Profile
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Please verify all information before activating your emergency profile
        </p>
      </div>

      {/* Personal Details Section */}
      <ReviewSection
        title="Personal Details"
        step={1}
        onEdit={onEditStep}
        icon={<User className="w-5 h-5" />}
        status={isPersonalComplete ? 'complete' : 'incomplete'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <InfoRow label="Name" value={profile.fullName || ''} />
          <InfoRow label="Age" value={profile.age ? `${profile.age} years` : ''} />
          <InfoRow
            label="Gender"
            value={
              profile.gender
                ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).replace('_', ' ')
                : ''
            }
          />
          <InfoRow
            label="Blood Group"
            value={
              <span className="inline-flex items-center gap-1">
                <Droplets className="w-3 h-3 text-red-500" />
                {profile.bloodGroup !== 'unknown' ? profile.bloodGroup : 'Not set'}
              </span>
            }
          />
          <InfoRow label="Phone" value={profile.phoneNumber || ''} icon={<Phone className="w-3 h-3" />} />
          <InfoRow label="Email" value={profile.email || ''} icon={<Mail className="w-3 h-3" />} />
        </div>
        <div className="mt-2">
          <InfoRow label="Address" value={profile.address || ''} icon={<MapPin className="w-3 h-3" />} />
        </div>

        {/* Emergency Contacts */}
        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Emergency Contacts ({emergencyContacts.filter((c) => c.name && c.phone).length})
            </span>
          </div>
          <div className="space-y-1">
            {emergencyContacts
              .filter((c) => c.name && c.phone)
              .map((contact, idx) => (
                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                  {contact.name} ({contact.relation}) - {contact.phone}
                </div>
              ))}
          </div>
        </div>
      </ReviewSection>

      {/* Medical Information Section */}
      <ReviewSection
        title="Medical Information"
        step={2}
        onEdit={onEditStep}
        icon={<Heart className="w-5 h-5" />}
        status="complete"
      >
        {/* Medical Conditions */}
        <div className="mb-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Medical Conditions:</span>
          {activeMedicalConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {activeMedicalConditions.map((condition) => (
                <span
                  key={condition}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded"
                >
                  <Activity className="w-3 h-3" />
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-700 dark:text-gray-300 ml-2">None reported</span>
          )}
        </div>

        {/* Other Medical Info */}
        {medicalInfo.allergies && (
          <InfoRow
            label="Allergies"
            value={medicalInfo.allergies}
            icon={<AlertTriangle className="w-3 h-3 text-yellow-500" />}
          />
        )}
        {medicalInfo.regularMedications && (
          <InfoRow
            label="Medications"
            value={medicalInfo.regularMedications}
            icon={<Pill className="w-3 h-3 text-green-500" />}
          />
        )}
        {medicalInfo.insuranceAvailable && (
          <InfoRow
            label="Insurance"
            value={
              <span className="text-green-600 dark:text-green-400">
                ✓ Available
              </span>
            }
          />
        )}
      </ReviewSection>

      {/* Hospital Preferences Section */}
      <ReviewSection
        title="Hospital Preferences"
        step={3}
        onEdit={onEditStep}
        icon={<Building2 className="w-5 h-5" />}
        status={isHospitalsComplete ? 'complete' : 'incomplete'}
      >
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Preferred Hospitals: {preferredHospitals.length} selected
          </span>
          {!isHospitalsComplete && (
            <span className="text-red-500 ml-2">(Minimum 2 required)</span>
          )}
        </div>
        {preferredHospitals.length > 0 && (
          <div className="mt-2 space-y-1">
            {preferredHospitals.map((hospital, idx) => (
              <div
                key={idx}
                className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <Building2 className="w-3 h-3 text-gray-400" />
                {typeof hospital === 'string' ? hospital : hospital.name}
              </div>
            ))}
          </div>
        )}
      </ReviewSection>

      {/* Consent Settings Section */}
      <ReviewSection
        title="Permissions & Consent"
        step={4}
        onEdit={onEditStep}
        icon={<Shield className="w-5 h-5" />}
        status={isConsentComplete ? 'complete' : 'incomplete'}
      >
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            {consentSettings.allowLocation ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-gray-600 dark:text-gray-400">Location Access</span>
          </div>
          <div className="flex items-center gap-2">
            {consentSettings.allowSMS ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-gray-600 dark:text-gray-400">SMS Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            {consentSettings.allowFamilyNotification ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-gray-600 dark:text-gray-400">Family Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            {consentSettings.allowMedicalShareInEmergency ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-gray-600 dark:text-gray-400">Medical Data Sharing</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {consentSettings.consentAccepted ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-600 dark:text-green-400 font-medium">
                  Terms & Conditions Accepted
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Consent Required - Please accept terms
                </span>
              </>
            )}
          </div>
        </div>
      </ReviewSection>

      {/* Ready Status */}
      {isPersonalComplete && isHospitalsComplete && isConsentComplete ? (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-300">
                Profile Ready for Activation
              </h4>
              <p className="text-sm text-green-600 dark:text-green-400">
                Click "Activate Emergency Profile" to enable one-tap SOS
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <div>
              <h4 className="font-semibold text-red-800 dark:text-red-300">
                Profile Incomplete
              </h4>
              <p className="text-sm text-red-600 dark:text-red-400">
                Please complete all required sections marked in red
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewStep;
