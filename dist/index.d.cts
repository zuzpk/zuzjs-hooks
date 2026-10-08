import * as react from 'react';
import react__default, { Dispatch, SetStateAction, RefObject, ReactNode, CSSProperties, DependencyList } from 'react';
import { CancelTokenSource } from '@zuzjs/core';

type AgentRole = 'user' | 'assistant' | 'system';
type AgentContextMode = 'general' | 'coding';
type AgentActivity = {
    id: string;
    kind: 'thinking' | 'tool' | 'status' | 'verification' | 'retry';
    title: string;
    detail?: string;
    state: 'pending' | 'running' | 'completed' | 'failed';
    createdAt: number;
};
type AgentTerminalExecution = {
    id: string;
    command: string;
    output: string;
    state: 'running' | 'completed' | 'failed';
    exitCode?: number;
};
type AgentPermissionRequest = {
    id: string;
    tool: string;
    command: string;
    description: string;
    riskTier: string;
    requiredPhrase?: string;
    options?: string[];
};
type AgentConnectionState = 'connecting' | 'connected' | 'reconnecting';
type AgentRunStats = {
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    tokensPerSecond?: number;
    contextTokens?: number;
    contextLimit?: number;
};
type AgentMessage = {
    id: string;
    role: AgentRole;
    content: string;
    createdAt: number;
    streaming?: boolean;
    failed?: boolean;
    activity?: AgentActivity[];
    terminal?: AgentTerminalExecution[];
    stats?: AgentRunStats;
};
type AgentChatSummary = {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    archived?: boolean;
    contextMode?: AgentContextMode;
};
type AgentChat = {
    summary: AgentChatSummary;
    messages: AgentMessage[];
};
/** A follow-up held until the current turn has reached a terminal state. */
type AgentQueuedMessage = {
    id: string;
    content: string;
    createdAt: number;
};
type AgentThinkingLevel = 'low' | 'medium' | 'high';
type AgentSendOptions = {
    model?: string;
    thinkingLevel?: AgentThinkingLevel;
};
type AgentClientEvent = {
    type: 'message_delta';
    chatId: string;
    messageId: string;
    delta: string;
} | {
    type: 'message_completed';
    chatId: string;
    message: AgentMessage;
} | {
    type: 'activity';
    chatId: string;
    messageId?: string;
    activity: AgentActivity[];
} | {
    type: 'terminal';
    chatId: string;
    messageId?: string;
    terminal: AgentTerminalExecution[];
} | {
    type: 'stats';
    chatId: string;
    messageId?: string;
    stats: AgentRunStats;
} | {
    type: 'permission';
    chatId: string;
    permission?: AgentPermissionRequest;
} | {
    type: 'connection';
    state: AgentConnectionState;
} | {
    type: 'failed';
    chatId: string;
    error: string;
};
interface AgentClient {
    initialize(): Promise<{
        chats: AgentChatSummary[];
        activeChatId?: string;
    }>;
    loadChat(chatId: string): Promise<AgentChat>;
    createChat(input?: {
        firstMessage?: string;
        contextMode?: AgentContextMode;
    }): Promise<AgentChat>;
    send(input: {
        chatId: string;
        message: string;
        firstMessageAlreadyPersisted?: boolean;
        options?: AgentSendOptions;
    }): Promise<AgentChat | void>;
    archiveChat?(chatId: string): Promise<void>;
    cancel?(chatId: string): Promise<void>;
    queue?(input: {
        chatId: string;
        message: string;
        options?: AgentSendOptions;
    }): Promise<void>;
    listQueued?(chatId: string): Promise<AgentQueuedMessage[]>;
    respondToPermission?(input: {
        chatId: string;
        permissionId: string;
        approved: boolean;
        response?: string;
    }): Promise<AgentChat | void>;
    subscribe?(listener: (event: AgentClientEvent) => void): () => void;
}
type AgentCapabilities = {
    sessions: boolean;
    archive: boolean;
    cancel: boolean;
    queue?: boolean;
    activity: boolean;
    contextMode: boolean;
};
type UseAgentOptions = {
    client: AgentClient;
};
type AgentController = {
    chats: AgentChatSummary[];
    activeChat: AgentChat | null;
    activeChatId: string | null;
    messages: AgentMessage[];
    loading: boolean;
    running: boolean;
    error: string | null;
    permission: AgentPermissionRequest | null;
    queuedMessages: AgentQueuedMessage[];
    respondToPermission: (input: {
        permissionId: string;
        approved: boolean;
        response?: string;
    }) => Promise<void>;
    selectChat: (chatId: string) => Promise<void>;
    createChat: (input?: {
        firstMessage?: string;
        contextMode?: AgentContextMode;
    }) => Promise<AgentChat>;
    send: (message: string, options?: AgentSendOptions) => Promise<void>;
    retry: () => Promise<void>;
    archiveChat: (chatId?: string) => Promise<void>;
    cancel: () => Promise<void>;
    setChats: Dispatch<SetStateAction<AgentChatSummary[]>>;
};

declare function useAgent({ client }: UseAgentOptions): AgentController;

type dynamic = {
    [x: string]: any;
};
type ValueOf<T> = T[keyof T];
type CalendarWeekdayFormat = "long" | "short" | "narrow";
type CalendarMonthFormat = CalendarWeekdayFormat | "numeric" | "2-digit";
declare enum CropShape {
    Circle = "circle",
    Square = "square"
}
declare const AnchorType: {
    readonly TopLeft: "top left";
    readonly TopRight: "top right";
    readonly TopCenter: "top center";
    readonly BottomLeft: "bottom left";
    readonly BottomRight: "bottom right";
};
declare enum KeyCode {
    Backspace = 8,
    Tab = 9,
    Enter = 13,
    Shift = 16,
    Ctrl = 17,
    Alt = 18,
    PauseBreak = 19,
    Command = 19,
    CapsLock = 20,
    Escape = 27,
    Space = 32,
    PageUp = 33,
    PageDown = 34,
    End = 35,
    Home = 36,
    ArrowLeft = 37,
    ArrowUp = 38,
    ArrowRight = 39,
    ArrowDown = 40,
    Insert = 45,
    Delete = 46,
    Digit0 = 48,
    Digit1 = 49,
    Digit2 = 50,
    Digit3 = 51,
    Digit4 = 52,
    Digit5 = 53,
    Digit6 = 54,
    Digit7 = 55,
    Digit8 = 56,
    Digit9 = 57,
    KeyA = 65,
    KeyB = 66,
    KeyC = 67,
    KeyD = 68,
    KeyE = 69,
    KeyF = 70,
    KeyG = 71,
    KeyH = 72,
    KeyI = 73,
    KeyJ = 74,
    KeyK = 75,
    KeyL = 76,
    KeyM = 77,
    KeyN = 78,
    KeyO = 79,
    KeyP = 80,
    KeyQ = 81,
    KeyR = 82,
    KeyS = 83,
    KeyT = 84,
    KeyU = 85,
    KeyV = 86,
    KeyW = 87,
    KeyX = 88,
    KeyY = 89,
    KeyZ = 90,
    Numpad0 = 96,
    Numpad1 = 97,
    Numpad2 = 98,
    Numpad3 = 99,
    Numpad4 = 100,
    Numpad5 = 101,
    Numpad6 = 102,
    Numpad7 = 103,
    Numpad8 = 104,
    Numpad9 = 105,
    NumpadMultiply = 106,
    NumpadAdd = 107,
    NumpadSubtract = 109,
    NumpadDecimal = 110,
    NumpadDivide = 111,
    F1 = 112,
    F2 = 113,
    F3 = 114,
    F4 = 115,
    F5 = 116,
    F6 = 117,
    F7 = 118,
    F8 = 119,
    F9 = 120,
    F10 = 121,
    F11 = 122,
    F12 = 123,
    NumLock = 144,
    ScrollLock = 145,
    Semicolon = 186,// ;
    Equal = 187,// =
    Comma = 188,// ,
    Minus = 189,// -
    Period = 190,// .
    Slash = 191,// /
    Backquote = 192,// `
    BracketLeft = 219,// [
    Backslash = 220,// \
    BracketRight = 221,// ]
    Quote = 222
}

