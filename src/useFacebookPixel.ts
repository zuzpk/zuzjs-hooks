import { useEffect } from "react";

/**
 * Custom hook for Facebook Pixel tracking
 * @param pixelId - Facebook Pixel ID (e.g., '123456789012345')
 * @param debug - Optional debug mode (default: false)
 */
const useFacebookPixel = (pixelId?: string, debug = false) => {
    // Initialize Facebook Pixel
    useEffect(() => {
      if (!pixelId) return;
  
      // Load Facebook Pixel script if not already loaded
      if (!window.fbq) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://connect.facebook.net/en_US/fbevents.js`;
        document.head.appendChild(script);
  
        window._fbq = window._fbq || [];
        window.fbq = function() {
          window._fbq.push(arguments);
        };
  
        window.fbq('init', pixelId);
        if (debug) {
          window.fbq('set', 'debug', true);
        }
      }
  
      // Track initial page view
      window.fbq('track', 'PageView');
    }, [pixelId, debug]);
  
    /**
     * Track a page view
     */
    const trackPageView = () => {
      if (!pixelId) return;
      window.fbq('track', 'PageView');
    };
  
    /**
     * Track a custom event
     * @param eventName - Standard or custom event name
     * @param params - Optional event parameters
     */
    const trackEvent = (eventName: string, params?: Record<string, any>) => {
      if (!pixelId) return;
      window.fbq('track', eventName, params);
    };
  
    /**
     * Track a custom conversion
     * @param eventName - Conversion event name
     * @param params - Optional conversion parameters
     */
    const trackCustom = (eventName: string, params?: Record<string, any>) => {
      if (!pixelId) return;
      window.fbq('trackCustom', eventName, params);
    };
  
    return {
      trackPageView,
      trackEvent,
      trackCustom,
    };
};

export default useFacebookPixel