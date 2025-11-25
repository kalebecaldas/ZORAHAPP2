import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from 'axios';
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API utility with authentication
export const api = axios.create({
  baseURL: (import.meta as any)?.env?.VITE_API_URL || '/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  let token: string | null = null;
  if (isBrowser) {
    token = localStorage.getItem('token');
    if (!token) {
      const persisted = localStorage.getItem('auth-storage');
      if (persisted) {
        try {
          const parsed = JSON.parse(persisted);
          token = parsed?.state?.token || null;
        } catch { }
      }
    }
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    // Ensure proper Content-Type for FormData uploads
    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
      if ((config.headers as any)['Content-Type']) {
        delete (config.headers as any)['Content-Type'];
      }
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login on 401 if the error hasn't been handled by the component
    // This prevents redirects when fetching conversations that might have auth issues
    if (isBrowser && error.response?.status === 401 && !error._handled) {
      const currentPath = window.location.pathname;
      // Don't redirect if we're on conversations page - let the component handle it
      if (!currentPath.includes('/conversations')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
