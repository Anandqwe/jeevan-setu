import { create } from 'zustand';

const useMapStore = create((set) => ({
    center: [28.6139, 77.2090], // Delhi
    zoom: 12,
    markers: [],
    heatmapData: [],
    selectedMarkerId: null,
    showHeatmap: false,

    setCenter: (center) => set({ center }),
    setZoom: (zoom) => set({ zoom }),
    setMarkers: (markers) => set({ markers }),

    addMarker: (marker) => set((state) => ({
        markers: [...state.markers.filter(m => m.id !== marker.id), marker],
    })),

    removeMarker: (id) => set((state) => ({
        markers: state.markers.filter(m => m.id !== id),
    })),

    updateMarkerPosition: (id, lat, lng) => set((state) => ({
        markers: state.markers.map(m =>
            m.id === id ? { ...m, lat, lng } : m
        ),
    })),

    setSelectedMarker: (id) => set({ selectedMarkerId: id }),
    toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
    setHeatmapData: (data) => set({ heatmapData: data }),
}));

export default useMapStore;
