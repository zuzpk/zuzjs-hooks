"use client"
import { useEffect } from "react";
import { KeyCode } from "./types";

export type Shortcut = {
    keys: KeyCode[];
    callback: (event: KeyboardEvent) => void;
};

const useShortcuts  = (
    shortcuts: Shortcut[],
    preventDefault?: boolean
) => {

    useEffect(() => {

        const handleKeyDown = (event: KeyboardEvent) => {

            const pressedKeys: KeyCode[] = [];

            if (event.ctrlKey) pressedKeys.push(KeyCode.Ctrl);
            if (event.shiftKey) pressedKeys.push(KeyCode.Shift);
            if (event.altKey) pressedKeys.push(KeyCode.Alt);
            if (event.metaKey) pressedKeys.push(KeyCode.PauseBreak); // Meta key (Cmd on Mac)

            pressedKeys.push(event.keyCode as KeyCode); // Convert event key to KeyCode enum

            shortcuts.forEach(({ keys, callback }) => {
                if (keys.every(key => pressedKeys.includes(key))) {
                    if (preventDefault ?? true) event.preventDefault();
                    callback(event);
                }
            });
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [shortcuts, preventDefault]);

}

export default useShortcuts