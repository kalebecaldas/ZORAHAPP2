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
export async function getSystemBranding(forceRefresh = false): Promise<SystemBranding> {
  if (cachedBranding && !forceRefresh) {
    return cachedBranding;
  }

  try {
    // Add timestamp to prevent browser cache
    const response = await fetch(`/api/settings/system-branding?t=${Date.now()}`);
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
  // Force reload by fetching fresh data (bypass cache)
  getSystemBranding(true).then((branding) => {
    cachedBranding = branding;
    // Notify all listeners with fresh data
    listeners.forEach(listener => listener(branding));
    // Dispatch custom event to trigger updates in all components
    window.dispatchEvent(new CustomEvent('branding-updated'));
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
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    
    // Load branding on mount with fresh data
    getSystemBranding(true).then((data) => {
      if (mounted) {
        setBranding(data);
        setIsLoading(false);
      }
    });
    
    // Subscribe to changes
    const unsubscribe = subscribeToBranding((data) => {
      if (mounted) {
        setBranding(data);
      }
    });
    
    // Listen for custom event when branding is updated
    const handleBrandingUpdate = () => {
      getSystemBranding(true).then((data) => {
        if (mounted) {
          setBranding(data);
        }
      });
    };
    window.addEventListener('branding-updated', handleBrandingUpdate);
    
    return () => {
      mounted = false;
      unsubscribe();
      window.removeEventListener('branding-updated', handleBrandingUpdate);
    };
  }, []);

  return branding;
}

