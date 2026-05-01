/**
 * Unified render batcher — inspired by motion-dom/frameloop.
 * 
 * Coalesces all animation updates (scroll, entry, lerp, auto-play) into a single
 * RAF callback to minimize GPU compositing and improve perf on scroll-heavy animations.
 */

export type StepName = 'preUpdate' | 'update' | 'preRender' | 'render'

export type FrameData = {
    delta: number
    timestamp: number
    isProcessing: boolean
}

export type ProcessFn = (frameData: FrameData) => void

export interface RenderStep {
    schedule: (process: ProcessFn, keepAlive?: boolean, immediate?: boolean) => ProcessFn
    cancel: (process: ProcessFn) => void
    process: (frameData: FrameData) => void
}

export interface RenderBatch {
    schedule: (step: StepName, process: ProcessFn, keepAlive?: boolean, immediate?: boolean) => ProcessFn
    cancel: (process: ProcessFn) => void
    state: FrameData
}

/**
 * Create a unified render batcher.
 * 
 * Usage:
 *   const batch = createRenderBatch()
 *   
 *   // In scroll handler:
 *   batch.schedule('preUpdate', updateScrollDelta)
 *   
 *   // In entry ticker:
 *   batch.schedule('update', updateEntryProgress, true)  // keepAlive
 *   
 *   // All updates batch into single RAF callback
 */
export function createRenderBatch(): RenderBatch {
    const stepOrder: StepName[] = ['preUpdate', 'update', 'preRender', 'render']
    
    let runNextFrame = false
    let useDefaultElapsed = true
    const state: FrameData = {
        delta: 0.0,
        timestamp: 0.0,
        isProcessing: false,
    }

    const flagRunNextFrame = () => {
        runNextFrame = true
    }

    // Create a render step for each phase
    const steps = new Map<StepName, RenderStep>()
    
    stepOrder.forEach((stepName) => {
        let thisFrame = new Set<ProcessFn>()
        let nextFrame = new Set<ProcessFn>()
        let isProcessing = false
        let flushNextFrame = false
        const toKeepAlive = new WeakSet<ProcessFn>()
        let latestFrameData: FrameData = { delta: 0, timestamp: 0, isProcessing: false }

        const step: RenderStep = {
            schedule: (callback, keepAlive = false, immediate = false) => {
                const addToCurrentFrame = immediate && isProcessing
                const queue = addToCurrentFrame ? thisFrame : nextFrame

                if (keepAlive) toKeepAlive.add(callback)
                queue.add(callback)

                return callback
            },

            cancel: (callback) => {
                nextFrame.delete(callback)
                toKeepAlive.delete(callback)
            },

            process: (frameData) => {
                latestFrameData = frameData

                if (isProcessing) {
                    flushNextFrame = true
                    return
                }

                isProcessing = true

                // Swap queues to avoid GC
                const prevFrame = thisFrame
                thisFrame = nextFrame
                nextFrame = prevFrame
                nextFrame.clear()

                // Execute all callbacks in this step
                thisFrame.forEach((callback) => {
                    if (toKeepAlive.has(callback)) {
                        step.schedule(callback)
                        flagRunNextFrame()
                    }

                    callback(latestFrameData)
                })

                isProcessing = false

                if (flushNextFrame) {
                    flushNextFrame = false
                    flagRunNextFrame()
                }
            },
        }

        steps.set(stepName, step)
    })

    const processBatch = () => {
        const timestamp = performance.now()
        runNextFrame = false

        state.delta = useDefaultElapsed ? 1000 / 60 : Math.max(Math.min(timestamp - state.timestamp, 40), 1)
        state.timestamp = timestamp
        state.isProcessing = true

        // Execute all steps in order
        stepOrder.forEach((stepName) => {
            const step = steps.get(stepName)!
            step.process(state)
        })

        state.isProcessing = false

        if (runNextFrame) {
            useDefaultElapsed = false
            scheduleNextFrame(processBatch)
        }
    }

    const scheduleNextFrame = (callback: FrameRequestCallback) => {
        requestAnimationFrame(callback)
    }

    const wake = () => {
        runNextFrame = true
        useDefaultElapsed = true

        if (!state.isProcessing) {
            scheduleNextFrame(processBatch)
        }
    }

    return {
        schedule: (stepName, process, keepAlive = false, immediate = false) => {
            if (!runNextFrame) wake()
            const step = steps.get(stepName)
            return step!.schedule(process, keepAlive, immediate)
        },

        cancel: (process) => {
            stepOrder.forEach((stepName) => {
                steps.get(stepName)!.cancel(process)
            })
        },

        state,
    }
}
