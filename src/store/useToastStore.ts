import { create } from 'zustand';

export type ToastVariant = 'success' | 'error';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  body?: string;
  action?: { label: string; fn: () => void };
  duration: number; // ms; 0 = manual dismiss only
}

interface ToastStore {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastStore>()((set, get) => ({
  toasts: [],

  push(toast) {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set(s => ({ toasts: [...s.toasts.slice(-4), { ...toast, id }] })); // max 5 stacked
    if (toast.duration > 0) {
      setTimeout(() => get().dismiss(id), toast.duration);
    }
    return id;
  },

  dismiss(id) {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  },

  clear() {
    set({ toasts: [] });
  },
}));

// Convenience — callable outside React trees (e.g., async export handlers)
export const toast = {
  success: (title: string, body?: string) =>
    useToastStore.getState().push({ variant: 'success', title, body, duration: 5000 }),
  error: (title: string, body?: string, action?: ToastItem['action']) =>
    useToastStore.getState().push({ variant: 'error', title, body, action, duration: 0 }),
};
