/**
 * API client for Sierra backend
 *
 * Handles authentication, error handling, and type-safe requests
 */

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Type-safe API client with automatic error handling
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${BACKEND_URL}${endpoint}`;

  // Append query params
  if (params) {
    const searchParams = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    );
    url += `?${searchParams.toString()}`;
  }

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include', // Send cookies for session-based auth
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    // 401: Unauthorized - trigger logout
    if (response.status === 401) {
      // Dynamically import to avoid circular dependency
      import('@/store/authStore').then(({ useAuthStore }) => {
        useAuthStore.getState().logout();
      });
    }

    const errorData = await response.json().catch(() => ({
      message: response.statusText,
    }));

    throw new ApiError(
      response.status,
      errorData.message || `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    apiClient<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: ApiOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
