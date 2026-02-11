"use client"
import { useEffect, useState } from 'react';

const useNetworkStatus = () => {

    const [isOnline, setIsOnline] = useState<boolean | null>(null);

    const updateNetworkStatus = () => {
        setIsOnline(navigator.onLine);
    };

    useEffect(() => {

        setTimeout(() => setIsOnline(navigator.onLine))

        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        return () => {
            window.removeEventListener('online', updateNetworkStatus);
            window.removeEventListener('offline', updateNetworkStatus);
        };
    }, []);

    return isOnline;
};

export default useNetworkStatus;