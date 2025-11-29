import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Update favicon dynamically based on system branding
async function updateFavicon() {
  try {
    const response = await fetch('/api/settings/system-branding');
    if (response.ok) {
      const branding = await response.json();
      const faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (faviconLink && branding.logoUrl) {
        faviconLink.href = branding.logoUrl;
        // Force browser to reload favicon by adding timestamp
        faviconLink.href = `${branding.logoUrl}?t=${Date.now()}`;
      }
    }
  } catch (error) {
    console.warn('Failed to load system branding for favicon:', error);
  }
}

// Update favicon on load
updateFavicon();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
