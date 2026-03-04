import { create } from 'zustand';

const useTrackingStore = create((set, get) => ({
  // ambulance_id -> { latitude, longitude, timestamp }
  ambulancePositions: {},

  updatePosition: (ambulance_id, latitude, longitude) => {
    set((state) => ({
      ambulancePositions: {
        ...state.ambulancePositions,
        [ambulance_id]: {
          latitude,
          longitude,
          timestamp: new Date().toISOString(),
        },
      },
    }));
  },

  getPosition: (ambulance_id) => {
    return get().ambulancePositions[ambulance_id] || null;
  },

  clearPositions: () => {
    set({ ambulancePositions: {} });
  },
}));

export default useTrackingStore;
