"use client";

import { useCallback, useState } from "react";

export type UseCacheReturn = {
	write: (key: string, data: unknown) => Promise<void>;
	read: <T>(key: string) => Promise<T | null>;
	writeBinary: (key: string, data: Uint8Array | ArrayBuffer) => Promise<void>;
	readBinary: (key: string) => Promise<Uint8Array | null>;
	remove: (key: string) => Promise<boolean>;
	clear: () => Promise<boolean>;
	isLoading: boolean;
	error: Error | null;
};

const DEFAULT_CACHE_NAME = "zuz-cache-v1";

const hasCacheApi = () => typeof window !== "undefined" && typeof window.caches !== "undefined";

const toError = (err: unknown) => err instanceof Error ? err : new Error(String(err));

const toUint8ArrayBuffer = (value: Uint8Array): ArrayBuffer =>
	value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;

const toBinaryBuffer = (value: Uint8Array | ArrayBuffer): ArrayBuffer =>
	value instanceof Uint8Array ? toUint8ArrayBuffer(value) : value;

const normalizeCacheKey = (key: string) => {
	if (/^https?:\/\//i.test(key)) {
		return key;
	}

	if (key.startsWith("/")) {
		return `${window.location.origin}${key}`;
	}

	return `${window.location.origin}/${key}`;
};

const toRequest = (key: string) => new Request(normalizeCacheKey(key), {
	method: "GET",
});

const useCache = (cacheName: string = DEFAULT_CACHE_NAME): UseCacheReturn => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	const getCache = useCallback(() => caches.open(cacheName), [cacheName]);

	const write = useCallback(async (key: string, data: unknown) => {
		if (!hasCacheApi()) return;
		setIsLoading(true);
		setError(null);
		try {
			const cache = await getCache();
			await cache.put(toRequest(key), new Response(JSON.stringify(data), {
				headers: { "content-type": "application/json" },
			}));
		} catch (err) {
			setError(toError(err));
		} finally {
			setIsLoading(false);
		}
	}, [getCache]);

	const read = useCallback(async <T>(key: string): Promise<T | null> => {
		if (!hasCacheApi()) return null;
		setIsLoading(true);
		setError(null);
		try {
			const cache = await getCache();
			const response = await cache.match(toRequest(key));
			if (!response) return null;
			return await response.json() as T;
		} catch (err) {
			setError(toError(err));
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [getCache]);

	const writeBinary = useCallback(async (key: string, data: Uint8Array | ArrayBuffer) => {
		if (!hasCacheApi()) return;
		setIsLoading(true);
		setError(null);
		try {
			const cache = await getCache();
			const buffer = toBinaryBuffer(data);
			const body = new Blob([buffer], { type: "application/octet-stream" });

			await cache.put(toRequest(key), new Response(body, {
				headers: {
					"content-type": "application/octet-stream",
				},
			}));
		} catch (err) {
			setError(toError(err));
		} finally {
			setIsLoading(false);
		}
	}, [getCache]);

	const readBinary = useCallback(async (key: string): Promise<Uint8Array | null> => {
		if (!hasCacheApi()) return null;
		setIsLoading(true);
		setError(null);
		try {
			const cache = await getCache();
			const response = await cache.match(toRequest(key));
			if (!response) return null;
			return new Uint8Array(await response.arrayBuffer());
		} catch (err) {
			setError(toError(err));
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [getCache]);

	const remove = useCallback(async (key: string): Promise<boolean> => {
		if (!hasCacheApi()) return false;
		try {
			const cache = await getCache();
			return cache.delete(toRequest(key));
		} catch (err) {
			setError(toError(err));
			return false;
		}
	}, [getCache]);

	const clear = useCallback(async (): Promise<boolean> => {
		if (!hasCacheApi()) return false;
		try {
			return caches.delete(cacheName);
		} catch (err) {
			setError(toError(err));
			return false;
		}
	}, [cacheName]);

	return { write, read, writeBinary, readBinary, remove, clear, isLoading, error };
};

export default useCache;
