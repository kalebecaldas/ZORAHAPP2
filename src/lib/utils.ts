import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import axios from 'axios';
const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// API utility with authentication
export const api = axios.create({
  baseURL: (import.meta as any)?.env?.VITE_API_URL || 'http://localhost:4007',
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
        } catch {}
      }
    }
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isBrowser && error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
