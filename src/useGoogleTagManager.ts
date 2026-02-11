import { useEffect } from 'react';

/**
 * Custom hook for Google gtag (Global Site Tag) tracking
 * @param id - Google Analytics tracking ID (e.g., 'G-XXXXXXXXXX')
 */
const useGtag = (id?: string) => {
  // Initialize gtag.js
  useEffect(() => {
    if (!id) return;

    // Load gtag.js script if not already loaded
    if (!window.gtag) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };

      // Set the current date/time
      window.gtag('js', new Date());
    }

    // Configure the tracker
    window.gtag('config', id);
  }, [id]);

  /**
   * Track a page view
   * @param path - URL path to track (defaults to current location)
   */
  const trackPageView = (path?: string) => {
    if (!id) return;
    window.gtag('config', id, {
      page_path: path || window.location.pathname,
    });
  };

  /**
   * Track an event
   * @param eventName - Event name (e.g., 'login', 'sign_up')
   * @param params - Additional event parameters
   */
  const trackEvent = (eventName: string, params?: Record<string, any>) => {
    if (!id) return;
    window.gtag('event', eventName, params);
  };

  return {
    trackPageView,
    trackEvent,
  };
};

export default useGtag;