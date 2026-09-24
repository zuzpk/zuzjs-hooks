import { CSSProperties, RefObject, useEffect, useMemo, useRef, useState } from "react";
import { createRenderBatch, ProcessFn, RenderBatch } from "./frameloop";

export type GradientType = "linear" | "radial" | "conic" | "orb";
export type GradientAnimation = "none" | "rotate" | "float" | "pulse";
export type GradientMotionPreset = "idle" | "thinking" | "burst";

export interface GradientStop {
  color: string;
  at?: number | string;
}

export interface OrbLayer {
  color: string;
  x?: number;
  y?: number;
  size?: number;
  opacity?: number;
}

export interface UseGradientOptions {
  type?: GradientType;
  stops?: GradientStop[];
  angle?: number;
  position?: string;
  duration?: number;
  speed?: number;
  preset?: GradientMotionPreset;
  animate?: boolean;
  animation?: GradientAnimation;
  autoPlay?: boolean;
  loop?: boolean;
  backgroundColor?: string;
  orbs?: OrbLayer[];
  bloom?: boolean;
  bloomIntensity?: number;
  bloomColor?: string;
  bloomBlur?: number;
  bloomSpread?: number;
  bloomAnimate?: boolean;
  /**
   * Write animated CSS (backgroundImage, backgroundPosition, filter, boxShadow)
   * directly to `elementRef` — completely bypasses React state during animation.
   * Attach the returned `elementRef` to the target element.
   */
  directDOM?: boolean;
  /**
   * Max animation update rate for the RAF loop.
   * Lower values significantly reduce GPU/paint pressure on heavy gradients.
   * Default: 30
   */
  maxFPS?: number;
  /**
   * When possible, use compositor-driven CSS keyframe animation instead of
   * per-frame JavaScript updates. Currently optimized for non-orb "float" mode.
   * Default: true
   */
  cssAnimation?: boolean;
  /**
   * Enable built-in WebGL renderer path (same hook, no external libs).
   * Requires `directDOM: true` and an attached `elementRef`.
   * Falls back to CSS/RAF path if WebGL is unavailable.
   */
  webgl?: boolean;
  /**
   * GPU preference hint for WebGL context creation.
   * Default: "low-power"
   */
  webglPowerPreference?: WebGLPowerPreference;
  /**
   * Cap device pixel ratio for WebGL canvas to reduce GPU load.
   * Default: 1.5
   */
  webglDprCap?: number;
}

export interface UseGradientResult {
  gradient: string;
  style: CSSProperties;
  progress: number;
  speed: number;
  preset: GradientMotionPreset;
  bloom: number;
  /** Attach to an element when `directDOM: true` to enable zero-render animation. */
  elementRef: RefObject<HTMLElement | null>;
  controls: {
    play: () => void;
    pause: () => void;
    seek: (progress: number) => void;
    setSpeed: (speed: number) => void;
    setPreset: (preset: GradientMotionPreset) => void;
    flash: (intensity?: number, durationMs?: number) => void;
    isPlaying: boolean;
  };
}

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const clampSpeed = (n: number) => Math.min(Math.max(n, 0.05), 20);
const clampBloom = (n: number) => Math.min(Math.max(n, 0), 3);
const clampFps = (n: number) => Math.min(Math.max(n, 1), 120);
const GRADIENT_PROGRESS_EPSILON = 0.001;

let gradientPerfStylesInjected = false;

const ensureGradientPerfStyles = () => {
  if (gradientPerfStylesInjected || typeof document === "undefined") return;

  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-zuz-gradient-perf", "true");
  styleEl.textContent = `
@keyframes zuz-gradient-float {
  0%   { background-position: 50% 50%; }
  25%  { background-position: 72% 64%; }
  50%  { background-position: 50% 78%; }
  75%  { background-position: 28% 64%; }
  100% { background-position: 50% 50%; }
}
`;

  document.head.appendChild(styleEl);
  gradientPerfStylesInjected = true;
};

