import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseTimerService } from './base-timer.service';
import { TimerEvent, TimerMetadata } from './base-timer.service';

/**
 * Timer service implementation using requestAnimationFrame for smooth animations.
 * 
 * This service is optimized for animation-related timing where you need consistent
 * frame-rate based updates. It leverages the browser's requestAnimationFrame API
 * to provide timing that's synchronized with the display refresh rate.
 * 
 * Key characteristics:
 * - Runs at the browser's refresh rate (typically 60fps)
 * - Automatically pauses when page is hidden or manually paused
 * - Ideal for animations, visual effects, and smooth UI updates
 * - More CPU-efficient than high-frequency setTimeout
 * - Automatically throttled by browser when tab is inactive
 * 
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private animationTimer: AnimationTimerService) {}
 * 
 * // Create a smooth animation timer
 * const animationTimer$ = this.animationTimer.createTimer({
 *   delay: 2000,        // Run for 2 seconds
 *   immediate: true,    // Start immediately
 *   repeat: false       // Don't repeat
 * });
 * 
 * animationTimer$.subscribe(event => {
 *   if (event.type === 'tick') {
 *     // Update animation based on elapsed time
 *     const progress = event.elapsedTime / 2000; // 0 to 1
 *     this.updateAnimation(progress);
 *   }
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class AnimationTimerService extends BaseTimerService {
  
  /**
   * Creates a timer stream using requestAnimationFrame for smooth animation timing.
   * 
   * This implementation:
   * - Uses requestAnimationFrame for consistent frame-rate timing
   * - Tracks accumulated running time excluding paused periods
   * - Handles pause/resume by monitoring the canRun() signal
   * - Automatically completes when delay is reached (for non-repeating timers)
   * - Continues indefinitely for repeating timers
   * 
   * The timer respects pause state by continuing to schedule animation frames
   * but not incrementing the accumulated time or emitting tick events when paused.
   * This ensures smooth resumption without timing gaps.
   * 
   * @param metadata - Timer configuration and tracking metadata
   * @returns Observable stream that emits TimerEvent objects on each animation frame
   * 
   * @protected
   */
  protected createTimerStream(metadata: TimerMetadata): Observable<TimerEvent> {
    return new Observable<TimerEvent>(subscriber => {
      let animationId: number;
      let lastResumeTime = Date.now();
      let accumulatedTime = 0;

      /**
       * Animation frame callback that handles timing logic.
       * Called on each browser animation frame (typically 60fps).
       * 
       * @param currentTime - High-resolution timestamp from requestAnimationFrame
       */
      const tick = (currentTime: number) => {
        const timer = this._activeTimers().get(metadata.id);
        if (!timer || !timer.isActive) {
          return;
        }

        // Check if we can run (visible and not paused)
        if (!this.canRun() || timer.isPaused) {
          // If paused, schedule next frame but don't emit or accumulate time
          animationId = requestAnimationFrame(tick);
          return;
        }

        // Calculate elapsed time since last resume
        const timeSinceResume = currentTime - lastResumeTime;
        accumulatedTime += timeSinceResume;
        lastResumeTime = currentTime;

        const event: TimerEvent = {
          id: metadata.id,
          type: 'tick',
          timestamp: currentTime,
          elapsedTime: accumulatedTime
        };

        subscriber.next(event);

        // Check if timer should complete (for non-repeating timers)
        if (!metadata.config.repeat && accumulatedTime >= metadata.config.delay) {
          subscriber.next({
            ...event,
            type: 'complete'
          });
          subscriber.complete();
          return;
        }

        // Schedule next animation frame
        animationId = requestAnimationFrame(tick);
      };

      // Start immediately if configured
      if (metadata.config.immediate) {
        subscriber.next({
          id: metadata.id,
          type: 'tick',
          timestamp: lastResumeTime,
          elapsedTime: 0
        });
      }

      // Start the animation loop
      animationId = requestAnimationFrame(tick);

      /**
       * Cleanup function called when the Observable is unsubscribed.
       * Cancels any pending animation frame to prevent memory leaks.
       */
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    });
  }
}