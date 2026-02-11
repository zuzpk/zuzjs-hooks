"use client"
import { useEffect, useRef, useState } from "react";
import { dynamic } from "./types";

const useImage = (
    url: string, 
    crossOrigin?: 'anonymous' | 'use-credentials', 
    referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
) => {

    const [ state, setState ] = useState<dynamic>({ loaded: false, error: null });
    const img = useRef<HTMLImageElement>(null);
    
    useEffect(() => {

        if ( url && url !== `` ){

            var _img = new Image();
            crossOrigin && (_img.crossOrigin = crossOrigin);
            referrerPolicy && (_img.referrerPolicy = referrerPolicy);
            _img.onload = () => {
                img.current = _img;
                setState({ loaded: true, error: null });
            }
            _img.onerror = () => {
                setState({ loaded: false, error: `Failed to load image at ${url}` });
            }
            _img.src = url;

        }

    }, [url])

    return [ img.current ? img.current.src : ``, state.loaded, state.error ];

}

export default useImage