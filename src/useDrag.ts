"use client"
import { DependencyList, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { setActiveDrag, subscribeActiveDrag, updateActiveDrag } from './dndRuntime';
import type { DragProbe, UseDragSpecFactory } from './dndTypes';

const INTERACTIVE_TAGS = ['BUTTON', 'INPUT', 'TEXTAREA', 'A', 'SELECT'];

const isInteractiveElement = (el: Element | null): boolean => {
    if (!el) return false;
    
    // Check tag name
    if (INTERACTIVE_TAGS.includes(el.tagName)) return true;
    
    // Check for click event listener or contentEditable
    if ((el as any).contentEditable === 'true') return true;
    
    // Check for role attributes that indicate interactivity
    const role = el.getAttribute('role');
    if (role && ['button', 'link', 'checkbox', 'radio', 'switch', 'tab'].includes(role)) return true;
    
    return false;
};

const findInteractiveParent = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    
    let current: Element | null = target;
    const maxDepth = 5; // Check up to 5 levels
    let depth = 0;
    
    while (current && depth < maxDepth) {
        if (isInteractiveElement(current)) return true;
        current = current.parentElement;
        depth++;
    }
    
    return false;
};

const useDragSource = <TItem = unknown, TCollected = Record<string, unknown>>(
    specFactory: UseDragSpecFactory<TItem, TCollected>,
    deps?: DependencyList
): [TCollected, (node: HTMLElement | null) => void] => {
    const spec = useMemo(() => specFactory(), deps ?? [specFactory]);
    const specRef = useRef(spec);

    useEffect(() => {
        specRef.current = spec;
    }, [spec]);

    const nodeRef = useRef<HTMLElement | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const pendingStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingStartCleanupRef = useRef<(() => void) | null>(null);
    const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
    const isDraggingRef = useRef(false);
    const currentOffsetRef = useRef<{ x: number; y: number } | null>(null);
    const initialOffsetRef = useRef<{ x: number; y: number } | null>(null);
    const itemRef = useRef<TItem | undefined>(undefined);

    const monitorRef = useRef<DragProbe<TItem>>({
        active: () => isDraggingRef.current,
        payload: () => itemRef.current,
        channel: () => specRef.current.channel,
        origin: () => initialOffsetRef.current,
        pointer: () => currentOffsetRef.current,
        offset: () => {
            if (!initialOffsetRef.current || !currentOffsetRef.current) return null;
            return {
                x: currentOffsetRef.current.x - initialOffsetRef.current.x,
                y: currentOffsetRef.current.y - initialOffsetRef.current.y
            };
        }
    });

    const [collected, setCollected] = useState<TCollected>(() => {
        const observe = spec.observe;
        if (observe) {
            return observe(monitorRef.current);
        }
        return {} as TCollected;
    });

    const updateCollected = useCallback(() => {
        const observe = specRef.current.observe;
        if (!observe) return;
        setCollected(observe(monitorRef.current));
    }, []);

    const clearPendingStart = useCallback(() => {
        if (pendingStartTimeoutRef.current) {
            clearTimeout(pendingStartTimeoutRef.current);
            pendingStartTimeoutRef.current = null;
        }

        const cleanupPending = pendingStartCleanupRef.current;
        if (cleanupPending) {
            cleanupPending();
            pendingStartCleanupRef.current = null;
        }

        pendingPointRef.current = null;
    }, []);

    useEffect(() => {
        updateCollected();
    }, [updateCollected]);

    useEffect(() => {
        return subscribeActiveDrag(updateCollected);
    }, [updateCollected]);

    const stopDragging = useCallback(() => {
        clearPendingStart();

        const removeHandlers = cleanupRef.current;
        if (removeHandlers) {
            removeHandlers();
            cleanupRef.current = null;
        }

        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            specRef.current.onFinish?.(itemRef.current, monitorRef.current);

            updateActiveDrag({
                isDragging: false
            });

            updateCollected();
        }
    }, [clearPendingStart, updateCollected]);

    useEffect(() => stopDragging, [stopDragging]);

    const beginDragging = useCallback((startPoint: { x: number; y: number }) => {
        if (isDraggingRef.current) return false;

        const activeSpec = specRef.current;
        const when = activeSpec.when;
        const canDrag = typeof when === 'function'
            ? when(monitorRef.current)
            : when ?? true;

        if (!canDrag) return false;

        isDraggingRef.current = true;

        const payload = activeSpec.payload;
        const item = typeof payload === 'function'
            ? (payload as () => TItem)()
            : payload;
        itemRef.current = item;

        const startOffset = { x: startPoint.x, y: startPoint.y };
        initialOffsetRef.current = startOffset;
        currentOffsetRef.current = startOffset;

        setActiveDrag({
            isDragging: true,
            item,
            itemType: activeSpec.channel,
            initialClientOffset: startOffset,
            clientOffset: startOffset
        });

        updateCollected();

        const onMouseMove = (moveEvent: MouseEvent) => {
            currentOffsetRef.current = { x: moveEvent.clientX, y: moveEvent.clientY };
            updateActiveDrag({
                clientOffset: currentOffsetRef.current
            });
            updateCollected();
        };

        const onMouseUp = () => {
            stopDragging();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        cleanupRef.current = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        return true;
    }, [stopDragging, updateCollected]);

    const startDragging = useCallback((event: MouseEvent) => {
        // Skip drag if clicking on interactive elements (buttons, inputs, links, etc.)
        if (findInteractiveParent(event.target)) {
            return;
        }

        const dragDelay = Math.max(0, specRef.current.dragDelay ?? 0);
        const startPoint = { x: event.clientX, y: event.clientY };

        if (dragDelay <= 0) {
            const started = beginDragging(startPoint);
            if (started) {
                event.preventDefault();
            }
            return;
        }

        clearPendingStart();
        pendingPointRef.current = startPoint;

        const onPendingMouseMove = (moveEvent: MouseEvent) => {
            pendingPointRef.current = {
                x: moveEvent.clientX,
                y: moveEvent.clientY,
            };
        };

        const cancelPending = () => {
            clearPendingStart();
        };

        document.addEventListener('mousemove', onPendingMouseMove);
        document.addEventListener('mouseup', cancelPending);

        pendingStartCleanupRef.current = () => {
            document.removeEventListener('mousemove', onPendingMouseMove);
            document.removeEventListener('mouseup', cancelPending);
        };

        pendingStartTimeoutRef.current = setTimeout(() => {
            const point = pendingPointRef.current ?? startPoint;
            clearPendingStart();
            beginDragging(point);
        }, dragDelay);
    }, [beginDragging, clearPendingStart]);

    const dragRef = useCallback((node: HTMLElement | null) => {
        if (nodeRef.current) {
            nodeRef.current.removeEventListener('mousedown', startDragging);
        }

        nodeRef.current = node;

        if (nodeRef.current) {
            nodeRef.current.addEventListener('mousedown', startDragging);
        }
    }, [startDragging]);

    useEffect(() => {
        return () => {
            if (nodeRef.current) {
                nodeRef.current.removeEventListener('mousedown', startDragging);
            }
        };
    }, [startDragging]);

    return [collected, dragRef];
};

function useDrag<TItem = unknown, TCollected = Record<string, unknown>>(
    specFactory: UseDragSpecFactory<TItem, TCollected>,
    deps?: DependencyList
): [TCollected, (node: HTMLElement | null) => void] {
    return useDragSource(specFactory, deps);
}

export type { DragProbe, DragSpec, DragType, UseDragSpecFactory } from './dndTypes';

export default useDrag