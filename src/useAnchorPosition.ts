"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { ANCHOR, AnchorType, ValueOf } from "./types"; // Import your ANCHOR constant

export type AnchorOptions = {
    offsetX?: number,
    offsetY?: number,
    overflow?: boolean
}

const useAnchorPosition = (
    parent?: HTMLElement | null,
    event?: MouseEvent | null,
    options: AnchorOptions & { preferredAnchor?: ValueOf<typeof AnchorType> } = {}
) => {
    const [position, setPosition] = useState<{ top: number, left: number }>({ top: 0, left: 0 });
    const [currentAnchor, setCurrentAnchor] = useState<ValueOf<typeof AnchorType>>(options.preferredAnchor || ANCHOR.TopLeft);
    
    const { offsetX = 0, offsetY = 0, overflow = true } = options;
    const targetRef = useRef<HTMLDivElement | null>(null);

    const updatePosition = useCallback(() => {
        let top = 0;
        let left = 0;
        let nextAnchor = options.preferredAnchor || ANCHOR.TopLeft;

        if (event) {
            top = event.clientY + offsetY;
            left = event.clientX + offsetX;
        } else if (parent) {
            const rect = parent.getBoundingClientRect();
            top = rect.bottom + offsetY;
            left = rect.left + offsetX;
        }

        if (overflow && targetRef.current) {
            const menuWidth = targetRef.current.offsetWidth;
            const menuHeight = targetRef.current.offsetHeight;
            const { innerWidth, innerHeight } = window;

            // X-Axis Flip Detection
            if (left + menuWidth > innerWidth) {
                left = event ? event.clientX - menuWidth - offsetX : (parent?.getBoundingClientRect().right || 0) - menuWidth;
                nextAnchor = nextAnchor.includes('Right') ? nextAnchor : ANCHOR.TopRight; 
            }

            // Y-Axis Flip Detection
            if (top + menuHeight > innerHeight) {
                top = event ? event.clientY - menuHeight - offsetY : (parent?.getBoundingClientRect().top || 0) - menuHeight - offsetY;
                // You could add BottomLeft/BottomRight to your ANCHOR object to handle this
            }
        }

        setPosition({ top, left });
        setCurrentAnchor(nextAnchor);
    }, [event, parent, offsetX, offsetY, overflow, options.preferredAnchor]);

    useEffect(() => {
        // Run after render so targetRef.current is available for measurements
        const timeout = setTimeout(updatePosition, 0); 
        window.addEventListener("resize", updatePosition);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener("resize", updatePosition);
        };
    }, [updatePosition]);

    return { position, targetRef, calculatedAnchor: currentAnchor };
}

export default useAnchorPosition
