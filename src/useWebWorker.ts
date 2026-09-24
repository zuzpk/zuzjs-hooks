/**
 * Manage Web Workers with a simple React hook, no boilerplate, batteries included.
 */
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

export type WorkerStatus =
  | 'idle'
  | 'running'
  | 'success'
  | 'error'
  | 'terminated';

/** A function that can be moved into a worker. Must be self-contained. */
export type WorkerFn<TInput, TResult> = (
  input: TInput,
  api: WorkerSideApi,
) => TResult | Promise<TResult>;

/** API surface exposed to the function executing *inside* the worker. */
export interface WorkerSideApi {
  /** Emit an intermediate progress value back to the main thread. */
  progress: (value: unknown) => void;
  /** Emit an arbitrary named event back to the main thread. */
  emit: (event: string, payload?: unknown) => void;
  /** Resolves/rejects when the caller aborts this specific call. */
  signal: AbortSignal;
}

export interface CallOptions {
  /** Objects to transfer (zero-copy) instead of structured-cloned. */
  transfer?: Transferable[];
  /** Abort this call early. */
  signal?: AbortSignal;
  /** Milliseconds before the call rejects with a TimeoutError. */
  timeout?: number;
  /** Retry count for failed calls (does not retry on abort/timeout by default). */
  retries?: number;
  /** Backoff in ms between retries, or a function of the attempt index. */
  retryDelay?: number | ((attempt: number) => number);
  /** Also retry on timeout. Defaults to false. */
  retryOnTimeout?: boolean;
  /** Called for every streamed progress value for this call. */
  onProgress?: (value: unknown) => void;
}

export interface UseWebWorkerOptions<TInput, TResult> {
  /** Spawn the worker immediately instead of on first call. Default: false. */
  eager?: boolean;
  /** Keep the worker alive between calls. Default: true. */
  persistent?: boolean;
  /** Number of workers in the pool. >1 enables parallel execution. Default: 1. */
  poolSize?: number;
  /** Scheduling strategy for the pool. Default: 'least-busy'. */
  strategy?: 'round-robin' | 'least-busy';
  /** Restart a worker automatically if it crashes. Default: true. */
  autoRestart?: boolean;
  /** Default options applied to every call(). */
  callDefaults?: CallOptions;
  /** Fired whenever the worker emits a named event. */
  onEvent?: (event: string, payload: unknown) => void;
  /** Fired on any uncaught worker error. */
  onError?: (error: Error) => void;
  /** Extra dependencies — changing them re-creates the worker. */
  deps?: ReadonlyArray<unknown>;
  /** Names of globalThis functions/values to inject into worker scope. */
  // (kept for API completeness; injection happens via `imports`)
  imports?: string[];
}

export interface UseWebWorkerResult<TInput, TResult> {
  /** Invoke the worker. Resolves with the result of the worker function. */
  call: (input: TInput, options?: CallOptions) => Promise<TResult>;
  /** Latest resolved result, or undefined. */
  result: TResult | undefined;
  /** Latest error, or undefined. */
  error: Error | undefined;
  /** Reactive status of the worker / most recent call. */
  status: WorkerStatus;
  /** True while any call is in flight. */
  loading: boolean;
  /** Number of calls currently in flight. */
  pending: number;
  /** Latest progress value streamed from the worker. */
  progress: unknown;
  /** Abort every in-flight call. */
  cancelAll: () => void;
  /** Terminate the worker(s) immediately. */
  terminate: () => void;
  /** Tear down and re-create the worker(s). */
  restart: () => void;
  /** Subscribe to a named worker event. Returns an unsubscribe fn. */
  on: (event: string, handler: (payload: unknown) => void) => () => void;
}

/* ------------------------------------------------------------------ *
 * Internal message protocol
 * ------------------------------------------------------------------ */

type OutboundMessage<TInput> = {
  type: 'call';
  id: number;
  input: TInput;
};

type InboundMessage<TResult> =
  | { type: 'result'; id: number; value: TResult }
  | { type: 'error'; id: number; error: SerializedError }
  | { type: 'progress'; id: number; value: unknown }
  | { type: 'event'; id: number; event: string; payload: unknown }
  | { type: 'ready' };

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
}

/* ------------------------------------------------------------------ *
 * Error classes
 * ------------------------------------------------------------------ */

export class WorkerTimeoutError extends Error {
  constructor(ms: number) {
    super(`Worker call timed out after ${ms}ms`);
    this.name = 'WorkerTimeoutError';
  }
}

