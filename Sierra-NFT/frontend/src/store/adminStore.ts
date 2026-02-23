import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Admin authentication state
 */
interface AdminState {
  isAdminAuthenticated: boolean;
}

/**
 * Admin authentication actions
 */
interface AdminActions {
  setAdminAuth: () => void;
  adminLogout: () => void;
}

/**
 * Zustand admin store with localStorage persistence
 *
 * Persists only isAdminAuthenticated to localStorage
 * Session validity is verified via /admin/me endpoint
 */
export const useAdminStore = create<AdminState & AdminActions>()(
  persist(
    (set) => ({
      // Initial state
      isAdminAuthenticated: false,

      // Set admin authentication after successful login
      setAdminAuth: () =>
        set({
          isAdminAuthenticated: true,
        }),

      // Clear admin authentication state
      adminLogout: () =>
        set({
          isAdminAuthenticated: false,
        }),
    }),
    {
      name: 'sierra-admin',
      // Only persist isAdminAuthenticated
      partialize: (state) => ({
        isAdminAuthenticated: state.isAdminAuthenticated,
      }),
    },
  ),
);
