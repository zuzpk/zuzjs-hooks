"use client"
// import * as dashjs from "dashjs";
import { useCallback, useEffect, useRef, useState } from "react";

export type MediaItem = {
    url: string;
    title: string;
    artist?: string;
    cover?: string;
    isDash?: boolean;
};

const useMediaPlayer = (playlist: MediaItem[], initialItem?: MediaItem) => {
    const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
    const dashPlayerRef = useRef<any>(null);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 1
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const currentItem = playlist.length > 0 ? playlist[currentIndex] : initialItem;

    const loadSource = useCallback(async (item: MediaItem) => {
        const el = mediaRef.current;
        if (!el) return;

        if (dashPlayerRef.current) {
            dashPlayerRef.current.destroy();
            dashPlayerRef.current = null;
        }

        setIsLoading(true);

        if (item.isDash) {
            const dashjs = await import("dashjs");
            dashPlayerRef.current = dashjs.MediaPlayer().create();
            dashPlayerRef.current.initialize(el, item.url, isPlaying);
        } else {
            el.src = item.url;
            el.load();
            if (isPlaying) {
                el.play().catch(() => setIsPlaying(false));
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        if (currentItem) loadSource(currentItem);
    }, [currentItem, loadSource]);

    // --- Sync Listeners ---
    useEffect(() => {
        const el = mediaRef.current;
        if (!el) return;

        const onTimeUpdate = () => {
            if (el.duration) setProgress(el.currentTime / el.duration);
        };

        const onLoadedMetadata = () => setDuration(el.duration);
        const onEnded = () => (playlist.length > 1 ? next() : setIsPlaying(false));

        el.addEventListener("timeupdate", onTimeUpdate);
        el.addEventListener("loadedmetadata", onLoadedMetadata);
        el.addEventListener("ended", onEnded);

        return () => {
            el.removeEventListener("timeupdate", onTimeUpdate);
            el.removeEventListener("loadedmetadata", onLoadedMetadata);
            el.removeEventListener("ended", onEnded);
        };
    }, [currentIndex, playlist.length]);

    // --- Controls ---
    const togglePlay = () => {
        const el = mediaRef.current;
        if (!el) return;
        if (isPlaying) el.pause(); else el.play();
        setIsPlaying(!isPlaying);
    };

    const seek = (val: number) => { // Expects 0 to 1
        const el = mediaRef.current;
        if (!el || !el.duration) return;
        const time = val * el.duration;
        el.currentTime = time;
        setProgress(val);
    };

    const updateVolume = (val: number) => {
        const el = mediaRef.current;
        if (!el) return;
        const v = Math.min(1, Math.max(0, val));
        el.volume = v;
        setVolume(v);
        if (v > 0) setIsMuted(false);
    };

    const toggleMute = () => {
        const el = mediaRef.current;
        if (!el) return;
        el.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const next = () => setCurrentIndex((prev) => (prev + 1) % playlist.length);
    const prev = () => setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);

    return {
        hasMedia: !!currentItem,
        mediaRef,
        state: { 
            isPlaying, isLoading, progress, duration, 
            volume, isMuted, currentItem, currentIndex 
        },
        controls: { 
            togglePlay, seek, next, prev, 
            setVolume: updateVolume, setIsMuted: toggleMute, 
            setCurrentIndex 
        }
    };
};

export default useMediaPlayer;