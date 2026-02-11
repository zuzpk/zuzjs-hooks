"use client"
import { useEffect, useState } from 'react';

/**
 * Custom hook that sets a mounted state to true after a specified delay.
 *
 * @param {number} [delay=100] - The delay in milliseconds before setting the mounted state to true.
 * @returns {boolean} - The mounted state.
 *
 * @example
 * const isMounted = useMounted(200);
 * 
 * useEffect(() => {
 *   if (isMounted) {
 *     // Component is mounted after 200ms
 *   }
 * }, [isMounted]);
 */
const useMounted = (delay: number = 100) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), delay);
        return () => clearTimeout(timer); // Cleanup the timer on unmount
    }, [delay]);

    return mounted;
};

export default useMounted;