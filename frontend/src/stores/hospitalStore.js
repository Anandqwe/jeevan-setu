import { create } from 'zustand';
import { getHospitals } from '../api/hospitals';

const useHospitalStore = create((set, get) => ({
  hospitals: [],
  loading: false,
  error: null,

  fetchHospitals: async () => {
    set({ loading: true });
    try {
      const data = await getHospitals();
      set({ hospitals: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  updateBedCount: (hospital_id, available_icu_beds) => {
    set((state) => ({
      hospitals: state.hospitals.map((h) =>
        h.id === hospital_id ? { ...h, available_icu_beds } : h
      ),
    }));
  },
}));

export default useHospitalStore;
