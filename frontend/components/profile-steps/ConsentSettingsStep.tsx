/**
 * Step 4: Device & Consent Settings
 * Collects user consent and notification preferences
 */

import React from 'react';
import {
  MapPin,
  MessageSquare,
  Users,
  Shield,
  FileText,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { PatientProfile, ConsentSettings } from '../../services/api';

interface ConsentSettingsStepProps {
  profile: Partial<PatientProfile>;
  updateProfile: (updates: Partial<PatientProfile>) => void;
}

// Toggle switch component
const ConsentToggle: React.FC<{
  label: string;
  description: string;
  icon: React.ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
  recommended?: boolean;
}> = ({ label, description, icon, value, onChange, recommended }) => (
  <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="p-2 bg-white dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        {recommended && (
          <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
            Recommended
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-orange-500"></div>
    </label>
  </div>
);

export const ConsentSettingsStep: React.FC<ConsentSettingsStepProps> = ({
  profile,
  updateProfile,
}) => {
  const consentSettings = profile.consentSettings || ({} as ConsentSettings);

  // Update consent field
  const updateConsent = (field: keyof ConsentSettings, value: boolean) => {
    updateProfile({
      consentSettings: {
        ...consentSettings,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Permissions & Consent
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure how we can help you during emergencies. These settings ensure
          faster response times.
        </p>
      </div>

      {/* Permission Toggles */}
      <div className="space-y-3">
        <ConsentToggle
          label="Allow Location Access"
          description="Share your real-time GPS location during emergencies for faster ambulance dispatch"
          icon={<MapPin className="w-5 h-5" />}
          value={consentSettings.allowLocation ?? true}
          onChange={(v) => updateConsent('allowLocation', v)}
          recommended
        />

        <ConsentToggle
          label="Allow SMS Notifications"
          description="Receive SMS updates about ambulance status and hospital information"
          icon={<MessageSquare className="w-5 h-5" />}
          value={consentSettings.allowSMS ?? true}
          onChange={(v) => updateConsent('allowSMS', v)}
          recommended
        />

        <ConsentToggle
          label="Notify Family Members"
          description="Automatically notify your emergency contacts when you trigger an SOS"
          icon={<Users className="w-5 h-5" />}
          value={consentSettings.allowFamilyNotification ?? true}
          onChange={(v) => updateConsent('allowFamilyNotification', v)}
          recommended
        />

        <ConsentToggle
          label="Share Medical Info in Emergency"
          description="Allow hospitals and paramedics to access your medical profile during emergencies"
          icon={<Shield className="w-5 h-5" />}
          value={consentSettings.allowMedicalShareInEmergency ?? true}
          onChange={(v) => updateConsent('allowMedicalShareInEmergency', v)}
          recommended
        />
      </div>

      {/* Warning if medical share is disabled */}
      {!consentSettings.allowMedicalShareInEmergency && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Medical Sharing Disabled
              </h4>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Without medical info sharing, emergency responders won't have access to your
                allergies, conditions, or medications. This may affect the quality of emergency care.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Consent */}
      <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
              Terms & Conditions
            </h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-2">
              <p>By accepting, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Share your profile data with emergency services when SOS is triggered</li>
                <li>Allow encrypted storage of your medical information</li>
                <li>Receive emergency notifications and updates</li>
                <li>Let us process your location data for ambulance routing</li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Your data is encrypted and stored securely. You can delete your profile anytime.
                View our{' '}
                <a href="#" className="text-orange-500 hover:underline">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="#" className="text-orange-500 hover:underline">
                  Terms of Service
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Consent Checkbox */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-1">
              <input
                type="checkbox"
                checked={consentSettings.consentAccepted || false}
                onChange={(e) => updateConsent('consentAccepted', e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  consentSettings.consentAccepted
                    ? 'bg-orange-500 border-orange-500'
                    : 'border-gray-300 dark:border-gray-600 group-hover:border-orange-400'
                }`}
              >
                {consentSettings.consentAccepted && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-900 dark:text-white">
                I accept the Terms & Conditions
                <span className="text-red-500 ml-1">*</span>
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required to activate your emergency profile
              </p>
            </div>
          </label>
        </div>

        {/* Consent Status */}
        {consentSettings.consentAccepted && (
          <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              Consent accepted. You can proceed to review.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsentSettingsStep;
