"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import useMutationObserver from "./useMutationObserver";
export interface ScrollBreakpoint {
  [key: number]: () => void;
}

const useScrollbar = (speed: number = 1, breakpoints: ScrollBreakpoint = {}, smooth: boolean = false) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const thumbY = useRef<HTMLDivElement | null>(null);
  const thumbX = useRef<HTMLDivElement | null>(null);
  
  const SCROLL_SPEED = useMemo(() => speed, [speed]);
  const lerpFactor = 0.12; 
  
  const targetY = useRef(0);
  const currentY = useRef(0);
  const targetX = useRef(0);
  const currentX = useRef(0);
  
  const isRunning = useRef(false);
  const isDragging = useRef(false);

  const animationFrameId = useRef<number | null>(null);
  const physicsFrameId = useRef<number | null>(null);

  const updateThumb = useCallback(() => {
    if (!containerRef.current || !thumbY.current || !thumbX.current) return;

    const { clientHeight, scrollHeight, clientWidth, scrollWidth } = containerRef.current;

    // Use high-precision refs if the physics engine is running, otherwise fallback to DOM
    const sTop = isRunning.current ? currentY.current : containerRef.current.scrollTop;
    const sLeft = isRunning.current ? currentX.current : containerRef.current.scrollLeft;

    // Y Thumb
    const thumbSizeY = Math.max((clientHeight / scrollHeight) * clientHeight, 30);
    const maxThumbPosY = clientHeight - thumbSizeY;
    // Calculate position using the high-precision sTop
    const thumbPosY = (sTop / (scrollHeight - clientHeight)) * maxThumbPosY;

    thumbY.current.style.height = `${thumbSizeY}px`;
    // translate3d(0, y, 0) is smoother than translateY(y)
    thumbY.current.style.transform = `translate3d(0, ${thumbPosY}px, 0)`;

    // X Thumb
    const thumbSizeX = Math.max((clientWidth / scrollWidth) * clientWidth, 30);
    const maxThumbPosX = clientWidth - thumbSizeX;
    const thumbPosX = (sLeft / (scrollWidth - clientWidth)) * maxThumbPosX;

    thumbX.current.style.width = `${thumbSizeX}px`;
    thumbX.current.style.transform = `translate3d(${thumbPosX}px, 0, 0)`;

    if (rootRef.current) {
        rootRef.current.classList.toggle('--no-y', scrollHeight <= clientHeight);
        rootRef.current.classList.toggle('--no-x', scrollWidth <= clientWidth);
    }
  }, []);

  const requestVisualUpdate = useCallback(() => {
    if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    animationFrameId.current = requestAnimationFrame(() => {
      updateThumb();
      // Trigger breakpoints after the visual update for this frame
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = containerRef.current;
        const scrollPercentY = (scrollTop / (scrollHeight - clientHeight)) * 100;
        const scrollPercentX = (scrollLeft / (scrollWidth - clientWidth)) * 100;

        Object.keys(breakpoints).forEach((key) => {
          const breakpoint = parseFloat(key);
          if (Math.abs(scrollPercentY - breakpoint) < 1) {
            breakpoints[breakpoint]?.();
          }
          if (Math.abs(scrollPercentX - breakpoint) < 1) { // Assuming breakpoints can be for X too
            breakpoints[breakpoint]?.();
          }
        });
      }
    });
  }, [updateThumb]);

  const tick = useCallback(() => {
    if (!containerRef.current || isDragging.current) {
      isRunning.current = false;
      return;
    }

    const diffY = targetY.current - currentY.current;
    const diffX = targetX.current - currentX.current;
    
    // Apply LERP
    currentY.current += diffY * lerpFactor;
    currentX.current += diffX * lerpFactor;

    // 1. Update the actual scroll position
    containerRef.current.scrollTop = Math.round(currentY.current);
    containerRef.current.scrollLeft = Math.round(currentX.current);

    // 2. FORCE the thumb to update in the SAME frame
    // Don't use requestVisualUpdate() here, call updateThumb() directly
    updateThumb(); 

    if (Math.abs(diffY) > 0.1 || Math.abs(diffX) > 0.1) {
      physicsFrameId.current = requestAnimationFrame(tick);
    } else {
      // Snap to final target to prevent "near-miss" jumps
      currentY.current = targetY.current;
      currentX.current = targetX.current;
      containerRef.current.scrollTop = targetY.current;
      containerRef.current.scrollLeft = targetX.current;
      updateThumb(); 
      isRunning.current = false;
    }
    
    window.dispatchEvent(new Event('scroll'));
  }, [updateThumb, lerpFactor]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current) return;

    const target = e.target as HTMLElement;
    if (target.closest('.--allow-scroll')) return;

    if (smooth) {
      e.preventDefault(); 
      const maxScrollY = containerRef.current.scrollHeight - containerRef.current.clientHeight;
      const maxScrollX = containerRef.current.scrollWidth - containerRef.current.clientWidth;
      
      targetY.current = Math.max(0, Math.min(targetY.current + e.deltaY * SCROLL_SPEED, maxScrollY));
      targetX.current = Math.max(0, Math.min(targetX.current + e.deltaX * SCROLL_SPEED, maxScrollX));

      if (!isRunning.current) {
        isRunning.current = true;
        physicsFrameId.current = requestAnimationFrame(tick);
      }
    } else {
      containerRef.current.scrollTop += e.deltaY * SCROLL_SPEED;
      containerRef.current.scrollLeft += e.deltaX * SCROLL_SPEED;
    }
  }, [smooth, SCROLL_SPEED, tick]);

  const handleNativeScroll = useCallback(() => {
    if (!containerRef.current) return;
    if (!isRunning.current) {
      currentY.current = containerRef.current.scrollTop;
      targetY.current = containerRef.current.scrollTop;
      currentX.current = containerRef.current.scrollLeft;
      targetX.current = containerRef.current.scrollLeft;
    }
    requestVisualUpdate();
    window.dispatchEvent(new Event('scroll'));
  }, [requestVisualUpdate]);

  // Dragging Handlers
  const onScrollY = (e: React.MouseEvent) => {
    isDragging.current = true;
    const startY = e.clientY;
    const startScroll = containerRef.current?.scrollTop || 0;
    const onMove = (me: MouseEvent) => {
        if (!containerRef.current) return;
        const ratio = containerRef.current.scrollHeight / containerRef.current.clientHeight;
        containerRef.current.scrollTop = startScroll + (me.clientY - startY) * ratio;
    };
    const onUp = () => { isDragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const onScrollX = (e: React.MouseEvent) => {
    isDragging.current = true;
    const startX = e.clientX;
    const startScroll = containerRef.current?.scrollLeft || 0;
    const onMove = (me: MouseEvent) => {
        if (!containerRef.current) return;
        const ratio = containerRef.current.scrollWidth / containerRef.current.clientWidth;
        containerRef.current.scrollLeft = startScroll + (me.clientX - startX) * ratio;
    };
    const onUp = () => { isDragging.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Physics-aware Scroll Helpers
  const triggerPhysics = () => {
    if (!isRunning.current) {
        isRunning.current = true;
        physicsFrameId.current = requestAnimationFrame(tick);
    }
  };

  const scrollToTop = () => { targetY.current = 0; triggerPhysics(); };
  const scrollToBottom = () => { targetY.current = containerRef.current?.scrollHeight || 0; triggerPhysics(); };
  const scrollToLeft = () => { targetX.current = 0; triggerPhysics(); };
  const scrollToRight = () => { targetX.current = containerRef.current?.scrollWidth || 0; triggerPhysics(); };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    window.addEventListener("resize", requestVisualUpdate);
    container.addEventListener("scroll", handleNativeScroll, { passive: true });
    container.addEventListener("wheel", handleWheel, { passive: !smooth });
    requestVisualUpdate();
    return () => {
      window.removeEventListener("resize", requestVisualUpdate);
      container.removeEventListener("scroll", handleNativeScroll);
      container.removeEventListener("wheel", handleWheel);
      if (physicsFrameId.current) cancelAnimationFrame(physicsFrameId.current);
    };
  }, [handleNativeScroll, handleWheel, requestVisualUpdate, smooth]);

  useMutationObserver(containerRef.current, requestVisualUpdate);

  return {
    rootRef, containerRef, thumbY, thumbX,
    onScrollY, onScrollX,
    scrollToTop, scrollToBottom, scrollToLeft, scrollToRight
  };
};

export default useScrollbar;