type Command = {
    label: string;
    value: string;
    icon?: string;
    type?: 'command' | 'submenu' | 'action';
    subCommands?: Command[];
    action?: React.ReactNode | ((props: {
        onSelect: (value: string) => void;
    }) => React.ReactNode);
};
type CommandActionProps = {
    command?: string;
    commands?: Command[];
    cmd?: (value: string, textarea: HTMLTextAreaElement | HTMLInputElement) => void;
    ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};
declare const useCommandActions: ({ command, commands, cmd, ref, }: CommandActionProps) => {
    showDropdown: boolean;
    dropdownPosition: {
        top: number;
        left: number;
    };
    handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
    handleInput: (event: React.FormEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
    handleCommandSelect: (value: string) => void;
    parentRef: RefObject<HTMLDivElement | null>;
};

type IDBOptions = {
    name: string;
    version: number;
    meta: IDBMeta[];
    /**
     * Called when an "object store not found" corruption is detected on any DB
     * operation. Typically used by DBProvider to wipe + reload automatically.
     */
    onCorrupted?: (source: string) => void;
};
declare const isMissingStoreError: (error: unknown) => boolean;
interface IDBMeta {
    name: string;
    config: {
        keyPath: string;
        autoIncrement: boolean;
    };
    schema: IDBSchema[];
}
interface IDBSchema {
    name: string;
    key?: string;
    unique?: boolean;
}
declare const useDatabase: (options: IDBOptions) => {
    getAll: <T>(storeName: string) => Promise<T>;
    getByID: <T>(storeName: string, id: string | number) => Promise<T>;
    getStore: <T>(storeName: string, id: string | number) => Promise<T>;
    insert: <T>(storeName: string, value: T, key?: any) => Promise<number>;
    update: <T>(storeName: string, values: {
        [x: string | number | symbol]: T;
    }) => Promise<void>;
    update_one: <T extends Object>(storeName: string, value: Partial<T>, key: IDBValidKey) => Promise<void>;
    remove: (storeName: string, key: IDBValidKey) => Promise<void>;
    subscribe: (storeName: string, callback: (result?: any) => void) => () => void;
    dbUnavailable: boolean;
    error: string | null;
};

/**
 * sessionStorage key written before a self-heal reload.
 * Read by useDBHealed() to surface a one-time notification after the page
 * comes back up.
 */
declare const DB_HEALED_KEY = "zuzjs.db.healed";
declare const DB_HEAL_STATE_KEY = "zuzjs.db.heal.state";
declare const DB_HEAL_BLOCKED_KEY = "zuzjs.db.heal.blocked";
declare const DBProvider: ({ options, children, onCorrupted, selfHeal }: {
    options: IDBOptions;
    children: ReactNode;
    /**
     * Enables the built-in delete-and-reload recovery flow.
     * Disabled by default because automatic reloads can be too aggressive for
     * transient browser IndexedDB failures.
     */
    selfHeal?: boolean;
    /**
     * Override the default self-heal behaviour.
     * Called with the operation source string when an "object store not found"
     * error is detected.
     */
    onCorrupted?: (source: string) => void;
}) => react.JSX.Element;
declare const useDB: (options?: IDBOptions) => ReturnType<typeof useDatabase>;
/**
 * Returns heal metadata when the page was reloaded after an automatic
 * IndexedDB self-heal. Clears the sessionStorage marker on first read so the
 * value is only truthy once per recovery cycle.
 */
declare const useDBHealed: () => {
    healed: boolean;
    blocked: boolean;
    source: string | null;
    dbName: string | null;
};
/**
 * Hook to watch a specific store.
 * Automatically re-refetches whenever insert/update/remove is called on that store.
 */
declare const useWatchDB: <T>(storeName: string, predicate?: (item: T) => boolean) => {
    data: T[];
    first: () => NonNullable<T> | null;
    last: () => NonNullable<T> | null;
    length: number;
    isEmpty: boolean;
    [Symbol.iterator]: () => Generator<T, void, unknown>;
};

type AnchorPlacement = "top" | "bottom" | "left" | "right";
type UseAnchorOptions = {
    autoFlip?: boolean;
    open?: boolean;
    preferredPlacement?: AnchorPlacement;
    margin?: number;
    offset?: number;
};
declare const useAnchor: (children: ReactNode, anchorName?: string, options?: UseAnchorOptions) => {
    root: ReactNode;
    hovered: boolean;
    anchorName: string;
    anchorRef: react.RefObject<HTMLElement | null>;
    canUseDocument: boolean;
    floatingRef: react.RefObject<HTMLElement | null>;
    floatingStyle: {
        positionAnchor: string;
    };
    placement: AnchorPlacement;
    isPositioned: boolean;
};

type AnchorOptions = {
    offsetX?: number;
    offsetY?: number;
    overflow?: boolean;
    preferredAnchor?: ValueOf<typeof AnchorType>;
};
declare const useAnchorPosition: (parent?: HTMLElement | null, event?: MouseEvent | null, options?: AnchorOptions) => {
    position: {
        top: number;
        left: number;
    };
    targetRef: react.RefObject<HTMLElement | null>;
    calculatedAnchor: "top left" | "top right" | "top center" | "bottom left" | "bottom right";
    isPositioned: boolean;
};

declare const useCalendar: (range?: number, dayFormat?: CalendarWeekdayFormat, monthFormat?: CalendarMonthFormat) => {
    today: Date;
    daysCount: number;
    month: string;
    day: string;
    days: {
        day: string;
        date: number;
        month: string;
        year: number;
    }[];
    next: () => void;
    prev: () => void;
};

type UseCacheReturn = {
    write: (key: string, data: unknown) => Promise<void>;
    read: <T>(key: string) => Promise<T | null>;
    writeBinary: (key: string, data: Uint8Array | ArrayBuffer) => Promise<void>;
    readBinary: (key: string) => Promise<Uint8Array | null>;
    remove: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
    isLoading: boolean;
    error: Error | null;
};
declare const useCache: (cacheName?: string) => UseCacheReturn;

type CarouselOptions = {
    total: number;
    initialIndex?: number;
    loop?: boolean;
    useWheel?: boolean;
    useKeys?: boolean;
    onChange?: (index: number) => void;
};
declare const useCarousel: ({ total, initialIndex, loop, useWheel, useKeys, onChange }: CarouselOptions) => {
    index: number;
    next: () => void;
    prev: () => void;
    goTo: (i: number) => void;
    isFirst: boolean;
    isLast: boolean;
    progress: number;
};

type LensLayer = 'SHADOW' | 'BODY' | 'BORDER' | 'LABEL' | null;
interface LensAvailability {
    SHADOW: boolean;
    BODY: boolean;
    BORDER: boolean;
    LABEL: boolean;
}
interface LensElementDimensions {
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
    x: number;
    y: number;
}
interface LensRelativeDimensions {
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
    x: number;
    y: number;
}
interface LensCompactDimensions {
    x: number;
    y: number;
    width: number;
    height: number;
}
interface LensStyleSnapshot {
    layout: Record<string, string>;
    boxModel: Record<string, string>;
    typography: Record<string, string>;
    visual: Record<string, string>;
    motion: Record<string, string>;
    interactions: Record<string, string>;
    customProperties: Record<string, string>;
}
interface LensPseudoStyleSnapshot {
    content: string;
    display: string;
    width: string;
    height: string;
    color: string;
    background: string;
    border: string;
    borderRadius: string;
    boxShadow: string;
    fontSize: string;
    fontWeight: string;
    opacity: string;
    visibility: string;
    position: string;
    inset: string;
}
interface LensExtractedPseudoElement {
    styles: LensPseudoStyleSnapshot;
    styleSnapshot: LensStyleSnapshot;
    rebuildStyles: CSSProperties;
    selfDimensions: LensElementDimensions;
    parentDimensions: LensElementDimensions;
    relativeDimensions?: LensRelativeDimensions;
    compactDimensions: LensCompactDimensions;
}
interface LensExtractedTextNode {
    index: number;
    type: 'text';
    content: string;
    parentIndex: number;
    depth: number;
}
interface LensExplodedTreeNode {
    element: LensExtractedElement;
    children: LensExplodedTreeNode[];
}
interface LensExtractedElement {
    index: number;
    type: 'element';
    path: string;
    tagName: string;
    id: string;
    className: string;
    text: string;
    depth: number;
    parentIndex: number | null;
    children: LensExplodedTreeNode[];
    styleSnapshot: LensStyleSnapshot;
    rebuildStyles: CSSProperties;
    selfDimensions: LensElementDimensions;
    parentDimensions: LensElementDimensions | null;
    relativeDimensions?: LensRelativeDimensions;
    compactDimensions: LensCompactDimensions;
    pseudo: {
        before: LensExtractedPseudoElement | null;
        after: LensExtractedPseudoElement | null;
    };
}
type LensExtractedNode = LensExtractedElement | LensExtractedTextNode;
interface ManualLensStyles extends CSSProperties {
    info?: string;
    title?: string;
}
declare const useCodeLens: (manualStyles?: Partial<Record<LensLayer & string, ManualLensStyles>>) => {
    rootRef: react.RefObject<HTMLDivElement | null>;
    isActive: boolean;
    setIsActive: react.Dispatch<react.SetStateAction<boolean>>;
    hoveredLayer: LensLayer;
    setHoveredLayer: react.Dispatch<react.SetStateAction<LensLayer>>;
    focusedLayer: LensLayer;
    setFocusedLayer: react.Dispatch<react.SetStateAction<LensLayer>>;
    styles: CSSProperties | null;
    availability: LensAvailability;
    extractedElements: LensExtractedNode[];
    explodedTree: LensExplodedTreeNode[];
    toggleLens: () => void;
};

declare const useDebounce: <T extends (...args: any[]) => void>(func: T, delay: number) => (...args: Parameters<T>) => void;

/**
 * Custom hook that sets a mounted state to true after a specified delay.
 *
 * @param {number} [delay=100] - The delay in milliseconds before setting the mounted state to true.
 * @returns {boolean} - The mounted state.
 *
 * @example
 * const isMounted = useMounted(200);
 *
 * useEffect(() => {
 *   if (isMounted) {
 *     // Component is mounted after 200ms
 *   }
 * }, [isMounted]);
 */
declare const useMounted: (delay?: number) => boolean;

interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape';
    ready: boolean;
}
declare const useDevice: () => DeviceInfo;

