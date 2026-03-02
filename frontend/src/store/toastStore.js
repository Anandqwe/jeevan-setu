import { create } from 'zustand';

let toastId = 0;

const useToastStore = create((set) => ({
  toasts: [],
  
  addToast: (message, type = 'info', duration = 4500) => {
    const id = ++toastId;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  success: (message, duration) =>
    useToastStore.getState().addToast(message, 'success', duration),
  error: (message, duration) =>
    useToastStore.getState().addToast(message, 'error', duration),
  warning: (message, duration) =>
    useToastStore.getState().addToast(message, 'warning', duration),
  info: (message, duration) =>
    useToastStore.getState().addToast(message, 'info', duration),
}));

export default useToastStore;

// Convenience export
export const toast = {
  success: (msg, dur) => useToastStore.getState().success(msg, dur),
  error: (msg, dur) => useToastStore.getState().error(msg, dur),
  warning: (msg, dur) => useToastStore.getState().warning(msg, dur),
  info: (msg, dur) => useToastStore.getState().info(msg, dur),
};