export class WorkerAbortError extends Error {
  constructor(reason?: unknown) {
    super(
      typeof reason === 'string' ? reason : 'Worker call was aborted',
    );
    this.name = 'WorkerAbortError';
  }
}

export class WorkerCrashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkerCrashError';
  }
}

function reviveError(s: SerializedError): Error {
  const e = new Error(s.message);
  e.name = s.name;
  e.stack = s.stack;
  return e;
}

/* ------------------------------------------------------------------ *
 * Worker source generation (for the function-based API)
 * ------------------------------------------------------------------ */

/**
 * Builds the JS source of a worker that hosts an arbitrary user function.
 * The function is stringified and re-evaluated inside the worker. It must be
 * fully self-contained (no closures over outer scope).
 */
function buildWorkerSource(fnSource: string): string {
  return `
'use strict';
const __userFn = (${fnSource});
const __aborters = new Map();

self.onmessage = async (e) => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'abort') {
    const ac = __aborters.get(msg.id);
    if (ac) ac.abort(msg.reason);
    return;
  }

  if (msg.type !== 'call') return;

  const { id, input } = msg;
  const ac = new AbortController();
  __aborters.set(id, ac);

  const api = {
    signal: ac.signal,
    progress: (value) => {
      try { self.postMessage({ type: 'progress', id, value }); }
      catch (_) { /* non-cloneable progress payload — ignored */ }
    },
    emit: (event, payload) => {
      try { self.postMessage({ type: 'event', id, event, payload }); }
      catch (_) { /* non-cloneable event payload — ignored */ }
    },
  };

  try {
    const value = await __userFn(input, api);
    // The user function may return [value, transferList] to transfer objects.
    if (Array.isArray(value) && value.__transfer === true) {
      self.postMessage({ type: 'result', id, value: value[0] }, value[1] || []);
    } else {
      self.postMessage({ type: 'result', id, value });
    }
  } catch (err) {
    const isAbort =
      (err && (err.name === 'AbortError' || err.name === 'WorkerAbortError')) ||
      ac.signal.aborted;
    self.postMessage({
      type: 'error',
      id,
      error: {
        name: isAbort ? 'WorkerAbortError' : (err && err.name) || 'Error',
        message: (err && err.message) || String(err),
        stack: err && err.stack,
      },
    });
  } finally {
    __aborters.delete(id);
  }
};

self.postMessage({ type: 'ready' });
`;
}

