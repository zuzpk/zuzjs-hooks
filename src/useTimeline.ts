import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRenderBatch, FrameData, ProcessFn, RenderBatch } from './frameloop';

export type TimelineMode = 'scroll' | 'manual' | 'auto';

type CssUnit = string;

type KeyframeValue = number | `${number}${CssUnit}`;
export type TimelineEasingName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
export type TimelineEasing = TimelineEasingName | string | ((t: number) => number);
export type TimelineSpanTrigger = 'timeline' | 'inView';
export type TimelineEntryTrigger = 'mount' | 'inView';

export interface TimelineEffect {
    property: string;
    from: KeyframeValue;
    to: KeyframeValue;
    easing?: TimelineEasing;
    unit?: CssUnit;
}

type TransformAxis = 'x' | 'y' | 'z';

export type TransformValueTuple = [from: KeyframeValue, to: KeyframeValue, easing?: TimelineEasing];

export type TransformValueEffect = {
    from: KeyframeValue;
    to: KeyframeValue;
    easing?: TimelineEasing;
} | TransformValueTuple;

export interface TransformSkewPair {
    x?: TransformValueEffect;
    y?: TransformValueEffect;
}

export type TransformSkewEffect = TransformValueEffect | TransformSkewPair;

export interface TimelineTransformEffects {
    // Shorthand aliases
    x?: TransformValueEffect;
    y?: TransformValueEffect;
    z?: TransformValueEffect;
    rx?: TransformValueEffect;
    ry?: TransformValueEffect;
    rz?: TransformValueEffect;
    sx?: TransformValueEffect;
    sy?: TransformValueEffect;
    sz?: TransformValueEffect;
    skx?: TransformValueEffect;
    sky?: TransformValueEffect;
    skew?: TransformSkewEffect;

    // Long-form transforms
    translateX?: TransformValueEffect;
    translateY?: TransformValueEffect;
    translateZ?: TransformValueEffect;
    translate3d?: {
        x: TransformValueEffect;
        y: TransformValueEffect;
        z: TransformValueEffect;
    };
    scale?: TransformValueEffect;
    scaleX?: TransformValueEffect;
    scaleY?: TransformValueEffect;
    scaleZ?: TransformValueEffect;
    scale3d?: {
        x: TransformValueEffect;
        y: TransformValueEffect;
        z: TransformValueEffect;
    };
    rotate?: TransformValueEffect;
    rotateX?: TransformValueEffect;
    rotateY?: TransformValueEffect;
    rotateZ?: TransformValueEffect;
    skewX?: TransformValueEffect;
    skewY?: TransformValueEffect;
    perspective?: TransformValueEffect;
}

export interface LayerSpan {
    start: number;
    end: number;
}

export type TimelineAnchorEdge = 'start' | 'end';

export interface TimelineAnchorRef {
    layerId: string;
    edge?: TimelineAnchorEdge;
    keyframeId?: string;
    keyframeIndex?: number;
    offset?: number;
}

export type TimelineAnchor = number | string | TimelineAnchorRef;

/**
 * A single keyframe span with its own start/end range and effects.
 * Use inside `keyframes: []` on a layer for multi-range animation.
 */
export interface TimelineKeyframe {
    /** Optional keyframe id, used by anchor refs like `hero#intro:start`. */
    id?: string;
    /** Span trigger mode. timeline = sticky chaining, inView = active only within range. */
    trigger?: TimelineSpanTrigger;
    start: TimelineAnchor; // 0..1 or anchor reference
    end: TimelineAnchor;   // 0..1 or anchor reference
    effects?: TimelineEffect[];
    transforms?: TimelineTransformEffects;
    [key: string]: unknown; // flat API: scale, opacity, x, y, etc.
}

export interface TimelineEntry {
    /** Optional id for diagnostics/debug readability. */
    id?: string;
    /** mount = one-time on mount, inView = reversible while layer range is in view. */
    trigger?: TimelineEntryTrigger;
    /** Animation duration in ms. Default: 700 */
    duration?: number;
    /** Delay before entry starts, in ms. Default: 0 */
    delay?: number;
    /** Easing for entry interpolation. Default: easeOut */
    easing?: TimelineEasing;
    effects?: TimelineEffect[];
    transforms?: TimelineTransformEffects;
    [key: string]: unknown; // flat API: scale, opacity, x, y, etc.
}

export interface TimelineLayer {
    id: string;
    /** Default trigger for this layer's spans/keyframes when omitted on each keyframe. */
    trigger?: TimelineSpanTrigger;
    /** Required when not using `keyframes`. */
    start?: TimelineAnchor; // 0..1 or anchor reference
    /** Required when not using `keyframes`. */
    end?: TimelineAnchor;   // 0..1 or anchor reference
    /** Multiple keyframe ranges for this layer — overrides start/end when provided. */
    keyframes?: TimelineKeyframe[];
    /** One-time mount animation for this layer. */
    entry?: TimelineEntry;
    effects?: TimelineEffect[];
    transforms?: TimelineTransformEffects;
    [key: string]: unknown;
}

export interface TimelineOptions {
    layers: TimelineLayer[];
    mode?: TimelineMode;
    duration?: number;     // Total ms for 'auto' mode
    sceneHeight?: number;  // Total px for 'scroll' mode (auto-computed when omitted)
    debug?: boolean;       // true = expose pixel/progress debug helpers and live scroll metrics
    debugOverlay?: boolean; // true = render built-in debug overlay mounted to document.body
    autoStart?: boolean;
    interpolate?: boolean; // true = lerp playhead to target, false = snap (default)
    lerpFactor?: number;   // smoothing factor 0.01–0.5 (default 0.1)
    maxFPS?: number;       // Max playhead state update rate (default 45)
}

export interface TimelineLayerState {
    progress: number;
    active: boolean;
    direction: 'asc' | 'desc';
    startProgress: number;
    endProgress: number;
    scrollPx: {
        start: number;
        end: number;
        span: number;
    };
    style: Record<string, string | number>;
}

export interface TimelineDebugLayerRange {
    start: number;
    end: number;
    span: number;
}

export interface TimelinePerfMetrics {
    batchDeltaMs: number;
    longFrames: number;
    scrollEvents: number;
    scrollFlushes: number;
    scrollSkips: number;
    playheadCommits: number;
    commitSkips: number;
    layerCalcMs: number;
    reusedLayers: number;
    recomputedLayers: number;
}

export interface TimelineDebugInfo<Id extends string = string> {
    enabled: boolean;
    mode: TimelineMode;
    sceneHeight: number;
    viewportHeight: number;
    scrollTop: number;
    scrollProgress: number;
    layerRangesPx: Record<Id, TimelineDebugLayerRange>;
    suggestions: string[];
    pxToProgress: (px: number) => number;
    progressToPx: (progress: number) => number;
    perf: TimelinePerfMetrics;
}

interface NormalizedTimelineSpan {
    trigger: TimelineSpanTrigger;
    start: number;
    end: number;
    effects: TimelineEffect[];
    transforms: Partial<TimelineTransformEffects>;
    styleEffects: Record<string, TransformValueEffect>;
    debugMeta?: {
        startAnchor: TimelineAnchor;
        endAnchor: TimelineAnchor;
        keyframeId?: string;
        keyframeIndex: number;
        anchored: boolean;
        adjustedFromNearZero: boolean;
    };
}

interface NormalizedTimelineEntry {
    id?: string;
    trigger: TimelineEntryTrigger;
    duration: number;
    delay: number;
    easing: TimelineEasing;
    effects: TimelineEffect[];
    transforms: Partial<TimelineTransformEffects>;
    styleEffects: Record<string, TransformValueEffect>;
}

interface PendingTimelineSpan {
    trigger: TimelineSpanTrigger;
    startAnchor: TimelineAnchor;
    endAnchor: TimelineAnchor;
    keyframeId?: string;
    keyframeIndex: number;
    effects: TimelineEffect[];
    transforms: Partial<TimelineTransformEffects>;
    styleEffects: Record<string, TransformValueEffect>;
}

interface NormalizedTimelineLayer {
    id: string;
    spans: NormalizedTimelineSpan[];
    entry?: NormalizedTimelineEntry;
}

