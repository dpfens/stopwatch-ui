/**
 * @fileoverview Angular Timer Services with Pause-Aware Functionality
 * 
 * This module provides a comprehensive timer system for Angular v19 applications
 * that automatically pauses when the browser tab becomes hidden and resumes when
 * it becomes visible. It combines Angular's signal-based reactivity with RxJS
 * observables for powerful, responsive timer management.
 * 
 * Key Features:
 * - Signal-based reactive state management
 * - Automatic pause/resume on page visibility changes
 * - Manual pause/resume controls
 * - Multiple concurrent timer support per service
 * - Accurate timing calculations during pause periods
 * - Two timer implementations: RAF-based and setTimeout-based
 * 
 * Services:
 * - BaseTimerService: Abstract foundation for timer implementations
 * - AnimationTimerService: RequestAnimationFrame-based timing for smooth animations
 * - TimerService: setTimeout/setInterval-based timing for precise intervals
 * 
 * @example
 * ```typescript
 * // In your component
 * constructor(
 *   private animationTimer: AnimationTimerService,
 *   private intervalTimer: TimerService
 * ) {}
 * 
 * // Create animation timer
 * const animation$ = this.animationTimer.createTimer({
 *   delay: 2000,
 *   immediate: true
 * });
 * 
 * // Create interval timer
 * const interval$ = this.intervalTimer.createTimer({
 *   delay: 1000,
 *   repeat: true
 * });
 * ```
 * 
 * @author Doug Fenstermacher
 * @version 1.0.0
 * @since Angular 19
 */
