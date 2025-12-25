/**
 * Step 2: Medical Information
 * Collects medical conditions and health information (encrypted fields)
 */

import React, { useRef } from 'react';
import {
  Heart,
  Droplet,
  Activity,
  AlertTriangle,
  Pill,
  Accessibility,
  FileText,
  Upload,
  Shield,
  CheckCircle,
  X,
} from 'lucide-react';
import { PatientProfile, MedicalInfo } from '../../services/api';

interface MedicalInfoStepProps {
  profile: Partial<PatientProfile>;
  updateProfile: (updates: Partial<PatientProfile>) => void;
}

// Medical condition toggle component
const MedicalConditionToggle: React.FC<{
  label: string;
  description: string;
  icon: React.ReactNode;
  value: boolean;
  onChange: (value: boolean) => void;
  color: string;
}> = ({ label, description, icon, value, onChange, color }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${
      value
        ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-900/20`
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}
  >
    <div className="flex items-start gap-3">
      <div
        className={`p-2 rounded-lg ${
          value
            ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span
            className={`font-medium ${
              value ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {label}
          </span>
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              value
                ? `border-${color}-500 bg-${color}-500`
                : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            {value && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  </button>
);

export const MedicalInfoStep: React.FC<MedicalInfoStepProps> = ({
  profile,
  updateProfile,
}) => {
  const insuranceInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  const medicalInfo = profile.medicalInfo || ({} as MedicalInfo);

  // Update medical info field
  const updateMedical = (field: keyof MedicalInfo, value: any) => {
    updateProfile({
      medicalInfo: {
        ...medicalInfo,
        [field]: value,
      },
    });
  };

  // Handle file upload (convert to base64 for demo, in production use cloud storage)
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: 'insuranceCardUrl' | 'medicalReportUrl'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For demo, store file name. In production, upload to cloud storage
    // and store the URL
    updateMedical(field, `uploaded:${file.name}`);
    
    // Also store metadata if it's a medical report
    if (field === 'medicalReportUrl') {
      updateMedical('medicalReportMetadata', JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Encryption Notice */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Your Data is Encrypted
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              All sensitive medical information is encrypted using AES-256 encryption before
              being stored. Only you and authorized emergency responders can access this data.
            </p>
          </div>
        </div>
      </div>

      {/* Medical Conditions Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Medical Conditions
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Select any conditions that apply to you
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MedicalConditionToggle
            label="Diabetes"
            description="Type 1 or Type 2 diabetes"
            icon={<Droplet className="w-5 h-5" />}
            value={medicalInfo.diabetes || false}
            onChange={(v) => updateMedical('diabetes', v)}
            color="purple"
          />
          <MedicalConditionToggle
            label="Blood Pressure"
            description="Hypertension or hypotension"
            icon={<Activity className="w-5 h-5" />}
            value={medicalInfo.bloodPressure || false}
            onChange={(v) => updateMedical('bloodPressure', v)}
            color="red"
          />
          <MedicalConditionToggle
            label="Heart Condition"
            description="Any cardiac related issues"
            icon={<Heart className="w-5 h-5" />}
            value={medicalInfo.heartCondition || false}
            onChange={(v) => updateMedical('heartCondition', v)}
            color="pink"
          />
          <MedicalConditionToggle
            label="Kidney Condition"
            description="Kidney disease or dialysis"
            icon={<Activity className="w-5 h-5" />}
            value={medicalInfo.kidneyCondition || false}
            onChange={(v) => updateMedical('kidneyCondition', v)}
            color="orange"
          />
        </div>
      </div>

      {/* Text Fields (Encrypted) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Additional Information
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
            (Encrypted)
          </span>
        </h3>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Allergies
            </div>
          </label>
          <textarea
            value={medicalInfo.allergies || ''}
            onChange={(e) => updateMedical('allergies', e.target.value)}
            placeholder="List any allergies (medications, food, environmental)..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
          />
        </div>

        {/* Regular Medications */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-green-500" />
              Regular Medications
            </div>
          </label>
          <textarea
            value={medicalInfo.regularMedications || ''}
            onChange={(e) => updateMedical('regularMedications', e.target.value)}
            placeholder="List medications you take regularly with dosage..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
          />
        </div>

        {/* Disabilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4 text-blue-500" />
              Disabilities / Special Needs
            </div>
          </label>
          <textarea
            value={medicalInfo.disabilities || ''}
            onChange={(e) => updateMedical('disabilities', e.target.value)}
            placeholder="Any disabilities or special requirements for emergency responders to know..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
          />
        </div>
      </div>

      {/* Insurance & Documents */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Insurance & Documents
        </h3>

        {/* Insurance Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Health Insurance Available
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Do you have health insurance coverage?
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={medicalInfo.insuranceAvailable || false}
              onChange={(e) => updateMedical('insuranceAvailable', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
          </label>
        </div>

        {/* Insurance Card Upload */}
        {medicalInfo.insuranceAvailable && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Insurance Card (Optional)
            </label>
            <input
              ref={insuranceInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileUpload(e, 'insuranceCardUrl')}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => insuranceInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors w-full justify-center text-gray-600 dark:text-gray-400"
            >
              <Upload className="w-5 h-5" />
              {medicalInfo.insuranceCardUrl
                ? medicalInfo.insuranceCardUrl.replace('uploaded:', '')
                : 'Click to upload insurance card'}
            </button>
          </div>
        )}

        {/* Medical Report Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Upload Medical Report (Optional)
          </label>
          <input
            ref={reportInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => handleFileUpload(e, 'medicalReportUrl')}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => reportInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 transition-colors w-full justify-center text-gray-600 dark:text-gray-400"
          >
            <Upload className="w-5 h-5" />
            {medicalInfo.medicalReportUrl
              ? medicalInfo.medicalReportUrl.replace('uploaded:', '')
              : 'Click to upload medical report'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Recent medical reports can help responders understand your health better
          </p>
        </div>
      </div>
    </div>
  );
};

export default MedicalInfoStep;