interface PendingTimelineLayer {
    id: string;
    spans: PendingTimelineSpan[];
    entry?: NormalizedTimelineEntry;
}

interface ResolvedSpanRange {
    start: number;
    end: number;
    adjustedFromNearZero: boolean;
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const clampFps = (n: number) => Math.min(Math.max(n, 1), 120);
const PLAYHEAD_EPSILON = 0.001;
const MIN_ANCHORED_SPAN = 0.002;
const DEFAULT_TIMELINE_EASING: TimelineEasingName = 'easeOut';
const METRIC_PRECISION = 10000;

const roundMetric = (value: number) => Math.round(value * METRIC_PRECISION) / METRIC_PRECISION;

const normalizeTimingMs = (value: number | undefined, fallbackMs: number) => {
    if (value === undefined || !Number.isFinite(value)) return fallbackMs;

    const safe = Math.max(value, 0);
    // UX convenience: decimal timings (e.g. 0.5) are usually authored as seconds.
    // Keep integer values as milliseconds for backwards compatibility.
    if (!Number.isInteger(safe) && safe > 0) {
        return safe * 1000;
    }

    return safe;
};

const formatAnchorForDebug = (anchor: TimelineAnchor) => {
    if (typeof anchor === 'number') return String(anchor);
    if (typeof anchor === 'string') return anchor;

    const base = anchor.keyframeId
        ? `${anchor.layerId}#${anchor.keyframeId}`
        : (anchor.keyframeIndex !== undefined ? `${anchor.layerId}@${anchor.keyframeIndex}` : anchor.layerId);
    const edge = anchor.edge ?? 'end';
    const offset = anchor.offset ?? 0;
    const offsetSuffix = offset === 0 ? '' : (offset > 0 ? `+${offset}` : `${offset}`);

    return `${base}:${edge}${offsetSuffix}`;
};

const EASING_PRESETS: Record<TimelineEasingName, (t: number) => number> = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

const CSS_EASING_ALIASES: Record<string, TimelineEasingName> = {
    linear: 'linear',
    'ease-in': 'easeIn',
    'ease-out': 'easeOut',
    'ease-in-out': 'easeInOut',
};

const easingFnCache = new Map<string, (t: number) => number>();
const parsedKeyframeCache = new Map<string, { value: number; unit: CssUnit }>();

const normalizeEasingToken = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    if (!trimmed.startsWith('$')) return trimmed;
    const name = trimmed.slice(1).trim();
    return name ? `var(--${name})` : trimmed;
};

const resolveCssVarValue = (token: string) => {
    const match = /^var\(\s*(--[A-Za-z0-9_-]+)(?:\s*,\s*([^\)]+))?\s*\)$/.exec(token);
    if (!match) return undefined;
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const varName = match[1];
    const fallback = match[2]?.trim();

    const rootValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (rootValue) return rootValue;

    const bodyValue = document.body
        ? getComputedStyle(document.body).getPropertyValue(varName).trim()
        : '';
    if (bodyValue) return bodyValue;

    return fallback || undefined;
};

const createCubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
    const ax = 3 * x1 - 3 * x2 + 1;
    const bx = -6 * x1 + 3 * x2;
    const cx = 3 * x1;
    const ay = 3 * y1 - 3 * y2 + 1;
    const by = -6 * y1 + 3 * y2;
    const cy = 3 * y1;

    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const sampleSlopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

    const solveCurveX = (x: number) => {
        let t = x;

        for (let i = 0; i < 8; i += 1) {
            const xEstimate = sampleX(t) - x;
            const slope = sampleSlopeX(t);
            if (Math.abs(xEstimate) < 1e-7) return t;
            if (Math.abs(slope) < 1e-7) break;
            t -= xEstimate / slope;
        }

        let t0 = 0;
        let t1 = 1;
        t = x;

        for (let i = 0; i < 24; i += 1) {
            const xEstimate = sampleX(t);
            if (Math.abs(xEstimate - x) < 1e-7) return t;
            if (x > xEstimate) {
                t0 = t;
            } else {
                t1 = t;
            }
            t = (t0 + t1) / 2;
        }

        return t;
    };

    return (progress: number) => {
        const x = clamp01(progress);
        // Preserve bezier overshoot/undershoot (spring-like curves with y < 0 or y > 1).
        // We only clamp the input progress domain; output remains raw bezier Y.
        return sampleY(solveCurveX(x));
    };
};

const parseCssBezierEasing = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === 'ease') {
        return createCubicBezier(0.25, 0.1, 0.25, 1);
    }

    const bezierMatch = /^cubic-bezier\(\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\)$/i.exec(trimmed);
    if (!bezierMatch) return undefined;

    const x1 = Number(bezierMatch[1]);
    const y1 = Number(bezierMatch[2]);
    const x2 = Number(bezierMatch[3]);
    const y2 = Number(bezierMatch[4]);

    if (![x1, y1, x2, y2].every(Number.isFinite)) return undefined;
    return createCubicBezier(x1, y1, x2, y2);
};

const parseKeyframeValue = (value: KeyframeValue): { value: number; unit: CssUnit } => {
    if (typeof value === 'number') {
        return { value, unit: '' };
    }

    const cached = parsedKeyframeCache.get(value);
    if (cached) return cached;

    const match = /^(-?\d*\.?\d+)([a-z%]*)$/i.exec(value.trim());
    const result = !match
        ? { value: 0, unit: '' }
        : { value: Number(match[1]), unit: match[2] ?? '' };

    parsedKeyframeCache.set(value, result);
    return result;
};

const isCssVarToken = (token: string) => token.startsWith('var(--');

const resolveEasing = (easing?: TimelineEasing): ((t: number) => number) => {
    if (!easing) return EASING_PRESETS[DEFAULT_TIMELINE_EASING];
    if (typeof easing === 'function') return easing;

    // 1. Check raw string against presets/aliases BEFORE token normalization, so
    //    names like "easeOut" work directly without going through the $ → var() path.
    const raw = (easing as string).trim();
    const rawPreset = EASING_PRESETS[raw as TimelineEasingName];
    if (rawPreset) return rawPreset;
    const rawAlias = CSS_EASING_ALIASES[raw.toLowerCase()];
    if (rawAlias) return EASING_PRESETS[rawAlias];

    // 2. Normalize $name → var(--name)
    const token = normalizeEasingToken(raw);

    // 3. Stable cache — only non-CSS-var tokens are cached permanently.
    //    CSS var tokens are NOT cached here because the var value may be unavailable
    //    on first render (SSR, async stylesheets) and would poison the cache as linear.
    if (!isCssVarToken(token)) {
        const cached = easingFnCache.get(token);
        if (cached) return cached;
    }

    // 4. Preset / alias again on the normalized token (handles $linear → var(--linear)
    //    edge case gracefully by still checking after normalization).
    const tokenPreset = EASING_PRESETS[token as TimelineEasingName];
    if (tokenPreset) {
        easingFnCache.set(token, tokenPreset);
        return tokenPreset;
    }
    const tokenAlias = CSS_EASING_ALIASES[token.toLowerCase()];
    if (tokenAlias) {
        const fn = EASING_PRESETS[tokenAlias];
        easingFnCache.set(token, fn);
        return fn;
    }

    // 5. Direct cubic-bezier string (no variable lookup needed)
    const bezierDirect = parseCssBezierEasing(token);
    if (bezierDirect) {
        easingFnCache.set(token, bezierDirect);
        return bezierDirect;
    }

    // 6. CSS var resolution — read fresh every call so late-loading stylesheets work.
    //    Cache the result only if the var resolved to a non-empty value.
    if (isCssVarToken(token)) {
        const fromCssVar = resolveCssVarValue(token);
        if (fromCssVar) {
            const resolvedFromVar: (t: number) => number = resolveEasing(fromCssVar);
            // Cache only now that we have a real value
            easingFnCache.set(token, resolvedFromVar);
            return resolvedFromVar;
        }
        // CSS var not resolved yet — return default without caching so next call retries
        return EASING_PRESETS[DEFAULT_TIMELINE_EASING];
    }

    // 7. Unknown string — cache as linear so we don't spam warnings
    easingFnCache.set(token, EASING_PRESETS.linear);
    return EASING_PRESETS.linear;
};

