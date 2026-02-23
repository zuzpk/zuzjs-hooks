"use client"
import { useCallback, useState } from "react";

const useFileSystem = () => {
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Internal helper to get root or a specific directory
    const getHandle = useCallback(async (path?: string, create = false) => {
        let handle = await navigator.storage.getDirectory();
        if (path) {
            const parts = path.split('/').filter(Boolean);
            for (const part of parts) {
                handle = await handle.getDirectoryHandle(part, { create });
            }
        }
        return handle;
    }, []);

    // 1. Write: Supports Blob, ArrayBuffer, or String
    const write = useCallback(async (fileName: string, content: any, path?: string) => {
        setIsBusy(true);
        setError(null);
        try {
            const dir = await getHandle(path, true);
            const fileHandle = await dir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            return true;
        } catch (err: any) {
            setError(err);
            return false;
        } finally {
            setIsBusy(false);
        }
    }, [getHandle]);

    // 2. Read: Returns a File object (which is a Blob)
    const read = useCallback(async (fileName: string, path?: string) => {
        setIsBusy(true);
        try {
            const dir = await getHandle(path);
            const fileHandle = await dir.getFileHandle(fileName);
            return await fileHandle.getFile();
        } catch (err: any) {
            setError(err);
            return null;
        } finally {
            setIsBusy(false);
        }
    }, [getHandle]);

    // 3. Remove: Delete a file or an entire directory
    const remove = useCallback(async (name: string, path?: string, isFolder = false) => {
        try {
            const dir = await getHandle(path);
            await dir.removeEntry(name, { recursive: isFolder });
            return true;
        } catch (err: any) {
            setError(err);
            return false;
        }
    }, [getHandle]);

    // 4. List: Scans a directory
    const list = useCallback(async (path?: string) => {
        try {
            const dir = await getHandle(path);
            const entries: { name: string, kind: 'file' | 'directory' }[] = [];
            // @ts-ignore
            for await (const [name, handle] of dir.entries()) {
                entries.push({ name, kind: handle.kind });
            }
            return entries;
        } catch (err: any) {
            setError(err);
            return [];
        }
    }, [getHandle]);

    // 5. Space Estimate: Check quota
    const getUsage = useCallback(async () => {
        if (navigator.storage && navigator.storage.estimate) {
            const { usage, quota } = await navigator.storage.estimate();
            return { 
                used: usage || 0, 
                total: quota || 0, 
                percent: usage && quota ? (usage / quota) * 100 : 0 
            };
        }
        return null;
    }, []);

    return { write, read, remove, list, getUsage, isBusy, error };
};

export default useFileSystem