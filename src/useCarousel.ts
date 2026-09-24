"use client"
import { useCallback, useState } from "react";
import { KeyCode } from "./types";
import useMouseWheel from "./useMouseWheel";
import useShortcuts from "./useShortcuts";

export type CarouselOptions = {
    total: number;
    initialIndex?: number;
    loop?: boolean;
    useWheel?: boolean;
    useKeys?: boolean;
    onChange?: (index: number) => void;
};

const useCarousel = ({
    total,
    initialIndex = 0,
    loop = true,
    useWheel = true,
    useKeys = true,
    onChange
}: CarouselOptions) => {
    const [index, setIndex] = useState(initialIndex);

    const navigate = useCallback((direction: "next" | "prev" | number) => {
        setIndex((prev) => {
            let nextIndex = prev;

            if (typeof direction === "number") {
                nextIndex = direction;
            } else {
                nextIndex = direction === "next" ? prev + 1 : prev - 1;
            }

            // Handle Looping Logic
            if (nextIndex >= total) nextIndex = loop ? 0 : total - 1;
            if (nextIndex < 0) nextIndex = loop ? total - 1 : 0;

            if (nextIndex !== prev) onChange?.(nextIndex);
            return nextIndex;
        });
    }, [total, loop, onChange]);

    // 1. Mouse Wheel Integration
    useMouseWheel((dir) => navigate(dir), useWheel);

    // 2. Keybord Shortcuts Integration
    useShortcuts([
        { keys: [KeyCode.ArrowRight], callback: () => navigate("next") },
        { keys: [KeyCode.ArrowLeft], callback: () => navigate("prev") }
    ], useKeys);

    return {
        index,
        next: () => navigate("next"),
        prev: () => navigate("prev"),
        goTo: (i: number) => navigate(i),
        isFirst: index === 0,
        isLast: index === total - 1,
        progress: total > 0 ? (index / (total - 1)) * 100 : 0
    };
};

export default useCarousel