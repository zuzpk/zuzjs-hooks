"use client"
import { useEffect, useState } from "react";

type UseImageState = {
    src: string;
    loaded: boolean;
    error: string | null;
};

type CacheEntry =
    | { status: "loading"; promise: Promise<string> }
    | { status: "loaded"; src: string }
    | { status: "error"; error: string };

const imageCache = new Map<string, CacheEntry>();

const useImage = (
    url: string, 
    crossOrigin?: 'anonymous' | 'use-credentials', 
    referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
) => {

    const cacheKey = `${crossOrigin || ``}|${referrerPolicy || ``}|${url}`;

    const [state, setState] = useState<UseImageState>(() => {
        const cached = imageCache.get(cacheKey);
        if (cached?.status === "loaded") {
            return { src: cached.src, loaded: true, error: null };
        }
        if (cached?.status === "error") {
            return { src: ``, loaded: false, error: cached.error };
        }
        return { src: ``, loaded: false, error: null };
    });
    
    useEffect(() => {

        let active = true;

        if (!url || url === ``) {
            setState({ src: ``, loaded: false, error: null });
            return () => {
                active = false;
            };
        }

        const cached = imageCache.get(cacheKey);
        if (cached?.status === "loaded") {
            setState({ src: cached.src, loaded: true, error: null });
            return () => {
                active = false;
            };
        }

        if (cached?.status === "error") {
            setState({ src: ``, loaded: false, error: cached.error });
            return () => {
                active = false;
            };
        }

        const loadPromise = cached?.status === "loading"
            ? cached.promise
            : new Promise<string>((resolve, reject) => {
                const next = new Image();
                if (crossOrigin) next.crossOrigin = crossOrigin;
                if (referrerPolicy) next.referrerPolicy = referrerPolicy;
                next.onload = () => resolve(next.src || url);
                next.onerror = () => reject(new Error(`Failed to load image at ${url}`));
                next.src = url;
            });

        if (!cached) {
            imageCache.set(cacheKey, { status: "loading", promise: loadPromise });
        }

        loadPromise
            .then((loadedSrc) => {
                imageCache.set(cacheKey, { status: "loaded", src: loadedSrc });
                if (active) {
                    setState({ src: loadedSrc, loaded: true, error: null });
                }
            })
            .catch((err: Error) => {
                const message = err?.message || `Failed to load image at ${url}`;
                imageCache.set(cacheKey, { status: "error", error: message });
                if (active) {
                    setState({ src: ``, loaded: false, error: message });
                }
            });

        return () => {
            active = false;
        };

    }, [cacheKey, crossOrigin, referrerPolicy, url]);

    return [state.src, state.loaded, state.error] as const;

}

export default useImage