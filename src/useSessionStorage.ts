"use client"
import useLocalStorage, {
	type LocalStorageAction,
	type LocalStorageChange,
	type LocalStorageEventSource,
	type UseLocalStorageOptions
} from "./useLocalStorage";

export type SessionStorageAction = LocalStorageAction;
export type SessionStorageEventSource = LocalStorageEventSource;
export type SessionStorageChange<T> = LocalStorageChange<T>;
export interface UseSessionStorageOptions<T> extends UseLocalStorageOptions<T> {}

const useSessionStorage = <T>(
	key: string,
	options: UseSessionStorageOptions<T> = {}
) => {
	const storage = options.storage ?? (typeof window !== "undefined" ? window.sessionStorage : undefined);

	return useLocalStorage<T>(key, {
		...options,
		storage
	});
};

export default useSessionStorage;