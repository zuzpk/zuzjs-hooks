"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import useMutationObserver from "./useMutationObserver";

export interface ScrollBreakpoint {
  [key: number]: () => void; // Example: { 15: () => console.log("Scrolled 15%") }
}

const useScrollbar = (speed: number, breakpoints: ScrollBreakpoint = {}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const thumbY = useRef<HTMLDivElement | null>(null);
  const thumbX = useRef<HTMLDivElement | null>(null);
  const SCROLL_SPEED = useMemo(() => speed ?? 1, [speed]); // default to 1x multiplier
  const isDraggingY = useRef(false);
  const isDraggingX = useRef(false);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const scrollStartY = useRef(0);
  const scrollStartX = useRef(0);
  // No need for thumbHeight/Width refs if calculating them dynamically
  // const thumbHeight = useRef(30);
  // const thumbWidth = useRef(30);

  // Animation frame ID for batching visual updates
  const animationFrameId = useRef<number | null>(null);

  const updateThumb = useCallback(() => {
    if (!containerRef.current || !thumbY.current || !thumbX.current) return;

    const { clientHeight, scrollHeight, scrollTop, clientWidth, scrollWidth, scrollLeft } = containerRef.current;

    // Y thumb calculations and update
    const actualThumbMinHeight = 30; // Min thumb size: 30px
    const thumbSizeY = Math.max((clientHeight / scrollHeight) * clientHeight, actualThumbMinHeight);
    const maxThumbPosY = clientHeight - thumbSizeY;
    const thumbPosY = (scrollTop / (scrollHeight - clientHeight)) * maxThumbPosY;

    thumbY.current.style.height = `${thumbSizeY}px`;
    // *** KEY CHANGE: Use transform for positioning ***
    thumbY.current.style.transform = `translateY(${thumbPosY}px)`;
    thumbY.current.style.willChange = 'transform, height'; // Hint for browser

    // X thumb calculations and update
    const actualThumbMinWidth = 30; // Min thumb size: 30px
    const thumbSizeX = Math.max((clientWidth / scrollWidth) * clientWidth, actualThumbMinWidth);
    const maxThumbPosX = clientWidth - thumbSizeX;
    const thumbPosX = (scrollLeft / (scrollWidth - clientWidth)) * maxThumbPosX;

    thumbX.current.style.width = `${thumbSizeX}px`;
    // *** KEY CHANGE: Use transform for positioning ***
    thumbX.current.style.transform = `translateX(${thumbPosX}px)`;
    thumbX.current.style.willChange = 'transform, width'; // Hint for browser

    // Handle --no-y and --no-x classes (consider if these are strictly needed on every frame)
    // These might still cause reflows, but less frequently than 'top'/'left'
    if (scrollHeight <= clientHeight && rootRef.current) { // Use scrollHeight <= clientHeight for accurate check
        rootRef.current.classList.add(`--no-y`);
    } else if (rootRef.current) {
        rootRef.current.classList.remove(`--no-y`);
    }

    if (scrollWidth <= clientWidth && rootRef.current) { // Use scrollWidth <= clientWidth for accurate check
        rootRef.current.classList.add(`--no-x`);
    } else if (rootRef.current) {
        rootRef.current.classList.remove(`--no-x`);
    }

  }, []); // Dependencies can be added here if needed, but often not for core calculations

  // *** NEW: Central function to request a visual update via requestAnimationFrame ***
  const requestVisualUpdate = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
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
  }, [updateThumb, breakpoints]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    // *** Call requestVisualUpdate instead of postScroll ***
    requestVisualUpdate();
  }, [requestVisualUpdate]);

  // Dragging logic
  const onScrollY = (e: React.MouseEvent) => {
    isDraggingY.current = true;
    dragStartY.current = e.clientY;
    scrollStartY.current = containerRef.current?.scrollTop || 0;
    document.body.style.userSelect = "none";
    if (rootRef.current) rootRef.current?.classList.add(`--scrolling`);
  };

  const onScrollX = (e: React.MouseEvent) => {
    isDraggingX.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = containerRef.current?.scrollLeft || 0;
    document.body.style.userSelect = "none";
    if (rootRef.current) rootRef.current?.classList.add(`--scrolling`);
  };

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || (!isDraggingY.current && !isDraggingX.current)) return;

    const { clientHeight, scrollHeight, clientWidth, scrollWidth } = containerRef.current;

    if (isDraggingY.current) {
      const maxScroll = scrollHeight - clientHeight;
      const thumbCurrentHeight = thumbY.current?.clientHeight || 30; // Use actual thumb height
      const maxThumbMove = clientHeight - thumbCurrentHeight;

      const deltaY = e.clientY - dragStartY.current;
      const newScrollTop = Math.min(
        Math.max(scrollStartY.current + (deltaY / maxThumbMove) * maxScroll, 0),
        maxScroll
      );
      containerRef.current.scrollTop = newScrollTop;
      // *** No direct updateThumb here, the scroll event listener will trigger requestVisualUpdate ***
    }
    if (isDraggingX.current) {
      const maxScrollX = scrollWidth - clientWidth;
      const thumbCurrentWidth = thumbX.current?.clientWidth || 30; // Use actual thumb width
      const maxThumbMoveX = clientWidth - thumbCurrentWidth;

      const deltaX = e.clientX - dragStartX.current;
      const newScrollLeft = Math.min(
        Math.max(scrollStartX.current + (deltaX / maxThumbMoveX) * maxScrollX, 0),
        maxScrollX
      );
      containerRef.current.scrollLeft = newScrollLeft;
      // *** No direct updateThumb here, the scroll event listener will trigger requestVisualUpdate ***
    }
  }, []); // No dependencies needed if current values are always fresh

  const handleDragEnd = () => {
    isDraggingY.current = false;
    isDraggingX.current = false;
    document.body.style.userSelect = "";
    if (rootRef.current) rootRef.current?.classList.remove(`--scrolling`);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current); // Clear any pending rAF
    }
  };

  const scrollToTop = () => containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  const scrollToLeft = () => containerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  const scrollToRight = () => containerRef.current?.scrollTo({ left: containerRef.current.scrollWidth, behavior: "smooth" });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // *** Passive listener means preventDefault is often not needed/effective here ***
      // e.preventDefault();
      // e.stopPropagation();

      if (!containerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = containerRef.current;

      let newScrollTop = scrollTop;
      let newScrollLeft = scrollLeft;
      let changed = false;

      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        const maxScrollY = scrollHeight - clientHeight;
        newScrollTop = scrollTop + e.deltaY * SCROLL_SPEED;
        newScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollY));
        if (newScrollTop !== scrollTop) {
          containerRef.current.scrollTop = newScrollTop;
          changed = true;
        }
      } else { // Prefer deltaX if it's larger or if deltaY is 0
        const maxScrollX = scrollWidth - clientWidth;
        newScrollLeft = scrollLeft + e.deltaX * SCROLL_SPEED;
        newScrollLeft = Math.max(0, Math.min(newScrollLeft, maxScrollX));
        if (newScrollLeft !== scrollLeft) {
          containerRef.current.scrollLeft = newScrollLeft;
          changed = true;
        }
      }

      // *** Only request update if scroll position actually changed ***
      if (changed) {
        requestVisualUpdate();
      }
    };

    window.addEventListener("resize", requestVisualUpdate); // Use requestVisualUpdate for resize
    container.addEventListener("scroll", handleScroll, { passive: true }); // Make scroll passive if you don't preventDefault
    container.addEventListener("wheel", handleWheel, { passive: true }); // Keep passive for wheel

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);

    // Initial update
    requestVisualUpdate(); // Use requestVisualUpdate for initial render

    return () => {
      window.removeEventListener("resize", requestVisualUpdate);
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("wheel", handleWheel); // Corrected: remove from container
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current); // Clean up any pending rAF
      }
    };
  }, [handleScroll, handleDragMove, requestVisualUpdate, SCROLL_SPEED]); // Added SCROLL_SPEED to deps

  // *** NEW: Hook useMutationObserver to call requestVisualUpdate ***
  useMutationObserver(containerRef.current, requestVisualUpdate);

  return {
    rootRef,
    containerRef,
    thumbY,
    thumbX,
    scrollToTop,
    scrollToBottom,
    scrollToLeft,
    scrollToRight,
    onScrollY,
    onScrollX,
  };
};

export default useScrollbar;