/** Resolve the eventual source of a Worker, whichever API form was used. */
function createWorkerInstance<TInput, TResult>(
  factory: WorkerFn<TInput, TResult> | string | URL,
): { worker: Worker; revoke: () => void } {
  // URL or string path → load directly.
  if (factory instanceof URL) {
    return { worker: new Worker(factory, { type: 'module' }), revoke: () => {} };
  }
  if (typeof factory === 'string') {
    return { worker: new Worker(factory), revoke: () => {} };
  }

  // Function → stringify, wrap, blob-URL it.
  const source = buildWorkerSource(factory.toString());
  const blob = new Blob([source], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  return { worker, revoke: () => URL.revokeObjectURL(url) };
}

/* ------------------------------------------------------------------ *
 * A single managed worker (the "node" of a pool)
 * ------------------------------------------------------------------ */

interface PendingCall<TResult> {
  resolve: (value: TResult) => void;
  reject: (reason: Error) => void;
  onProgress?: (value: unknown) => void;
  cleanup: () => void;
}

class ManagedWorker<TInput, TResult> {
  private worker: Worker | null = null;
  private revoke: () => void = () => {};
  private nextId = 1;
  private pending = new Map<number, PendingCall<TResult>>();
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private destroyed = false;

  /** Count of in-flight calls — used by the least-busy scheduler. */
  public get load(): number {
    return this.pending.size;
  }

  constructor(
    private factory: WorkerFn<TInput, TResult> | string | URL,
    private handlers: {
      onEvent?: (event: string, payload: unknown) => void;
      onError?: (error: Error) => void;
      onCrash?: () => void;
    },
  ) {
    this.readyPromise = new Promise((res) => {
      this.resolveReady = res;
    });
    this.spawn();
  }

  private spawn() {
    const { worker, revoke } = createWorkerInstance<TInput, TResult>(
      this.factory,
    );
    this.worker = worker;
    this.revoke = revoke;

    worker.onmessage = (e: MessageEvent<InboundMessage<TResult>>) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;

      switch (msg.type) {
        case 'ready':
          this.resolveReady();
          break;

        case 'result': {
          const call = this.pending.get(msg.id);
          if (call) {
            call.cleanup();
            this.pending.delete(msg.id);
            call.resolve(msg.value);
          }
          break;
        }

        case 'error': {
          const call = this.pending.get(msg.id);
          if (call) {
            call.cleanup();
            this.pending.delete(msg.id);
            call.reject(reviveError(msg.error));
          }
          break;
        }

        case 'progress': {
          const call = this.pending.get(msg.id);
          call?.onProgress?.(msg.value);
          break;
        }

        case 'event':
          this.handlers.onEvent?.(msg.event, msg.payload);
          break;
      }
    };

    worker.onerror = (e: ErrorEvent) => {
      // Prevent the default "Uncaught" console spam; we surface it ourselves.
      e.preventDefault?.();
      const err = new WorkerCrashError(
        e.message || 'Worker crashed with an uncaught error',
      );
      this.handlers.onError?.(err);
      // A hard crash invalidates every in-flight call.
      this.failAll(err);
      this.handlers.onCrash?.();
    };

    worker.onmessageerror = () => {
      const err = new Error('Worker received an un-deserializable message');
      this.handlers.onError?.(err);
    };
  }

  /** Reject every pending call — used on crash or terminate. */
  private failAll(reason: Error) {
    for (const [, call] of this.pending) {
      call.cleanup();
      call.reject(reason);
    }
    this.pending.clear();
  }

  async whenReady(): Promise<void> {
    return this.readyPromise;
  }

  call(
    input: TInput,
    options: CallOptions,
  ): Promise<TResult> {
    if (this.destroyed || !this.worker) {
      return Promise.reject(
        new WorkerCrashError('Worker has been terminated'),
      );
    }

    const id = this.nextId++;
    const worker = this.worker;

    return new Promise<TResult>((resolve, reject) => {
      let settled = false;
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (options.signal) {
          options.signal.removeEventListener('abort', onAbort);
        }
      };

      const finishResolve = (value: TResult) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      const finishReject = (reason: Error) => {
        if (settled) return;
        settled = true;
        reject(reason);
      };

      const onAbort = () => {
        if (settled) return;
        // Tell the worker to abort the in-flight computation.
        try {
          worker.postMessage({
            type: 'abort',
            id,
            reason: 'aborted-by-caller',
          });
        } catch {
          /* worker may already be gone */
        }
        this.pending.delete(id);
        cleanup();
        finishReject(new WorkerAbortError(options.signal?.reason));
      };

      // Already aborted before we even started.
      if (options.signal?.aborted) {
        finishReject(new WorkerAbortError(options.signal.reason));
        return;
      }

      this.pending.set(id, {
        resolve: finishResolve,
        reject: finishReject,
        onProgress: options.onProgress,
        cleanup,
      });

      if (options.signal) {
        options.signal.addEventListener('abort', onAbort, { once: true });
      }

      if (typeof options.timeout === 'number' && options.timeout > 0) {
        timeoutHandle = setTimeout(() => {
          if (settled) return;
          try {
            worker.postMessage({
              type: 'abort',
              id,
              reason: 'timeout',
            });
          } catch {
            /* ignore */
          }
          this.pending.delete(id);
          cleanup();
          finishReject(new WorkerTimeoutError(options.timeout as number));
        }, options.timeout);
      }

      const outbound: OutboundMessage<TInput> = { type: 'call', id, input };
      try {
        worker.postMessage(outbound, options.transfer ?? []);
      } catch (err) {
        this.pending.delete(id);
        cleanup();
        finishReject(
          err instanceof Error
            ? err
            : new Error('Failed to post message to worker'),
        );
      }
    });
  }

  cancelAll() {
    this.failAll(new WorkerAbortError('cancelAll() called'));
  }

  terminate() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.failAll(new WorkerCrashError('Worker has been terminated'));
    this.worker?.terminate();
    this.revoke();
    this.worker = null;
  }
}

/* ------------------------------------------------------------------ *
 * Worker pool — schedules calls across N managed workers
 * ------------------------------------------------------------------ */

class WorkerPool<TInput, TResult> {
  private nodes: ManagedWorker<TInput, TResult>[] = [];
  private cursor = 0;

