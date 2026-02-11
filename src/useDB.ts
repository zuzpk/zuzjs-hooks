"use client"
import { useEffect, useRef, useState } from "react";

enum DBMode {
    readOnly = "readonly",
    readWrite = "readwrite",
}

export type IDBOptions = {
    name: string;
    version: number;
    meta: IDBMeta[];
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

const useDB = (options: IDBOptions) => {

    const { name, version, meta } = options;
    const db = useRef<IDBDatabase | null>(null);
    const [ error, setError ] = useState<string | null>(null);
    
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
        }

        openRequest.onerror = () => {
            setError('Failed to open database');
        };

        return () => db.current?.close()

    }, [name, version])

    const connect = () => new Promise<IDBDatabase>((resolve, reject) => {
        if ( db.current ) resolve(db.current)
        const request = indexedDB.open(name, +(version.toString().replace(/\./g, ``)))
        request.onsuccess = (event) => {
            db.current = (event.target as IDBOpenDBRequest).result
            resolve(db.current)
        };
        request.onerror = (event) => {
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
            console.log(`[getAll]`, err)
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
            console.log(`[getByID]`, err)
            reject('Database either corrupted or not initialized');
        })
    })

    const insert = <T>(storeName: string, value: T, key?: any) => new Promise<number>((resolve, reject) => {
        
        connect().then((db) => {
            
            const { store } = createTransaction(storeName, DBMode.readWrite)
            const request = store.add(value, key);

            request.onsuccess = (evt: any) => {
                resolve(evt.target.result);
            };
        
            request.onerror = (evt: any) => {
                reject(`INSERTION Failed. ${evt.target.result}`);
            };
        })
        .catch(err => {
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
                updateReq.onsuccess = () => resolve();
                updateReq.onerror = (evt: any) => reject(`Update failed. ${evt.target.error}`);

            }

            getReq.onerror = (evt: any) => {
                reject(`Failed to get existing record. ${evt.target.error}`);
            };
        })
        .catch(err => {
            reject('Database either corrupted or not initialized');
        })
    })

    const update = <T>(storeName: string, values: { [x: string | number | symbol ]: T }) => new Promise<void>((resolve, reject) => {
        connect().then((db) => {
            const { store } = createTransaction(storeName, DBMode.readWrite)
            let completed = 0
            const request = store.put(values);
            request.onsuccess = (evt: any) => {
                resolve();
            };
            request.onerror = (evt: any) => {
                reject(`UPDATE Failed. ${evt.target.result}`);
            };
        })
        .catch(err => {
            reject(`UPDATE Failed. ${err}`);
            // reject('Database either corrupted or not initialized');
        })
    })

    const remove = (storeName: string, key: IDBValidKey) => new Promise<void>((resolve, reject) => {
        connect().then((db) => {
            const { store } = createTransaction(storeName, DBMode.readWrite)
            const request = store.delete(key)
            request.onsuccess = (evt: any) => {
                resolve();
            };
        })
        .catch(err => {
            console.log(err)
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
        error 
    }

}

export default useDB