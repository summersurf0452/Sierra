/**
 * useAdminAuth - Admin authentication hook
 *
 * Provides login/logout/checkSession for admin panel.
 * Uses adminStore for persistent state and API calls for server verification.
 */

import { useAdminStore } from '@/store/adminStore';
import { api } from '@/lib/api';

export function useAdminAuth() {
  const { isAdminAuthenticated, setAdminAuth, adminLogout } = useAdminStore();

  const login = async (username: string, password: string) => {
    const res = await api.post<{ success: boolean }>('/admin/login', {
      username,
      password,
    });
    if (res.success) {
      setAdminAuth();
    }
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/admin/logout');
    } catch {
      // Logout should succeed locally even if API fails
    }
    adminLogout();
  };

  const checkSession = async (): Promise<boolean> => {
    try {
      await api.get('/admin/me');
      setAdminAuth();
      return true;
    } catch {
      adminLogout();
      return false;
    }
  };

  return { isAdminAuthenticated, login, logout, checkSession };
}