const normalizeTransformValueEffect = (effect: TransformValueEffect) => {
    if (Array.isArray(effect)) {
        return {
            from: effect[0],
            to: effect[1],
            easing: effect[2]
        };
    }

    return effect;
};

const interpolateEffect = (effect: TimelineEffect, progress: number, fallbackEasing?: TimelineEasing): string | number => {
    const from = parseKeyframeValue(effect.from);
    const to = parseKeyframeValue(effect.to);
    const eased = resolveEasing(effect.easing ?? fallbackEasing)(progress);
    const value = from.value + (to.value - from.value) * eased;
    const unit = effect.unit ?? (to.unit || from.unit);

    if (!unit) return value;
    return `${value}${unit}`;
};

const interpolateTransformValue = (
    effect: TransformValueEffect,
    progress: number,
    defaultUnit = '',
    fallbackEasing?: TimelineEasing,
): string | number => {
    const normalized = normalizeTransformValueEffect(effect);
    const from = parseKeyframeValue(normalized.from);
    const to = parseKeyframeValue(normalized.to);
    const eased = resolveEasing(normalized.easing ?? fallbackEasing)(progress);
    const value = from.value + (to.value - from.value) * eased;
    const unit = to.unit || from.unit || defaultUnit;

    if (!unit) return value;
    return `${value}${unit}`;
};

const axisUnit = (axis: TransformAxis) => axis === 'z' ? 'px' : 'px';

const isTransformValueEffect = (value: unknown): value is TransformValueEffect => {
    if (Array.isArray(value)) {
        return value.length >= 2 && value.length <= 3;
    }

    if (!value || typeof value !== 'object') return false;
    const maybe = value as Record<string, unknown>;
    return (typeof maybe.from === 'number' || typeof maybe.from === 'string') && (typeof maybe.to === 'number' || typeof maybe.to === 'string');
};

const isTransformSkewPair = (value: unknown): value is TransformSkewPair => {
    if (!value || typeof value !== 'object') return false;
    if (isTransformValueEffect(value)) return false;
    const maybe = value as Record<string, unknown>;
    const xOk = maybe.x === undefined || isTransformValueEffect(maybe.x);
    const yOk = maybe.y === undefined || isTransformValueEffect(maybe.y);
    return xOk && yOk;
};

const isTransformValueGroup = (value: unknown): value is { x: TransformValueEffect; y: TransformValueEffect; z: TransformValueEffect } => {
    if (!value || typeof value !== 'object') return false;
    const maybe = value as Record<string, unknown>;
    return isTransformValueEffect(maybe.x) && isTransformValueEffect(maybe.y) && isTransformValueEffect(maybe.z);
};

const TIMELINE_RESERVED_KEYS = new Set([
    'id',
    'trigger',
    'start',
    'end',
    'effects',
    'transforms',
    'keyframes',
    'entry',
]);

const TRANSFORM_KEYS = new Set<keyof TimelineTransformEffects>([
    'x',
    'y',
    'z',
    'rx',
    'ry',
    'rz',
    'sx',
    'sy',
    'sz',
    'skx',
    'sky',
    'skew',
    'translateX',
    'translateY',
    'translateZ',
    'translate3d',
    'scale',
    'scaleX',
    'scaleY',
    'scaleZ',
    'scale3d',
    'rotate',
    'rotateX',
    'rotateY',
    'rotateZ',
    'skewX',
    'skewY',
    'perspective'
]);

type LayerLike = { effects?: TimelineEffect[]; transforms?: TimelineTransformEffects; [key: string]: unknown };

type AnchorRefSource = Exclude<TimelineAnchor, number>;

const parseTimelineAnchor = (anchor: AnchorRefSource): TimelineAnchorRef | null => {
    if (typeof anchor === 'object' && anchor) {
        if (!anchor.layerId) return null;
        return {
            layerId: anchor.layerId,
            edge: anchor.edge ?? 'end',
            keyframeId: anchor.keyframeId,
            keyframeIndex: anchor.keyframeIndex,
            offset: Number.isFinite(anchor.offset) ? anchor.offset : undefined,
        };
    }

    const trimmed = String(anchor).trim();
    if (!trimmed) return null;

    let edge: TimelineAnchorEdge = 'end';
    let body = trimmed;
    let offset: number | undefined;

    const edgeOffsetMatch = /:(start|end)([+-]\d*\.?\d+)?\s*$/.exec(trimmed);
    if (edgeOffsetMatch) {
        edge = edgeOffsetMatch[1] as TimelineAnchorEdge;
        const rawOffset = edgeOffsetMatch[2];
        if (rawOffset !== undefined) {
            const parsedOffset = Number(rawOffset);
            if (Number.isFinite(parsedOffset)) {
                offset = parsedOffset;
            }
        }
        body = trimmed.slice(0, edgeOffsetMatch.index).trim();
    } else if (trimmed.endsWith(':start')) {
        edge = 'start';
        body = trimmed.slice(0, -':start'.length);
    } else if (trimmed.endsWith(':end')) {
        edge = 'end';
        body = trimmed.slice(0, -':end'.length);
    }

    if (!body) return null;

    const hashIndex = body.lastIndexOf('#');
    const atIndex = body.lastIndexOf('@');

    if (hashIndex > 0) {
        const layerId = body.slice(0, hashIndex).trim();
        const keyframeId = body.slice(hashIndex + 1).trim();
        if (!layerId || !keyframeId) return null;
        return { layerId, keyframeId, edge, offset };
    }

    if (atIndex > 0) {
        const layerId = body.slice(0, atIndex).trim();
        const rawIndex = body.slice(atIndex + 1).trim();
        const keyframeIndex = Number(rawIndex);
        if (!layerId || !Number.isInteger(keyframeIndex) || keyframeIndex < 0) return null;
        return { layerId, keyframeIndex, edge, offset };
    }

    return { layerId: body, edge, offset };
};

const getDirectLayerEffects = (layer: LayerLike) => {
    const styleEffects: Record<string, TransformValueEffect> = {};
    const transformEffects: Partial<TimelineTransformEffects> = {};

    Object.entries(layer).forEach(([key, value]) => {
        if (TIMELINE_RESERVED_KEYS.has(key)) return;

        if (TRANSFORM_KEYS.has(key as keyof TimelineTransformEffects)) {
            if (
                isTransformValueEffect(value) ||
                isTransformSkewPair(value) ||
                isTransformValueGroup(value)
            ) {
                transformEffects[key as keyof TimelineTransformEffects] = value as never;
            }
            return;
        }

        if (isTransformValueEffect(value)) {
            styleEffects[key] = value;
        }
    });

    return { styleEffects, transformEffects };
};

const normalizeSpan = (
    kf: LayerLike & { start: TimelineAnchor; end: TimelineAnchor; id?: string; trigger?: TimelineSpanTrigger },
    keyframeIndex: number,
    defaultTrigger: TimelineSpanTrigger,
): PendingTimelineSpan => {
    const { styleEffects, transformEffects } = getDirectLayerEffects(kf);
    return {
        trigger: kf.trigger ?? defaultTrigger,
        startAnchor: kf.start,
        endAnchor: kf.end,
        keyframeId: typeof kf.id === 'string' && kf.id.trim() ? kf.id : undefined,
        keyframeIndex,
        effects: kf.effects ?? [],
        transforms: { ...(kf.transforms ?? {}), ...transformEffects },
        styleEffects,
    };
};

const normalizeEntry = (entry: TimelineEntry): NormalizedTimelineEntry => {
    const cleaned: LayerLike = { ...entry };
    delete cleaned.id;
    delete cleaned.trigger;
    delete cleaned.duration;
    delete cleaned.delay;
    delete cleaned.easing;

    const { styleEffects, transformEffects } = getDirectLayerEffects(cleaned);

    return {
        id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : undefined,
        trigger: entry.trigger ?? 'mount',
        duration: Math.max(normalizeTimingMs(entry.duration, 700), 16),
        delay: normalizeTimingMs(entry.delay, 0),
        easing: entry.easing ?? 'easeOut',
        effects: entry.effects ?? [],
        transforms: { ...(entry.transforms ?? {}), ...transformEffects },
        styleEffects,
    };
};

