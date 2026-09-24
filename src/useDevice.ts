"use client"
import { useEffect, useState } from 'react';

export interface DeviceInfo {
    isMobile: boolean,
    isTablet: boolean,
    isDesktop: boolean,
    width: number,
    height: number,
    orientation: 'portrait' | 'landscape',
    ready: boolean,
}

// Breakpoints used as a fallback / cross-check against UA sniffing
const MOBILE_MAX_WIDTH = 767;
const TABLET_MAX_WIDTH = 1024;

const getDeviceState = (): DeviceInfo => {
    // SSR / non-browser guard — checks both navigator AND window
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
        return {
            isMobile: false,
            isTablet: false,
            isDesktop: true,
            width: 0,
            height: 0,
            orientation: 'landscape',
            ready: false,
        };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    const userAgent = navigator.userAgent;

    // UA-based detection
    const uaTablet = /Tablet|iPad/i.test(userAgent);
    const uaMobile = /Mobi|Android/i.test(userAgent) && !uaTablet;

    // iPadOS 13+ reports as desktop Safari — catch it via touch + platform
    const isIpadOS =
        navigator.platform === 'MacIntel' &&
        typeof navigator.maxTouchPoints === 'number' &&
        navigator.maxTouchPoints > 1;

    // Width-based detection as a fallback when UA is inconclusive
    const widthMobile = width <= MOBILE_MAX_WIDTH;
    const widthTablet = width > MOBILE_MAX_WIDTH && width <= TABLET_MAX_WIDTH;

    const isTablet = uaTablet || isIpadOS || (!uaMobile && widthTablet);
    const isMobile = !isTablet && (uaMobile || widthMobile);

    return {
        isMobile,
        isTablet,
        isDesktop: !isMobile && !isTablet,
        width,
        height,
        orientation: width >= height ? 'landscape' : 'portrait',
        ready: true,
    };
};

const useDevice = (): DeviceInfo => {
    const [device, setDevice] = useState<DeviceInfo>(() => getDeviceState());

    useEffect(() => {
        // Sync once on mount (covers the SSR -> client hydration gap)
        let frame = 0;

        const update = () => {
            // Coalesce rapid resize events into a single rAF-batched update
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                setDevice(prev => {
                    const next = getDeviceState();
                    // Avoid re-renders when nothing meaningful changed
                    if (
                        prev.width === next.width &&
                        prev.height === next.height &&
                        prev.isMobile === next.isMobile &&
                        prev.isTablet === next.isTablet &&
                        prev.ready === next.ready
                    ) {
                        return prev;
                    }
                    return next;
                });
            });
        };

        update();

        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
        };
    }, []);

    return device;
};

export default useDevice;