  constructor(
    private factory: WorkerFn<TInput, TResult> | string | URL,
    private size: number,
    private strategy: 'round-robin' | 'least-busy',
    private autoRestart: boolean,
    private handlers: {
      onEvent?: (event: string, payload: unknown) => void;
      onError?: (error: Error) => void;
    },
  ) {
    for (let i = 0; i < Math.max(1, size); i++) {
      this.nodes.push(this.makeNode());
    }
  }

  private makeNode(): ManagedWorker<TInput, TResult> {
    const node = new ManagedWorker<TInput, TResult>(this.factory, {
      onEvent: this.handlers.onEvent,
      onError: this.handlers.onError,
      onCrash: () => {
        if (!this.autoRestart) return;
        // Replace the crashed node in place.
        const idx = this.nodes.indexOf(node);
        if (idx !== -1) {
          node.terminate();
          this.nodes[idx] = this.makeNode();
        }
      },
    });
    return node;
  }

  private pick(): ManagedWorker<TInput, TResult> {
    if (this.strategy === 'least-busy') {
      let best = this.nodes[0];
      for (const n of this.nodes) {
        if (n.load < best.load) best = n;
      }
      return best;
    }
    // round-robin
    const node = this.nodes[this.cursor % this.nodes.length];
    this.cursor++;
    return node;
  }

  async call(input: TInput, options: CallOptions): Promise<TResult> {
    const node = this.pick();
    await node.whenReady();
    return node.call(input, options);
  }

  get totalLoad(): number {
    return this.nodes.reduce((sum, n) => sum + n.load, 0);
  }

  cancelAll() {
    this.nodes.forEach((n) => n.cancelAll());
  }

  terminate() {
    this.nodes.forEach((n) => n.terminate());
    this.nodes = [];
  }
}

/* ------------------------------------------------------------------ *
 * Retry helper
 * ------------------------------------------------------------------ */