const normalizeTimelineLayer = (layer: TimelineLayer): PendingTimelineLayer => {
    const spanTrigger = layer.trigger ?? 'timeline';

    if (layer.keyframes && layer.keyframes.length > 0) {
        return {
            id: layer.id,
            spans: layer.keyframes.map((keyframe, index) => normalizeSpan(keyframe, index, spanTrigger)),
            entry: layer.entry ? normalizeEntry(layer.entry) : undefined,
        };
    }

    return {
        id: layer.id,
        spans: [normalizeSpan({ ...layer, start: layer.start ?? 0, end: layer.end ?? 1 }, 0, spanTrigger)],
        entry: layer.entry ? normalizeEntry(layer.entry) : undefined,
    };
};

const resolveTimelineLayers = (layers: PendingTimelineLayer[]): NormalizedTimelineLayer[] => {
    const layerById = new Map(layers.map((layer) => [layer.id, layer]));
    const spanCache = new Map<string, ResolvedSpanRange>();
    const boundsCache = new Map<string, LayerSpan>();
    const resolvingSpans = new Set<string>();
    const resolvingBounds = new Set<string>();

    const fallbackEdgeValue = (edge: TimelineAnchorEdge) => edge === 'start' ? 0 : 1;

    const resolveAnchor = (anchor: TimelineAnchor, fallbackEdge: TimelineAnchorEdge): number => {
        if (typeof anchor === 'number') return clamp01(anchor);

        const parsed = parseTimelineAnchor(anchor);
        if (!parsed) return fallbackEdgeValue(fallbackEdge);

        const targetLayer = layerById.get(parsed.layerId);
        if (!targetLayer) return fallbackEdgeValue(parsed.edge ?? fallbackEdge);

        const targetEdge = parsed.edge ?? fallbackEdge;

        if (parsed.keyframeId || parsed.keyframeIndex !== undefined) {
            let targetIndex = -1;

            if (parsed.keyframeId) {
                targetIndex = targetLayer.spans.findIndex((span) => span.keyframeId === parsed.keyframeId);
            } else if (typeof parsed.keyframeIndex === 'number') {
                targetIndex = parsed.keyframeIndex;
            }

            if (targetIndex < 0 || targetIndex >= targetLayer.spans.length) {
                return fallbackEdgeValue(targetEdge);
            }

            const targetSpan = resolveSpanRange(parsed.layerId, targetIndex);
            const base = targetEdge === 'start' ? targetSpan.start : targetSpan.end;
            return clamp01(base + (parsed.offset ?? 0));
        }

        const layerBounds = resolveLayerBounds(parsed.layerId);
        const base = targetEdge === 'start' ? layerBounds.start : layerBounds.end;
        return clamp01(base + (parsed.offset ?? 0));
    };

    const resolveSpanRange = (layerId: string, spanIndex: number): ResolvedSpanRange => {
        const key = `${layerId}:${spanIndex}`;
        const cached = spanCache.get(key);
        if (cached) return cached;

        if (resolvingSpans.has(key)) {
            return { start: 0, end: 1, adjustedFromNearZero: false };
        }

        const layer = layerById.get(layerId);
        if (!layer) return { start: 0, end: 1, adjustedFromNearZero: false };

        const span = layer.spans[spanIndex];
        if (!span) return { start: 0, end: 1, adjustedFromNearZero: false };

        resolvingSpans.add(key);
        const isAnchored = typeof span.startAnchor !== 'number' || typeof span.endAnchor !== 'number';
        let start = resolveAnchor(span.startAnchor, 'start');
        let end = resolveAnchor(span.endAnchor, 'end');
        let adjustedFromNearZero = false;

        // Anchor-linked spans can easily collapse to a single point (e.g. start: "hero", end: 0.5)
        // which causes snap/flicker. Guarantee a tiny range so interpolation has room to work.
        if (isAnchored && Math.abs(end - start) < MIN_ANCHORED_SPAN) {
            adjustedFromNearZero = true;
            if (end >= start) {
                end = clamp01(start + MIN_ANCHORED_SPAN);
                if (Math.abs(end - start) < MIN_ANCHORED_SPAN) {
                    start = clamp01(end - MIN_ANCHORED_SPAN);
                }
            } else {
                end = clamp01(start - MIN_ANCHORED_SPAN);
                if (Math.abs(end - start) < MIN_ANCHORED_SPAN) {
                    start = clamp01(end + MIN_ANCHORED_SPAN);
                }
            }
        }

        const resolved: ResolvedSpanRange = { start, end, adjustedFromNearZero };
        resolvingSpans.delete(key);

        spanCache.set(key, resolved);
        return resolved;
    };

    const resolveLayerBounds = (layerId: string): LayerSpan => {
        const cached = boundsCache.get(layerId);
        if (cached) return cached;

        if (resolvingBounds.has(layerId)) {
            return { start: 0, end: 1 };
        }

        const layer = layerById.get(layerId);
        if (!layer) return { start: 0, end: 1 };

        resolvingBounds.add(layerId);
        const resolvedSpans = layer.spans.map((_span, index) => resolveSpanRange(layerId, index));
        resolvingBounds.delete(layerId);

        const entries = resolvedSpans.map((span) => Math.min(span.start, span.end));
        const exits = resolvedSpans.map((span) => Math.max(span.start, span.end));

        const bounds = {
            start: Math.min(...entries),
            end: Math.max(...exits),
        };

        boundsCache.set(layerId, bounds);
        return bounds;
    };

    return layers.map((layer) => ({
        id: layer.id,
        entry: layer.entry,
        spans: layer.spans.map((span, index) => {
            const resolved = resolveSpanRange(layer.id, index);
            return {
                trigger: span.trigger,
                start: resolved.start,
                end: resolved.end,
                effects: span.effects,
                transforms: span.transforms,
                styleEffects: span.styleEffects,
                debugMeta: {
                    startAnchor: span.startAnchor,
                    endAnchor: span.endAnchor,
                    keyframeId: span.keyframeId,
                    keyframeIndex: span.keyframeIndex,
                    anchored: typeof span.startAnchor !== 'number' || typeof span.endAnchor !== 'number',
                    adjustedFromNearZero: resolved.adjustedFromNearZero,
                },
            };
        }).sort((a, b) => Math.min(a.start, a.end) - Math.min(b.start, b.end)),
    }));
};

