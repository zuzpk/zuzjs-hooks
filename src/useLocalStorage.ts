"use client"
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type LocalStorageAction = "set" | "remove" | "clear";
export type LocalStorageEventSource = "internal" | "external";

export interface LocalStorageChange<T> {
	action: LocalStorageAction;
	key: string | null;
	source: LocalStorageEventSource;
	oldValue: T | undefined;
	newValue: T | undefined;
	rawOldValue: string | null;
	rawNewValue: string | null;
}

export interface UseLocalStorageOptions<T> {
	defaultValue?: T;
	storage?: Storage;
	sync?: boolean;
	serializer?: (value: T) => string;
	deserializer?: (value: string) => T;
	onChange?: (change: LocalStorageChange<T>) => void;
}

export interface UseLocalStorageListOptions<T> extends Omit<UseLocalStorageOptions<T[]>, "defaultValue"> {
	defaultValue?: T[];
	unique?: boolean;
}

export interface UseLocalStorageListResult<T> {
	value: T[];
	setValues: (nextValue: T[] | ((currentValue: T[]) => T[])) => T[] | undefined;
	addValue: (nextValue: T | T[]) => T[] | undefined;
	removeValue: (nextValue: T | T[]) => T[] | undefined;
	toggleValue: (nextValue: T) => T[] | undefined;
	clear: () => void;
	lastChange: LocalStorageChange<T[]> | null;
}

const LOCAL_STORAGE_EVENT = "zuz:local-storage-change";
const SESSION_STORAGE_EVENT = "zuz:session-storage-change";

function hasWindow(): boolean {
	return typeof window !== "undefined";
}

function getStorage(storage?: Storage): Storage | undefined {
	if (storage) {
		return storage;
	}

	if (!hasWindow()) {
		return undefined;
	}

	return window.localStorage;
}

function getStorageEventName(storage: Storage | undefined): string {
	if (!hasWindow()) {
		return LOCAL_STORAGE_EVENT;
	}

	if (storage === window.sessionStorage) {
		return SESSION_STORAGE_EVENT;
	}

	return LOCAL_STORAGE_EVENT;
}

function defaultSerialize<T>(value: T): string {
	return JSON.stringify(value);
}

function defaultDeserialize<T>(value: string): T {
	return JSON.parse(value) as T;
}

function resolveInitialValue<T>(defaultValue: T | undefined): T | undefined {
	return typeof defaultValue === "function"
		? (defaultValue as () => T)()
		: defaultValue;
}

function createChange<T>(
	action: LocalStorageAction,
	key: string | null,
	source: LocalStorageEventSource,
	rawOldValue: string | null,
	rawNewValue: string | null,
	deserializer: (value: string) => T
): LocalStorageChange<T> {
	const oldValue = rawOldValue === null ? undefined : deserializer(rawOldValue);
	const newValue = rawNewValue === null ? undefined : deserializer(rawNewValue);

	return {
		action,
		key,
		source,
		oldValue,
		newValue,
		rawOldValue,
		rawNewValue
	};
}

function inferAction(oldValue: string | null, newValue: string | null): LocalStorageAction {
	if (oldValue !== null && newValue === null) {
		return "remove";
	}

	if (oldValue === null && newValue === null) {
		return "clear";
	}

	return "set";
}

