"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { ANCHOR, AnchorType, ValueOf } from "./types";

export type AnchorOptions = {
    offsetX?: number,
    offsetY?: number,
    overflow?: boolean,
    preferredAnchor?: ValueOf<typeof AnchorType>
}

const useAnchorPosition = (
    parent?: HTMLElement | null,
    event?: MouseEvent | null,
    options: AnchorOptions = {}
) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [calculatedAnchor, setCalculatedAnchor] = useState(options.preferredAnchor || ANCHOR.TopLeft);
    const [isPositioned, setIsPositioned] = useState(false);
    const targetRef = useRef<HTMLElement | null>(null);

    const { offsetX = 0, offsetY = 0, overflow = true, preferredAnchor = ANCHOR.TopLeft } = options;

    const updatePosition = useCallback(() => {
        const menu = targetRef.current;
        if (!menu) {
            setIsPositioned(false);
            return;
        }

        const menuWidth = menu?.offsetWidth || 0;
        const menuHeight = menu?.offsetHeight || 0;
        if (menuWidth === 0 || menuHeight === 0) {
            setIsPositioned(false);
            return;
        }

        const { innerWidth, innerHeight } = window;

        let top = 0;
        let left = 0;
        let finalAnchor = preferredAnchor;

        if (event) {
            // Context Menu (Mouse Position) logic
            top = event.clientY + offsetY;
            left = event.clientX + offsetX;
        } else if (parent) {
            // Dropdown (Element Anchor) logic
            const rect = parent.getBoundingClientRect();
            
            // Initial positioning based on preferredAnchor
            switch (preferredAnchor) {
                case ANCHOR.TopRight:
                    top = rect.bottom + offsetY;
                    left = rect.right - menuWidth + offsetX;
                    break;
                case ANCHOR.BottomLeft:
                    top = rect.top - menuHeight - offsetY;
                    left = rect.left + offsetX;
                    break;
                case ANCHOR.BottomRight:
                    top = rect.top - menuHeight - offsetY;
                    left = rect.right - menuWidth + offsetX;
                    break;
                case ANCHOR.TopLeft:
                default:
                    top = rect.bottom + offsetY;
                    left = rect.left + offsetX;
                    break;
            }
        }

        // Viewport Overflow Correction (Flip Logic)
        if (overflow && menuWidth > 0) {
            // Horizontal Flip
            if (left + menuWidth > innerWidth) {
                left = innerWidth - menuWidth - 10; // 10px padding from edge
                if (preferredAnchor.includes('Left')) finalAnchor = ANCHOR.TopRight;
            }
            if (left < 0) left = 10;

            // Vertical Flip
            if (top + menuHeight > innerHeight) {
                if (parent) {
                    const rect = parent.getBoundingClientRect();
                    top = rect.top - menuHeight - offsetY;
                } else {
                    top = innerHeight - menuHeight - 10;
                }
            }
            if (top < 0) top = 10;
        }

        setPosition({ top, left });
        setCalculatedAnchor(finalAnchor);
        setIsPositioned(true);
    }, [event, parent, offsetX, offsetY, overflow, preferredAnchor]);

    useEffect(() => {
        setIsPositioned(false);
        updatePosition();
        
        // Listen for window changes
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        // Listen for menu size changes (if items load dynamically)
        const observer = new ResizeObserver(updatePosition);
        if (targetRef.current) observer.observe(targetRef.current);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
            observer.disconnect();
        };
    }, [updatePosition]);

    return { position, targetRef, calculatedAnchor, isPositioned };
}

export default useAnchorPosition;