const PRESET_SPEED: Record<GradientMotionPreset, number> = {
  idle: 0.35,
  thinking: 1.8,
  burst: 3.2,
};

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "").trim();

  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
  }

  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
  }

  return hex;
};

const withOpacity = (color: string, opacity: number) => {
  if (color.startsWith("#")) return hexToRgba(color, opacity);
  return color;
};

const parseColorToRgb = (color: string): [number, number, number] => {
  const c = color.trim();

  if (c.startsWith("#")) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  const rgbMatch = c.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((n) => Number(n.trim()));
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
      return [
        Math.min(Math.max(parts[0], 0), 255),
        Math.min(Math.max(parts[1], 0), 255),
        Math.min(Math.max(parts[2], 0), 255),
      ];
    }
  }

  return [124, 58, 237];
};

const formatStops = (stops: GradientStop[]) =>
  stops
    .map((stop, index) => {
      const fallback = Math.round((index / Math.max(stops.length - 1, 1)) * 100);
      const at = stop.at ?? `${fallback}%`;
      return `${stop.color} ${at}`;
    })
    .join(", ");

const defaultStops: GradientStop[] = [
  { color: "#2D5BFF", at: "0%" },
  { color: "#00D4FF", at: "45%" },
  { color: "#7C3AED", at: "100%" },
];

const defaultOrbs: OrbLayer[] = [
  { color: "#7C3AED", x: 18, y: 24, size: 46, opacity: 0.58 },
  { color: "#00D4FF", x: 78, y: 34, size: 42, opacity: 0.5 },
  { color: "#2D5BFF", x: 52, y: 76, size: 52, opacity: 0.45 },
];

// ---------------------------------------------------------------------------
// Module-level pure helpers — used by both the useMemo path and the direct DOM
// path so the RAF loop never touches React state when elementRef is attached.
// ---------------------------------------------------------------------------

interface AnimatedGradientOpts {
  type: GradientType;
  stops: GradientStop[];
  angle: number;
  position: string;
  animation: GradientAnimation;
  animate: boolean;
  orbs: OrbLayer[];
  bloom: boolean;
  bloomIntensity: number;
  bloomColor: string | undefined;
  bloomBlur: number;
  bloomSpread: number;
  bloomAnimate: boolean;
}

const computeGradient = (progress: number, opts: AnimatedGradientOpts): string => {
  const stopText = formatStops(opts.stops);

  if (opts.type === "linear") {
    const a = opts.animation === "rotate" ? opts.angle + progress * 360 : opts.angle;
    return `linear-gradient(${a}deg, ${stopText})`;
  }
  if (opts.type === "radial") {
    return `radial-gradient(circle at ${opts.position}, ${stopText})`;
  }
  if (opts.type === "conic") {
    const a = opts.animation === "rotate" ? opts.angle + progress * 360 : opts.angle;
    return `conic-gradient(from ${a}deg at ${opts.position}, ${stopText})`;
  }

  // orb
  const t = progress * Math.PI * 2;
  const shouldOrbit = opts.animate && opts.animation !== "none";

  return opts.orbs
    .map((orb, i) => {
      const baseX = orb.x ?? 50;
      const baseY = orb.y ?? 50;
      const baseSize = orb.size ?? 42;
      const opacity = orb.opacity ?? 0.5;

      const drift = shouldOrbit && opts.animation !== "pulse" ? Math.sin(t + i * 1.7) * 8 : 0;
      const lift  = shouldOrbit && opts.animation !== "pulse" ? Math.cos(t + i * 1.2) * 6 : 0;
      const pulse = shouldOrbit && opts.animation === "pulse" ? 1 + Math.sin(t + i) * 0.18 : 1;

      const x    = clamp01((baseX + drift) / 100) * 100;
      const y    = clamp01((baseY + lift)  / 100) * 100;
      const size = Math.max(baseSize * pulse, 10);
      const color = withOpacity(orb.color, opacity);

      return `radial-gradient(circle at ${x.toFixed(2)}% ${y.toFixed(2)}%, ${color} 0%, rgba(0,0,0,0) ${size.toFixed(2)}%)`;
    })
    .join(", ");
};

