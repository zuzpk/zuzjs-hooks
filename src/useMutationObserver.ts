"use client"
import { type RefObject, useEffect, useRef } from "react";

export type MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => void;

const DEFAULT_OPTIONS: MutationObserverInit = { childList: true, subtree: true };

const useMutationObserver = (
    target: HTMLElement | null | RefObject<HTMLElement | null>,
    callback: MutationCallback,
    options: MutationObserverInit = DEFAULT_OPTIONS
) => {
    const observerRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        const targetNode = target && typeof target === "object" && "current" in target
            ? target.current
            : target;

        if (!targetNode) return;

        // Create a new MutationObserver and pass the callback
        observerRef.current = new MutationObserver(callback);

        // Start observing the target element
        observerRef.current.observe(targetNode, options);

        // Cleanup function to disconnect the observer
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [target, callback, options]);
};

export default useMutationObserver;