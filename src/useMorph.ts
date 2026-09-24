"use client"
import { useState, useLayoutEffect, RefObject } from "react";

const useMorph = (sourceRef: RefObject<HTMLElement | null>, isReady: boolean) => {
    const [rect, setRect] = useState<{ width: number, height: number, top: number, left: number } | null>(null);

    useLayoutEffect(() => {
        if (isReady && sourceRef.current) {
            const sourceRect = sourceRef.current.getBoundingClientRect();
            setRect({
                width: sourceRect.width,
                height: sourceRect.height,
                top: sourceRect.top,
                left: sourceRect.left
            });
        }
    }, [isReady, sourceRef]);

    return { 
        sourceRect: rect, 
        isMeasured: !!rect 
    };
};

export default useMorph