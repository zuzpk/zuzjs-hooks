---
name: zuzjs-hooks
description: Use, debug, and extend @zuzjs/hooks, a TypeScript React 19 library for browser APIs, UI behavior, storage, IndexedDB, drag and drop, media, realtime communication, workers, and animation.
license: MIT
metadata:
  package: "@zuzjs/hooks"
  language: TypeScript
  framework: React 19
  runtime: browser
---

# @zuzjs/hooks

Use this skill when integrating or maintaining `@zuzjs/hooks`. The package is a browser-oriented React hook library that ships ESM, CommonJS, and declaration files from a single public entry point: `src/index.ts`.

## Install and validate

```bash
npm install @zuzjs/hooks
```

```tsx
import { useLocalStorage, useNetworkStatus } from "@zuzjs/hooks";
```

| Concern | Command / location |
| --- | --- |
| Public API | `src/index.ts` |
| Build | `npm run build` |
| Type check | `npx tsc --noEmit` |
| Build tool | `tsup.config.ts` |
| Supported Node | `>=18.17.0` |

`tsup` bundles `src/index.ts` as ESM and CJS, emits declarations, and externalizes React and React DOM. The package export map exposes only the package root, so all supported consumer imports must come from `@zuzjs/hooks`.

## Client and SSR guidance

Many hooks use DOM and browser APIs: `window`, `document`, Web Storage, IndexedDB, observers, workers, WebSocket, notifications, and media. Call them from client-rendered components. For example, in Next.js, add `'use client'` to the component module.

When maintaining a hook:

1. Guard browser globals with `typeof window !== "undefined"` or an equivalent safe fallback.
2. Register listeners, observers, sockets, timers, and animation frames in effects and always clean them up.
3. Keep changing callbacks/options stable when they are effect dependencies.
4. Use the library frame-loop or `requestAnimationFrame` batching for high-frequency scroll, resize, or animation updates.
5. Do not add a package subpath import unless the `package.json` export map is also deliberately expanded.

## Public API map

### Agent orchestration

`useAgent({ client })` is a transport-neutral chat controller for applications that render an AI/agent conversation. It does not make network requests itself: the host implements `AgentClient` and maps its own RPC, HTTP, WebSocket, or SDK protocol into the shared contracts.

```tsx
import { useMemo } from 'react';
import { useAgent, type AgentClient } from '@zuzjs/hooks';

function AgentScreen({ client }: { client: AgentClient }) {
  const stableClient = useMemo(() => client, [client]);
  const agent = useAgent({ client: stableClient });

  if (agent.loading) return <p>Loading…</p>;
  return <button onClick={() => void agent.send('Hello')}>Send</button>;
}
```

`AgentClient` must implement:

| Method | Responsibility |
| --- | --- |
| `initialize()` | Return chat summaries and optional initial active chat id. |
| `loadChat(chatId)` | Return the authoritative transcript. |
| `createChat(input?)` | Create and return a chat. `input` can include `firstMessage` and `contextMode`. |
| `send(input)` | Submit a message. Return an authoritative `AgentChat`, or `void` when the controller should reload durable state. |
| `archiveChat?(chatId)` | Optional archive capability. |
| `cancel?(chatId)` | Optional cancellation capability. |
| `subscribe?(listener)` | Optional live events for message deltas, completion, activity, and failure. Return an unsubscribe function. |

The returned `AgentController` exposes `chats`, `activeChat`, `messages`, `loading`, `running`, `error`, `selectChat`, `createChat`, `send`, `retry`, `archiveChat`, and `cancel`.

Important integration rules:

- Keep the `client` identity stable. Construct it with `useMemo` or outside render so initialization/subscriptions are not restarted.
- When `createChat({ firstMessage })` persists the first user message, return that message in the chat transcript. `useAgent` then passes `firstMessageAlreadyPersisted: true` to `send` and avoids an optimistic duplicate.
- Treat a returned `AgentChat` as authoritative. If `send` returns `void`, `useAgent` reloads with `loadChat`.
- Use `AgentCapabilities` in the UI layer to expose only transport-supported sessions, archive, cancel, activity, and context-mode features.
- Public types are `AgentClient`, `AgentClientEvent`, `AgentController`, `AgentCapabilities`, `AgentChat`, `AgentChatSummary`, `AgentMessage`, `AgentActivity`, and `AgentContextMode`.

### UI, layout, and interaction

