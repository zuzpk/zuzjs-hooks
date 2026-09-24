import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import useDatabase, { IDBOptions } from "./useDB";

type DBContextType = ReturnType<typeof useDB>

const DBContext = createContext<DBContextType | null>(null);

/**
 * sessionStorage key written before a self-heal reload.
 * Read by useDBHealed() to surface a one-time notification after the page
 * comes back up.
 */
export const DB_HEALED_KEY = `zuzjs.db.healed`
export const DB_HEAL_STATE_KEY = `zuzjs.db.heal.state`
export const DB_HEAL_BLOCKED_KEY = `zuzjs.db.heal.blocked`

const DB_HEAL_COOLDOWN_MS = 30_000
const DB_HEAL_MAX_RELOADS = 1
const DB_HEAL_RELOAD_DELAY_MS = 1500

export const DBProvider = ({ options, children, onCorrupted, selfHeal = false }: {
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
}) => {
    const isHealing = useRef(false)

    const defaultHeal = useCallback(async (source: string) => {
        if ( isHealing.current ) return

        let healState = { attempts: 0, lastAt: 0 }
        try {
            const rawState = sessionStorage.getItem(`${DB_HEAL_STATE_KEY}:${options.name}`)
            if ( rawState ) {
                const parsedState = JSON.parse(rawState)
                healState = {
                    attempts: Number(parsedState?.attempts ?? 0) || 0,
                    lastAt: Number(parsedState?.lastAt ?? 0) || 0,
                }
            }
        }
        catch {
            healState = { attempts: 0, lastAt: 0 }
        }

        const now = Date.now()
        const withinCooldown = now - healState.lastAt < DB_HEAL_COOLDOWN_MS
        const nextAttempts = withinCooldown ? healState.attempts + 1 : 1

        if ( withinCooldown && nextAttempts > DB_HEAL_MAX_RELOADS ) {
            sessionStorage.setItem(DB_HEAL_BLOCKED_KEY, JSON.stringify({
                source,
                dbName: options.name,
                attempts: nextAttempts,
                at: now,
            }))
            console.warn(`[DB-HEAL] Skipping reload to avoid loop for "${options.name}" (${source})`)
            return
        }

        isHealing.current = true

        try {
            sessionStorage.setItem(`${DB_HEAL_STATE_KEY}:${options.name}`, JSON.stringify({
                attempts: nextAttempts,
                lastAt: now,
            }))

            await new Promise<void>((resolve, reject) => {
                const req = indexedDB.deleteDatabase(options.name)
                req.onsuccess = () => resolve()
                req.onerror   = () => reject(req.error)
                req.onblocked = () => resolve()
            })
            sessionStorage.setItem(DB_HEALED_KEY, JSON.stringify({ source, dbName: options.name, at: Date.now() }))
            window.setTimeout(() => {
                window.location.reload()
            }, DB_HEAL_RELOAD_DELAY_MS)
        }
        catch (err) {
            isHealing.current = false
            console.error(`[DB-HEAL] Failed to self-heal "${options.name}" (${source})`, err)
        }
    }, [options.name])

    const db = useDatabase({
        ...options,
        onCorrupted: onCorrupted ?? (selfHeal ? defaultHeal : undefined),
    });

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
 * Returns heal metadata when the page was reloaded after an automatic
 * IndexedDB self-heal. Clears the sessionStorage marker on first read so the
 * value is only truthy once per recovery cycle.
 */
export const useDBHealed = (): {
    healed: boolean;
    blocked: boolean;
    source: string | null;
    dbName: string | null;
} => {
    const [state] = useState<{
        healed: boolean;
        blocked: boolean;
        source: string | null;
        dbName: string | null;
    }>(() => {
        try {
            const raw = sessionStorage.getItem(DB_HEALED_KEY)
            if ( raw ) {
                sessionStorage.removeItem(DB_HEALED_KEY)
                const parsed = JSON.parse(raw)
                if ( typeof parsed?.dbName === "string" ) {
                    sessionStorage.removeItem(`${DB_HEAL_STATE_KEY}:${parsed.dbName}`)
                    sessionStorage.removeItem(DB_HEAL_BLOCKED_KEY)
                }
                return {
                    healed: true,
                    blocked: false,
                    source: typeof parsed?.source === "string" ? parsed.source : null,
                    dbName: typeof parsed?.dbName === "string" ? parsed.dbName : null,
                }
            }

            const blockedRaw = sessionStorage.getItem(DB_HEAL_BLOCKED_KEY)
            if ( blockedRaw ) {
                sessionStorage.removeItem(DB_HEAL_BLOCKED_KEY)
                const parsed = JSON.parse(blockedRaw)
                return {
                    healed: false,
                    blocked: true,
                    source: typeof parsed?.source === "string" ? parsed.source : null,
                    dbName: typeof parsed?.dbName === "string" ? parsed.dbName : null,
                }
            }

            return { healed: false, blocked: false, source: null, dbName: null }
        }
        catch {
            return { healed: false, blocked: false, source: null, dbName: null }
        }
    })
    return state
}

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

    const { getAll, subscribe, dbUnavailable } = ctx;
    const [data, setData] = useState<T[]>([]);

    const refresh = useCallback(async () => {
        if ( dbUnavailable ) {
            setData([])
            return
        }

        try {
            const res = await getAll<T[]>(storeName);
            setData(predicate ? res.filter(predicate) : res);
        } catch (e) {
            console.error(`[useWatchDB] Failed to fetch ${storeName}:`, e);
        }
    }, [dbUnavailable, getAll, storeName, predicate]);

    useEffect(() => {
        if ( dbUnavailable ) {
            setData([])
            return
        }

        refresh();
        return subscribe(storeName, refresh); 
    }, [dbUnavailable, storeName, subscribe, refresh]);

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