interface Dimensions {
    width: number;
    height: number;
    top: number;
    left: number;
    bottom: number;
    right: number;
    x: number;
    y: number;
}
declare const useDimensions: (el?: HTMLElement | ReactNode) => Dimensions;

/**
 * Sets Document Title and on Page unloads resets title to old/current
 */
declare const useDocumentTitle: ({ title, defaultTitle }: {
    title: string;
    defaultTitle?: string;
}) => void;

interface Position {
    x: number;
    y: number;
}
type DragType = string | symbol;
interface DragProbe<TItem = unknown> {
    active: () => boolean;
    payload: () => TItem | undefined;
    channel: () => DragType | undefined;
    origin: () => Position | null;
    pointer: () => Position | null;
    offset: () => Position | null;
}
type DragSpec<TItem = unknown, TCollected = Record<string, unknown>> = {
    channel: DragType;
    payload?: TItem | (() => TItem);
    when?: boolean | ((probe: DragProbe<TItem>) => boolean);
    dragDelay?: number;
    observe?: (probe: DragProbe<TItem>) => TCollected;
    onFinish?: (item: TItem | undefined, probe: DragProbe<TItem>) => void;
};
type UseDragSpecFactory<TItem = unknown, TCollected = Record<string, unknown>> = () => DragSpec<TItem, TCollected>;
interface DropProbe<TItem = unknown> {
    canReceive: () => boolean;
    hovering: () => boolean;
    payload: () => TItem | undefined;
    channel: () => DragType | undefined;
    origin: () => Position | null;
    pointer: () => Position | null;
    offset: () => Position | null;
    bounds: () => DOMRect | null;
}
type DropSpec<TItem = unknown, TCollected = Record<string, unknown>> = {
    accepts: DragType | DragType[];
    canReceive?: (item: TItem | undefined, probe: DropProbe<TItem>) => boolean;
    observe?: (probe: DropProbe<TItem>) => TCollected;
    onHover?: (item: TItem | undefined, probe: DropProbe<TItem>) => void;
    onReceive?: (item: TItem | undefined, probe: DropProbe<TItem>) => void;
};
type UseDropSpecFactory<TItem = unknown, TCollected = Record<string, unknown>> = () => DropSpec<TItem, TCollected>;

declare function useDrag<TItem = unknown, TCollected = Record<string, unknown>>(specFactory: UseDragSpecFactory<TItem, TCollected>, deps?: DependencyList): [TCollected, (node: HTMLElement | null) => void];

declare function useDrop<TItem = unknown, TCollected = Record<string, unknown>>(specFactory: UseDropSpecFactory<TItem, TCollected>, deps?: DependencyList): [TCollected, (node: HTMLElement | null) => void];