async function withRetry<T>(
  attemptFn: () => Promise<T>,
  retries: number,
  retryDelay: number | ((attempt: number) => number),
  retryOnTimeout: boolean,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await attemptFn();
    } catch (err) {
      lastError = err as Error;
      const isAbort = lastError.name === 'WorkerAbortError';
      const isTimeout = lastError.name === 'WorkerTimeoutError';
      // Never retry caller-driven aborts.
      if (isAbort) throw lastError;
      // Only retry timeouts when explicitly allowed.
      if (isTimeout && !retryOnTimeout) throw lastError;
      // Out of attempts.
      if (attempt === retries) throw lastError;

      const delay =
        typeof retryDelay === 'function'
          ? retryDelay(attempt)
          : retryDelay;
      if (delay > 0) {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  // Unreachable, but satisfies the type checker.
  throw lastError ?? new Error('Retry failed');
}

/* ------------------------------------------------------------------ *
 * The hook
 * ------------------------------------------------------------------ */

export function useWebWorker<TInput = unknown, TResult = unknown>(
  factory: WorkerFn<TInput, TResult> | string | URL,
  options: UseWebWorkerOptions<TInput, TResult> = {},
): UseWebWorkerResult<TInput, TResult> {
  const {
    eager = false,
    poolSize = 1,
    strategy = 'least-busy',
    autoRestart = true,
    callDefaults,
    onEvent,
    onError,
    deps = [],
    persistent = true,
  } = options;

  /* --- reactive state --- */
  const [status, setStatus] = useState<WorkerStatus>('idle');
  const [result, setResult] = useState<TResult | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [pending, setPending] = useState(0);
  const [progress, setProgress] = useState<unknown>(undefined);

  /* --- refs that must survive re-renders --- */
  const poolRef = useRef<WorkerPool<TInput, TResult> | null>(null);
  const eventBus = useRef(
    new Map<string, Set<(payload: unknown) => void>>(),
  );
  const mounted = useRef(true);
  // Stable references to the latest callbacks so the pool never goes stale.
  const onEventRef = useRef(onEvent);
  const onErrorRef = useRef(onError);
  onEventRef.current = onEvent;
  onErrorRef.current = onError;

  // The factory is captured once per `deps` cycle. We keep a ref so `call`
  // does not need to be re-created on every render.
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  const safeSet = useCallback(
    <T,>(setter: (v: T) => void, value: T) => {
      if (mounted.current) setter(value);
    },
    [],
  );

  /* --- pool lifecycle --- */
  const buildPool = useCallback((): WorkerPool<TInput, TResult> => {
    return new WorkerPool<TInput, TResult>(
      factoryRef.current,
      poolSize,
      strategy,
      autoRestart,
      {
        onEvent: (event, payload) => {
          onEventRef.current?.(event, payload);
          const subs = eventBus.current.get(event);
          if (subs) subs.forEach((h) => h(payload));
        },
        onError: (err) => {
          onErrorRef.current?.(err);
          safeSet(setError, err);
          safeSet(setStatus, 'error');
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolSize, strategy, autoRestart, safeSet]);

  const ensurePool = useCallback((): WorkerPool<TInput, TResult> => {
    if (!poolRef.current) {
      poolRef.current = buildPool();
    }
    return poolRef.current;
  }, [buildPool]);

  const terminate = useCallback(() => {
    poolRef.current?.terminate();
    poolRef.current = null;
    safeSet(setStatus, 'terminated');
  }, [safeSet]);

  const restart = useCallback(() => {
    poolRef.current?.terminate();
    poolRef.current = buildPool();
    safeSet(setStatus, 'idle');
    safeSet(setError, undefined);
  }, [buildPool, safeSet]);

  const cancelAll = useCallback(() => {
    poolRef.current?.cancelAll();
  }, []);

  /* --- the call() entry point --- */
  const call = useCallback(
    async (input: TInput, perCall?: CallOptions): Promise<TResult> => {
      const pool = ensurePool();
      const merged: CallOptions = { ...callDefaults, ...perCall };

      const retries = merged.retries ?? 0;
      const retryDelay = merged.retryDelay ?? 0;
      const retryOnTimeout = merged.retryOnTimeout ?? false;

      safeSet(setStatus, 'running');
      safeSet(setError, undefined);
      setPending((p) => p + 1);

      const runOnce = () =>
        pool.call(input, {
          ...merged,
          onProgress: (value) => {
            safeSet(setProgress, value);
            merged.onProgress?.(value);
          },
        });

      try {
        const value = await withRetry(
          runOnce,
          retries,
          retryDelay,
          retryOnTimeout,
        );
        safeSet(setResult, value);
        safeSet(setStatus, 'success');
        return value;
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error(String(err));
        safeSet(setError, e);
        safeSet(setStatus, 'error');
        throw e;
      } finally {
        setPending((p) => {
          const next = Math.max(0, p - 1);
          return next;
        });
      }
    },
    [ensurePool, callDefaults, safeSet],
  );

  /* --- event subscription --- */
  const on = useCallback(
    (event: string, handler: (payload: unknown) => void) => {
      let set = eventBus.current.get(event);
      if (!set) {
        set = new Set();
        eventBus.current.set(event, set);
      }
      set.add(handler);
      return () => {
        set?.delete(handler);
      };
    },
    [],
  );

  /* --- eager spawn + dependency-driven re-creation --- */
  useEffect(() => {
    mounted.current = true;
    if (eager) {
      // Tear down any previous pool, then spawn a fresh one.
      poolRef.current?.terminate();
      poolRef.current = buildPool();
      safeSet(setStatus, 'idle');
    }
    return () => {
      mounted.current = false;
      // On unmount (or deps change) always tear down — unless the caller
      // explicitly opted into a non-persistent, lazy worker, in which case
      // there may not even be one. Either way, terminate is safe.
      if (!persistent || true) {
        poolRef.current?.terminate();
        poolRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eager, buildPool, persistent, ...deps]);

  /* --- derived flags --- */
  const loading = pending > 0;

  return useMemo(
    () => ({
      call,
      result,
      error,
      status,
      loading,
      pending,
      progress,
      cancelAll,
      terminate,
      restart,
      on,
    }),
    [
      call,
      result,
      error,
      status,
      loading,
      pending,
      progress,
      cancelAll,
      terminate,
      restart,
      on,
    ],
  );
}

/* ------------------------------------------------------------------ *
 * Helper: mark a return value for transfer from inside a worker fn.
 * Usage inside your worker function:
 *   return transfer(myArrayBuffer, [myArrayBuffer]);
 * ------------------------------------------------------------------ */

export function transfer<T>(value: T, transferList: Transferable[]): T {
  const wrapped = [value, transferList] as unknown as T & {
    __transfer: boolean;
  };
  (wrapped as unknown as { __transfer: boolean }).__transfer = true;
  return wrapped;
}

export default useWebWorker;