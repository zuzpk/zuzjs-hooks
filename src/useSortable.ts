"use client"
import { DependencyList, useCallback, useEffect, useMemo, useRef } from "react";
import type { DragProbe, DragType, DropProbe, Position } from "./dndTypes";
import useDrag from "./useDrag";
import useDrop from "./useDrop";

export type SortableId = string | number;

export type SortablePayload<TItem = unknown> = {
    id: SortableId;
    index: number;
    item: TItem;
};

export type SortableState<TItem = unknown> = {
    isDragging: boolean;
    isOver: boolean;
    canReceive: boolean;
    draggingItem: SortablePayload<TItem> | undefined;
    dragOffset: Position | null;
    pointer: Position | null;
    overIndex: number;
};

export type SortableSpec<TItem = unknown, TCollected = Record<string, unknown>> = {
    channel: DragType;
    id: SortableId;
    index: number;
    payload: TItem;
    accepts?: DragType | DragType[];
    draggable?: boolean;
    droppable?: boolean;
    dragDelay?: number;
    when?: boolean | ((probe: DragProbe<SortablePayload<TItem>>) => boolean);
    canReceive?: (item: SortablePayload<TItem> | undefined, probe: DropProbe<SortablePayload<TItem>>) => boolean;
    observe?: (state: SortableState<TItem>) => TCollected;
    onMove?: (item: SortablePayload<TItem>, toIndex: number, probe: DropProbe<SortablePayload<TItem>>) => void;
    onDrop?: (item: SortablePayload<TItem>, toIndex: number, probe: DropProbe<SortablePayload<TItem>>) => void;
    onFinish?: (item: SortablePayload<TItem> | undefined, probe: DragProbe<SortablePayload<TItem>>) => void;
};

export type UseSortableSpecFactory<TItem = unknown, TCollected = Record<string, unknown>> = () => SortableSpec<TItem, TCollected>;

const useSortable = <TItem = unknown, TCollected = Record<string, unknown>>(
    specFactory: UseSortableSpecFactory<TItem, TCollected>,
    deps?: DependencyList,
): [TCollected, (node: HTMLElement | null) => void] => {
    const spec = useMemo(() => specFactory(), deps ?? [specFactory]);
    const specRef = useRef(spec);

    useEffect(() => {
        specRef.current = spec;
    }, [spec]);

    const lastMoveKeyRef = useRef<string | null>(null);

    const [dragCollected, dragRef] = useDrag<SortablePayload<TItem>, {
        isDragging: boolean;
        dragOffset: Position | null;
        pointer: Position | null;
        draggingItem: SortablePayload<TItem> | undefined;
    }>(() => {
        const current = specRef.current;
        return {
            channel: current.channel,
            dragDelay: current.dragDelay,
            when: (probe) => {
                if (!current.draggable && current.draggable !== undefined) return false;
                const rule = current.when;
                return typeof rule === "function" ? rule(probe) : rule ?? true;
            },
            payload: () => ({
                id: current.id,
                index: current.index,
                item: current.payload,
            }),
            onFinish: (item, probe) => {
                lastMoveKeyRef.current = null;
                current.onFinish?.(item, probe);
            },
            observe: (probe) => ({
                isDragging: probe.active(),
                dragOffset: probe.offset(),
                pointer: probe.pointer(),
                draggingItem: probe.payload(),
            }),
        };
    }, [spec.channel, spec.dragDelay, spec.id, spec.index, spec.payload, spec.draggable, spec.when, spec.onFinish]);

    const [dropCollected, dropRef] = useDrop<SortablePayload<TItem>, {
        isOver: boolean;
        canReceive: boolean;
        draggingItem: SortablePayload<TItem> | undefined;
    }>(() => {
        const current = specRef.current;
        return {
            accepts: current.accepts ?? current.channel,
            canReceive: (item, probe) => {
                if (!current.droppable && current.droppable !== undefined) return false;
                if (!item) return false;
                if (item.id === current.id) return false;

                const canReceive = current.canReceive;
                return canReceive ? canReceive(item, probe) : true;
            },
            onHover: (item, probe) => {
                if (!item) return;
                if (item.id === current.id) return;

                const moveKey = `${String(item.id)}:${item.index}->${current.index}`;
                if (moveKey === lastMoveKeyRef.current) return;

                lastMoveKeyRef.current = moveKey;
                current.onMove?.(item, current.index, probe);
            },
            onReceive: (item, probe) => {
                if (!item) return;
                if (item.id === current.id) return;
                current.onDrop?.(item, current.index, probe);
            },
            observe: (probe) => ({
                isOver: probe.hovering(),
                canReceive: probe.canReceive(),
                draggingItem: probe.payload(),
            }),
        };
    }, [spec.accepts, spec.channel, spec.droppable, spec.canReceive, spec.id, spec.index, spec.onDrop, spec.onMove]);

    const collected = useMemo<TCollected>(() => {
        const current = specRef.current;
        const mergedState: SortableState<TItem> = {
            isDragging: dragCollected.isDragging,
            isOver: dropCollected.isOver,
            canReceive: dropCollected.canReceive,
            draggingItem: dragCollected.draggingItem ?? dropCollected.draggingItem,
            dragOffset: dragCollected.dragOffset,
            pointer: dragCollected.pointer,
            overIndex: current.index,
        };

        const observe = current.observe;
        if (observe) {
            return observe(mergedState);
        }

        return mergedState as TCollected;
    }, [dragCollected, dropCollected]);

    const connectorRef = useCallback((node: HTMLElement | null) => {
        dragRef(node);
        dropRef(node);
    }, [dragRef, dropRef]);

    return [collected, connectorRef];
};

export default useSortable;
