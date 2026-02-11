declare global {
    interface Window {
        fbq: (...args: any[]) => void;
        _fbq: any;
        gtag: (...args: any[]) => void;
        dataLayer: Record<string, any>[];
    }
}

export type {
    CalendarWeekdayFormat,
    CalendarMonthFormat
} from "./types"

export { KeyCode, CropShape, AnchorType } from "./types"

export {
    default as useCommandActions,
    type Command,
    type CommandActionProps
} from './useCommandActions';

export {
    default as useDB, type IDBOptions,
    type IDBSchema
} from './useDB';

export { default as useAnchorPosition } from './useAnchorPosition';

export { default as useCalendar } from './useCalendar';

export { default as useDebounce } from './useDebounce';

export { default as useDelayed, default as useMounted } from './useDelayed';

export { default as useDevice } from './useDevice';

export { default as useDimensions } from './useDimensions';

export { default as useFacebookPixel } from './useFacebookPixel';

export { default as useGoogleTagManager } from './useGoogleTagManager';

export { default as useImage } from './useImage';

export { default as useImageCropper } from './useImageCropper';

export { default as useIntersectionObserver } from './useIntersectionObserver';

export {
    default as useLineChart,
    type DataPoint, type LineChartProps, type UseLineChartDimensions,
    type UseLineChartReturn
} from './useLineChart';

export { default as useMorph } from './useMorph';

export { default as useMutationObserver, type MutationCallback } from './useMutationObserver';

export { default as useNetworkStatus } from './useNetworkStatus';

export { default as useNextInterval } from './useNextInterval';

export {
    default as usePushNotifications, type PushNotificationsOptions,
    type PushNotificationsResult, type PushSubscriptionMeta
} from './usePushNotifications';

export { default as useResizeObserver } from './useResizeObserver';

export { default as useScrollbar } from './useScrollbar';

export { default as useScrollPhysics } from './useScrollPhysics';

export { default as useShortcuts } from './useShortcuts';

export type { 
    QueItem as UploadQueItem, 
    Status as UploadStatus, 
    Uploadify 
} from './useUploader';
export { default as useUploader } from './useUploader';

export { default as useWebSocket, type WebSocketOptions } from './useWebSocket';