type SortableId = string | number;
type SortablePayload<TItem = unknown> = {
    id: SortableId;
    index: number;
    item: TItem;
};
type SortableState<TItem = unknown> = {
    isDragging: boolean;
    isOver: boolean;
    canReceive: boolean;
    draggingItem: SortablePayload<TItem> | undefined;
    dragOffset: Position | null;
    pointer: Position | null;
    overIndex: number;
};
type SortableSpec<TItem = unknown, TCollected = Record<string, unknown>> = {
    channel: DragType;
    id: SortableId;
    index: number;
    payload: TItem;
    accepts?: DragType | DragType[];
    draggable?: boolean;
    droppable?: boolean;
    dragDelay?: number;
    /** Reorder axis. `"y"` for vertical lists, `"x"` for horizontal. Default `"y"`. */
    axis?: "x" | "y";
    when?: boolean | ((probe: DragProbe<SortablePayload<TItem>>) => boolean);
    canReceive?: (item: SortablePayload<TItem> | undefined, probe: DropProbe<SortablePayload<TItem>>) => boolean;
    observe?: (state: SortableState<TItem>) => TCollected;
    onMove?: (item: SortablePayload<TItem>, toIndex: number, probe: DropProbe<SortablePayload<TItem>>) => void;
    onDrop?: (item: SortablePayload<TItem>, toIndex: number, probe: DropProbe<SortablePayload<TItem>>) => void;
    onFinish?: (item: SortablePayload<TItem> | undefined, probe: DragProbe<SortablePayload<TItem>>) => void;
};
type UseSortableSpecFactory<TItem = unknown, TCollected = Record<string, unknown>> = () => SortableSpec<TItem, TCollected>;
declare const useSortable: <TItem = unknown, TCollected = Record<string, unknown>>(specFactory: UseSortableSpecFactory<TItem, TCollected>, deps?: DependencyList) => [TCollected, (node: HTMLElement | null) => void];

/**
 * Custom hook for Facebook Pixel tracking
 * @param pixelId - Facebook Pixel ID (e.g., '123456789012345')
 * @param debug - Optional debug mode (default: false)
 */
declare const useFacebookPixel: (pixelId?: string, debug?: boolean) => {
    trackPageView: () => void;
    trackEvent: (eventName: string, params?: Record<string, any>) => void;
    trackCustom: (eventName: string, params?: Record<string, any>) => void;
};

declare const useFileSystem: () => {
    write: (fileName: string, content: any, path?: string) => Promise<boolean>;
    read: (fileName: string, path?: string) => Promise<File | null>;
    remove: (name: string, path?: string, isFolder?: boolean) => Promise<boolean>;
    list: (path?: string) => Promise<{
        name: string;
        kind: "file" | "directory";
    }[]>;
    getFile: (fileName: string, path?: string) => Promise<{
        file: File;
        handle: FileSystemFileHandle;
        url: string;
    } | null>;
    getUsage: () => Promise<{
        used: number;
        total: number;
        percent: number;
    } | null>;
    isBusy: boolean;
    error: Error | null;
};

/**
 * Custom hook for Google gtag (Global Site Tag) tracking
 * @param id - Google Analytics tracking ID (e.g., 'G-XXXXXXXXXX')
 */
declare const useGtag: (id?: string) => {
    trackPageView: (path?: string) => void;
    trackEvent: (eventName: string, params?: Record<string, any>) => void;
};

type GradientType = "linear" | "radial" | "conic" | "orb";
type GradientAnimation = "none" | "rotate" | "float" | "pulse";
type GradientMotionPreset = "idle" | "thinking" | "burst";
interface GradientStop {
    color: string;
    at?: number | string;
}
interface OrbLayer {
    color: string;
    x?: number;
    y?: number;
    size?: number;
    opacity?: number;
}
interface UseGradientOptions {
    type?: GradientType;
    stops?: GradientStop[];
    angle?: number;
    position?: string;
    duration?: number;
    speed?: number;
    preset?: GradientMotionPreset;
    animate?: boolean;
    animation?: GradientAnimation;
    autoPlay?: boolean;
    loop?: boolean;
    backgroundColor?: string;
    orbs?: OrbLayer[];
    bloom?: boolean;
    bloomIntensity?: number;
    bloomColor?: string;
    bloomBlur?: number;
    bloomSpread?: number;
    bloomAnimate?: boolean;
    /**
     * Write animated CSS (backgroundImage, backgroundPosition, filter, boxShadow)
     * directly to `elementRef` — completely bypasses React state during animation.
     * Attach the returned `elementRef` to the target element.
     */
    directDOM?: boolean;
    /**
     * Max animation update rate for the RAF loop.
     * Lower values significantly reduce GPU/paint pressure on heavy gradients.
     * Default: 30
     */
    maxFPS?: number;
    /**
     * When possible, use compositor-driven CSS keyframe animation instead of
     * per-frame JavaScript updates. Currently optimized for non-orb "float" mode.
     * Default: true
     */
    cssAnimation?: boolean;
    /**
     * Enable built-in WebGL renderer path (same hook, no external libs).
     * Requires `directDOM: true` and an attached `elementRef`.
     * Falls back to CSS/RAF path if WebGL is unavailable.
     */
    webgl?: boolean;
    /**
     * GPU preference hint for WebGL context creation.
     * Default: "low-power"
     */
    webglPowerPreference?: WebGLPowerPreference;
    /**
     * Cap device pixel ratio for WebGL canvas to reduce GPU load.
     * Default: 1.5
     */
    webglDprCap?: number;
}
interface UseGradientResult {
    gradient: string;
    style: CSSProperties;
    progress: number;
    speed: number;
    preset: GradientMotionPreset;
    bloom: number;
    /** Attach to an element when `directDOM: true` to enable zero-render animation. */
    elementRef: RefObject<HTMLElement | null>;
    controls: {
        play: () => void;
        pause: () => void;
        seek: (progress: number) => void;
        setSpeed: (speed: number) => void;
        setPreset: (preset: GradientMotionPreset) => void;
        flash: (intensity?: number, durationMs?: number) => void;
        isPlaying: boolean;
    };
}
declare const useGradient: (options?: UseGradientOptions) => UseGradientResult;

declare const useImage: (url: string, crossOrigin?: "anonymous" | "use-credentials", referrerPolicy?: "no-referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url", error_retry_cooldown_ms?: number) => readonly [string, boolean, string | null];

declare const useImageCropper: (imageUrl: string, cropSize: number, cropShape?: CropShape, zoomScale?: number) => {
    canvasRef: react.RefObject<HTMLCanvasElement | null>;
    crop: () => string | null;
    setScale: (newZoom: number) => void;
    handleMouseDown: () => void;
    handleMouseUp: () => void;
    handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
};

interface IntersectionObserverOptions {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number | number[];
}
declare const useIntersectionObserver: (refs: RefObject<HTMLElement | null>[], options?: IntersectionObserverOptions) => number[];

interface DataPoint {
    x: number;
    y: number;
}
interface UseLineChartDimensions {
    width: number;
    height: number;
}
interface UseLineChartReturn {
    pathD: string;
    areaPathD: string;
}
interface LineChartProps {
    data: DataPoint[];
    width?: string | number;
    height?: string | number;
    lineColor?: string;
    strokeWidth?: number;
    gradientStartColor?: string;
    gradientEndColor?: string;
    padding?: number;
    animated?: boolean;
}
declare const useLineChart: (data: DataPoint[], dimensions?: UseLineChartDimensions, padding?: number) => UseLineChartReturn;

