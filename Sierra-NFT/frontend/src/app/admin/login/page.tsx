'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import toast from 'react-hot-toast';

/**
 * Admin Login Page - /admin/login
 *
 * Centered login form with Sierra red+black theme.
 * Redirects to /admin if already authenticated.
 * Handles username/password login via useAdminAuth.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const { isAdminAuthenticated, login, checkSession } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    const check = async () => {
      const valid = await checkSession();
      if (valid) {
        router.push('/admin');
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter your credentials');
      return;
    }

    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.success) {
        toast.success('Login successful');
        router.push('/admin');
      } else {
        toast.error('Authentication failed: invalid credentials');
      }
    } catch {
      toast.error('Authentication failed: invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Already authenticated - show loading while redirect happens
  if (isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-primary">Sierra</span>{' '}
            <span className="text-foreground">Admin</span>
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to access the admin panel
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
