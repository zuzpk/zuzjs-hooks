import { clamp } from '@zuzjs/core'
import { RefObject, useEffect, useRef } from 'react'

type ScrollPhysicsOptions = {
  lerpFactor?: number,

  x?: number,
  y?: number,
  
  xMultiplier?: number
  yMultiplier?: number

  scale?: {
    min: number
    max: number
    factor: number
  }

  rotate?: {
    direction?: 1 | -1
    multiplier?: number
  }

}

const useScrollPhysics = (
  ref: RefObject<HTMLElement>, 
  options: ScrollPhysicsOptions
) => {

  const { 
    lerpFactor = 0.1,
    x,
    y,
    xMultiplier = 0.25,
    yMultiplier = 0.25,
    scale,
    rotate,
  } = options

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
    if (typeof window === 'undefined') return

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
      target.current = window.scrollY
      if (!isRunning.current) {
        lastTime.current = performance.now()
        raf.current = requestAnimationFrame(tick)
        isRunning.current = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [lerpFactor, x, y, xMultiplier, yMultiplier, scale, rotate])

  return { position, velocity }
}

export default useScrollPhysics
