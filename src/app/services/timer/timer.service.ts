import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseTimerService, TimerEvent, TimerMetadata } from './base-timer.service';

/**
 * Timer service implementation using setTimeout/setInterval for precise timing.
 * 
 * This service provides high-precision timing using the standard setTimeout and
 * setInterval browser APIs. It's ideal for time-based operations that require
 * exact delays and don't need to be synchronized with the display refresh rate.
 * 
 * Key characteristics:
 * - Precise timing based on specified millisecond delays
 * - Supports both single-shot and repeating timers
 * - Automatically pauses and accurately resumes on visibility changes
 * - Maintains accurate remaining time calculations during pause
 * - Better suited for business logic timing than animation
 * - Lower resource usage than requestAnimationFrame for infrequent events
 * 
 * @example
 * ```typescript
 * // Inject the service
 * constructor(private timerService: TimerService) {}
 * 
 * // Create a precise interval timer
 * const intervalTimer$ = this.timerService.createTimer({
 *   delay: 5000,        // Every 5 seconds
 *   repeat: true,       // Keep repeating
 *   immediate: false    // Don't fire immediately
 * });
 * 
 * intervalTimer$.subscribe(event => {
 *   if (event.type === 'tick') {
 *     console.log('5 seconds elapsed', event.elapsedTime);
 *   }
 * });
 * 
 * // Create a one-shot timer
 * const timeoutTimer$ = this.timerService.createTimer({
 *   delay: 10000,       // Wait 10 seconds
 *   repeat: false       // Fire once only
 * });
 * 
 * timeoutTimer$.subscribe(event => {
 *   if (event.type === 'complete') {
 *     console.log('Timer completed after', event.elapsedTime, 'ms');
 *   }
 * });
 * ```
 */
@Injectable({
  providedIn: 'root'
})
export class TimerService extends BaseTimerService {
  
  /**
   * Creates a timer stream using setTimeout/setInterval for precise timing.
   * 
   * This implementation handles complex pause/resume logic by:
   * - Using setTimeout for precise delay control
   * - Monitoring pause state changes via the canRun() signal
   * - Calculating remaining time when paused and resuming with correct delay
   * - Supporting both single-shot and repeating timer modes
   * - Maintaining accurate elapsed time tracking across pause/resume cycles
   * 
   * The timer automatically adjusts its behavior when paused by clearing
   * active timeouts and rescheduling them with adjusted delays when resumed.
   * This ensures that the total elapsed time remains accurate regardless
   * of how many pause/resume cycles occur.
   * 
   * @param metadata - Timer configuration and tracking metadata
   * @returns Observable stream that emits TimerEvent objects at specified intervals
   * 
   * @protected
   */
  protected createTimerStream(metadata: TimerMetadata): Observable<TimerEvent> {
    return new Observable<TimerEvent>(subscriber => {
      let timeoutId: number | undefined;
      let intervalId: number | undefined;
      let startTime = Date.now();
      let pauseStartTime: number | undefined;
      let accumulatedTime = 0;
      let isCompleted = false;

      /**
       * Schedules the next timer event with the specified delay.
       * Handles both single-shot and repeating timer logic.
       * 
       * @param delay - Milliseconds to wait before the next timer event
       */
      const scheduleNext = (delay: number) => {
        if (isCompleted) return;

        timeoutId = window.setTimeout(() => {
          if (isCompleted) return;

          const timer = this._activeTimers().get(metadata.id);
          if (!timer || !timer.isActive) {
            return;
          }

          // Check if we can run (not paused and page visible)
          if (!this.canRun() || timer.isPaused) {
            // If paused, reschedule with the same delay
            scheduleNext(delay);
            return;
          }

          const currentTime = Date.now();
          
          // Update accumulated time only if we weren't paused
          if (!pauseStartTime) {
            accumulatedTime += delay;
          }

          const event: TimerEvent = {
            id: metadata.id,
            type: 'tick',
            timestamp: currentTime,
            elapsedTime: accumulatedTime
          };

          subscriber.next(event);

          if (metadata.config.repeat) {
            // For repeating timers, schedule the next tick
            scheduleNext(metadata.config.delay);
          } else {
            // For single-shot timers, complete after emitting
            isCompleted = true;
            subscriber.next({
              ...event,
              type: 'complete'
            });
            subscriber.complete();
          }
        }, delay);
      };

      /**
       * Handles pause and resume logic by checking the current canRun state.
       * This is called periodically to detect state changes.
       */
      const checkPauseState = () => {
        if (isCompleted) return;

        const timer = this._activeTimers().get(metadata.id);
        if (!timer || !timer.isActive) return;

        const canRun = this.canRun() && !timer.isPaused;
        const currentTime = Date.now();

        if (!canRun && !pauseStartTime) {
          // Starting pause - cancel active timers and record pause time
          pauseStartTime = currentTime;
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = undefined;
          }
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = undefined;
          }
        } else if (canRun && pauseStartTime) {
          // Resuming from pause - reschedule with appropriate delay
          pauseStartTime = undefined;
          
          if (metadata.config.repeat) {
            // For repeating timers, use the full delay
            scheduleNext(metadata.config.delay);
          } else {
            // For single-shot timers, use remaining time
            const remainingTime = Math.max(0, metadata.config.delay - accumulatedTime);
            if (remainingTime > 0) {
              scheduleNext(remainingTime);
            }
          }
        }

        // Schedule next pause state check
        if (!isCompleted) {
          setTimeout(checkPauseState, 100); // Check every 100ms
        }
      };

      // Emit immediate tick if configured
      if (metadata.config.immediate) {
        subscriber.next({
          id: metadata.id,
          type: 'tick',
          timestamp: startTime,
          elapsedTime: 0
        });
      }

      // Start the timer with initial delay
      if (metadata.config.repeat) {
        scheduleNext(metadata.config.delay);
      } else {
        scheduleNext(metadata.config.delay);
      }

      // Start monitoring pause/resume state
      checkPauseState();

      /**
       * Cleanup function called when the Observable is unsubscribed.
       * Clears any active timeouts/intervals.
       */
      return () => {
        isCompleted = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    });
  }
}