import { Injectable, signal, computed, effect, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';


/**
 * Configuration options for creating a timer.
 */
export interface TimerConfig {
  /** 
   * Unique identifier for the timer. If not provided, one will be generated automatically.
   */
  id?: string;
  
  /** 
   * Delay in milliseconds between timer events.
   * For non-repeating timers, this is the duration until completion.
   * For repeating timers, this is the interval between ticks.
   */
  delay: number;
  
  /** 
   * Whether the timer should repeat indefinitely.
   * @default false
   */
  repeat?: boolean;
  
  /** 
   * Whether to emit an immediate tick event when the timer starts.
   * @default false
   */
  immediate?: boolean;
}


/**
 * Events emitted by timer instances throughout their lifecycle.
 */
export interface TimerEvent {
  /** Unique identifier of the timer that emitted this event. */
  id: string;
  
  /** 
   * Type of timer event:
   * - 'start': Timer has been created and started
   * - 'tick': Regular timer event (animation frame or timeout)
   * - 'complete': Timer has finished (non-repeating timers only)
   * - 'pause': Timer has been paused due to visibility or manual pause
   * - 'resume': Timer has been resumed from pause
   * - 'cancel': Timer has been manually cancelled
   */
  type: 'start' | 'tick' | 'complete' | 'pause' | 'resume' | 'cancel';
  
  /** Timestamp when this event was emitted (Date.now()). */
  timestamp: number;
  
  /** 
   * Total elapsed time since the timer started, excluding paused periods.
   * This represents actual "running time" of the timer.
   */
  elapsedTime: number;
}

/**
 * Internal metadata tracked for each active timer instance.
 * Used by the timer services to manage state and pause/resume behavior.
 */
export interface TimerMetadata {
  /** Unique identifier of the timer. */
  id: string;
  
  /** Configuration used to create this timer. */
  config: TimerConfig;
  
  /** Timestamp when the timer was started or last resumed. */
  startTime: number;
  
  /** 
   * Timestamp when the timer was paused, if currently paused.
   * Undefined when the timer is running.
   */
  pausedTime?: number;
  
  /** 
   * Total time the timer has been running, excluding paused periods.
   * Updated when the timer is paused or completed.
   */
  elapsedTime: number;
  
  /** 
   * Remaining time until the timer should complete (for non-repeating timers).
   * Updated when the timer is paused to account for time already elapsed.
   */
  remainingTime: number;
  
  /** Whether the timer is currently active (not completed or cancelled). */
  isActive: boolean;
  
  /** Whether the timer is currently paused. */
  isPaused: boolean;
}


/**
 * Abstract base service for creating pause-aware timer implementations.
 * 
 * This service provides a foundation for timer services that automatically pause
 * when the browser tab becomes hidden and resume when it becomes visible again.
 * It uses Angular signals for reactive state management and RxJS observables
 * for timer event streams.
 * 
 * Key features:
 * - Automatic pause/resume on page visibility changes
 * - Manual pause/resume control
 * - Multiple concurrent timer support
 * - Signal-based reactive state
 * - Accurate time tracking during pause periods
 * - Automatic cleanup on service destruction
 * 
 * @example
 * ```typescript
 * // Extend this class to create specific timer implementations
 * @Injectable({ providedIn: 'root' })
 * export class MyTimerService extends BaseTimerService {
 *   protected createTimerStream(metadata: TimerMetadata): Observable<TimerEvent> {
 *     // Implement timer-specific logic
 *   }
 * }
 * ```
 */
@Injectable()
export abstract class BaseTimerService {
  protected destroyRef = inject(DestroyRef);

  // Signal-based state management
  private _isVisible = signal(true);
  private _isPaused = signal(false);
  protected _activeTimers = signal<Map<string, TimerMetadata>>(new Map());

  /**
   * Read-only signal indicating if the page is currently visible.
   * Automatically updates based on the browser's Page Visibility API.
   */
  readonly isVisible = this._isVisible.asReadonly();
  
  /**
   * Read-only signal indicating if the timer service is manually paused.
   * This is separate from visibility-based pausing.
   */
  readonly isPaused = this._isPaused.asReadonly();
  
  /**
   * Computed signal that indicates if timers can currently run.
   * Timers can run when the page is visible AND not manually paused.
   */
  readonly canRun = computed(() => this._isVisible() && !this._isPaused());
  
  /**
   * Computed signal containing an array of all active timer metadata.
   * Useful for debugging and monitoring timer state.
   */
  readonly activeTimers = computed(() => Array.from(this._activeTimers().values()));
  
  /**
   * Computed signal containing the count of currently active timers.
   */
  readonly activeTimerCount = computed(() => this._activeTimers().size);

  // Event streams
  private timerEvents$ = new Subject<TimerEvent>();
  
  /**
   * Observable stream of all timer events from all active timers.
   * Emits start, tick, complete, pause, resume, and cancel events.
   */
  readonly events$ = this.timerEvents$.asObservable();

  constructor() {
    this.initializeVisibilityDetection();
    this.initializePauseResume();
  }

  /**
   * Manually pause all timers managed by this service.
   * Paused timers will not emit tick events but will maintain their state.
   * Call resume() to continue timer execution.
   */
  pause(): void {
    this._isPaused.set(true);
  }

  /**
   * Resume all manually paused timers.
   * This only resumes timers that were paused via the pause() method,
   * not those paused due to page visibility.
   */
  resume(): void {
    this._isPaused.set(false);
  }

  /**
   * Create a new timer with the specified configuration.
   * 
   * The returned Observable will emit TimerEvent objects throughout the timer's
   * lifecycle. The timer will automatically pause when the page becomes hidden
   * or when the service is manually paused, and resume when conditions allow.
   * 
   * @param config - Configuration for the timer
   * @returns Observable stream of timer events
   * 
   * @example
   * ```typescript
   * // Create a repeating timer that ticks every second
   * const timer$ = timerService.createTimer({
   *   delay: 1000,
   *   repeat: true,
   *   immediate: true
   * });
   * 
   * timer$.subscribe(event => {
   *   console.log(`Timer ${event.id}: ${event.type} at ${event.elapsedTime}ms`);
   * });
   * ```
   */
  createTimer(config: TimerConfig): Observable<TimerEvent> {
    const id = config.id || this.generateTimerId();
    const timerConfig = { ...config, id };

    return new Observable<TimerEvent>(subscriber => {
      const metadata: TimerMetadata = {
        id,
        config: timerConfig,
        startTime: Date.now(),
        elapsedTime: 0,
        remainingTime: config.delay,
        isActive: true,
        isPaused: false
      };

      // Add to registry
      this.addTimer(metadata);

      // Create timer-specific stream that handles pause/resume internally
      const subscription = this.createTimerStream(metadata).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: event => {
          this.timerEvents$.next(event);
          subscriber.next(event);
        },
        error: err => subscriber.error(err),
        complete: () => {
          this.removeTimer(id);
          subscriber.complete();
        }
      });

      // Cleanup function
      return () => {
        subscription.unsubscribe();
        this.removeTimer(id);
      };
    });
  }

  /**
   * Cancel a specific timer by its ID.
   * The timer will emit a 'cancel' event and then complete.
   * 
   * @param id - The ID of the timer to cancel
   */
  cancelTimer(id: string): void {
    const timer = this._activeTimers().get(id);
    if (timer) {
      this.timerEvents$.next({
        id,
        type: 'cancel',
        timestamp: Date.now(),
        elapsedTime: timer.elapsedTime
      });
      this.removeTimer(id);
    }
  }

  /**
   * Cancel all active timers managed by this service.
   * Each timer will emit a 'cancel' event before being removed.
   */
  cancelAllTimers(): void {
    const timers = Array.from(this._activeTimers().keys());
    timers.forEach(id => this.cancelTimer(id));
  }

  /**
   * Abstract method that concrete timer services must implement.
   * This method should create an Observable that emits timer events
   * according to the timer's configuration and the service's specific timing mechanism.
   * 
   * The implementation should:
   * - Respect the timer's pause state by checking this.canRun()
   * - Handle the timer's repeat configuration
   * - Emit appropriate TimerEvent objects
   * - Complete the stream when the timer finishes (for non-repeating timers)
   * 
   * @param metadata - Metadata for the timer to create
   * @returns Observable stream of timer events
   */
  protected abstract createTimerStream(metadata: TimerMetadata): Observable<TimerEvent>;

  /**
   * Initialize page visibility detection using the Page Visibility API.
   * Sets up event listeners to automatically pause/resume timers when
   * the page becomes hidden/visible.
   * 
   * @private
   */
  private initializeVisibilityDetection(): void {
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        this._isVisible.set(!document.hidden);
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup on destroy
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }
  }

  /**
   * Initialize the pause/resume system that responds to changes in the canRun signal.
   * This effect automatically pauses/resumes individual timers when the global
   * pause state or page visibility changes.
   * 
   * @private
   */
  private initializePauseResume(): void {
    // Effect to handle global pause/resume when canRun changes
    effect(() => {
      const canRun = this.canRun();
      const currentTime = Date.now();

      this._activeTimers().forEach(timer => {
        if (canRun && timer.isPaused) {
          this.resumeTimer(timer.id, currentTime);
        } else if (!canRun && !timer.isPaused && timer.isActive) {
          this.pauseTimer(timer.id, currentTime);
        }
      });
    });
  }

  /**
   * Add a timer to the active timer registry and emit a 'start' event.
   * 
   * @param metadata - Timer metadata to add
   * @private
   */
  private addTimer(metadata: TimerMetadata): void {
    this._activeTimers.update(timers => {
      const newTimers = new Map(timers);
      newTimers.set(metadata.id, metadata);
      return newTimers;
    });

    this.timerEvents$.next({
      id: metadata.id,
      type: 'start',
      timestamp: Date.now(),
      elapsedTime: 0
    });
  }

  /**
   * Remove a timer from the active timer registry.
   * 
   * @param id - ID of the timer to remove
   * @private
   */
  private removeTimer(id: string): void {
    this._activeTimers.update(timers => {
      const newTimers = new Map(timers);
      newTimers.delete(id);
      return newTimers;
    });
  }

  /**
   * Pause a specific timer, updating its metadata and emitting a 'pause' event.
   * Calculates and stores the elapsed time and remaining time for the timer.
   * 
   * @param id - ID of the timer to pause
   * @param timestamp - Optional timestamp for the pause (defaults to Date.now())
   * @private
   */
  private pauseTimer(id: string, timestamp = Date.now()): void {
    this._activeTimers.update(timers => {
      const newTimers = new Map(timers);
      const timer = newTimers.get(id);
      
      if (timer && !timer.isPaused) {
        const elapsedSincePause = timestamp - (timer.pausedTime || timer.startTime);
        const newElapsed = timer.elapsedTime + elapsedSincePause;
        
        newTimers.set(id, {
          ...timer,
          isPaused: true,
          pausedTime: timestamp,
          elapsedTime: newElapsed,
          remainingTime: Math.max(0, timer.config.delay - newElapsed)
        });

        this.timerEvents$.next({
          id,
          type: 'pause',
          timestamp,
          elapsedTime: newElapsed
        });
      }
      
      return newTimers;
    });
  }

  /**
   * Resume a specific timer, updating its metadata and emitting a 'resume' event.
   * Adjusts the start time to account for the time spent paused.
   * 
   * @param id - ID of the timer to resume
   * @param timestamp - Optional timestamp for the resume (defaults to Date.now())
   * @private
   */
  private resumeTimer(id: string, timestamp = Date.now()): void {
    this._activeTimers.update(timers => {
      const newTimers = new Map(timers);
      const timer = newTimers.get(id);
      
      if (timer && timer.isPaused) {
        newTimers.set(id, {
          ...timer,
          isPaused: false,
          startTime: timestamp - timer.elapsedTime,
          pausedTime: undefined
        });

        this.timerEvents$.next({
          id,
          type: 'resume',
          timestamp,
          elapsedTime: timer.elapsedTime
        });
      }
      
      return newTimers;
    });
  }

  /**
   * Generate a unique timer ID.
   * Uses current timestamp and random string for uniqueness.
   * 
   * @returns Unique timer identifier
   * @private
   */
  private generateTimerId(): string {
    return `timer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}