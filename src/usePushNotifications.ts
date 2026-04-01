import { urlBase64ToUint8Array } from "@zuzjs/core";
import { useCallback, useEffect, useState } from "react";

export type PushSubscriptionMeta = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushNotificationsOptions = {
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

export type PushNotificationsResult = {

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

const usePushNotifications = (
    options: PushNotificationsOptions
) : PushNotificationsResult => {

    const {
        vapidPublicKey,
        serviceWorkerPath = '/sw.js',
        requestPermissionOnMount = false,
    } = options;

    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [subscriptionMeta, setSubscriptionMeta] = useState<PushSubscriptionMeta | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
    const [isSupported, setIsSupported] = useState(false);
    
    // Register service worker
    const registerServiceWorker = useCallback(async () => {

        if (!isSupported) return null;

        try {
            const reg = await navigator.serviceWorker.register(serviceWorkerPath, {
                scope: '/',
                updateViaCache: 'all',
            });
            setRegistration(reg);
            return reg;
        } catch (err) {
            console.error('Service Worker registration failed:', err);
            setError('Failed to register service worker');
            return null;
        }

  }, [serviceWorkerPath, isSupported]);

    // Get current subscription
    const getCurrentSubscription = useCallback(async (reg: ServiceWorkerRegistration) => {
        try {
        const sub = await reg.pushManager.getSubscription();
        setSubscription(sub);
        if (sub) {
            setSubscriptionMeta(sub.toJSON() as PushSubscriptionMeta);
        } else {
            setSubscriptionMeta(null);
        }
        return sub;
        } catch (err) {
        console.error('Failed to get subscription:', err);
        setError('Failed to get subscription');
        return null;
        }
    }, []);

    // Subscribe to push
    const subscribe = useCallback(async (): Promise<PushSubscription | null> => {
        if (!isSupported || !registration) {
            setError('Push not supported or service worker not registered');
            return null;
        }

        if (typeof vapidPublicKey !== 'string' || vapidPublicKey.trim().length === 0) {
            setError('Invalid VAPID public key');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const permissionResultRaw = await Notification.requestPermission();
            const permissionResult: NotificationPermission =
                permissionResultRaw === 'granted' ||
                permissionResultRaw === 'denied' ||
                permissionResultRaw === 'default'
                    ? permissionResultRaw
                    : 'default';

            if (permissionResultRaw !== permissionResult) {
                setError(`Unexpected notification permission result: ${String(permissionResultRaw)}`);
                setIsLoading(false);
                return null;
            }

            setPermission(permissionResult);

            if (permissionResult !== 'granted') {
                setError('Permission not granted for notifications');
                setIsLoading(false);
                return null;
            }

            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey.trim()) as BufferSource;
            const pushSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });

            setSubscription(pushSubscription);
            setSubscriptionMeta(pushSubscription.toJSON() as PushSubscriptionMeta);
            setIsLoading(false);

            return pushSubscription;
        } catch (err: any) {
            console.error('Subscription failed:', err);
            setError(err.message || 'Failed to subscribe');
            setIsLoading(false);
            return null;
        }
    }, [isSupported, registration, vapidPublicKey]);

    // Unsubscribe
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        if (!subscription) return true;

        try {
            const result = await subscription.unsubscribe();
            if (result) {
                setSubscription(null);
                setSubscriptionMeta(null);
            }
            return result;
        } catch (err) {
            console.error('Failed to unsubscribe:', err);
            return false;
        }
    }, [subscription]);

    // Request permission only
    const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
        const result = await Notification.requestPermission();
        setPermission(result);
        return result;
    }, []);

    // Initialize
    useEffect(() => {

        const _isSupported = 'PushManager' in window && 'serviceWorker' in navigator

        setIsSupported(_isSupported);

        if (!_isSupported) {
            setError('Push notifications not supported in this browser');
            return;
        }

        let isMounted = true;

        const init = async () => {
        const reg = await registerServiceWorker();
        if (!reg || !isMounted) return;

        setPermission(Notification.permission);
        await getCurrentSubscription(reg);

        if (requestPermissionOnMount && Notification.permission === 'default') {
            await requestPermission();
        }
        };

        init();

        return () => {
            isMounted = false;
        };
    }, [
            isSupported,
            registerServiceWorker,
            getCurrentSubscription,
            requestPermissionOnMount,
            requestPermission,
    ]);

    // Listen for permission changes
    useEffect(() => {

        if (!('permissions' in navigator)) return;

        let revoked = false;

        const checkPermission = async () => {
            if (revoked) return;
            const perm = await navigator.permissions.query({ name: 'notifications' });
            perm.onchange = () => {
                setPermission(Notification.permission);
                if (Notification.permission === 'denied') {
                    revoked = true;
                    unsubscribe();
                }
            };
        };

        checkPermission();

    }, [unsubscribe]);

    return {
        permission,
        subscription,
        subscriptionMeta,
        isSupported,
        subscribe,
        unsubscribe,
        requestPermission,
        error,
        isLoading,
    };

}

export default usePushNotifications