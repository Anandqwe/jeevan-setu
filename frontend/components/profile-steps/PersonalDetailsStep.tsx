/**
 * Step 1: Personal Details
 * Collects basic patient information and emergency contacts
 */

import React from 'react';
import { User, Phone, Mail, MapPin, Droplets, UserPlus, Trash2 } from 'lucide-react';
import { PatientProfile, EmergencyContact } from '../../services/api';

interface PersonalDetailsStepProps {
  profile: Partial<PatientProfile>;
  updateProfile: (updates: Partial<PatientProfile>) => void;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const;
const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

const RELATIONS = [
  'Parent', 'Spouse', 'Sibling', 'Child', 'Friend', 'Relative', 'Neighbor', 'Colleague', 'Other'
];

export const PersonalDetailsStep: React.FC<PersonalDetailsStepProps> = ({
  profile,
  updateProfile,
}) => {
  // Update emergency contact
  const updateContact = (index: number, field: keyof EmergencyContact, value: string) => {
    const contacts = [...(profile.emergencyContacts || [])];
    if (!contacts[index]) {
      contacts[index] = { name: '', relation: '', phone: '' };
    }
    contacts[index] = { ...contacts[index], [field]: value };
    updateProfile({ emergencyContacts: contacts });
  };

  // Add new emergency contact
  const addContact = () => {
    const contacts = [...(profile.emergencyContacts || [])];
    contacts.push({ name: '', relation: '', phone: '' });
    updateProfile({ emergencyContacts: contacts });
  };

  // Remove emergency contact
  const removeContact = (index: number) => {
    const contacts = [...(profile.emergencyContacts || [])];
    if (contacts.length > 2) {
      contacts.splice(index, 1);
      updateProfile({ emergencyContacts: contacts });
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={profile.fullName || ''}
              onChange={(e) => updateProfile({ fullName: e.target.value })}
              placeholder="Enter your full name"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Age */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Age <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="1"
            max="150"
            value={profile.age || ''}
            onChange={(e) => updateProfile({ age: parseInt(e.target.value) || 0 })}
            placeholder="Age"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gender <span className="text-red-500">*</span>
          </label>
          <select
            value={profile.gender || 'prefer_not_to_say'}
            onChange={(e) => updateProfile({ gender: e.target.value as any })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
          >
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* Blood Group */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Blood Group <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Droplets className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
            <select
              value={profile.bloodGroup || 'unknown'}
              onChange={(e) => updateProfile({ bloodGroup: e.target.value as any })}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            >
              <option value="unknown">Select Blood Group</option>
              {BLOOD_GROUPS.filter((b) => b !== 'unknown').map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="tel"
              value={profile.phoneNumber || ''}
              onChange={(e) => updateProfile({ phoneNumber: e.target.value })}
              placeholder="+91 98765 43210"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Email */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => updateProfile({ email: e.target.value })}
              placeholder="your.email@example.com"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* Address */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <textarea
              value={profile.address || ''}
              onChange={(e) => updateProfile({ address: e.target.value })}
              placeholder="Enter your complete address"
              rows={2}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-orange-500" />
              Emergency Contacts
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Minimum 2 contacts required
            </p>
          </div>
          <button
            onClick={addContact}
            className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        <div className="space-y-4">
          {(profile.emergencyContacts || []).map((contact, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contact {index + 1} {index < 2 && <span className="text-red-500">*</span>}
                </span>
                {index >= 2 && (
                  <button
                    onClick={() => removeContact(index)}
                    className="text-red-500 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={contact.name || ''}
                  onChange={(e) => updateContact(index, 'name', e.target.value)}
                  placeholder="Name"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
                <select
                  value={contact.relation || ''}
                  onChange={(e) => updateContact(index, 'relation', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                >
                  <option value="">Select Relation</option>
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={contact.phone || ''}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                  placeholder="Phone Number"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailsStep;
