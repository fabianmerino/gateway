import { create } from 'zustand';
import type { AuthResponse } from '../types/api';

interface AuthState {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  login: (user: AuthResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
