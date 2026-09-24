import type { DragType, Position } from './dndTypes';

export type ActiveDragState<TItem = unknown> = {
    isDragging: boolean;
    itemType?: DragType;
    item?: TItem;
    initialClientOffset: Position | null;
    clientOffset: Position | null;
};

const listeners = new Set<() => void>();

let activeDrag: ActiveDragState = {
    isDragging: false,
    itemType: undefined,
    item: undefined,
    initialClientOffset: null,
    clientOffset: null
};

const emit = () => {
    listeners.forEach((listener) => {
        listener();
    });
};

export const setActiveDrag = (next: ActiveDragState) => {
    activeDrag = next;
    emit();
};

export const updateActiveDrag = (next: Partial<ActiveDragState>) => {
    activeDrag = {
        ...activeDrag,
        ...next
    };
    emit();
};

export const getActiveDrag = () => activeDrag;

export const subscribeActiveDrag = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};