/**
 * Step 3: Hospital Preferences
 * Allows patients to select preferred hospitals for emergency routing
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Bed,
  Activity,
  Heart,
} from 'lucide-react';
import { PatientProfile, Hospital, hospitalAPI } from '../../services/api';

interface HospitalPreferencesStepProps {
  profile: Partial<PatientProfile>;
  updateProfile: (updates: Partial<PatientProfile>) => void;
}

export const HospitalPreferencesStep: React.FC<HospitalPreferencesStepProps> = ({
  profile,
  updateProfile,
}) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [seeding, setSeeding] = useState(false);

  // Get selected hospital IDs
  const selectedIds = (profile.preferredHospitals as string[]) || [];
  const additionalIds = (profile.additionalHospitals as string[]) || [];

  // Fetch hospitals on mount
  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await hospitalAPI.getHospitals({
        city: cityFilter || undefined,
        search: searchQuery || undefined,
      });

      if (response.hospitals.length === 0 && !searchQuery && !cityFilter) {
        // No hospitals exist, offer to seed
        setError('No hospitals found. Click "Load Sample Hospitals" to add demo data.');
      }

      setHospitals(response.hospitals);
    } catch (err: any) {
      console.error('Failed to fetch hospitals:', err);
      setError('Failed to load hospitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Seed hospitals for demo
  const handleSeedHospitals = async () => {
    try {
      setSeeding(true);
      await hospitalAPI.seedHospitals();
      await fetchHospitals();
    } catch (err: any) {
      console.error('Failed to seed hospitals:', err);
      setError(err.response?.data?.message || 'Failed to seed hospitals');
    } finally {
      setSeeding(false);
    }
  };

  // Toggle hospital selection
  const toggleHospital = (hospitalId: string, isPrimary: boolean = true) => {
    if (isPrimary) {
      const newSelected = selectedIds.includes(hospitalId)
        ? selectedIds.filter((id) => id !== hospitalId)
        : [...selectedIds, hospitalId];
      updateProfile({ preferredHospitals: newSelected });
    } else {
      const newAdditional = additionalIds.includes(hospitalId)
        ? additionalIds.filter((id) => id !== hospitalId)
        : [...additionalIds, hospitalId];
      updateProfile({ additionalHospitals: newAdditional });
    }
  };

  // Check if hospital is selected
  const isSelected = (hospitalId: string) => selectedIds.includes(hospitalId);
  const isAdditional = (hospitalId: string) => additionalIds.includes(hospitalId);

  // Get unique cities for filter
  const cities = [...new Set(hospitals.map((h) => h.city))].sort();

  // Filter hospitals by search
  const filteredHospitals = hospitals.filter((h) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(query) ||
      h.address.toLowerCase().includes(query) ||
      h.city.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Select Preferred Hospitals
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Choose at least 2 hospitals you prefer for emergency treatment.
          These will be prioritized when routing ambulances.
        </p>
      </div>

      {/* Selection Summary */}
      <div className="flex items-center gap-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
            {selectedIds.length}
          </div>
          <span className="text-sm text-orange-700 dark:text-orange-300">
            Preferred Selected
            {selectedIds.length < 2 && (
              <span className="text-red-500 ml-1">(min 2 required)</span>
            )}
          </span>
        </div>
        {additionalIds.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-500 text-white flex items-center justify-center font-bold">
              {additionalIds.length}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Additional</span>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospitals..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            fetchHospitals();
          }}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="">All Cities</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <button
          onClick={fetchHospitals}
          disabled={loading}
          className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-400">{error}</p>
              {error.includes('No hospitals') && (
                <button
                  onClick={handleSeedHospitals}
                  disabled={seeding}
                  className="mt-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                  {seeding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      Load Sample Hospitals
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      )}

      {/* Hospital List */}
      {!loading && filteredHospitals.length > 0 && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
          {filteredHospitals.map((hospital) => {
            const isPrimary = isSelected(hospital._id);
            const isSecondary = isAdditional(hospital._id);
            const isAnySelected = isPrimary || isSecondary;

            return (
              <div
                key={hospital._id}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  isPrimary
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : isSecondary
                    ? 'border-gray-400 bg-gray-50 dark:bg-gray-800/50'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Hospital Icon */}
                  <div
                    className={`p-3 rounded-lg ${
                      isPrimary
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}
                  >
                    <Building2 className="w-6 h-6" />
                  </div>

                  {/* Hospital Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                      {hospital.name}
                    </h4>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{hospital.address}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                      <Phone className="w-3 h-3" />
                      <span>{hospital.phone}</span>
                    </div>

                    {/* Facilities Tags */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {hospital.hasEmergency && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                          <Activity className="w-3 h-3" />
                          Emergency
                        </span>
                      )}
                      {hospital.hasICU && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          <Bed className="w-3 h-3" />
                          ICU
                        </span>
                      )}
                      {hospital.hasCardiacCare && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded">
                          <Heart className="w-3 h-3" />
                          Cardiac
                        </span>
                      )}
                      {hospital.availableBeds !== undefined && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                          {hospital.availableBeds} beds
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selection Buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleHospital(hospital._id, true)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                        isPrimary
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                      }`}
                    >
                      {isPrimary && <Check className="w-4 h-4" />}
                      Preferred
                    </button>
                    {!isPrimary && (
                      <button
                        onClick={() => toggleHospital(hospital._id, false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isSecondary
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        {isSecondary ? '✓ Additional' : '+ Additional'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredHospitals.length === 0 && !error && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            No hospitals found matching your search.
          </p>
        </div>
      )}
    </div>
  );
};

export default HospitalPreferencesStep;
