import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'teacher' | 'parent';

interface AuthState {
  user: string | null;     // name
  role: Role | null;
  phone: string | null;
  isLoggedIn: boolean;
  setAuth: (user: string, role: Role, phone: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      phone: null,
      isLoggedIn: false,
      setAuth: (user, role, phone) => set({ user, role, phone, isLoggedIn: true }),
      clearAuth: () => set({ user: null, role: null, phone: null, isLoggedIn: false }),
    }),
    { name: 'shulkapro-auth' }
  )
);
