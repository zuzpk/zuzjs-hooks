"use client"
import { useEffect, useRef } from "react";

export type MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => void;

const useMutationObserver = (
    target: HTMLElement | null,
    callback: MutationCallback,
    options: MutationObserverInit = { childList: true, subtree: true }
) => {
    const observerRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        if (!target) return;

        // Create a new MutationObserver and pass the callback
        observerRef.current = new MutationObserver(callback);

        // Start observing the target element
        observerRef.current.observe(target, options);

        // Cleanup function to disconnect the observer
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [target, callback, options]);
};

export default useMutationObserver;