| Hook | Use it for |
| --- | --- |
| `useAnchor` | Clone/configure an anchor trigger and produce a floating anchored element. Supports `open`, `autoFlip`, `preferredPlacement`, `margin`, and `offset`. |
| `useAnchorPosition` | Position a menu relative to an element or `MouseEvent`; returns `position`, `targetRef`, `calculatedAnchor`, and `isPositioned`. |
| `useCarousel` | Carousel index, next/previous/go-to controls, bounds, and progress. Wheel and arrow-key controls are enabled by default. |
| `useCodeLens` | Lens/inspection state for visual UI tooling. |
| `useDebounce` | A debounced callback. |
| `useDelayed` / `useMounted` | A delayed boolean mount state. `useMounted` is an alias. |
| `useDimensions` | Element or viewport dimensions. |
| `useDocumentTitle` | Set a title and restore the previous title on unmount. Pass `{ title, defaultTitle? }`. |
| `useImage`, `useImageCropper` | Image load state and crop interaction helpers. |
| `useIntersectionObserver` | Intersection ratios for an array of refs, preserving ref-array order. Defaults: `rootMargin: "200px"`, `threshold: [1]`. |
| `useMorph`, `useMouseWheel`, `useMutationObserver`, `useResizeObserver` | Visual transitions and DOM/wheel observation. |
| `useScrollbar`, `useScrollPhysics` | Scrollbar metrics/breakpoints and scroll physics behavior. |
| `useParallax` | Scroll offset multiplied by `speed`; uses a nearest `.--scroll-content` container when present, otherwise window scroll. |

### Device, commands, and time

| Hook | Use it for |
| --- | --- |
| `useDevice` | Responsive device classification, viewport dimensions, orientation, and `ready`. SSR gets a stable desktop-shaped fallback with `ready: false`. |
| `useNetworkStatus` | `boolean \| null` online state; it starts as `null` until browser status is read. |
| `useShortcuts` | Keyboard shortcut registration. `KeyCode` is exported for numeric key codes. |
| `useCommandActions` | Command/action registration and handlers. |
| `useNextInterval` | Controlled recurring scheduling. |
| `useTimer` | Animation-frame countdown. `duration` is in seconds; returns `progress`, `isPaused`, `isExpired`, `pause`, `resume`, and `reset`. |
| `useCalendar` | Calendar selection and date-grid helpers. |

### Local and session storage

`useLocalStorage` is object-based, not a React state tuple:

```tsx
const { value: theme, setValue, removeValue, clear, lastChange } =
  useLocalStorage<"light" | "dark">("theme", {
    defaultValue: "light",
    sync: true,
  });
```

`useSessionStorage` has the same API but defaults to `window.sessionStorage`.

Options for both include `defaultValue`, injected `storage`, `sync` (default `true`), `serializer`, `deserializer`, and `onChange`. Values are JSON serialized by default. With synchronization enabled, the hook listens to native cross-document storage events and package custom events for same-document instances. Unavailable storage and read/write/parse errors fall back safely to `defaultValue`.

`useLocalStore<T>(key, options?)` is the list-oriented companion:

```tsx
const { value, addValue, removeValue, toggleValue, setValues } =
  useLocalStore<string>("filters", { defaultValue: ["all"] });
```

It returns `value`, `setValues`, `addValue`, `removeValue`, `toggleValue`, `clear`, and `lastChange`. `unique` defaults to `true`.

`useCache<TMeta, TIndex>(options)` wraps the asynchronous browser Cache Storage API for binary assets, metadata, and indexes.

### IndexedDB

Use `useDatabase(options)` for a standalone database instance. Its options are:

```ts
{
  name: "app-db",
  version: 1,
  meta: [{
    name: "todos",
    config: { keyPath: "id", autoIncrement: false },
    schema: [{ name: "byDone", key: "done", unique: false }],
  }],
}
```

It exposes `getAll`, `getByID`, `getStore`, `insert`, `update`, `update_one`, `remove`, `subscribe`, `dbUnavailable`, and `error`. Mutations notify subscribers for the affected store.

For shared access, wrap the app with `DatabaseProvider` and consume the context:

```tsx
import { DatabaseProvider, useDB, useWatchDB } from "@zuzjs/hooks";

function Todos() {
  const db = useDB();
  const todos = useWatchDB<Todo>("todos");
  // todos.data, todos.first(), todos.last(), todos.length, todos.isEmpty
  return null;
}
```

`useDB()` throws outside `DatabaseProvider`; use `useDatabase(options)` directly when no provider is desired. `useDBHealed()` returns one-time self-healing metadata.

`DatabaseProvider` accepts `selfHeal`, which is disabled by default. When enabled after a missing-store corruption error, it can delete the named IndexedDB database and reload the page. Treat it as a deliberate data-destructive recovery option.

### Drag and drop

`useDrag`, `useDrop`, and `useSortable` use a **spec factory plus dependency array** and return `[collected, connectorRef]`.

```tsx
const [{ isDragging }, dragRef] = useDrag(() => ({
  channel: "CARD",
  payload: { id },
  observe: (probe) => ({ isDragging: probe.active() }),
}), [id]);

const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
  accepts: "CARD",
  canReceive: (item) => Boolean(item),
  onReceive: saveCard,
  observe: (probe) => ({ isOver: probe.hovering(), canDrop: probe.canReceive() }),
}), [saveCard]);
```