type LocalStorageAction = "set" | "remove" | "clear";
type LocalStorageEventSource = "internal" | "external";
interface LocalStorageChange<T> {
    action: LocalStorageAction;
    key: string | null;
    source: LocalStorageEventSource;
    oldValue: T | undefined;
    newValue: T | undefined;
    rawOldValue: string | null;
    rawNewValue: string | null;
}
interface UseLocalStorageOptions<T> {
    defaultValue?: T;
    storage?: Storage;
    sync?: boolean;
    serializer?: (value: T) => string;
    deserializer?: (value: string) => T;
    onChange?: (change: LocalStorageChange<T>) => void;
}
interface UseLocalStorageListOptions<T> extends Omit<UseLocalStorageOptions<T[]>, "defaultValue"> {
    defaultValue?: T[];
    unique?: boolean;
}
interface UseLocalStorageListResult<T> {
    value: T[];
    setValues: (nextValue: T[] | ((currentValue: T[]) => T[])) => T[] | undefined;
    addValue: (nextValue: T | T[]) => T[] | undefined;
    removeValue: (nextValue: T | T[]) => T[] | undefined;
    toggleValue: (nextValue: T) => T[] | undefined;
    clear: () => void;
    lastChange: LocalStorageChange<T[]> | null;
}
declare const useLocalStorage: <T>(key: string, options?: UseLocalStorageOptions<T>) => {
    value: T | undefined;
    setValue: (nextValue: T | ((currentValue: T | undefined) => T)) => T | undefined;
    removeValue: () => void;
    clear: () => void;
    lastChange: LocalStorageChange<T> | null;
};
/**
 * A hook for managing a collection of unique items in browser localStorage.
 */
declare const useLocalStore: <T>(key: string, options?: UseLocalStorageListOptions<T>) => UseLocalStorageListResult<T>;

type SessionStorageAction = LocalStorageAction;
type SessionStorageEventSource = LocalStorageEventSource;
type SessionStorageChange<T> = LocalStorageChange<T>;
interface UseSessionStorageOptions<T> extends UseLocalStorageOptions<T> {
}
declare const useSessionStorage: <T>(key: string, options?: UseSessionStorageOptions<T>) => {
    value: T | undefined;
    setValue: (nextValue: T | ((currentValue: T | undefined) => T)) => T | undefined;
    removeValue: () => void;
    clear: () => void;
    lastChange: LocalStorageChange<T> | null;
};

type MediaItem = {
    url: string;
    title: string;
    artist?: string;
    cover?: string;
    isDash?: boolean;
};
declare const useMediaPlayer: (playlist: MediaItem[], initialItem?: MediaItem) => {
    hasMedia: boolean;
    mediaRef: react.RefObject<HTMLVideoElement | HTMLAudioElement | null>;
    state: {
        isPlaying: boolean;
        isLoading: boolean;
        progress: number;
        duration: number;
        volume: number;
        isMuted: boolean;
        currentItem: MediaItem | undefined;
        currentIndex: number;
    };
    controls: {
        togglePlay: () => void;
        seek: (val: number) => void;
        next: () => void;
        prev: () => void;
        setVolume: (val: number) => void;
        setIsMuted: () => void;
        setCurrentIndex: react.Dispatch<react.SetStateAction<number>>;
    };
};

declare const useMorph: (sourceRef: RefObject<HTMLElement | null>, isReady: boolean) => {
    sourceRect: {
        width: number;
        height: number;
        top: number;
        left: number;
    } | null;
    isMeasured: boolean;
};

declare const useMouseWheel: (callback: (direction: "next" | "prev") => void, active?: boolean) => void;

type MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => void;
declare const useMutationObserver: (target: HTMLElement | null | RefObject<HTMLElement | null>, callback: MutationCallback, options?: MutationObserverInit) => void;

declare const useNetworkStatus: () => boolean | null;

interface Countdown {
    minutes: number;
    seconds: number;
    formatted: string;
    nextBoundary: Date;
}
/**
 * React hook that counts down to the next N-minute boundary.
 *
 * @param intervalMinutes The interval in minutes (e.g., 1, 5, 15, 30, 60)
 * @returns Countdown info + next boundary time
 */
declare const useNextInterval: (intervalMinutes?: number) => Countdown;

declare const useParallax: (speed?: number, anchorRef?: RefObject<HTMLElement | null>) => number;

type PushSubscriptionMeta = {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
};
type PushNotificationsOptions = {
    /**
     * VAPID public key (required for subscription)
     */
    vapidPublicKey: string;
    /**
     * Path to your service worker file
     * @default '/sw.js'
     */
    serviceWorkerPath?: string;
    /**
     * Auto-request permission on mount
     * @default false
     */
    requestPermissionOnMount?: boolean;
};
type PushNotificationsResult = {
    /** Current permission state */
    permission: NotificationPermission;
    /** Push subscription object (or null if not subscribed) */
    subscription: PushSubscription | null;
    /** JSON representation of subscription (easy to send to backend) */
    subscriptionMeta: PushSubscriptionMeta | null;
    /** Is push supported in this browser? */
    isSupported: boolean;
    /** Request permission and subscribe */
    subscribe: () => Promise<PushSubscription | null>;
    /** Unsubscribe from push */
    unsubscribe: () => Promise<boolean>;
    /** Request notification permission only */
    requestPermission: () => Promise<NotificationPermission>;
    /** Error state */
    error: string | null;
    /** Loading state */
    isLoading: boolean;
};
declare const usePushNotifications: (options: PushNotificationsOptions) => PushNotificationsResult;

interface Size {
    width: number;
    height: number;
    top: number;
    left: number;
}
declare const useResizeObserver: (ref: RefObject<HTMLElement | null> | HTMLElement) => Size;

interface ScrollBreakpoint {
    [key: number]: () => void;
}
declare const useScrollbar: (speed?: number, breakpoints?: ScrollBreakpoint, smooth?: boolean, onMetricsChange?: (metrics: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}) => void) => {
    rootRef: react.RefObject<HTMLDivElement | null>;
    containerRef: react.RefObject<HTMLDivElement | null>;
    thumbY: react.RefObject<HTMLDivElement | null>;
    thumbX: react.RefObject<HTMLDivElement | null>;
    onScrollY: (e: React.MouseEvent) => void;
    onScrollX: (e: React.MouseEvent) => void;
    scrollToTop: () => void;
    scrollToBottom: () => void;
    scrollToLeft: () => void;
    scrollToRight: () => void;
};

/**
 * Configuration options for scroll physics animations.
 *
 * @example
 * ```tsx
 * // Basic parallax effect
 * const options: ScrollPhysicsOptions = {
 *   y: 1,
 *   yMultiplier: 0.3
 * }
 *
 * // With scale and rotation
 * const options: ScrollPhysicsOptions = {
 *   y: 1,
 *   yMultiplier: 0.5,
 *   scale: {
 *     min: 0.8,
 *     max: 1,
 *     factor: 0.001
 *   },
 *   rotate: {
 *     direction: 1,
 *     multiplier: 0.1
 *   }
 * }
 * ```
 */
