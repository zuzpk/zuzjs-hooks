import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import useDatabase, { IDBOptions } from "./useDB";

type DBContextType = ReturnType<typeof useDB>

const DBContext = createContext<DBContextType | null>(null);

export const DBProvider = ({ options, children }: { options: IDBOptions; children: ReactNode }) => {
    const db = useDatabase(options);
    return <DBContext value={db}>
        {children}
    </DBContext>
        
};

export const useDB = (options?: IDBOptions): ReturnType<typeof useDatabase> => {
    const ctx = useContext(DBContext);
    
    // If we're in a provider, return the shared state
    if (ctx) return ctx;

    // LEGACY FALLBACK:
    // If you're using this standalone, you should call useDatabase(options) 
    // directly in your component, not via this useDB wrapper.
    // This wrapper is now specifically for Context.
    throw new Error("Please wrap your app in <DatabaseProvider> or use useDatabase(options) directly.");
};

/**
 * Hook to watch a specific store.
 * Automatically re-refetches whenever insert/update/remove is called on that store.
 */
export const useWatchDB = <T,>(
    storeName: string,
    predicate?: (item: T) => boolean
) => {

    const ctx = useContext(DBContext);
    if (!ctx) throw new Error("useDatabase must be used within a DBProvider");

    const { getAll, subscribe } = ctx;
    const [data, setData] = useState<T[]>([]);

    const refresh = useCallback(async () => {
        try {
            const res = await getAll<T[]>(storeName);
            setData(predicate ? res.filter(predicate) : res);
        } catch (e) {
            console.error(`[useWatchDB] Failed to fetch ${storeName}:`, e);
        }
    }, [getAll, storeName, predicate]);

    useEffect(() => {
        refresh();
        return subscribe(storeName, refresh); 
    }, [storeName, subscribe, refresh]);

    return {
        data,
        first: () => data[0] as T ?? null,
        last: () => data[data.length - 1] as T ?? null,
        length: data.length,
        isEmpty: data.length === 0,
        [Symbol.iterator]: function* () {
            for (const item of data) yield item;
        }
    };
};