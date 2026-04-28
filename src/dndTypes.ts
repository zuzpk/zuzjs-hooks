export interface Position {
    x: number;
    y: number;
}

export type DragType = string | symbol;

export interface DragProbe<TItem = unknown> {
    active: () => boolean;
    payload: () => TItem | undefined;
    channel: () => DragType | undefined;
    origin: () => Position | null;
    pointer: () => Position | null;
    offset: () => Position | null;
}

export type DragSpec<TItem = unknown, TCollected = Record<string, unknown>> = {
    channel: DragType;
    payload?: TItem | (() => TItem);
    when?: boolean | ((probe: DragProbe<TItem>) => boolean);
    dragDelay?: number;
    observe?: (probe: DragProbe<TItem>) => TCollected;
    onFinish?: (item: TItem | undefined, probe: DragProbe<TItem>) => void;
};

export type UseDragSpecFactory<TItem = unknown, TCollected = Record<string, unknown>> = () => DragSpec<TItem, TCollected>;

export interface DropProbe<TItem = unknown> {
    canReceive: () => boolean;
    hovering: () => boolean;
    payload: () => TItem | undefined;
    channel: () => DragType | undefined;
    origin: () => Position | null;
    pointer: () => Position | null;
    offset: () => Position | null;
}

export type DropSpec<TItem = unknown, TCollected = Record<string, unknown>> = {
    accepts: DragType | DragType[];
    canReceive?: (item: TItem | undefined, probe: DropProbe<TItem>) => boolean;
    observe?: (probe: DropProbe<TItem>) => TCollected;
    onHover?: (item: TItem | undefined, probe: DropProbe<TItem>) => void;
    onReceive?: (item: TItem | undefined, probe: DropProbe<TItem>) => void;
};

export type UseDropSpecFactory<TItem = unknown, TCollected = Record<string, unknown>> = () => DropSpec<TItem, TCollected>;