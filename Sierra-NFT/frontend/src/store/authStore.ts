import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User profile information
 */
export interface User {
  nickname: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

/**
 * Authentication state
 */
interface AuthState {
  address: string | null;
  isAuthenticated: boolean;
  user: User | null;
}

/**
 * Authentication actions
 */
interface AuthActions {
  setAuth: (address: string, user: User) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

/**
 * Zustand auth store with localStorage persistence
 *
 * Persists only address and isAuthenticated to localStorage
 * User profile data is refreshed from backend on session check
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // Initial state
      address: null,
      isAuthenticated: false,
      user: null,

      // Set authentication after successful SIWE login
      setAuth: (address: string, user: User) =>
        set({
          address,
          isAuthenticated: true,
          user,
        }),

      // Update user profile (e.g., after profile edit)
      updateUser: (userUpdate: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userUpdate } : null,
        })),

      // Clear authentication state
      logout: () =>
        set({
          address: null,
          isAuthenticated: false,
          user: null,
        }),
    }),
    {
      name: 'sierra-auth',
      // Only persist address and isAuthenticated, not user data
      partialize: (state) => ({
        address: state.address,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
