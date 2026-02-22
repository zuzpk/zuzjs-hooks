"use client"
import { useEffect, useRef } from "react";

const useMouseWheel = (callback: (direction: "next" | "prev") => void, active: boolean = true) => {
    const lastScroll = useRef<number>(0);

    useEffect(() => {
        if (!active) return;

        const handleWheel = (e: WheelEvent) => {
            const now = Date.now();
            // Debounce by 500ms to prevent trackpad "inertia" from multi-triggering
            if (now - lastScroll.current < 500) return;

            if (Math.abs(e.deltaY) > 10 || Math.abs(e.deltaX) > 10) {
                lastScroll.current = now;
                callback(e.deltaY > 0 || e.deltaX > 0 ? "next" : "prev");
            }
        };

        window.addEventListener("wheel", handleWheel, { passive: true });
        return () => window.removeEventListener("wheel", handleWheel);
    }, [callback, active]);
};

export default useMouseWheel