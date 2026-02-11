"use client"
import { RefObject, useEffect, useState } from 'react';

interface Size {
    width: number;
    height: number;
    top: number;
    left: number;
}

const useResizeObserver = (ref: RefObject<HTMLElement | null> | HTMLElement): Size => {
    
    const [size, setSize] = useState<Size>({ width: 0, height: 0, top: 0, left: 0 });

    useEffect(() => {
        
        const _ref = ref instanceof HTMLElement ? ref : ref.current

        const handleResize = (entries: ResizeObserverEntry[]) => {
            for (let entry of entries) {
                const { width, height, top, left } = entry.contentRect;
                setSize({ width, height, top, left });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        if (_ref) {
            resizeObserver.observe(_ref);
        }

        return () => {
            if (_ref) {
                resizeObserver.unobserve(_ref);
            }
        };
    }, [ref]);

    return size;
};

export default useResizeObserver;