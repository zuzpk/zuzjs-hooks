declare global {
    interface Window {
        fbq: (...args: any[]) => void;
        _fbq: any;
        gtag: (...args: any[]) => void;
        dataLayer: Record<string, any>[];
    }
}

export type {
    CalendarMonthFormat, CalendarWeekdayFormat
} from "./types";

export { AnchorType, CropShape, KeyCode } from "./types";

export {
    default as useCommandActions,
    type Command,
    type CommandActionProps
} from './useCommandActions';

export {
    isMissingStoreError, default as useDatabase, type IDBOptions,
    type IDBSchema
} from './useDB';
export {
    DBProvider as DatabaseProvider, DB_HEAL_BLOCKED_KEY, DB_HEAL_STATE_KEY, DB_HEALED_KEY, useDB, useDBHealed, useWatchDB
} from "./useDBProvider";

export { default as useAnchor } from './useAnchor';

export { default as useAnchorPosition } from './useAnchorPosition';

export { default as useCalendar } from './useCalendar';

export { default as useCarousel } from './useCarousel';

export {
    default as useCodeLens, type LensAvailability, type LensElementDimensions,
    type LensExplodedTreeNode, type LensExtractedElement, type LensExtractedNode, type LensLayer
} from './useCodeLens';

export { default as useDebounce } from './useDebounce';

export { default as useDelayed, default as useMounted } from './useDelayed';

export { default as useDevice } from './useDevice';

export { default as useDimensions } from './useDimensions';

export { default as useDocumentTitle } from './useDocumentTitle';

export { DragDirection, default as useDrag, type DragOptions } from './useDrag';

export { default as useFacebookPixel } from './useFacebookPixel';

export { default as useFileSystem } from './useFileSystem';

export { default as useGoogleTagManager } from './useGoogleTagManager';

export { default as useImage } from './useImage';

export { default as useImageCropper } from './useImageCropper';

export { default as useIntersectionObserver } from './useIntersectionObserver';

export {
    default as useLineChart,
    type DataPoint, type LineChartProps, type UseLineChartDimensions,
    type UseLineChartReturn
} from './useLineChart';

export {
    default as useLocalStorage,
    type LocalStorageAction,
    type LocalStorageChange,
    type LocalStorageEventSource,
    type UseLocalStorageOptions
} from './useLocalStorage';

export {
    default as useSessionStorage,
    type SessionStorageAction,
    type SessionStorageChange,
    type SessionStorageEventSource,
    type UseSessionStorageOptions
} from './useSessionStorage';

export {
    default as useMediaPlayer,
    type MediaItem
} from './useMediaPlayer';

export { default as useMorph } from './useMorph';

export { default as useMouseWheel } from './useMouseWheel';

export { default as useMutationObserver, type MutationCallback } from './useMutationObserver';

export { default as useNetworkStatus } from './useNetworkStatus';

export { default as useNextInterval } from './useNextInterval';

export {
    default as usePushNotifications, type PushNotificationsOptions,
    type PushNotificationsResult, type PushSubscriptionMeta
} from './usePushNotifications';

export { default as useResizeObserver } from './useResizeObserver';

export { default as useScrollbar, type ScrollBreakpoint } from './useScrollbar';

export { default as useScrollPhysics } from './useScrollPhysics';

export { default as useShortcuts } from './useShortcuts';

export { default as useTimer } from './useTimer';

export { default as useUploader } from './useUploader';
export type {
    Uploadify, QueItem as UploadQueItem,
    Status as UploadStatus
} from './useUploader';

export { default as useWebSocket, type WebSocketOptions } from './useWebSocket';
