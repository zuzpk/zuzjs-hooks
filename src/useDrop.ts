"use client"
import { DependencyList, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getActiveDrag, subscribeActiveDrag } from './dndRuntime';
import type { DragType, DropProbe, DropSpec, UseDropSpecFactory } from './dndTypes';

const toAcceptArray = (accept: DragType | DragType[]) => {
    return Array.isArray(accept) ? accept : [accept];
};

const isPointInsideNode = (node: HTMLElement | null, point: { x: number; y: number } | null) => {
    if (!node || !point) return false;
    const rect = node.getBoundingClientRect();
    return point.x >= rect.left
        && point.x <= rect.right
        && point.y >= rect.top
        && point.y <= rect.bottom;
};

const useDropTarget = <TItem = unknown, TCollected = Record<string, unknown>>(
    specFactory: UseDropSpecFactory<TItem, TCollected>,
    deps?: DependencyList
): [TCollected, (node: HTMLElement | null) => void] => {
    const spec = useMemo(() => specFactory(), deps ?? [specFactory]);
    const specRef = useRef(spec);

    useEffect(() => {
        specRef.current = spec;
    }, [spec]);

    const nodeRef = useRef<HTMLElement | null>(null);
    const canDropRef = useRef(false);
    const isOverRef = useRef(false);

    const monitorRef = useRef<DropProbe<TItem>>({
        canReceive: () => canDropRef.current,
        hovering: () => isOverRef.current,
        payload: () => getActiveDrag().item as TItem | undefined,
        channel: () => getActiveDrag().itemType,
        origin: () => getActiveDrag().initialClientOffset,
        pointer: () => getActiveDrag().clientOffset,
        offset: () => {
            const state = getActiveDrag();
            if (!state.initialClientOffset || !state.clientOffset) return null;
            return {
                x: state.clientOffset.x - state.initialClientOffset.x,
                y: state.clientOffset.y - state.initialClientOffset.y
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

    const syncTargetState = useCallback(() => {
        const dragState = getActiveDrag();
        const activeSpec = specRef.current;

        if (!dragState.isDragging || !dragState.itemType) {
            canDropRef.current = false;
            isOverRef.current = false;
            updateCollected();
            return;
        }

        const acceptedTypes = toAcceptArray(activeSpec.accepts);
        const typeMatches = acceptedTypes.some((itemType) => itemType === dragState.itemType);
        const pointerIsOver = isPointInsideNode(nodeRef.current, dragState.clientOffset);

        if (!typeMatches || !pointerIsOver) {
            canDropRef.current = false;
            isOverRef.current = false;
            updateCollected();
            return;
        }

        const canReceive = activeSpec.canReceive;
        const allowed = canReceive
            ? canReceive(dragState.item as TItem | undefined, monitorRef.current)
            : true;

        canDropRef.current = allowed;
        isOverRef.current = true;

        if (allowed) {
            activeSpec.onHover?.(dragState.item as TItem | undefined, monitorRef.current);
        }

        updateCollected();
    }, [updateCollected]);

    useEffect(() => {
        syncTargetState();
    }, [syncTargetState]);

    useEffect(() => {
        return subscribeActiveDrag(syncTargetState);
    }, [syncTargetState]);

    useEffect(() => {
        const onMouseUp = () => {
            const dragState = getActiveDrag();
            if (!dragState.isDragging) return;
            if (!isOverRef.current || !canDropRef.current) return;
            specRef.current.onReceive?.(dragState.item as TItem | undefined, monitorRef.current);
            isOverRef.current = false;
            canDropRef.current = false;
            updateCollected();
        };

        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [updateCollected]);

    const dropRef = useCallback((node: HTMLElement | null) => {
        nodeRef.current = node;
        syncTargetState();
    }, [syncTargetState]);

    return [collected, dropRef];
};

function useDrop<TItem = unknown, TCollected = Record<string, unknown>>(
    specFactory: UseDropSpecFactory<TItem, TCollected>,
    deps?: DependencyList
): [TCollected, (node: HTMLElement | null) => void] {
    return useDropTarget(specFactory, deps);
}

export type { DropProbe, DropSpec, UseDropSpecFactory } from './dndTypes';

export default useDrop
