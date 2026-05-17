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

type MemoryCacheEntry =
	| { type: "json"; value: unknown }
	| { type: "binary"; value: Uint8Array };

const hasCacheApi = () => typeof window !== "undefined" && typeof window.caches !== "undefined";

const toError = (err: unknown) => err instanceof Error ? err : new Error(String(err));

const toUint8ArrayBuffer = (value: Uint8Array): ArrayBuffer =>
	value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;

const toBinaryBuffer = (value: Uint8Array | ArrayBuffer): ArrayBuffer =>
	value instanceof Uint8Array ? toUint8ArrayBuffer(value) : value;

const cloneUint8Array = (value: Uint8Array) => new Uint8Array(value);

const getOrigin = () => {
	if (typeof window === "undefined") {
		return "";
	}

	return window.location.origin;
};

const normalizeCacheKey = (key: string) => {
	if (/^https?:\/\//i.test(key)) {
		return key;
	}

	const origin = getOrigin();

	if (key.startsWith("/")) {
		return `${origin}${key}`;
	}

	return origin ? `${origin}/${key}` : key;
};

const toRequest = (key: string) => new Request(normalizeCacheKey(key), {
	method: "GET",
});

const useCache = (cacheName: string = DEFAULT_CACHE_NAME): UseCacheReturn => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [memoryCache] = useState<Map<string, MemoryCacheEntry>>(() => new Map());

	const getCache = useCallback(() => caches.open(cacheName), [cacheName]);

	const write = useCallback(async (key: string, data: unknown) => {
		setIsLoading(true);
		setError(null);
		try {
			if (!hasCacheApi()) {
				memoryCache.set(normalizeCacheKey(key), { type: "json", value: data });
				return;
			}

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
		setIsLoading(true);
		setError(null);
		try {
			if (!hasCacheApi()) {
				const entry = memoryCache.get(normalizeCacheKey(key));
				if (!entry || entry.type !== "json") return null;
				return entry.value as T;
			}

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
	}, [getCache, memoryCache]);

	const writeBinary = useCallback(async (key: string, data: Uint8Array | ArrayBuffer) => {
		setIsLoading(true);
		setError(null);
		try {
			if (!hasCacheApi()) {
				const value = data instanceof Uint8Array
					? cloneUint8Array(data)
					: new Uint8Array(data);

				memoryCache.set(normalizeCacheKey(key), { type: "binary", value });
				return;
			}

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
	}, [getCache, memoryCache]);

	const readBinary = useCallback(async (key: string): Promise<Uint8Array | null> => {
		setIsLoading(true);
		setError(null);
		try {
			if (!hasCacheApi()) {
				const entry = memoryCache.get(normalizeCacheKey(key));
				if (!entry || entry.type !== "binary") return null;
				return cloneUint8Array(entry.value);
			}

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
	}, [getCache, memoryCache]);

	const remove = useCallback(async (key: string): Promise<boolean> => {
		if (!hasCacheApi()) {
			return memoryCache.delete(normalizeCacheKey(key));
		}

		try {
			const cache = await getCache();
			return cache.delete(toRequest(key));
		} catch (err) {
			setError(toError(err));
			return false;
		}
	}, [getCache, memoryCache]);

	const clear = useCallback(async (): Promise<boolean> => {
		if (!hasCacheApi()) {
			memoryCache.clear();
			return true;
		}

		try {
			return caches.delete(cacheName);
		} catch (err) {
			setError(toError(err));
			return false;
		}
	}, [cacheName, memoryCache]);

	return { write, read, writeBinary, readBinary, remove, clear, isLoading, error };
};

export default useCache;