/**
 * Directly apply all animated CSS properties to a DOM element.
 * Called from the RAF loop when directDOM mode is active — zero React renders.
 */
const applyAnimatedStyle = (
  el: HTMLElement,
  progress: number,
  flashBoost: number,
  opts: AnimatedGradientOpts
): void => {
  el.style.backgroundImage = computeGradient(progress, opts);

  if (opts.animate && opts.type !== "orb" && opts.animation === "float") {
    el.style.backgroundPosition =
      `${50 + Math.sin(progress * Math.PI * 2) * 22}% ${50 + Math.cos(progress * Math.PI * 2) * 18}%`;
  }

  const pulse      = opts.bloomAnimate ? 0.7 + (Math.sin(progress * Math.PI * 2) + 1) * 0.5 : 1;
  const baseBloom  = opts.bloom ? Math.max(opts.bloomIntensity, 0.25) : opts.bloomIntensity;
  const bloomLevel = clampBloom(baseBloom + flashBoost) * pulse;

  if (bloomLevel > 0) {
    const dominant    = opts.bloomColor ?? opts.stops[0]?.color ?? "#7C3AED";
    const glowA       = Math.max(opts.bloomBlur * bloomLevel, 0);
    const glowB       = Math.max((opts.bloomBlur + opts.bloomSpread * 1.6) * bloomLevel, 0);
    const rgbaA       = withOpacity(dominant, clamp01(0.26 * bloomLevel));
    const rgbaB       = withOpacity(dominant, clamp01(0.15 * bloomLevel));
    el.style.filter    = `saturate(${1 + bloomLevel * 0.18}) brightness(${1 + bloomLevel * 0.08})`;
    el.style.boxShadow = `0 0 ${glowA.toFixed(2)}px ${rgbaA}, 0 0 ${glowB.toFixed(2)}px ${rgbaB}`;
  } else {
    el.style.filter    = "";
    el.style.boxShadow = "";
  }
};

// ---------------------------------------------------------------------------

