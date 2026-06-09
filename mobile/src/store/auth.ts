import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  title?: string;
  dailySwipes: number;
  subscriptionTier: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'gigly-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

interface SwipeState {
  remainingSwipes: number;
  setRemainingSwipes: (count: number) => void;
  decrementSwipes: () => void;
}

export const useSwipeStore = create<SwipeState>((set) => ({
  remainingSwipes: 10,
  setRemainingSwipes: (count) => set({ remainingSwipes: count }),
  decrementSwipes: () => set((state) => ({ remainingSwipes: Math.max(0, state.remainingSwipes - 1) })),
}));