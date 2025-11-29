/**
 * Service to manage system branding (name and logo)
 * Loads from API and provides reactive updates
 */

interface SystemBranding {
  systemName: string;
  logoUrl: string;
}

let cachedBranding: SystemBranding | null = null;
let listeners: Array<(branding: SystemBranding) => void> = [];

/**
 * Get system branding (with caching)
 */
export async function getSystemBranding(): Promise<SystemBranding> {
  if (cachedBranding) {
    return cachedBranding;
  }

  try {
    const response = await fetch('/api/settings/system-branding');
    if (response.ok) {
      const branding = await response.json();
      cachedBranding = branding;
      return branding;
    }
  } catch (error) {
    console.warn('Failed to load system branding, using defaults:', error);
  }

  // Defaults
  return {
    systemName: 'ZoraH',
    logoUrl: '/favicon.svg'
  };
}

/**
 * Clear cache (call after updating branding)
 */
export function clearBrandingCache() {
  cachedBranding = null;
  // Force reload by fetching fresh data
  getSystemBranding().then((branding) => {
    // Notify all listeners with fresh data
    listeners.forEach(listener => listener(branding));
  });
}

/**
 * Subscribe to branding changes
 */
export function subscribeToBranding(callback: (branding: SystemBranding) => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

// Export for use in React components
import React from 'react';

/**
 * React hook for system branding
 */
export function useSystemBranding() {
  const [branding, setBranding] = React.useState<SystemBranding>({
    systemName: 'ZoraH',
    logoUrl: '/favicon.svg'
  });

  React.useEffect(() => {
    getSystemBranding().then(setBranding);
    
    const unsubscribe = subscribeToBranding(setBranding);
    return unsubscribe;
  }, []);

  return branding;
}