type ScrollPhysicsOptions = {
    /**
     * Linear interpolation factor for smooth animations.
     * Controls how smoothly the element follows the scroll position.
     * Lower values = smoother but slower response.
     * @default 0.1
     * @example
     * lerpFactor: 0.05 // Very smooth, slow response
     * lerpFactor: 0.2 // Quick response, less smooth
     */
    lerpFactor?: number;
    /**
     * Horizontal translation multiplier.
     * The element will move horizontally based on scroll position.
     * Positive values move right, negative values move left.
     * @example
     * x: 1 // Move horizontally with scroll
     * x: 2 // Double the scroll distance
     */
    x?: number;
    /**
     * Vertical translation multiplier.
     * The element will move vertically based on scroll position.
     * Positive values move down, negative values move up.
     * @example
     * y: 1 // Move vertically with scroll
     * y: -1 // Move in opposite direction
     */
    y?: number;
    /**
     * Additional multiplier for horizontal axis.
     * Fine-tunes the horizontal movement intensity.
     * @default 0.25
     * @example
     * xMultiplier: 0.5 // Moderate horizontal movement
     * xMultiplier: 1 // Full horizontal movement
     */
    xMultiplier?: number;
    /**
     * Additional multiplier for vertical axis.
     * Fine-tunes the vertical movement intensity.
     * @default 0.25
     * @example
     * yMultiplier: 0.3 // Subtle parallax effect
     * yMultiplier: 0.8 // Strong parallax effect
     */
    yMultiplier?: number;
    /**
     * Scale configuration for zoom effects based on scroll velocity.
     * Creates a dynamic scaling effect that responds to scroll speed.
     * @example
     * scale: {
     *   min: 0.8,    // Minimum scale (when scrolling fast)
     *   max: 1,      // Maximum scale (when not scrolling)
     *   factor: 0.001 // How quickly scale changes with velocity
     * }
     */
    scale?: {
        /** Minimum scale value (typically < 1) */
        min: number;
        /** Maximum scale value (typically 1) */
        max: number;
        /** Velocity sensitivity factor */
        factor: number;
    };
    /**
     * Rotation configuration for spin effects based on scroll velocity.
     * Creates a dynamic rotation effect that responds to scroll speed.
     * @example
     * rotate: {
     *   direction: 1,      // Clockwise rotation
     *   multiplier: 0.05   // Subtle rotation
     * }
     *
     * rotate: {
     *   direction: -1,     // Counter-clockwise rotation
     *   multiplier: 0.2   // Strong rotation
     * }
     */
    rotate?: {
        /**
         * Rotation direction.
         * 1 = clockwise, -1 = counter-clockwise
         * @default 1
         */
        direction?: 1 | -1;
        /**
         * Rotation intensity multiplier.
         * Higher values = more rotation per scroll velocity.
         * @default 1
         */
        multiplier?: number;
    };
};
/**
 * A React hook that applies physics-based scroll animations to elements.
 * Creates smooth, performant animations like parallax, scaling, and rotation
 * effects that respond to scroll position and velocity.
 *
 * @param ref - Reference to the target HTML element to animate
 * @param options - Scroll physics configuration options
 * @param scrollContainer - Optional reference to a custom scroll container (defaults to window)
 *
 * @returns Object containing current position and velocity refs
 *
 * @example
 * ```tsx
 * // Basic parallax effect
 * const ref = useRef<HTMLDivElement>(null);
 * useScrollPhysics(ref, {
 *   y: 1,
 *   yMultiplier: 0.3
 * });
 *
 * // With scale and rotation
 * useScrollPhysics(ref, {
 *   y: 1,
 *   yMultiplier: 0.5,
 *   scale: {
 *     min: 0.9,
 *     max: 1,
 *     factor: 0.0005
 *   },
 *   rotate: {
 *     direction: 1,
 *     multiplier: 0.05
 *   }
 * });
 *
 * // With custom scroll container
 * const scrollRef = useRef<HTMLDivElement>(null);
 * useScrollPhysics(ref, { y: 1 }, scrollRef);
 * ```
 *
 * @remarks
 * - Uses requestAnimationFrame for smooth 60fps animations
 * - Automatically cleans up event listeners on unmount
 * - Only activates when ref, options, and scroll container are all available
 * - Works with both window scroll and custom scroll containers
 * - Applies CSS transforms (translate3d, scale, rotate) for GPU acceleration
 */
declare const useScrollPhysics: (ref?: RefObject<HTMLElement> | null, options?: ScrollPhysicsOptions, scrollContainer?: RefObject<HTMLElement> | null) => {
    position: RefObject<number>;
    velocity: RefObject<number>;
};

type Shortcut = {
    keys: KeyCode[];
    callback: (event: KeyboardEvent) => void;
};
declare const useShortcuts: (shortcuts: Shortcut[], preventDefault?: boolean) => void;

type TimelineMode = 'scroll' | 'manual' | 'auto';
type CssUnit = string;
type KeyframeValue = number | `${number}${CssUnit}`;
type TimelineEasingName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
type TimelineEasing = TimelineEasingName | string | ((t: number) => number);
type TimelineSpanTrigger = 'timeline' | 'inView';
type TimelineEntryTrigger = 'mount' | 'inView';
type TimelineTriggerOffset = number | [startOffset: number, endOffset: number];
interface TimelineEffect {
    property: string;
    from: KeyframeValue;
    to: KeyframeValue;
    easing?: TimelineEasing;
    unit?: CssUnit;
}
type TransformValueTuple = [from: KeyframeValue, to: KeyframeValue, easing?: TimelineEasing];
type TransformValueEffect = {
    from: KeyframeValue;
    to: KeyframeValue;
    easing?: TimelineEasing;
} | TransformValueTuple;
interface TransformSkewPair {
    x?: TransformValueEffect;
    y?: TransformValueEffect;
}
type TransformSkewEffect = TransformValueEffect | TransformSkewPair;
interface TimelineTransformEffects {
    x?: TransformValueEffect;
    y?: TransformValueEffect;
    z?: TransformValueEffect;
    rx?: TransformValueEffect;
    ry?: TransformValueEffect;
    rz?: TransformValueEffect;
    sx?: TransformValueEffect;
    sy?: TransformValueEffect;
    sz?: TransformValueEffect;
    skx?: TransformValueEffect;
    sky?: TransformValueEffect;
    skew?: TransformSkewEffect;
    translateX?: TransformValueEffect;
    translateY?: TransformValueEffect;
    translateZ?: TransformValueEffect;
    translate3d?: {
        x: TransformValueEffect;
        y: TransformValueEffect;
        z: TransformValueEffect;
    };
    scale?: TransformValueEffect;
    scaleX?: TransformValueEffect;
    scaleY?: TransformValueEffect;
    scaleZ?: TransformValueEffect;
    scale3d?: {
        x: TransformValueEffect;
        y: TransformValueEffect;
        z: TransformValueEffect;
    };
    rotate?: TransformValueEffect;
    rotateX?: TransformValueEffect;
    rotateY?: TransformValueEffect;
    rotateZ?: TransformValueEffect;
    skewX?: TransformValueEffect;
    skewY?: TransformValueEffect;
    perspective?: TransformValueEffect;
}
type TimelineAnchorEdge = 'start' | 'end';
interface TimelineAnchorRef {
    layerId: string;
    edge?: TimelineAnchorEdge;
    keyframeId?: string;
    keyframeIndex?: number;
    offset?: number;
}
type TimelineAnchor = number | string | TimelineAnchorRef;
/**
 * A single keyframe span with its own start/end range and effects.
 * Use inside `keyframes: []` on a layer for multi-range animation.
 */