- Match a source `channel` to target `accepts`, including across sortable lists.
- Include all changing values used by the spec in its dependencies.
- Payload can be a value or lazy function.
- `dragDelay` requires a press-and-hold before the drag starts.
- Interactive descendants are excluded from initiating a drag.
- `useSortable` combines drag/drop behavior; update application state inside its movement/drop callbacks rather than trusting DOM order.

Public DnD types include `DragSpec`, `DragProbe`, `DragType`, `DropSpec`, `DropProbe`, `SortableSpec`, and `SortableState`.

### Realtime and workers

#### `useWebSocket`

```tsx
const { isConnected, messages, connect, disconnect, sendMessage } =
  useWebSocket("wss://example.com/socket", { autoConnect: true });
```

- HTTP(S) input becomes WS(S); a relative path resolves against the current browser origin.
- `autoConnect` and reconnect default to `true`.
- Reconnect delay doubles and caps at 60 seconds; normal close (`1000`) does not reconnect.
- `sendMessage` accepts a string or object; objects are JSON serialized.
- Incoming string data is JSON-parsed for `onMessage`; raw browser events go to `onRawMessage`.
- Sockets are shared by normalized URL. Multiple consumers of one URL therefore share underlying lifecycle/message behavior.

#### `useWebWorker`

```tsx
const { call, loading, progress, error } = useWebWorker<number[], number>(
  (values, api) => {
    api.progress(0.5);
    return values.reduce((sum, value) => sum + value, 0);
  },
  { poolSize: 2 },
);
```

The first argument can be a self-contained function, worker script path, or `URL`. The result exposes `call`, `result`, `error`, `status`, `loading`, `pending`, `progress`, `cancelAll`, `terminate`, `restart`, and `on`.

- Function workers are stringified and evaluated inside a worker, so they **cannot capture outer scope**.
- `call(input, options?)` supports transferables, `AbortSignal`, timeout, retries/backoff, timeout retry, and per-call progress.
- The worker API is `{ signal, progress, emit }`.
- Use `poolSize` with `least-busy` (default) or `round-robin` for concurrent calls.
- `terminate()` immediately stops in-flight work; `restart()` recreates workers.

### Media, animation, and integrations

- `useGradient(options?)` returns generated `gradient`/`style`, live values, `elementRef`, and playback controls. Use `directDOM: true` and attach `elementRef` to bypass React renders for decorative high-frequency animation. `webgl: true` requires direct-DOM mode and a target element; use `maxFPS` and `webglDprCap` to limit rendering cost.
- `useTimeline(options)` drives `scroll`, `manual`, or `auto` scenes. Each layer has a single `start`/`end` span or `keyframes`; use `effects[layerId]` for generated styles and `layers[layerId]` for progress. Layers can anchor ranges to other layer/keyframe edges.
- `useLineChart` provides line/SVG chart calculations.
- `useMediaPlayer` manages media state and controls; `MediaItem` is public.
- `useUploader` manages an upload queue, item status, and lifecycle.
- `useFileSystem` provides browser file-system interactions.
- `usePushNotifications` handles permission, token, and subscription state; use only with required secure-context/service-worker setup.
- `useFacebookPixel` and `useGoogleTagManager` integrate analytics. Apply consent policies and never send sensitive data.

## Adding or changing a hook

1. Create `src/useFeature.ts`; use `.tsx` only when JSX is necessary.
2. Follow the default-export convention: `export default useFeature`.
3. Export intended public option/return types from the hook module.
4. Re-export the hook and approved types from `src/index.ts`.
5. Preserve SSR guards and effect cleanup for browser APIs.
6. Avoid runtime dependencies unless browser APIs or existing dependencies cannot support the feature.
7. Update `README.md` examples whenever the public API changes.
8. Run `npx tsc --noEmit` and `npm run build`.

## Debugging checklist

| Symptom | Check first |
| --- | --- |
| SSR `window`/`document` error | Ensure client rendering and guard browser globals. |
| Stored value resets | Check storage access, serializer/deserializer compatibility, and `defaultValue`. |
| `useDB` throws | Wrap with `DatabaseProvider` or use `useDatabase(options)` directly. |
| Missing IndexedDB store | Check metadata/store names and schema versioning; enable `selfHeal` only after accepting deletion/reload behavior. |
| Drag does not begin/drop | Match `channel`/`accepts`, update factory dependencies, and ensure the target is not interactive. |
| Worker failure | Ensure function workers are self-contained and values are structured-cloneable or transferred; inspect `error` and `status`. |
| Socket does not send | Check `isConnected`, normalized URL, normal-close behavior, and other consumers sharing that URL. |
| Animation jank | Set `maxFPS`, use interpolation or direct DOM where appropriate, and simplify animated effects. |
| Observer misses updates | Keep refs/options stable and ensure the target exists before the observing effect runs. |

## Public types and helpers

Consult `src/index.ts` before relying on an export; it is authoritative. Besides hooks, the package exports `AnchorType`, `CropShape`, `KeyCode`, calendar formats, DnD types, IndexedDB types/constants, timeline types, gradient types, storage types, upload types, and worker options/results.
