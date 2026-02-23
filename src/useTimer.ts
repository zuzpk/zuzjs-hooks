"use client"
import { useEffect, useRef, useState } from "react";

export interface UseTimerProps {
    duration: number; // in seconds
    autoStart?: boolean;
    onProgress?: (percentage: number) => void;
    onExpired?: () => void;
}

const useTimer = ({ 
    duration, 
    autoStart = true, 
    onProgress, 
    onExpired 
}: UseTimerProps) => {

    const [isPaused, setIsPaused] = useState(!autoStart);
    const [isExpired, setIsExpired] = useState(false);
    
    const remainingRef = useRef(duration * 1000);
    const requestRef = useRef<number>(undefined);
    const lastTickRef = useRef<number>(undefined);

    const pause = () => setIsPaused(true);
    const resume = () => setIsPaused(false);
    const reset = () => {
        remainingRef.current = duration * 1000;
        setIsExpired(false);
    };

    useEffect(() => {
        if (isPaused || isExpired) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            lastTickRef.current = undefined;
            return;
        }

        const animate = (time: number) => {
            if (lastTickRef.current !== undefined) {
                const delta = time - lastTickRef.current;
                remainingRef.current -= delta;

                const progress = Math.max(0, remainingRef.current / (duration * 1000));
                onProgress?.(progress);

                if (remainingRef.current <= 0) {
                    setIsExpired(true);
                    onExpired?.();
                    return;
                }
            }

            lastTickRef.current = time;
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPaused, isExpired, duration, onProgress, onExpired]);

    return {
        progress: remainingRef.current / (duration * 1000),
        isPaused,
        isExpired,
        pause,
        resume,
        reset
    };
};

export default useTimer