const composeTransform = (
    transforms: TimelineTransformEffects | undefined,
    progress: number,
    fallbackEasing?: TimelineEasing,
) => {
    if (!transforms) return '';

    const segments: string[] = [];

    const translateX = transforms.translateX ?? transforms.x;
    const translateY = transforms.translateY ?? transforms.y;
    const translateZ = transforms.translateZ ?? transforms.z;
    const scaleX = transforms.scaleX ?? transforms.sx;
    const scaleY = transforms.scaleY ?? transforms.sy;
    const scaleZ = transforms.scaleZ ?? transforms.sz;
    const rotateX = transforms.rotateX ?? transforms.rx;
    const rotateY = transforms.rotateY ?? transforms.ry;
    const rotateZ = transforms.rotateZ ?? transforms.rz;

    const skewShorthand = transforms.skew;
    const skewX = transforms.skewX ?? transforms.skx ?? (isTransformSkewPair(skewShorthand) ? skewShorthand.x : undefined);
    const skewY = transforms.skewY ?? transforms.sky ?? (isTransformSkewPair(skewShorthand) ? skewShorthand.y : undefined);

    if (transforms.perspective) {
        segments.push(`perspective(${interpolateTransformValue(transforms.perspective, progress, 'px', fallbackEasing)})`);
    }

    if (transforms.translate3d) {
        const tx = interpolateTransformValue(transforms.translate3d.x, progress, axisUnit('x'), fallbackEasing);
        const ty = interpolateTransformValue(transforms.translate3d.y, progress, axisUnit('y'), fallbackEasing);
        const tz = interpolateTransformValue(transforms.translate3d.z, progress, axisUnit('z'), fallbackEasing);
        segments.push(`translate3d(${tx}, ${ty}, ${tz})`);
    } else {
        if (translateX) {
            segments.push(`translateX(${interpolateTransformValue(translateX, progress, axisUnit('x'), fallbackEasing)})`);
        }
        if (translateY) {
            segments.push(`translateY(${interpolateTransformValue(translateY, progress, axisUnit('y'), fallbackEasing)})`);
        }
        if (translateZ) {
            segments.push(`translateZ(${interpolateTransformValue(translateZ, progress, axisUnit('z'), fallbackEasing)})`);
        }
    }

    if (transforms.scale3d) {
        const sx = interpolateTransformValue(transforms.scale3d.x, progress, '', fallbackEasing);
        const sy = interpolateTransformValue(transforms.scale3d.y, progress, '', fallbackEasing);
        const sz = interpolateTransformValue(transforms.scale3d.z, progress, '', fallbackEasing);
        segments.push(`scale3d(${sx}, ${sy}, ${sz})`);
    } else {
        if (transforms.scale) {
            segments.push(`scale(${interpolateTransformValue(transforms.scale, progress, '', fallbackEasing)})`);
        }
        if (scaleX) {
            segments.push(`scaleX(${interpolateTransformValue(scaleX, progress, '', fallbackEasing)})`);
        }
        if (scaleY) {
            segments.push(`scaleY(${interpolateTransformValue(scaleY, progress, '', fallbackEasing)})`);
        }
        if (scaleZ) {
            segments.push(`scaleZ(${interpolateTransformValue(scaleZ, progress, '', fallbackEasing)})`);
        }
    }

    if (transforms.rotate) {
        segments.push(`rotate(${interpolateTransformValue(transforms.rotate, progress, 'deg', fallbackEasing)})`);
    }
    if (rotateX) {
        segments.push(`rotateX(${interpolateTransformValue(rotateX, progress, 'deg', fallbackEasing)})`);
    }
    if (rotateY) {
        segments.push(`rotateY(${interpolateTransformValue(rotateY, progress, 'deg', fallbackEasing)})`);
    }
    if (rotateZ) {
        segments.push(`rotateZ(${interpolateTransformValue(rotateZ, progress, 'deg', fallbackEasing)})`);
    }

    if (isTransformValueEffect(skewShorthand)) {
        segments.push(`skew(${interpolateTransformValue(skewShorthand, progress, 'deg', fallbackEasing)})`);
    }

    if (skewX) {
        segments.push(`skewX(${interpolateTransformValue(skewX, progress, 'deg', fallbackEasing)})`);
    }
    if (skewY) {
        segments.push(`skewY(${interpolateTransformValue(skewY, progress, 'deg', fallbackEasing)})`);
    }

    return segments.join(' ');
};

const getLayerProgress = (playhead: number, span: LayerSpan) => {
    const start = clamp01(span.start);
    const end = clamp01(span.end);
    const distance = end - start;

    if (Math.abs(distance) < 1e-6) {
        return playhead >= end ? 1 : 0;
    }

    return clamp01((playhead - start) / distance);
};

const getScrollContainer = (el: HTMLElement | null) => {
    return el?.closest('.--scroll-content') as HTMLElement | null;
};

export interface UseTimelineReturn<Id extends string = string> {
    containerRef: React.RefObject<HTMLDivElement | null>;
    playhead: number;
    /** Per-layer progress values (0–1) keyed by layer id. */
    layers: Record<Id, number>;
    /** Full layer state (progress, active, style, scrollPx, …) keyed by layer id. */
    layerStates: Record<Id, TimelineLayerState>;
    /** Computed CSS style object for each layer, keyed by layer id. */
    effects: Record<Id, Record<string, string | number>>;
    getLayerScrollRange: (layerId: Id) => { start: number; end: number; span: number } | null;
    controls: {
        play: () => void;
        pause: () => void;
        seek: (progress: number) => void;
        next: () => void;
        prev: () => void;
        isPlaying: boolean;
    };
    debug: TimelineDebugInfo<Id>;
}

