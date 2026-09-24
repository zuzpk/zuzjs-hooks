import { RefObject, useEffect, useRef, useState } from 'react';
import { createRenderBatch, ProcessFn, RenderBatch } from './frameloop';

const PARALLAX_EPSILON = 0.5; // px — skip update if offset hasn't changed enough

const getScrollContainer = (el: HTMLElement | null) => {
    return el?.closest('.--scroll-content') as HTMLElement | null;
};

const useParallax = (
    speed: number = 0.5,
    anchorRef?: RefObject<HTMLElement | null>
) => {
    const [offset, setOffset] = useState(0);
    const batchRef = useRef<RenderBatch | null>(null);
    const pendingRef = useRef<number | null>(null);
    const scheduledRef = useRef(false);
    const offsetRef = useRef(0);

    useEffect(() => {
        if (!batchRef.current) {
            batchRef.current = createRenderBatch();
        }

        return () => {
            batchRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!batchRef.current) return;

        const anchorEl = anchorRef?.current;
        const scrollContainer = anchorEl
            ? getScrollContainer(anchorEl)
            : (document.querySelector('.--scroll-content') as HTMLElement | null);

        const readScroll = () => (scrollContainer ? scrollContainer.scrollTop : window.scrollY);

        let flushScrollFn: ProcessFn | null = null;
        flushScrollFn = () => {
            scheduledRef.current = false;
            const pendingScroll = pendingRef.current;
            pendingRef.current = null;
            if (pendingScroll === null) return;

            const next = pendingScroll * speed;
            if (Math.abs(next - offsetRef.current) < PARALLAX_EPSILON) return;
            offsetRef.current = next;
            setOffset(next);
        };

        const handleScroll = () => {
            pendingRef.current = readScroll();
            if (scheduledRef.current || !flushScrollFn) return;

            scheduledRef.current = true;
            batchRef.current?.schedule('preUpdate', flushScrollFn);
        };

        const scrollSource: HTMLElement | Window = scrollContainer ?? window;
        scrollSource.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            scrollSource.removeEventListener('scroll', handleScroll);
            pendingRef.current = null;
            scheduledRef.current = false;
            if (batchRef.current && flushScrollFn) {
                batchRef.current.cancel(flushScrollFn);
            }
        };
    }, [speed, anchorRef]);

    return offset;
};

export default useParallax;