import { create } from 'zustand';

interface LiveAlert {
  id: string;
  type: 'compliance' | 'lessons' | 'system';
  title: string;
  message: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  timestamp: Date;
  dismissed: boolean;
}

interface NotificationState {
  alerts: LiveAlert[];
  addAlert: (alert: Omit<LiveAlert, 'id' | 'dismissed'>) => void;
  dismissAlert: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  alerts: [],
  addAlert: (alert) => set((state) => {
    const id = Math.random().toString(36).substring(7);
    return {
      alerts: [{ ...alert, id, dismissed: false }, ...state.alerts].slice(0, 50)
    };
  }),
  dismissAlert: (id) => set((state) => ({
    alerts: state.alerts.map((a) => a.id === id ? { ...a, dismissed: true } : a)
  })),
  clearAll: () => set({ alerts: [] })
}));
