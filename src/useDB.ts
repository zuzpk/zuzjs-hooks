"use client"
import { useCallback, useEffect, useRef, useState } from "react";

enum DBMode {
    readOnly = "readonly",
    readWrite = "readwrite",
}

export type IDBOptions = {
    name: string;
    version: number;
    meta: IDBMeta[];
    /**
     * Called when an "object store not found" corruption is detected on any DB
     * operation. Typically used by DBProvider to wipe + reload automatically.
     */
    onCorrupted?: (source: string) => void;
}

export const isMissingStoreError = (error: unknown): boolean => {
    const msg = String((error as any)?.message ?? (error as any)?.name ?? error ?? "")
    return (
        msg.includes("object stores was not found") ||
        msg.includes("One of the specified object stores was not found") ||
        msg.includes("No objectStore named")
    )
}

export interface IDBMeta {
    name: string
    config: { keyPath: string, autoIncrement: boolean },
    schema: IDBSchema[]
}

export interface IDBSchema {
    name: string
    key?: string
    unique?: boolean
}

const useDatabase = (options: IDBOptions) => {

    const { name, version, meta, onCorrupted } = options;
    const db = useRef<IDBDatabase | null>(null);
    const [ error, setError ] = useState<string | null>(null);
    const [ dbUnavailable, setDBUnavailable ] = useState(false);
    const listeners = useRef<Map<string, Set<(result?: any) => void>>>(new Map());

    const markUnavailable = useCallback((source: string, err?: unknown) => {
        setDBUnavailable(true)
        const nextMessage = String((err as any)?.message ?? err ?? `IndexedDB is unavailable`)
        setError(prev => prev ?? `${source}: ${nextMessage}`)
    }, [])

    const markAvailable = useCallback(() => {
        setDBUnavailable(false)
    }, [])

    const notify = useCallback((storeName: string, result?: any) => {
        listeners.current.get(storeName)?.forEach(cb => cb(result));
    }, []);

    // Subscribe to changes
    const subscribe = useCallback((storeName: string, callback: (result?: any) => void) => {
        if (!listeners.current.has(storeName)) listeners.current.set(storeName, new Set());
        listeners.current.get(storeName)!.add(callback);
        return () => { listeners.current.get(storeName)?.delete(callback); };
    }, []);
    
    useEffect(() => {

        const openRequest = indexedDB.open(name, +(version.toString().replace(/\./g, ``)));

        openRequest.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;
            meta.forEach((meta) => {
                if (!database.objectStoreNames.contains(meta.name)) {
                    const store = database.createObjectStore(meta.name, meta.config);
                    meta.schema.forEach((schema) => {
                        store.createIndex(schema.name, schema.key || schema.name, { unique: schema.unique || false });
                    })
                }
            })
        }

        openRequest.onsuccess = (event) => {
            db.current = (event.target as IDBOpenDBRequest).result
            markAvailable()
        }

        openRequest.onerror = () => {
            markUnavailable(`open`, openRequest.error)
            setError('Failed to open database');
        };

        return () => db.current?.close()

    }, [name, version, markAvailable, markUnavailable])

    const connect = () => new Promise<IDBDatabase>((resolve, reject) => {
        if ( db.current ) resolve(db.current)
        const request = indexedDB.open(name, +(version.toString().replace(/\./g, ``)))
        request.onsuccess = (event) => {
            db.current = (event.target as IDBOpenDBRequest).result
            markAvailable()
            resolve(db.current)
        };
        request.onerror = (event) => {
            markUnavailable(`connect`, request.error ?? event)
            reject([`Failed to open database`, event].join(`\n`));
        };
    })

    const createTransaction = (storeName: string, mode: DBMode) : {
        store: IDBObjectStore
    } => {
        const transaction = db.current!.transaction(storeName, mode)
        const store = transaction.objectStore(storeName);
        return { store }
    }

    const getStore = <T>(storeName: string, id: string | number) => new Promise<T>((resolve, reject) => {
        connect().then((db) => {
            const { store } = createTransaction(storeName, DBMode.readOnly)
            const request = store.getAll()
            request.onsuccess = (evt: any) => {
                const result = evt.target.result as T
                if ( undefined == result ) reject('Record not found');
                resolve(evt.target.result as T);
            };
        
            request.onerror = (evt: any) => {
                reject(`SELECT Failed. ${evt.target.result}`);
            };
        })
        .catch(err => {
            if ( isMissingStoreError(err) ) {
                markUnavailable(`getStore:${storeName}`, err)
                onCorrupted?.(`getStore:${storeName}`)
            }
            reject(err.message || 'Database either corrupted or not initialized');
        })
    })

    const getAll = <T>(storeName: string) => new Promise<T>((resolve, reject) => {
        connect().then((db) => {
            const { store } = createTransaction(storeName, DBMode.readOnly)
            const request = store.getAll()
            request.onsuccess = (evt: any) => {
                const result = evt.target.result as T
                if ( undefined == result ) reject('Record not found');
                resolve(evt.target.result as T);
            };
        
            request.onerror = (evt: any) => {
                reject(`SELECT Failed. ${evt.target.result}`);
            };
        })
        .catch(err => {
            if ( isMissingStoreError(err) ) {
                markUnavailable(`getAll:${storeName}`, err)
                onCorrupted?.(`getAll:${storeName}`)
            }
            reject('Database either corrupted or not initialized');
        })
    })

    const getByID = <T>(storeName: string, id: string | number) => new Promise<T>((resolve, reject) => {
        connect().then((db) => {
            const { store } = createTransaction(storeName, DBMode.readOnly)
            const request = store.get(id);

            request.onsuccess = (evt: any) => {
                const result = evt.target.result as T
                if ( undefined == result ) reject('Record not found');
                resolve(evt.target.result as T);
            };
        
            request.onerror = (evt: any) => {
                reject(`SELECT Failed. ${evt.target.result}`);
            };
        })
        .catch(err => {
            if ( isMissingStoreError(err) ) {
                markUnavailable(`getByID:${storeName}`, err)
                onCorrupted?.(`getByID:${storeName}`)
            }
            reject('Database either corrupted or not initialized');
        })
    })

    const insert = <T>(storeName: string, value: T, key?: any) => new Promise<number>((resolve, reject) => {
        
        connect().then((db) => {
            
            const { store } = createTransaction(storeName, DBMode.readWrite)
            const request = store.add(value, key);

            request.onsuccess = (evt: any) => {
                notify(storeName, evt.target?.result);
                resolve(evt.target?.result);
            };
        
            request.onerror = (evt: any) => {
                reject(`INSERTION Failed. ${evt.target.result}`);
            };
        })
        .catch(err => {
            if ( isMissingStoreError(err) ) {
                markUnavailable(`insert:${storeName}`, err)
                onCorrupted?.(`insert:${storeName}`)
            }
            reject(err.message || 'Database either corrupted or not initialized');
        })

    })   
    
    const update_one = <T extends Object>(storeName: string, value: Partial<T>, key: IDBValidKey) => new Promise<void>((resolve, reject) => {
        connect().then((db) => {

            const { store } = createTransaction(storeName, DBMode.readWrite)
            
            const getReq = store.get(key);
            getReq.onsuccess = () => {
                const existing = getReq.result;
                if (!existing) {
                    reject(`Record with key ${key} not found.`);
                    return;
                }
                const updateReq = store.put({ ...existing, ...value });
                updateReq.onsuccess = (evt: any) => {
                    notify(storeName, evt.target?.result);
                    resolve(evt.target?.result)
                };
                updateReq.onerror = (evt: any) => reject(`Update failed. ${evt.target.error}`);

            }

            getReq.onerror = (evt: any) => {
                reject(`Failed to get existing record. ${evt.target.error}`);
            };
        })
        .catch(err => {
            if ( isMissingStoreError(err) ) {
                markUnavailable(`update_one:${storeName}`, err)
                onCorrupted?.(`update_one:${storeName}`)
            }
            reject('Database either corrupted or not initialized');
        })
    })

    const update = <T>(storeName: string, values: { [x: string | number | symbol ]: T }) => new Promise<void>((resolve, reject) => {
        connect().then((db) => {
            const { store } = createTransaction(storeName, DBMode.readWrite)
            let completed = 0
            const request = store.put(values);
            request.onsuccess = (evt: any) => {
                notify(storeName, evt.target?.result);
                resolve(evt.target?.result);
            };
            request.onerror = (evt: any) => {
                reject(`UPDATE Failed. ${evt.target.result}`);
            };
        })
        .catch(err => {
            if ( isMissingStoreError(err) ) {
                markUnavailable(`update:${storeName}`, err)
                onCorrupted?.(`update:${storeName}`)
            }
            reject(`UPDATE Failed. ${err}`);
        })
    })

    const remove = (storeName: string, key: IDBValidKey) => new Promise<void>((resolve, reject) => {
        connect().then((db) => {
            const { store } = createTransaction(storeName, DBMode.readWrite)
            const request = store.delete(key)
            request.onsuccess = (evt: any) => {
                notify(storeName, evt.target?.result);
                resolve(evt.target?.result);
            };
        })
        .catch(err => {
            if ( isMissingStoreError(err) ) {
                markUnavailable(`remove:${storeName}`, err)
                onCorrupted?.(`remove:${storeName}`)
            }
            reject(`Delete failed from ${storeName} with key: ${key}`)
        })
    })

    return { 
        getAll,
        getByID,
        getStore,
        insert, 
        update,
        update_one,
        remove,
        subscribe,
        dbUnavailable,
        error
    }

}

export default useDatabase