interface TimelineKeyframe {
    /** Optional keyframe id, used by anchor refs like `hero#intro:start`. */
    id?: string;
    /** Span trigger mode. timeline = sticky chaining, inView = active only within range. */
    trigger?: TimelineSpanTrigger;
    /** Offset to shift resolved start/end trigger range. Number shifts both, tuple shifts independently. */
    triggerOffset?: TimelineTriggerOffset;
    start: TimelineAnchor;
    end: TimelineAnchor;
    effects?: TimelineEffect[];
    transforms?: TimelineTransformEffects;
    [key: string]: unknown;
}
interface TimelineEntry {
    /** Optional id for diagnostics/debug readability. */
    id?: string;
    /** mount = one-time on mount, inView = reversible while layer range is in view. */
    trigger?: TimelineEntryTrigger;
    /** Animation duration in ms. Default: 700 */
    duration?: number;
    /** Delay before entry starts, in ms. Default: 0 */
    delay?: number;
    /** Easing for entry interpolation. Default: easeOut */
    easing?: TimelineEasing;
    effects?: TimelineEffect[];
    transforms?: TimelineTransformEffects;
    [key: string]: unknown;
}
interface TimelineLayer {
    id: string;
    /** Default trigger for this layer's spans/keyframes when omitted on each keyframe. */
    trigger?: TimelineSpanTrigger;
    /** Default trigger offset for this layer's spans when omitted on each keyframe. */
    triggerOffset?: TimelineTriggerOffset;
    /** Required when not using `keyframes`. */
    start?: TimelineAnchor;
    /** Required when not using `keyframes`. */
    end?: TimelineAnchor;
    /** Multiple keyframe ranges for this layer — overrides start/end when provided. */
    keyframes?: TimelineKeyframe[];
    /** One-time mount animation for this layer. */
    entry?: TimelineEntry;
    effects?: TimelineEffect[];
    transforms?: TimelineTransformEffects;
    [key: string]: unknown;
}
interface TimelineOptions {
    layers: TimelineLayer[];
    mode?: TimelineMode;
    duration?: number;
    sceneHeight?: number;
    debug?: boolean;
    debugOverlay?: boolean;
    autoStart?: boolean;
    interpolate?: boolean;
    lerpFactor?: number;
    maxFPS?: number;
}
interface TimelineLayerState {
    progress: number;
    active: boolean;
    direction: 'asc' | 'desc';
    startProgress: number;
    endProgress: number;
    scrollPx: {
        start: number;
        end: number;
        span: number;
    };
    style: Record<string, string | number>;
}
interface TimelineDebugLayerRange {
    start: number;
    end: number;
    span: number;
}
interface TimelinePerfMetrics {
    batchDeltaMs: number;
    longFrames: number;
    scrollEvents: number;
    scrollFlushes: number;
    scrollSkips: number;
    playheadCommits: number;
    commitSkips: number;
    layerCalcMs: number;
    reusedLayers: number;
    recomputedLayers: number;
}
interface TimelineDebugInfo<Id extends string = string> {
    enabled: boolean;
    mode: TimelineMode;
    root: string;
    scrollSource: string;
    sceneHeight: number;
    viewportHeight: number;
    scrollTop: number;
    scrollProgress: number;
    layerRangesPx: Record<Id, TimelineDebugLayerRange>;
    suggestions: string[];
    pxToProgress: (px: number) => number;
    progressToPx: (progress: number) => number;
    perf: TimelinePerfMetrics;
}
interface UseTimelineReturn<Id extends string = string> {
    containerRef: react__default.RefObject<HTMLDivElement | null>;
    playhead: number;
    /** Per-layer progress values (0–1) keyed by layer id. */
    layers: Record<Id, number>;
    /** Full layer state (progress, active, style, scrollPx, …) keyed by layer id. */
    layerStates: Record<Id, TimelineLayerState>;
    /** Computed CSS style object for each layer, keyed by layer id. */
    effects: Record<Id, Record<string, string | number>>;
    getLayerScrollRange: (layerId: Id) => {
        start: number;
        end: number;
        span: number;
    } | null;
    controls: {
        play: () => void;
        pause: () => void;
        seek: (progress: number) => void;
        next: () => void;
        prev: () => void;
        isPlaying: boolean;
    };
    waapi: {
        enabled: boolean;
    };
    debug: TimelineDebugInfo<Id>;
}
declare const useTimeline: <Id extends string = string>({ layers, mode, duration, sceneHeight, debug, debugOverlay, autoStart, interpolate, lerpFactor: lerpFactorOption, maxFPS, }: Omit<TimelineOptions, "layers"> & {
    layers: Array<TimelineLayer & {
        id: Id;
    }>;
}) => UseTimelineReturn<Id>;

interface UseTimerProps {
    duration: number;
    autoStart?: boolean;
    onProgress?: (percentage: number) => void;
    onExpired?: () => void;
}
declare const useTimer: ({ duration, autoStart, onProgress, onExpired }: UseTimerProps) => {
    progress: number;
    isPaused: boolean;
    isExpired: boolean;
    pause: () => void;
    resume: () => void;
    reset: () => void;
};

declare enum Status {
    Error = -1,
    Idle = 0,
    FetchingServer = 1,
    Uploading = 2,
    Saving = 3,
    Saved = 4
}
interface QueItem {
    ID: string;
    file: File;
    dir: string;
    remote: false;
    progress: number;
    speed: number;
    eta: number;
    bytes: number;
    status: Status;
    server?: Server | null;
}
type Server = {
    ID: string;
    uri: string;
    token: string;
    rmf: string | null;
};
type Uploadify = {
    que: QueItem[];
    index: number;
    speed: number;
    stamp: number | null;
    token: string | null;
    status: Status;
    cancelToken?: CancelTokenSource | null;
};
interface Uploader {
    apiUrl: string;
    onChange?: (file: QueItem | null) => void;
    onComplete?: (index: number, que: QueItem[], currentFile: QueItem | null) => void;
    onError?: (index: number, que: QueItem[], currentFile: QueItem | null) => void;
    onQueFinished?: () => void;
}
declare const useUploader: (conf: Uploader) => {
    get: () => react.RefObject<Uploadify>;
    getQue: () => QueItem[];
    addToQue: (f: dynamic) => void;
};

type WebSocketHeaders = {
    Authorization: string;
};
type WebSocketOptions = {
    headers?: WebSocketHeaders & dynamic;
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onRawMessage?: (event: MessageEvent) => void;
    onMessage?: (data: dynamic) => void;
    onError?: (event: Event) => void;
    autoConnect?: boolean;
    reconnect?: boolean;
};
declare const useWebSocket: (url: string, options?: WebSocketOptions) => {
    isConnected: boolean;
    messages: any[];
    connect: (websocketHeaders?: WebSocketHeaders) => void;
    disconnect: () => void;
    sendMessage: (message: string | object) => void;
};