const useGradient = (options: UseGradientOptions = {}): UseGradientResult => {
  const {
    type = "linear",
    stops = defaultStops,
    angle = 135,
    position = "center",
    duration = 6000,
    speed: initialSpeed = 1,
    preset: initialPreset,
    animate = false,
    animation = "float",
    autoPlay = false,
    loop = true,
    backgroundColor = "transparent",
    orbs = defaultOrbs,
    bloom = false,
    bloomIntensity = 0,
    bloomColor,
    bloomBlur = 60,
    bloomSpread = 14,
    bloomAnimate = false,
    directDOM = false,
    maxFPS = 30,
    cssAnimation = true,
    webgl = false,
    webglPowerPreference = "low-power",
    webglDprCap = 1.5,
  } = options;

  const resolvedInitialPreset: GradientMotionPreset = initialPreset ?? "idle";

  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(
    clampSpeed(initialPreset ? PRESET_SPEED[resolvedInitialPreset] : initialSpeed)
  );
  const [preset, setPreset] = useState<GradientMotionPreset>(resolvedInitialPreset);
  const [flashBoost, setFlashBoost] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay && animate);
  const rafRef = useRef<number | null>(null);
  const batchRef = useRef<RenderBatch | null>(null);
  const gradientLoopRef = useRef<ProcessFn | null>(null);
  const progressRef = useRef(0);
  const flashTimerRef = useRef<number | null>(null);
  const webglActiveRef = useRef(false);

  // Direct DOM mode — updated every render so RAF loop always reads the latest option values
  const elementRef = useRef<HTMLElement | null>(null);
  const flashBoostRef = useRef(0);
  const directOptsRef = useRef<AnimatedGradientOpts>({
    type, stops, angle, position, animation, animate, orbs,
    bloom, bloomIntensity, bloomColor, bloomBlur, bloomSpread, bloomAnimate,
  });
  directOptsRef.current = {
    type, stops, angle, position, animation, animate, orbs,
    bloom, bloomIntensity, bloomColor, bloomBlur, bloomSpread, bloomAnimate,
  };

  useEffect(() => {
    if (!batchRef.current) {
      batchRef.current = createRenderBatch();
    }

    return () => {
      if (batchRef.current && gradientLoopRef.current) {
        batchRef.current.cancel(gradientLoopRef.current);
      }
      gradientLoopRef.current = null;
      batchRef.current = null;
    };
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    flashBoostRef.current = flashBoost;
  }, [flashBoost]);

  useEffect(() => {
    if (initialPreset) {
      setPreset(initialPreset);
      setSpeed(clampSpeed(PRESET_SPEED[initialPreset]));
      return;
    }

    setSpeed(clampSpeed(initialSpeed));
  }, [initialSpeed, initialPreset]);

  const play = () => {
    if (animate) setIsPlaying(true);
  };

  const pause = () => setIsPlaying(false);

  const seek = (nextProgress: number) => {
    const normalized = clamp01(nextProgress);
    progressRef.current = normalized;
    setProgress(normalized);
  };

  const updateSpeed = (nextSpeed: number) => {
    setPreset("idle");
    setSpeed(clampSpeed(nextSpeed));
  };

  const updatePreset = (nextPreset: GradientMotionPreset) => {
    setPreset(nextPreset);
    setSpeed(PRESET_SPEED[nextPreset]);
  };

  const flash = (intensity: number = 1, durationMs: number = 220) => {
    const boost = clampBloom(intensity);

    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    flashBoostRef.current = boost;

    if (directDOM && elementRef.current && !webglActiveRef.current) {
      applyAnimatedStyle(elementRef.current, progressRef.current, boost, directOptsRef.current);
    } else {
      setFlashBoost(boost);
    }

    flashTimerRef.current = window.setTimeout(() => {
      flashBoostRef.current = 0;
      if (directDOM && elementRef.current && !webglActiveRef.current) {
        applyAnimatedStyle(elementRef.current, progressRef.current, 0, directOptsRef.current);
      } else {
        setFlashBoost(0);
      }
      flashTimerRef.current = null;
    }, Math.max(durationMs, 40));
  };

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!animate || !isPlaying) return;

    if (directDOM && webgl && elementRef.current) {
      const el = elementRef.current;
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.display = "block";

      const computedPosition = window.getComputedStyle(el).position;
      const previousPositionInline = el.style.position;
      if (computedPosition === "static") {
        el.style.position = "relative";
      }

      el.appendChild(canvas);

      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        premultipliedAlpha: true,
        powerPreference: webglPowerPreference,
      });

      if (gl) {
        const vsSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

        const fsSource = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_flash;
uniform float u_bloom;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;

float blob(vec2 uv, vec2 p, float r) {
  return smoothstep(r, r - 0.22, distance(uv, p));
}

void main() {
  vec2 uv = v_uv;
  float t = u_time;

  vec2 p0 = vec2(0.30 + sin(t * 0.70) * 0.10, 0.36 + cos(t * 0.90) * 0.08);
  vec2 p1 = vec2(0.72 + cos(t * 0.58) * 0.11, 0.44 + sin(t * 0.76) * 0.10);
  vec2 p2 = vec2(0.52 + sin(t * 0.82) * 0.12, 0.74 + cos(t * 0.62) * 0.10);

  float m0 = blob(uv, p0, 0.62);
  float m1 = blob(uv, p1, 0.64);
  float m2 = blob(uv, p2, 0.66);

  float sumM = max(m0 + m1 + m2, 0.0001);
  vec3 col = (u_c0 * m0 + u_c1 * m1 + u_c2 * m2) / sumM;

  float vignette = smoothstep(1.05, 0.18, distance(uv, vec2(0.5)));
  col *= (0.82 + vignette * 0.34);
  col += u_flash * 0.20;
  col *= (1.0 + u_bloom * 0.09);

  gl_FragColor = vec4(col, 1.0);
}`;

        const compileShader = (type: number, source: string) => {
          const shader = gl.createShader(type);
          if (!shader) return null;
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            gl.deleteShader(shader);
            return null;
          }
          return shader;
        };

        const vs = compileShader(gl.VERTEX_SHADER, vsSource);
        const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

        if (vs && fs) {
          const program = gl.createProgram();
          if (program) {
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);

            if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
              const buffer = gl.createBuffer();
              if (buffer) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

                const attribPos = gl.getAttribLocation(program, "a_position");
                const uniformTime = gl.getUniformLocation(program, "u_time");
                const uniformFlash = gl.getUniformLocation(program, "u_flash");
                const uniformBloom = gl.getUniformLocation(program, "u_bloom");
                const uniformC0 = gl.getUniformLocation(program, "u_c0");
                const uniformC1 = gl.getUniformLocation(program, "u_c1");
                const uniformC2 = gl.getUniformLocation(program, "u_c2");

                const resize = () => {
                  const dpr = Math.min(window.devicePixelRatio || 1, Math.max(webglDprCap, 1));
                  const w = Math.max(1, Math.round(el.clientWidth * dpr));
                  const h = Math.max(1, Math.round(el.clientHeight * dpr));
                  if (canvas.width !== w || canvas.height !== h) {
                    canvas.width = w;
                    canvas.height = h;
                  }
                };

                resize();

                const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null;
                ro?.observe(el);

                const effectiveDuration = duration <= 0 ? 1 : duration / speed;
                const frameInterval = 1000 / clampFps(maxFPS);
                const start = performance.now() - progressRef.current * effectiveDuration;
                let rafId: number | null = null;
                let lastPaintAt = 0;

                const draw = (next: number) => {
                  const opts = directOptsRef.current;
                  const c0 = parseColorToRgb(opts.stops[0]?.color ?? "#2D5BFF");
                  const c1 = parseColorToRgb(opts.stops[1]?.color ?? "#00D4FF");
                  const c2 = parseColorToRgb(opts.stops[2]?.color ?? "#7C3AED");

                  resize();
                  gl.viewport(0, 0, canvas.width, canvas.height);
                  gl.useProgram(program);
                  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                  gl.enableVertexAttribArray(attribPos);
                  gl.vertexAttribPointer(attribPos, 2, gl.FLOAT, false, 0, 0);

                  gl.uniform1f(uniformTime, next * Math.PI * 2);
                  gl.uniform1f(uniformFlash, flashBoostRef.current);
                  gl.uniform1f(uniformBloom, opts.bloom ? clampBloom(opts.bloomIntensity) : 0);
                  gl.uniform3f(uniformC0, c0[0] / 255, c0[1] / 255, c0[2] / 255);
                  gl.uniform3f(uniformC1, c1[0] / 255, c1[1] / 255, c1[2] / 255);
                  gl.uniform3f(uniformC2, c2[0] / 255, c2[1] / 255, c2[2] / 255);

                  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                };

                webglActiveRef.current = true;
                el.style.backgroundImage = "";

                const step = (now: number) => {
                  if (lastPaintAt !== 0 && now - lastPaintAt < frameInterval) {
                    rafId = requestAnimationFrame(step);
                    return;
                  }
                  lastPaintAt = now;

                  const elapsed = now - start;
                  const raw = elapsed / effectiveDuration;
                  const next = loop ? raw % 1 : clamp01(raw);
                  progressRef.current = next;
                  draw(next);

                  if (loop || raw < 1) {
                    rafId = requestAnimationFrame(step);
                  } else {
                    setIsPlaying(false);
                  }
                };

                rafId = requestAnimationFrame(step);

                return () => {
                  if (rafId !== null) cancelAnimationFrame(rafId);
                  ro?.disconnect();
                  webglActiveRef.current = false;
                  if (canvas.parentNode === el) el.removeChild(canvas);
                  if (computedPosition === "static") {
                    el.style.position = previousPositionInline;
                  }
                  gl.deleteBuffer(buffer);
                  gl.deleteProgram(program);
                  gl.deleteShader(vs);
                  gl.deleteShader(fs);
                };
              }
            }

            gl.deleteProgram(program);
          }
        }

        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      }

      if (canvas.parentNode === el) el.removeChild(canvas);
      if (computedPosition === "static") {
        el.style.position = previousPositionInline;
      }
      webglActiveRef.current = false;
    }

    const canUseCssAnimation =
      directDOM &&
      cssAnimation &&
      animation === "float" &&
      type !== "orb" &&
      elementRef.current !== null;

    if (canUseCssAnimation && elementRef.current) {
      ensureGradientPerfStyles();
      const el = elementRef.current;
      // Static gradient image + compositor-driven background-position animation.
      el.style.backgroundImage = computeGradient(0, directOptsRef.current);
      el.style.backgroundSize = "220% 220%";
      el.style.animation = `zuz-gradient-float ${Math.max(duration / speed, 1)}ms ease-in-out infinite`;
      el.style.animationPlayState = isPlaying ? "running" : "paused";

      return () => {
        if (el.style.animation.includes("zuz-gradient-float")) {
          el.style.animation = "";
          el.style.animationPlayState = "";
        }
      };
    }

    if (!batchRef.current) return;

    const effectiveDuration = duration <= 0 ? 1 : duration / speed;
    const start = performance.now() - progressRef.current * effectiveDuration;
    const frameInterval = 1000 / clampFps(maxFPS);
    let lastPaintAt = 0;

    let gradientLoop: ProcessFn | null = null;
    gradientLoop = (frameData) => {
      if (!gradientLoop) return;

      const now = frameData.timestamp;
      if (lastPaintAt !== 0 && now - lastPaintAt < frameInterval) return;
      lastPaintAt = now;

      const elapsed = now - start;
      const raw = elapsed / effectiveDuration;
      const next = loop ? raw % 1 : clamp01(raw);
      const changedEnough = Math.abs(next - progressRef.current) >= GRADIENT_PROGRESS_EPSILON;
      progressRef.current = next;

      if (directDOM && elementRef.current) {
        applyAnimatedStyle(elementRef.current, next, flashBoostRef.current, directOptsRef.current);
      } else if (changedEnough) {
        setProgress(next);
      }

      if (!loop && raw >= 1) {
        const fn = gradientLoop;
        gradientLoop = null;
        gradientLoopRef.current = null;
        if (batchRef.current && fn) {
          batchRef.current.cancel(fn);
        }
        setIsPlaying(false);
      }
    };

    gradientLoopRef.current = gradientLoop;
    batchRef.current.schedule('update', gradientLoop, true);

    return () => {
      if (batchRef.current && gradientLoop) {
        batchRef.current.cancel(gradientLoop);
      }
      if (gradientLoopRef.current === gradientLoop) {
        gradientLoopRef.current = null;
      }
    };
  }, [animate, isPlaying, duration, speed, loop, maxFPS, directDOM, cssAnimation, animation, type, webgl, webglPowerPreference, webglDprCap]);

  const gradient = useMemo(() => {
    const stopText = formatStops(stops);

    if (type === "linear") {
      const resolvedAngle = animation === "rotate" ? angle + progress * 360 : angle;
      return `linear-gradient(${resolvedAngle}deg, ${stopText})`;
    }

    if (type === "radial") {
      return `radial-gradient(circle at ${position}, ${stopText})`;
    }

    if (type === "conic") {
      const resolvedAngle = animation === "rotate" ? angle + progress * 360 : angle;
      return `conic-gradient(from ${resolvedAngle}deg at ${position}, ${stopText})`;
    }

    const t = progress * Math.PI * 2;
    const shouldOrbit = animate && animation !== "none";

    const orbLayers = orbs
      .map((orb, index) => {
        const baseX = orb.x ?? 50;
        const baseY = orb.y ?? 50;
        const baseSize = orb.size ?? 42;
        const opacity = orb.opacity ?? 0.5;

        const drift = shouldOrbit && animation !== "pulse" ? Math.sin(t + index * 1.7) * 8 : 0;
        const lift = shouldOrbit && animation !== "pulse" ? Math.cos(t + index * 1.2) * 6 : 0;
        const pulse = shouldOrbit && animation === "pulse" ? 1 + Math.sin(t + index) * 0.18 : 1;

        const x = clamp01((baseX + drift) / 100) * 100;
        const y = clamp01((baseY + lift) / 100) * 100;
        const size = Math.max(baseSize * pulse, 10);
        const color = withOpacity(orb.color, opacity);

        return `radial-gradient(circle at ${x.toFixed(2)}% ${y.toFixed(2)}%, ${color} 0%, rgba(0,0,0,0) ${size.toFixed(2)}%)`;
      })
      .join(", ");

    return orbLayers;
  }, [type, stops, angle, position, animation, animate, progress, orbs]);

  const style = useMemo<CSSProperties>(() => {
    // directDOM mode: animated properties are written imperatively by the RAF loop.
    // Only return static props so React doesn't overwrite them on re-renders.
    if (directDOM) {
      const base: CSSProperties = { backgroundColor };
      if (animate && type !== "orb" && animation === "float") {
        base.backgroundSize = "220% 220%";
      }
      return base;
    }

    // Standard React-managed path ↓
    const movingPosition = `${50 + Math.sin(progress * Math.PI * 2) * 22}% ${50 + Math.cos(progress * Math.PI * 2) * 18}%`;
    const pulse = bloomAnimate ? 0.7 + (Math.sin(progress * Math.PI * 2) + 1) * 0.5 : 1;
    const baseBloom = bloom ? Math.max(bloomIntensity, 0.25) : bloomIntensity;
    const bloomLevel = clampBloom(baseBloom + flashBoost) * pulse;

    const dominantColor = bloomColor ?? stops[0]?.color ?? "#7C3AED";
    const glowA = Math.max(bloomBlur * bloomLevel, 0);
    const glowB = Math.max((bloomBlur + bloomSpread * 1.6) * bloomLevel, 0);
    const glowOpacityA = clamp01(0.26 * bloomLevel);
    const glowOpacityB = clamp01(0.15 * bloomLevel);

    const base: CSSProperties = {
      backgroundColor,
      backgroundImage: gradient,
    };

    if (animate && type !== "orb" && animation === "float") {
      base.backgroundSize = "220% 220%";
      base.backgroundPosition = movingPosition;
    }

    if (bloomLevel > 0) {
      const rgbaA = withOpacity(dominantColor, glowOpacityA);
      const rgbaB = withOpacity(dominantColor, glowOpacityB);

      base.filter = `saturate(${1 + bloomLevel * 0.18}) brightness(${1 + bloomLevel * 0.08})`;
      base.boxShadow = `0 0 ${glowA.toFixed(2)}px ${rgbaA}, 0 0 ${glowB.toFixed(2)}px ${rgbaB}`;
    }

    return base;
  }, [
    directDOM,
    gradient,
    backgroundColor,
    animate,
    type,
    animation,
    progress,
    bloom,
    bloomIntensity,
    bloomColor,
    bloomBlur,
    bloomSpread,
    bloomAnimate,
    flashBoost,
    stops,
  ]);

  return {
    gradient,
    style,
    progress,
    speed,
    preset,
    bloom: clampBloom((bloom ? Math.max(bloomIntensity, 0.25) : bloomIntensity) + flashBoost),
    elementRef,
    controls: {
      play,
      pause,
      seek,
      setSpeed: updateSpeed,
      setPreset: updatePreset,
      flash,
      isPlaying,
    },
  };
};

export default useGradient;
