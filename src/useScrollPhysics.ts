import { clamp } from '@zuzjs/core'
import { RefObject, useEffect, useRef } from 'react'

/**
 * Configuration options for scroll physics animations.
 * 
 * @example
 * ```tsx
 * // Basic parallax effect
 * const options: ScrollPhysicsOptions = {
 *   y: 1,
 *   yMultiplier: 0.3
 * }
 * 
 * // With scale and rotation
 * const options: ScrollPhysicsOptions = {
 *   y: 1,
 *   yMultiplier: 0.5,
 *   scale: {
 *     min: 0.8,
 *     max: 1,
 *     factor: 0.001
 *   },
 *   rotate: {
 *     direction: 1,
 *     multiplier: 0.1
 *   }
 * }
 * ```
 */
export type ScrollPhysicsOptions = {
  /**
   * Linear interpolation factor for smooth animations.
   * Controls how smoothly the element follows the scroll position.
   * Lower values = smoother but slower response.
   * @default 0.1
   * @example
   * lerpFactor: 0.05 // Very smooth, slow response
   * lerpFactor: 0.2 // Quick response, less smooth
   */
  lerpFactor?: number,

  /**
   * Horizontal translation multiplier.
   * The element will move horizontally based on scroll position.
   * Positive values move right, negative values move left.
   * @example
   * x: 1 // Move horizontally with scroll
   * x: 2 // Double the scroll distance
   */
  x?: number,

  /**
   * Vertical translation multiplier.
   * The element will move vertically based on scroll position.
   * Positive values move down, negative values move up.
   * @example
   * y: 1 // Move vertically with scroll
   * y: -1 // Move in opposite direction
   */
  y?: number,
  
  /**
   * Additional multiplier for horizontal axis.
   * Fine-tunes the horizontal movement intensity.
   * @default 0.25
   * @example
   * xMultiplier: 0.5 // Moderate horizontal movement
   * xMultiplier: 1 // Full horizontal movement
   */
  xMultiplier?: number

  /**
   * Additional multiplier for vertical axis.
   * Fine-tunes the vertical movement intensity.
   * @default 0.25
   * @example
   * yMultiplier: 0.3 // Subtle parallax effect
   * yMultiplier: 0.8 // Strong parallax effect
   */
  yMultiplier?: number

  /**
   * Scale configuration for zoom effects based on scroll velocity.
   * Creates a dynamic scaling effect that responds to scroll speed.
   * @example
   * scale: {
   *   min: 0.8,    // Minimum scale (when scrolling fast)
   *   max: 1,      // Maximum scale (when not scrolling)
   *   factor: 0.001 // How quickly scale changes with velocity
   * }
   */
  scale?: {
    /** Minimum scale value (typically < 1) */
    min: number
    /** Maximum scale value (typically 1) */
    max: number
    /** Velocity sensitivity factor */
    factor: number
  }

  /**
   * Rotation configuration for spin effects based on scroll velocity.
   * Creates a dynamic rotation effect that responds to scroll speed.
   * @example
   * rotate: {
   *   direction: 1,      // Clockwise rotation
   *   multiplier: 0.05   // Subtle rotation
   * }
   * 
   * rotate: {
   *   direction: -1,     // Counter-clockwise rotation
   *   multiplier: 0.2   // Strong rotation
   * }
   */
  rotate?: {
    /**
     * Rotation direction.
     * 1 = clockwise, -1 = counter-clockwise
     * @default 1
     */
    direction?: 1 | -1
    /**
     * Rotation intensity multiplier.
     * Higher values = more rotation per scroll velocity.
     * @default 1
     */
    multiplier?: number
  }

}

