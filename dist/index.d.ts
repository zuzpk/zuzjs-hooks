import * as react from 'react';
import { RefObject, ReactNode } from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { CancelTokenSource } from '@zuzjs/core';

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
}) => react_jsx_runtime.JSX.Element;
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

declare const useDevice: () => {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
} & Dimensions;

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
declare enum DragDirection {
    x = "x",
    y = "y",
    xy = "xy"
}
type DragOptions = {
    direction?: DragDirection;
    snap?: number;
    limits?: {
        left?: number;
        right?: number;
        top?: number;
        bottom?: number;
    };
};
declare const useDrag: (dragOptions?: DragOptions) => {
    position: Position;
    onMouseDown: (event: React.MouseEvent) => void;
    isDragging: boolean;
};

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

declare const useImage: (url: string, crossOrigin?: "anonymous" | "use-credentials", referrerPolicy?: "no-referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "same-origin" | "strict-origin" | "strict-origin-when-cross-origin" | "unsafe-url") => any[];

declare const useImageCropper: (imageUrl: string, cropSize: number, cropShape?: CropShape, scale?: number) => {
    canvasRef: react.RefObject<HTMLCanvasElement | null>;
    crop: () => string | null;
    setScale: react.Dispatch<react.SetStateAction<number>>;
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
declare const useScrollbar: (speed?: number, breakpoints?: ScrollBreakpoint, smooth?: boolean) => {
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

type ScrollPhysicsOptions = {
    lerpFactor?: number;
    x?: number;
    y?: number;
    xMultiplier?: number;
    yMultiplier?: number;
    scale?: {
        min: number;
        max: number;
        factor: number;
    };
    rotate?: {
        direction?: 1 | -1;
        multiplier?: number;
    };
};
declare const useScrollPhysics: (ref: RefObject<HTMLElement>, options: ScrollPhysicsOptions) => {
    position: RefObject<number>;
    velocity: RefObject<number>;
};

type Shortcut = {
    keys: KeyCode[];
    callback: (event: KeyboardEvent) => void;
};
declare const useShortcuts: (shortcuts: Shortcut[], preventDefault?: boolean) => void;

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

declare global {
    interface Window {
        fbq: (...args: any[]) => void;
        _fbq: any;
        gtag: (...args: any[]) => void;
        dataLayer: Record<string, any>[];
    }
}

export { AnchorType, type CalendarMonthFormat, type CalendarWeekdayFormat, type Command, type CommandActionProps, CropShape, DB_HEALED_KEY, DB_HEAL_BLOCKED_KEY, DB_HEAL_STATE_KEY, type DataPoint, DBProvider as DatabaseProvider, DragDirection, type DragOptions, type IDBOptions, type IDBSchema, KeyCode, type LineChartProps, type MediaItem, type MutationCallback, type PushNotificationsOptions, type PushNotificationsResult, type PushSubscriptionMeta, type ScrollBreakpoint, type QueItem as UploadQueItem, Status as UploadStatus, type Uploadify, type UseLineChartDimensions, type UseLineChartReturn, type WebSocketOptions, isMissingStoreError, useAnchorPosition, useCalendar, useCarousel, useCommandActions, useDB, useDBHealed, useDatabase, useDebounce, useMounted as useDelayed, useDevice, useDimensions, useDocumentTitle, useDrag, useFacebookPixel, useFileSystem, useGtag as useGoogleTagManager, useImage, useImageCropper, useIntersectionObserver, useLineChart, useMediaPlayer, useMorph, useMounted, useMouseWheel, useMutationObserver, useNetworkStatus, useNextInterval, usePushNotifications, useResizeObserver, useScrollPhysics, useScrollbar, useShortcuts, useTimer, useUploader, useWatchDB, useWebSocket };