const useTimeline = <Id extends string = string>({ 
    layers, 
    mode = 'manual', 
    duration = 3000, 
    sceneHeight,
    debug = false,
    debugOverlay = true,
    autoStart = false,
    interpolate = false,
    lerpFactor: lerpFactorOption = 0.1,
    maxFPS = 45,
}: Omit<TimelineOptions, 'layers'> & { layers: Array<TimelineLayer & { id: Id }> }): UseTimelineReturn<Id> => {
    const [playhead, setPlayhead] = useState(0); // 0 to 1
    const [isPlaying, setIsPlaying] = useState(autoStart);
    const containerRef = useRef<HTMLDivElement>(null);
    const batchRef = useRef<RenderBatch | null>(null);
    const pendingPlayheadRef = useRef<number | null>(null);
    const scrollUpdateScheduledRef = useRef(false);
    const layerStateCacheRef = useRef<Record<string, { key: string; state: TimelineLayerState }>>({});
    const lastFrameTimestampRef = useRef(0);
    const perfMetricsRef = useRef<TimelinePerfMetrics>({
        batchDeltaMs: 0,
        longFrames: 0,
        scrollEvents: 0,
        scrollFlushes: 0,
        scrollSkips: 0,
        playheadCommits: 0,
        commitSkips: 0,
        layerCalcMs: 0,
        reusedLayers: 0,
        recomputedLayers: 0,
    });
    const playheadRef = useRef(0);
    const sceneHeightRef = useRef(sceneHeight && sceneHeight > 0 ? sceneHeight : 2000);
    const [resolvedSceneHeight, setResolvedSceneHeight] = useState(sceneHeightRef.current);
    const [debugScrollTop, setDebugScrollTop] = useState(0);
    const [debugViewportHeight, setDebugViewportHeight] = useState(0);
    const debugOverlayRef = useRef<HTMLDivElement | null>(null);
    const lastCommitAtRef = useRef(0);
    const frameIntervalRef = useRef(1000 / clampFps(maxFPS));
    const entryStartedAtRef = useRef<number | null>(null);
    const [entryNow, setEntryNow] = useState(0);
    const prevPlayheadRef = useRef(0);
    const prevEntryNowRef = useRef(0);
    const autoPlayStartTimeRef = useRef<number | null>(null);
    const lerpLoopRef = useRef<ProcessFn | null>(null);

    // Lerp-mode refs — updated every render so RAF loop always reads latest values
    const lerpTargetRef = useRef(0);
    const lerpFactorRef = useRef(Math.min(Math.max(lerpFactorOption, 0.01), 0.5));
    const interpolateRef = useRef(interpolate);
    const isPlayingRef = useRef(autoStart);
    const modeRef = useRef(mode);
    const durationRef = useRef(duration);
    lerpFactorRef.current = Math.min(Math.max(lerpFactorOption, 0.01), 0.5);
    interpolateRef.current = interpolate;
    frameIntervalRef.current = 1000 / clampFps(maxFPS);
    isPlayingRef.current = isPlaying;
    modeRef.current = mode;
    durationRef.current = duration;

    const sampleFrame = useCallback((frameData: FrameData) => {
        if (lastFrameTimestampRef.current === frameData.timestamp) return;

        lastFrameTimestampRef.current = frameData.timestamp;
        perfMetricsRef.current.batchDeltaMs = frameData.delta;
        if (frameData.delta > 18) {
            perfMetricsRef.current.longFrames += 1;
        }
    }, []);

    useEffect(() => {
        if (!batchRef.current) {
            batchRef.current = createRenderBatch();
        }
        return () => {
            // Batcher cleanup on unmount
            batchRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (sceneHeight && sceneHeight > 0) {
            sceneHeightRef.current = sceneHeight;
            setResolvedSceneHeight(sceneHeight);
        }
    }, [sceneHeight]);

    const normalizedLayers = useMemo(() => {
        const pendingLayers = layers.map(normalizeTimelineLayer);
        return resolveTimelineLayers(pendingLayers);
    }, [layers]);

    const maxEntryDuration = useMemo(() => {
        return normalizedLayers.reduce((max, layer) => {
            if (!layer.entry || layer.entry.trigger !== 'mount') return max;
            return Math.max(max, layer.entry.delay + layer.entry.duration);
        }, 0);
    }, [normalizedLayers]);

    // Phase 2: Entry Ticker via Batcher (coalesces with scroll + lerp + autoplay)
    useEffect(() => {
        if (maxEntryDuration <= 0) {
            entryStartedAtRef.current = null;
            setEntryNow(0);
            return;
        }

        if (!batchRef.current) return;

        const startedAt = performance.now();
        entryStartedAtRef.current = startedAt;
        prevEntryNowRef.current = startedAt;
        setEntryNow(startedAt);
        let entryUpdateFn: ProcessFn | null = null;

        // Schedule entry update via batcher preUpdate step — fires before animations interpolate
        entryUpdateFn = (frameData: FrameData) => {
            if (!entryUpdateFn) return; // Already cancelled

            sampleFrame(frameData);

            const now = frameData.timestamp;
            const elapsed = now - startedAt;

            // Throttle updates to maxFPS
            if (now - prevEntryNowRef.current >= frameIntervalRef.current) {
                prevEntryNowRef.current = now;
                setEntryNow(now);
            }

            if (elapsed >= maxEntryDuration) {
                const fn = entryUpdateFn;
                entryUpdateFn = null;
                setEntryNow(startedAt + maxEntryDuration);
                if (batchRef.current && fn) {
                    batchRef.current.cancel(fn);
                }
            }
        };

        batchRef.current.schedule('preUpdate', entryUpdateFn, true);

        return () => {
            entryStartedAtRef.current = null;
            if (batchRef.current && entryUpdateFn) {
                batchRef.current.cancel(entryUpdateFn);
            }
            entryUpdateFn = null;
        };
    }, [maxEntryDuration]);

    useEffect(() => {
        playheadRef.current = playhead;
    }, [playhead]);

    const commitPlayhead = useCallback((next: number, force = false) => {
        const normalized = clamp01(next);
        const delta = Math.abs(normalized - playheadRef.current);
        if (delta < PLAYHEAD_EPSILON) {
            perfMetricsRef.current.commitSkips += 1;
            return;
        }

        if (!force) {
            const now = performance.now();
            const dt = now - lastCommitAtRef.current;

            // Throttle raw scroll commits to maxFPS to reduce render pressure.
            // Lerp commits bypass this so every smoothed step reaches the DOM.
            if (dt < frameIntervalRef.current && delta < 0.02) {
                perfMetricsRef.current.commitSkips += 1;
                return;
            }

            lastCommitAtRef.current = now;
        }

        playheadRef.current = normalized;
        perfMetricsRef.current.playheadCommits += 1;
        setPlayhead(normalized);
    }, []);


    // Playback Logic
    const play = useCallback(() => setIsPlaying(true), []);
    const pause = useCallback(() => setIsPlaying(false), []);
    const seek = useCallback((progress: number) => {
        commitPlayhead(progress);
    }, [commitPlayhead]);

    const next = useCallback(() => {
        const nextPoint = normalizedLayers
            .flatMap(l => l.spans.map(s => Math.min(s.start, s.end)))
            .filter(v => v > playhead)
            .sort((a, b) => a - b)[0] ?? 1;
        seek(nextPoint);
    }, [playhead, normalizedLayers, seek]);

    const prev = useCallback(() => {
        const prevPoint = normalizedLayers
            .flatMap(l => l.spans.map(s => Math.min(s.start, s.end)))
            .filter(v => v < playhead - 0.01)
            .sort((a, b) => b - a)[0] ?? 0;
        seek(prevPoint);
    }, [playhead, normalizedLayers, seek]);

    // Phase 3: Auto-Play Engine via Batcher
    useEffect(() => {
        if (mode !== 'auto' || !isPlaying || !batchRef.current) return;

        const startTimestamp = performance.now() - (playheadRef.current * duration);
        autoPlayStartTimeRef.current = startTimestamp;

        let autoPlayFn: ProcessFn | null = null;
        autoPlayFn = (frameData: FrameData) => {
            if (!autoPlayFn) return;

            sampleFrame(frameData);

            const elapsed = frameData.timestamp - startTimestamp;
            const progress = Math.min(elapsed / duration, 1);

            commitPlayhead(progress);

            if (progress >= 1) {
                const fn = autoPlayFn;
                autoPlayFn = null;
                setIsPlaying(false);
                if (batchRef.current && fn) {
                    batchRef.current.cancel(fn);
                }
            }
        };

        batchRef.current.schedule('update', autoPlayFn, true);

        return () => {
            if (batchRef.current && autoPlayFn) {
                batchRef.current.cancel(autoPlayFn);
            }
            autoPlayFn = null;
            autoPlayStartTimeRef.current = null;
        };
    }, [mode, isPlaying, duration, commitPlayhead]);

    // Phase 3: Lerp Engine via Batcher — smoothly moves playhead toward lerpTargetRef
    const startLerpLoop = useCallback(() => {
        if (!batchRef.current || lerpLoopRef.current) return;

        let lerpFn: ProcessFn | null = null;
        lerpFn = (frameData: FrameData) => {
            if (!lerpFn) return;

            sampleFrame(frameData);

            const curr = playheadRef.current;
            const tgt = lerpTargetRef.current;
            const diff = tgt - curr;

            if (Math.abs(diff) < 0.0003) {
                if (curr !== tgt) {
                    commitPlayhead(tgt);
                }
                const fn = lerpFn;
                lerpFn = null;
                lerpLoopRef.current = null;
                if (batchRef.current && fn) {
                    batchRef.current.cancel(fn);
                }
                return;
            }

            const next = curr + diff * lerpFactorRef.current;
            // force=true: bypass frame-interval throttle so every lerp step commits
            commitPlayhead(next, true);
        };

        lerpLoopRef.current = lerpFn;
        batchRef.current.schedule('update', lerpFn, true);
    }, [commitPlayhead, sampleFrame]);

    // Phase 1: Scroll Engine via Batcher (coalesces with entry, lerp, autoplay)
    useEffect(() => {
        if (mode !== 'scroll') return;

        const timelineEl = containerRef.current;
        if (!timelineEl || !batchRef.current) return;

        const scrollContainer = getScrollContainer(timelineEl);

        const resolveSceneHeight = () => {
            if (sceneHeight && sceneHeight > 0) return sceneHeight;

            const viewportHeight = scrollContainer?.clientHeight ?? window.innerHeight;
            const timelineHeight = timelineEl.scrollHeight || timelineEl.getBoundingClientRect().height;
            return Math.max(timelineHeight - viewportHeight, 1);
        };

        const syncSceneHeight = () => {
            const next = resolveSceneHeight();
            sceneHeightRef.current = next;
            setResolvedSceneHeight((prev) => Math.abs(prev - next) < 0.5 ? prev : next);

            if (debug) {
                const viewport = scrollContainer?.clientHeight ?? window.innerHeight;
                setDebugViewportHeight((prev) => Math.abs(prev - viewport) < 0.5 ? prev : viewport);
            }
        };

        const handleScroll = () => {
            if (!timelineEl) return;

            perfMetricsRef.current.scrollEvents += 1;

            const rect = timelineEl.getBoundingClientRect();
            const progressBase = scrollContainer
                ? rect.top - scrollContainer.getBoundingClientRect().top
                : rect.top;

            const effectiveSceneHeight = Math.max(sceneHeightRef.current, 1);
            const nextPlayhead = Math.min(Math.max(-progressBase / effectiveSceneHeight, 0), 1);

            if (debug) {
                const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
                setDebugScrollTop((prev) => Math.abs(prev - currentScrollTop) < 0.5 ? prev : currentScrollTop);
            }

            pendingPlayheadRef.current = nextPlayhead;
            if (scrollUpdateScheduledRef.current) return;

            scrollUpdateScheduledRef.current = true;
            batchRef.current?.schedule('preUpdate', (frameData: FrameData) => {
                sampleFrame(frameData);
                scrollUpdateScheduledRef.current = false;
                perfMetricsRef.current.scrollFlushes += 1;

                const pendingPlayhead = pendingPlayheadRef.current;
                if (pendingPlayhead === null) return;

                const delta = Math.abs(pendingPlayhead - playheadRef.current);
                if (delta < PLAYHEAD_EPSILON) {
                    perfMetricsRef.current.scrollSkips += 1;
                    return;
                }

                if (interpolateRef.current) {
                    lerpTargetRef.current = pendingPlayhead;
                    startLerpLoop();
                } else {
                    commitPlayhead(pendingPlayhead);
                }
            });
        };

        const scrollSource: HTMLElement | Window = scrollContainer ?? window;
        syncSceneHeight();
        scrollSource.addEventListener('scroll', handleScroll, { passive: true });
        const handleResize = () => {
            syncSceneHeight();
            handleScroll();
        };
        window.addEventListener('resize', handleResize);

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                syncSceneHeight();
                handleScroll();
            });
            resizeObserver.observe(timelineEl);
            if (scrollContainer) resizeObserver.observe(scrollContainer);
        }

        handleScroll();

        return () => {
            scrollSource.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            resizeObserver?.disconnect();
            pendingPlayheadRef.current = null;
            scrollUpdateScheduledRef.current = false;
            if (batchRef.current && lerpLoopRef.current) {
                batchRef.current.cancel(lerpLoopRef.current);
            }
            lerpLoopRef.current = null;
        };
    }, [commitPlayhead, debug, mode, sceneHeight, sampleFrame, startLerpLoop]);

    // Layer Calculation
    const layerStates = useMemo(() => {
        const calcStartedAt = performance.now();
        const nextCache: Record<string, { key: string; state: TimelineLayerState }> = {};
        let reusedLayers = 0;
        let recomputedLayers = 0;

        const states = normalizedLayers.reduce((acc, layer) => {
            const spans = layer.spans;

            const sorted = spans; // pre-sorted in resolveTimelineLayers

            // Overall bounds across all spans
            const allEntries = spans.map(s => Math.min(s.start, s.end));
            const allExits   = spans.map(s => Math.max(s.start, s.end));
            const overallStart = Math.min(...allEntries);
            const overallEnd   = Math.max(...allExits);
            const hasKeyframes = sorted.length > 0;
            const spanSamples: Array<{ span: typeof sorted[number]; spanProgress: number }> = [];

            for (const span of sorted) {
                const spanEntry = Math.min(span.start, span.end);
                const spanExit = Math.max(span.start, span.end);

                if (span.trigger === 'inView') {
                    if (playhead < spanEntry || playhead > spanExit) continue;
                } else {
                    if (playhead < spanEntry) continue;
                }

                spanSamples.push({
                    span,
                    spanProgress: getLayerProgress(playhead, { start: span.start, end: span.end }),
                });
            }

            const entry = layer.entry;
            let entryProgress = -1;
            let isEntryActive = false;
            let shouldApplyEntry = false;
            if (entry) {
                if (entry.trigger === 'inView') {
                    entryProgress = getLayerProgress(playhead, { start: overallStart, end: overallEnd });
                    shouldApplyEntry = true;
                } else {
                    const elapsedMs = entryStartedAtRef.current === null
                        ? 0
                        : Math.max(entryNow - entryStartedAtRef.current, 0);
                    const localMs = elapsedMs - entry.delay;
                    isEntryActive = localMs <= entry.duration;
                    entryProgress = isEntryActive
                        ? (localMs <= 0 ? 0 : clamp01(localMs / entry.duration))
                        : 1;

                    // If layer has keyframes, let keyframes take over once mount-entry finishes.
                    // For entry-only layers, keep applying final entry state (t=1).
                    shouldApplyEntry = isEntryActive || !hasKeyframes;
                }
            }

            const totalDistance = overallEnd - overallStart;
            const overallProgress = totalDistance < 1e-6
                ? (playhead >= overallEnd ? 1 : 0)
                : clamp01((playhead - overallStart) / totalDistance);

            const startPx = overallStart * resolvedSceneHeight;
            const endPx   = overallEnd   * resolvedSceneHeight;
            const active = playhead >= overallStart && playhead <= overallEnd;
            const cacheKey = [
                roundMetric(overallProgress),
                active ? 1 : 0,
                roundMetric(resolvedSceneHeight),
                roundMetric(entryProgress),
                isEntryActive ? 1 : 0,
                spanSamples.map(({ span, spanProgress }) => `${span.start}:${span.end}:${roundMetric(spanProgress)}`).join('|'),
            ].join(';');
            const cached = layerStateCacheRef.current[layer.id];
            if (cached?.key === cacheKey) {
                reusedLayers += 1;
                acc[layer.id] = cached.state;
                nextCache[layer.id] = cached;
                return acc;
            }

            // Merge styles: iterate spans in order; skip spans that haven't started yet.
            // Once a span has started it holds its end-state (progress=1) until the
            // next span takes over, giving seamless chaining between keyframes.
            const style: Record<string, string | number> = {};

            for (const { span, spanProgress } of spanSamples) {
                for (const effect of span.effects) {
                    style[effect.property] = interpolateEffect(effect, spanProgress);
                }
                Object.entries(span.styleEffects).forEach(([property, effect]) => {
                    style[property] = interpolateTransformValue(effect, spanProgress);
                });
                const transform = composeTransform(span.transforms, spanProgress);
                if (transform) style.transform = transform;
            }

            // Layer-level entry animation (one-time mount animation).
            // Important: before the entry ticker starts, force t=0 so first paint
            // already uses the entry "from" state (prevents jump/flicker).
            //
            // For layers that ALSO have keyframe spans: the entry transform is
            // COMPOSED (appended) on top of the keyframe transform rather than
            // overriding it. This lets keyframes respond to scroll immediately
            // while the entry animation plays simultaneously — no "entry delay"
            // is transferred to keyframe activation.
            //
            // For entry-only layers: full override behaviour is kept so the final
            // state (t=1) is held indefinitely after the entry completes.
            if (entry) {
                if (entry.trigger === 'inView') {
                    // inView entries always override — they are scroll-driven themselves.
                    if (shouldApplyEntry) {
                        const t = entryProgress;
                        for (const effect of entry.effects) {
                            style[effect.property] = interpolateEffect(effect, t, entry.easing);
                        }
                        Object.entries(entry.styleEffects).forEach(([property, effect]) => {
                            style[property] = interpolateTransformValue(effect, t, '', entry.easing);
                        });
                        const entryTransform = composeTransform(entry.transforms, t, entry.easing);
                        if (entryTransform) style.transform = entryTransform;
                    }
                } else if (hasKeyframes) {
                    // Mount entry + keyframes: compose entry transform additively so
                    // scroll-driven keyframes are never blocked by the entry animation.
                    const t = isEntryActive ? (entryProgress <= 0 ? 0 : entryProgress) : 1;
                    // Non-transform properties (opacity, color, …) from entry override
                    // keyframe equivalents only while entry is still active.
                    if (isEntryActive) {
                        for (const effect of entry.effects) {
                            style[effect.property] = interpolateEffect(effect, t, entry.easing);
                        }
                        Object.entries(entry.styleEffects).forEach(([property, effect]) => {
                            style[property] = interpolateTransformValue(effect, t, '', entry.easing);
                        });
                    }
                    // Transform is always composed (appended) so both entry slide-in
                    // and keyframe parallax/scroll effects stack correctly.
                    const entryTransform = composeTransform(entry.transforms, t, entry.easing);
                    if (entryTransform) {
                        style.transform = style.transform
                            ? `${style.transform} ${entryTransform}`
                            : entryTransform;
                    }
                } else {
                    // Entry-only layer: apply full state; hold at t=1 after completion.
                    if (shouldApplyEntry) {
                        const t = entryProgress;
                        for (const effect of entry.effects) {
                            style[effect.property] = interpolateEffect(effect, t, entry.easing);
                        }
                        Object.entries(entry.styleEffects).forEach(([property, effect]) => {
                            style[property] = interpolateTransformValue(effect, t, '', entry.easing);
                        });
                        const entryTransform = composeTransform(entry.transforms, t, entry.easing);
                        if (entryTransform) style.transform = entryTransform;
                    }
                }
            }

            const nextState = {
                progress: overallProgress,
                active,
                direction: overallEnd >= overallStart ? 'asc' : 'desc',
                startProgress: overallStart,
                endProgress: overallEnd,
                scrollPx: {
                    start: startPx,
                    end: endPx,
                    span: Math.abs(endPx - startPx),
                },
                style,
            } as TimelineLayerState;

            recomputedLayers += 1;
            acc[layer.id] = nextState;
            nextCache[layer.id] = { key: cacheKey, state: nextState };

            return acc;
        }, {} as Record<string, TimelineLayerState>);

        layerStateCacheRef.current = nextCache;
        perfMetricsRef.current.layerCalcMs = performance.now() - calcStartedAt;
        perfMetricsRef.current.reusedLayers = reusedLayers;
        perfMetricsRef.current.recomputedLayers = recomputedLayers;

        return states;
    }, [entryNow, normalizedLayers, playhead, resolvedSceneHeight]);

    const layerProgress = useMemo(() => {
        return Object.keys(layerStates).reduce((acc, key) => {
            acc[key] = layerStates[key].progress;
            return acc;
        }, {} as Record<string, number>);
    }, [layerStates]);

    const effects = useMemo(() => {
        return Object.keys(layerStates).reduce((acc, key) => {
            acc[key] = layerStates[key].style;
            return acc;
        }, {} as Record<string, Record<string, string | number>>);
    }, [layerStates]);

    const getLayerScrollRange = useCallback((layerId: string) => {
        const layer = layerStates[layerId];
        if (!layer) return null;
        return layer.scrollPx;
    }, [layerStates]);

    const pxToProgress = useCallback((px: number) => {
        const safePx = Number.isFinite(px) ? px : 0;
        return clamp01(safePx / Math.max(resolvedSceneHeight, 1));
    }, [resolvedSceneHeight]);

    const progressToPx = useCallback((progress: number) => {
        const safeProgress = Number.isFinite(progress) ? progress : 0;
        return clamp01(safeProgress) * resolvedSceneHeight;
    }, [resolvedSceneHeight]);

    const debugLayerRanges = useMemo(() => {
        return Object.keys(layerStates).reduce((acc, key) => {
            acc[key] = layerStates[key].scrollPx;
            return acc;
        }, {} as Record<string, TimelineDebugLayerRange>);
    }, [layerStates]);

    const debugSuggestions = useMemo(() => {
        const suggestions: string[] = [];

        normalizedLayers.forEach((layer) => {
            layer.spans.forEach((span) => {
                const meta = span.debugMeta;
                if (!meta?.anchored || !meta.adjustedFromNearZero) return;

                const keyframeLabel = meta.keyframeId
                    ? `#${meta.keyframeId}`
                    : `@${meta.keyframeIndex}`;
                const startAnchor = formatAnchorForDebug(meta.startAnchor);
                const endAnchor = formatAnchorForDebug(meta.endAnchor);

                suggestions.push(
                    `[${layer.id}${keyframeLabel}] near-zero linked span detected (${startAnchor} -> ${endAnchor}). ` +
                    `Try widening range, e.g. start: "${startAnchor}+0.02" or end farther away.`
                );
            });
        });

        return suggestions;
    }, [normalizedLayers]);

    const debugInfo = useMemo(() => {
        return {
            enabled: debug,
            mode,
            sceneHeight: resolvedSceneHeight,
            viewportHeight: debugViewportHeight,
            scrollTop: debugScrollTop,
            scrollProgress: pxToProgress(debugScrollTop),
            layerRangesPx: debugLayerRanges as Record<Id, TimelineDebugLayerRange>,
            suggestions: debugSuggestions,
            pxToProgress,
            progressToPx,
            perf: { ...perfMetricsRef.current },
        } satisfies TimelineDebugInfo<Id>;
    }, [debug, mode, resolvedSceneHeight, debugViewportHeight, debugScrollTop, pxToProgress, progressToPx, debugLayerRanges, debugSuggestions]);

    useEffect(() => {
        if (!debug || !debugOverlay || typeof document === 'undefined') {
            if (debugOverlayRef.current?.parentNode) {
                debugOverlayRef.current.parentNode.removeChild(debugOverlayRef.current);
            }
            debugOverlayRef.current = null;
            return;
        }

        if (!debugOverlayRef.current) {
            const mount = document.createElement('div');
            mount.style.position = 'fixed';
            mount.style.right = '12px';
            mount.style.top = '12px';
            mount.style.zIndex = '9999';
            mount.style.pointerEvents = 'none';
            mount.style.background = 'rgba(0,0,0,0.72)';
            mount.style.color = '#d7fce8';
            mount.style.border = '1px solid rgba(255,255,255,0.18)';
            mount.style.borderRadius = '10px';
            mount.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
            mount.style.fontSize = '11px';
            mount.style.lineHeight = '1.4';
            mount.style.padding = '10px 12px';
            mount.style.width = '360px';
            mount.style.whiteSpace = 'pre-wrap';
            mount.style.boxShadow = '0 8px 28px rgba(0,0,0,0.35)';
            document.body.appendChild(mount);
            debugOverlayRef.current = mount;
        }

        return () => {
            if (debugOverlayRef.current?.parentNode) {
                debugOverlayRef.current.parentNode.removeChild(debugOverlayRef.current);
            }
            debugOverlayRef.current = null;
        };
    }, [debug, debugOverlay]);

    useEffect(() => {
        if (!debug || !debugOverlay) return;
        const mount = debugOverlayRef.current;
        if (!mount) return;

        const fmt = (n: number, digits = 2) => Number.isFinite(n) ? n.toFixed(digits) : '0';
        const rangeLines = Object.entries(debugInfo.layerRangesPx as Record<string, TimelineDebugLayerRange>)
            .slice(0, 8)
            .map(([id, range]) => `${id}: ${fmt(range.start)} -> ${fmt(range.end)}px`);
        const suggestionLines = debugInfo.suggestions.length > 0
            ? debugInfo.suggestions.map((line, index) => `${index + 1}. ${line}`)
            : ['none'];

        mount.textContent = [
            'Timeline Debug',
            `sceneHeight: ${fmt(debugInfo.sceneHeight)}px`,
            `viewportHeight: ${fmt(debugInfo.viewportHeight)}px`,
            `scrollTop: ${fmt(debugInfo.scrollTop)}px`,
            `scrollProgress: ${fmt(debugInfo.scrollProgress, 4)}`,
            '',
            'perf',
            `batchDelta: ${fmt(debugInfo.perf.batchDeltaMs)}ms`,
            `longFrames: ${debugInfo.perf.longFrames}`,
            `layerCalc: ${fmt(debugInfo.perf.layerCalcMs)}ms`,
            `layers reused/recomputed: ${debugInfo.perf.reusedLayers}/${debugInfo.perf.recomputedLayers}`,
            `scroll events/flushes/skips: ${debugInfo.perf.scrollEvents}/${debugInfo.perf.scrollFlushes}/${debugInfo.perf.scrollSkips}`,
            `commits/skips: ${debugInfo.perf.playheadCommits}/${debugInfo.perf.commitSkips}`,
            '',
            'layerRangesPx',
            ...rangeLines,
            '',
            'conversions',
            `300px -> p: ${fmt(debugInfo.pxToProgress(300), 4)}`,
            `p:0.25 -> px: ${fmt(debugInfo.progressToPx(0.25))}`,
            `p:0.5 -> px: ${fmt(debugInfo.progressToPx(0.5))}`,
            `p:1.0 -> px: ${fmt(debugInfo.progressToPx(1))}`,
            '',
            'recommended offsets',
            ...suggestionLines,
        ].join('\n');
    }, [debug, debugOverlay, debugInfo]);

    return {
        containerRef,
        playhead,
        layers: layerProgress as Record<Id, number>,
        layerStates: layerStates as Record<Id, TimelineLayerState>,
        effects: effects as Record<Id, Record<string, string | number>>,
        getLayerScrollRange: getLayerScrollRange as UseTimelineReturn<Id>['getLayerScrollRange'],
        controls: { play, pause, seek, next, prev, isPlaying },
        debug: debugInfo,
    };
};

export default useTimeline