/**
 * A React hook that applies physics-based scroll animations to elements.
 * Creates smooth, performant animations like parallax, scaling, and rotation
 * effects that respond to scroll position and velocity.
 * 
 * @param ref - Reference to the target HTML element to animate
 * @param options - Scroll physics configuration options
 * @param scrollContainer - Optional reference to a custom scroll container (defaults to window)
 * 
 * @returns Object containing current position and velocity refs
 * 
 * @example
 * ```tsx
 * // Basic parallax effect
 * const ref = useRef<HTMLDivElement>(null);
 * useScrollPhysics(ref, {
 *   y: 1,
 *   yMultiplier: 0.3
 * });
 * 
 * // With scale and rotation
 * useScrollPhysics(ref, {
 *   y: 1,
 *   yMultiplier: 0.5,
 *   scale: {
 *     min: 0.9,
 *     max: 1,
 *     factor: 0.0005
 *   },
 *   rotate: {
 *     direction: 1,
 *     multiplier: 0.05
 *   }
 * });
 * 
 * // With custom scroll container
 * const scrollRef = useRef<HTMLDivElement>(null);
 * useScrollPhysics(ref, { y: 1 }, scrollRef);
 * ```
 * 
 * @remarks
 * - Uses requestAnimationFrame for smooth 60fps animations
 * - Automatically cleans up event listeners on unmount
 * - Only activates when ref, options, and scroll container are all available
 * - Works with both window scroll and custom scroll containers
 * - Applies CSS transforms (translate3d, scale, rotate) for GPU acceleration
 */
const useScrollPhysics = (
  ref?: RefObject<HTMLElement> | null, 
  options?: ScrollPhysicsOptions,
  scrollContainer?: RefObject<HTMLElement> | null
) => {

  const { 
    lerpFactor = 0.1,
    x,
    y,
    xMultiplier = 0.25,
    yMultiplier = 0.25,
    scale,
    rotate,
  } = options || {}

  const position = useRef(0)
  const velocity = useRef(0)

  const current = useRef(0)
  const target = useRef(0)
  const lastTime = useRef(performance.now())
  const raf = useRef<number | null>(null)
  const isRunning = useRef(false)
  const smoothedVelocity = useRef(0)

  const threshold = 0.2 // minimum delta to trigger animation

  useEffect(() => {
    // Only run if ref, options are provided, and we're in the browser
    if (typeof window === 'undefined' || !ref?.current || !options) return

    // Use provided scroll container or window
    const scrollElement = scrollContainer?.current || window

    const tick = () => {
      const now = performance.now()
      const dt = (now - lastTime.current) / 1000
      lastTime.current = now

      const delta = target.current - current.current
      const v = delta / dt

      // Update position & velocity
      current.current += delta * lerpFactor
      position.current = current.current
      
      velocity.current = v
      smoothedVelocity.current += (v - smoothedVelocity.current) * lerpFactor

      // Apply transform
      if (ref.current) {

        const translateX = x ? position.current * x * xMultiplier : 0
        const translateY = y ? position.current * y * yMultiplier : 0

        const scaleValue = scale
          ? clamp(
            scale.max - Math.abs(smoothedVelocity.current) * scale.factor, 
            scale.min, 
            scale.max
          ) : 1

        const rotateValue = rotate
          ? velocity.current * (rotate.multiplier ?? 1) * (rotate.direction ?? 1)
          : 0

        ref.current.style.transform = `
          translate3d(${translateX}px, ${translateY}px, 0)
          scale(${scaleValue})
          rotate(${rotateValue}deg)
        `.trim()

      }

      // If still moving, continue animating
      if (Math.abs(delta) > threshold || Math.abs(v) > threshold) {
        raf.current = requestAnimationFrame(tick)
      } else {
        isRunning.current = false
        raf.current = null
      }
    }

    const handleScroll = () => {
      // Get scroll position from container or window
      target.current = scrollContainer?.current 
        ? scrollContainer.current.scrollTop 
        : window.scrollY
        
      if (!isRunning.current) {
        lastTime.current = performance.now()
        raf.current = requestAnimationFrame(tick)
        isRunning.current = true
      }
    }

    scrollElement.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [lerpFactor, x, y, xMultiplier, yMultiplier, scale, rotate, ref, options, scrollContainer])

  return { position, velocity }
}

export default useScrollPhysics