const useLocalStorage = <T>(
	key: string,
	options: UseLocalStorageOptions<T> = {}
) => {
	const {
		defaultValue,
		storage: providedStorage,
		sync = true,
		serializer = defaultSerialize,
		deserializer = defaultDeserialize,
		onChange
	} = options;

	const fallbackValue = resolveInitialValue(defaultValue);
	const storage = getStorage(providedStorage);
	const storageEventName = getStorageEventName(storage);

	const readValue = useCallback((): T | undefined => {
		if (!storage) {
			return fallbackValue;
		}

		try {
			const rawValue = storage.getItem(key);
			if (rawValue === null) {
				return fallbackValue;
			}

			return deserializer(rawValue);
		} catch {
			return fallbackValue;
		}
	}, [deserializer, fallbackValue, key, storage]);

	const [lastChange, setLastChange] = useState<LocalStorageChange<T> | null>(null);

	const emitInternalChange = useCallback((change: LocalStorageChange<T>) => {
		if (!hasWindow()) {
			return;
		}

		window.dispatchEvent(new CustomEvent(storageEventName, {
			detail: change
		}));
	}, [storageEventName]);

	const subscribe = useCallback((onStoreChange: () => void) => {
		if (!sync || !hasWindow()) {
			return () => undefined;
		}

		const onNativeStorage = (event: StorageEvent) => {
			if (event.storageArea !== storage) {
				return;
			}

			if (event.key !== null && event.key !== key) {
				return;
			}

			const change = createChange<T>(
				inferAction(event.oldValue, event.newValue),
				event.key,
				"external",
				event.oldValue,
				event.newValue,
				deserializer
			);

			setLastChange(change);
			onChange?.(change);
			onStoreChange();
		};

		const onInternalStorage = (event: Event) => {
			const customEvent = event as CustomEvent<LocalStorageChange<T>>;
			const change = customEvent.detail;

			if (!change) {
				return;
			}

			if (change.key !== null && change.key !== key) {
				return;
			}

			setLastChange(change);
			onChange?.(change);
			onStoreChange();
		};

		window.addEventListener("storage", onNativeStorage);
		window.addEventListener(storageEventName, onInternalStorage as EventListener);

		return () => {
			window.removeEventListener("storage", onNativeStorage);
			window.removeEventListener(storageEventName, onInternalStorage as EventListener);
		};
	}, [deserializer, key, onChange, storage, storageEventName, sync]);

	const value = useSyncExternalStore(
		subscribe,
		readValue,
		() => fallbackValue
	);

	const setValue = useCallback((nextValue: T | ((currentValue: T | undefined) => T)) => {
		if (!storage) {
			return fallbackValue;
		}

		try {
			const currentValue = readValue();
			const resolvedValue = typeof nextValue === "function"
				? (nextValue as (currentValue: T | undefined) => T)(currentValue)
				: nextValue;
			const rawOldValue = storage.getItem(key);
			const rawNewValue = serializer(resolvedValue);

			storage.setItem(key, rawNewValue);

			const change = createChange<T>(
				"set",
				key,
				"internal",
				rawOldValue,
				rawNewValue,
				deserializer
			);

			setLastChange(change);
			onChange?.(change);
			emitInternalChange(change);

			return resolvedValue;
		} catch {
			return fallbackValue;
		}
	}, [deserializer, emitInternalChange, fallbackValue, key, onChange, readValue, serializer, storage]);

	const removeValue = useCallback(() => {
		if (!storage) {
			return;
		}

		const rawOldValue = storage.getItem(key);
		storage.removeItem(key);

		const change = createChange<T>(
			"remove",
			key,
			"internal",
			rawOldValue,
			null,
			deserializer
		);

		setLastChange(change);
		onChange?.(change);
		emitInternalChange(change);
	}, [deserializer, emitInternalChange, key, onChange, storage]);

	const clear = useCallback(() => {
		if (!storage) {
			return;
		}

		const rawOldValue = storage.getItem(key);
		storage.clear();

		const change = createChange<T>(
			"clear",
			null,
			"internal",
			rawOldValue,
			null,
			deserializer
		);

		setLastChange(change);
		onChange?.(change);
		emitInternalChange(change);
	}, [deserializer, emitInternalChange, key, onChange, storage]);

	useEffect(() => {
		setLastChange(null);
	}, [key]);

	return {
		value,
		setValue,
		removeValue,
		clear,
		lastChange
	};
};

function includesValue<T>(values: T[], nextValue: T): boolean {
	return values.some((value) => Object.is(value, nextValue));
}

function normalizeValues<T>(values: T[] | undefined, fallbackValue: T[] | undefined): T[] {
	return values ?? fallbackValue ?? [];
}

/**
 * A hook for managing a collection of unique items in browser localStorage.
 */
export const useLocalStore = <T>(
	key: string,
	options: UseLocalStorageListOptions<T> = {}
): UseLocalStorageListResult<T> => {
	const {
		defaultValue = [],
		unique = true,
		...storageOptions
	} = options;

	const localStorageState = useLocalStorage<T[]>(key, {
		...storageOptions,
		defaultValue
	});

	const values = normalizeValues(localStorageState.value, defaultValue);

	const setValues = useCallback((nextValue: T[] | ((currentValue: T[]) => T[])) => {
		return localStorageState.setValue((currentValue) => {
			const currentValues = normalizeValues(currentValue, defaultValue);
			const resolvedValues = typeof nextValue === "function"
				? nextValue(currentValues)
				: nextValue;

			return unique
				? resolvedValues.filter((value, index, array) => array.findIndex((item) => Object.is(item, value)) === index)
				: resolvedValues;
		});
	}, [defaultValue, localStorageState, unique]);

	const addValue = useCallback((nextValue: T | T[]) => {
		return setValues((currentValues) => {
			const valuesToAdd = Array.isArray(nextValue) ? nextValue : [nextValue];

			if (!unique) {
				return [...currentValues, ...valuesToAdd];
			}

			return valuesToAdd.reduce<T[]>((accumulator, value) => {
				if (includesValue(accumulator, value)) {
					return accumulator;
				}

				return [...accumulator, value];
			}, [...currentValues]);
		});
	}, [setValues, unique]);

	const removeValue = useCallback((nextValue: T | T[]) => {
		return setValues((currentValues) => {
			const valuesToRemove = Array.isArray(nextValue) ? nextValue : [nextValue];

			return currentValues.filter((value) => !valuesToRemove.some((item) => Object.is(item, value)));
		});
	}, [setValues]);

	const toggleValue = useCallback((nextValue: T) => {
		return setValues((currentValues) => {
			if (includesValue(currentValues, nextValue)) {
				return currentValues.filter((value) => !Object.is(value, nextValue));
			}

			return unique ? [...currentValues, nextValue] : [...currentValues, nextValue];
		});
	}, [setValues, unique]);

	return {
		value: values,
		setValues,
		addValue,
		removeValue,
		toggleValue,
		clear: localStorageState.clear,
		lastChange: localStorageState.lastChange as LocalStorageChange<T[]> | null
	};
};

export default useLocalStorage;