type WorkerStatus = 'idle' | 'running' | 'success' | 'error' | 'terminated';
/** A function that can be moved into a worker. Must be self-contained. */
type WorkerFn<TInput, TResult> = (input: TInput, api: WorkerSideApi) => TResult | Promise<TResult>;
/** API surface exposed to the function executing *inside* the worker. */
interface WorkerSideApi {
    /** Emit an intermediate progress value back to the main thread. */
    progress: (value: unknown) => void;
    /** Emit an arbitrary named event back to the main thread. */
    emit: (event: string, payload?: unknown) => void;
    /** Resolves/rejects when the caller aborts this specific call. */
    signal: AbortSignal;
}
interface CallOptions {
    /** Objects to transfer (zero-copy) instead of structured-cloned. */
    transfer?: Transferable[];
    /** Abort this call early. */
    signal?: AbortSignal;
    /** Milliseconds before the call rejects with a TimeoutError. */
    timeout?: number;
    /** Retry count for failed calls (does not retry on abort/timeout by default). */
    retries?: number;
    /** Backoff in ms between retries, or a function of the attempt index. */
    retryDelay?: number | ((attempt: number) => number);
    /** Also retry on timeout. Defaults to false. */
    retryOnTimeout?: boolean;
    /** Called for every streamed progress value for this call. */
    onProgress?: (value: unknown) => void;
}
interface UseWebWorkerOptions<TInput, TResult> {
    /** Spawn the worker immediately instead of on first call. Default: false. */
    eager?: boolean;
    /** Keep the worker alive between calls. Default: true. */
    persistent?: boolean;
    /** Number of workers in the pool. >1 enables parallel execution. Default: 1. */
    poolSize?: number;
    /** Scheduling strategy for the pool. Default: 'least-busy'. */
    strategy?: 'round-robin' | 'least-busy';
    /** Restart a worker automatically if it crashes. Default: true. */
    autoRestart?: boolean;
    /** Default options applied to every call(). */
    callDefaults?: CallOptions;
    /** Fired whenever the worker emits a named event. */
    onEvent?: (event: string, payload: unknown) => void;
    /** Fired on any uncaught worker error. */
    onError?: (error: Error) => void;
    /** Extra dependencies — changing them re-creates the worker. */
    deps?: ReadonlyArray<unknown>;
    /** Names of globalThis functions/values to inject into worker scope. */
    imports?: string[];
}
interface UseWebWorkerResult<TInput, TResult> {
    /** Invoke the worker. Resolves with the result of the worker function. */
    call: (input: TInput, options?: CallOptions) => Promise<TResult>;
    /** Latest resolved result, or undefined. */
    result: TResult | undefined;
    /** Latest error, or undefined. */
    error: Error | undefined;
    /** Reactive status of the worker / most recent call. */
    status: WorkerStatus;
    /** True while any call is in flight. */
    loading: boolean;
    /** Number of calls currently in flight. */
    pending: number;
    /** Latest progress value streamed from the worker. */
    progress: unknown;
    /** Abort every in-flight call. */
    cancelAll: () => void;
    /** Terminate the worker(s) immediately. */
    terminate: () => void;
    /** Tear down and re-create the worker(s). */
    restart: () => void;
    /** Subscribe to a named worker event. Returns an unsubscribe fn. */
    on: (event: string, handler: (payload: unknown) => void) => () => void;
}
declare function useWebWorker<TInput = unknown, TResult = unknown>(factory: WorkerFn<TInput, TResult> | string | URL, options?: UseWebWorkerOptions<TInput, TResult>): UseWebWorkerResult<TInput, TResult>;

declare global {
    interface Window {
        fbq: (...args: any[]) => void;
        _fbq: any;
        gtag: (...args: any[]) => void;
        dataLayer: Record<string, any>[];
    }
}

export { type AgentActivity, type AgentCapabilities, type AgentChat, type AgentChatSummary, type AgentClient, type AgentClientEvent, type AgentConnectionState, type AgentContextMode, type AgentController, type AgentMessage, type AgentPermissionRequest, type AgentQueuedMessage, type AgentRole, type AgentRunStats, type AgentSendOptions, type AgentTerminalExecution, type AgentThinkingLevel, AnchorType, type CalendarMonthFormat, type CalendarWeekdayFormat, type Command, type CommandActionProps, CropShape, DB_HEALED_KEY, DB_HEAL_BLOCKED_KEY, DB_HEAL_STATE_KEY, type DataPoint, DBProvider as DatabaseProvider, type DeviceInfo, type DragProbe, type DragSpec, type DragType, type DropProbe, type DropSpec, type GradientAnimation, type GradientMotionPreset, type GradientStop, type GradientType, type IDBOptions, type IDBSchema, KeyCode, type LensAvailability, type LensElementDimensions, type LensExplodedTreeNode, type LensExtractedElement, type LensExtractedNode, type LensLayer, type LineChartProps, type LocalStorageAction, type LocalStorageChange, type LocalStorageEventSource, type MediaItem, type MutationCallback, type OrbLayer, type PushNotificationsOptions, type PushNotificationsResult, type PushSubscriptionMeta, type ScrollBreakpoint, type ScrollPhysicsOptions, type SessionStorageAction, type SessionStorageChange, type SessionStorageEventSource, type SortableId, type SortablePayload, type SortableSpec, type SortableState, type TimelineAnchor, type TimelineAnchorEdge, type TimelineAnchorRef, type TimelineDebugInfo, type TimelineDebugLayerRange, type TimelineEasing, type TimelineEasingName, type TimelineEffect, type TimelineEntry, type TimelineEntryTrigger, type TimelineKeyframe, type TimelineLayer, type TimelineLayerState, type TimelineMode, type TimelineOptions, type TimelineSpanTrigger, type TimelineTransformEffects, type TimelineTriggerOffset, type TransformSkewEffect, type TransformSkewPair, type TransformValueEffect, type TransformValueTuple, type QueItem as UploadQueItem, Status as UploadStatus, type Uploadify, type UseAgentOptions, type UseCacheReturn, type UseDragSpecFactory, type UseDropSpecFactory, type UseGradientOptions, type UseGradientResult, type UseLineChartDimensions, type UseLineChartReturn, type UseLocalStorageListOptions, type UseLocalStorageListResult, type UseLocalStorageOptions, type UseSessionStorageOptions, type UseSortableSpecFactory, type UseTimelineReturn, type UseWebWorkerOptions, type UseWebWorkerResult, type WebSocketOptions, isMissingStoreError, useAgent, useAnchor, useAnchorPosition, useCache, useCalendar, useCarousel, useCodeLens, useCommandActions, useDB, useDBHealed, useDatabase, useDebounce, useMounted as useDelayed, useDevice, useDimensions, useDocumentTitle, useDrag, useDrop, useFacebookPixel, useFileSystem, useGtag as useGoogleTagManager, useGradient, useImage, useImageCropper, useIntersectionObserver, useLineChart, useLocalStorage, useLocalStore, useMediaPlayer, useMorph, useMounted, useMouseWheel, useMutationObserver, useNetworkStatus, useNextInterval, useParallax, usePushNotifications, useResizeObserver, useScrollPhysics, useScrollbar, useSessionStorage, useShortcuts, useSortable, useTimeline, useTimer, useUploader, useWatchDB, useWebSocket, useWebWorker };
