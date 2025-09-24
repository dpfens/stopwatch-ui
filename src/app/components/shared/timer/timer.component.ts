import { Component, input, computed, effect, inject, DestroyRef, signal } from '@angular/core';
import { TimeService } from '../../../services/time/time.service';

@Component({
  selector: 'simple-timer',
  standalone: true,
  template: `{{ displayTime() }}`,
  styles: [``]
})
export class SimpleTimerComponent {
  private readonly timeService = inject(TimeService);

  // Simple inputs - fixed the type issue
  getDuration = input.required<() => number>();
  isRunning = input<boolean>(false);
  includeMs = input<boolean>(true);

  // Internal state
  private currentDuration = signal(0);
  private intervalId?: number;
  
  // Display the formatted time
  displayTime = computed(() => {
    const ms = this.currentDuration();
    
    try {
      const duration = this.timeService.toDurationObject(ms);
      
      // Only show milliseconds if requested and duration < 1 minute
      if (!this.includeMs() || ms >= 60000) {
        duration.milliseconds = 0;
      }
      
      return this.timeService.durationFormatter().format(duration);
    } catch (error) {
      console.error('Error formatting duration:', error, 'ms:', ms);
      return '00:00:00';
    }
  });

  constructor() {
    // Update timer when running state changes
    effect(() => {
      if (this.isRunning()) {
        this.startTimer();
      } else {
        this.stopTimer();
        this.updateDuration(); // Update once when stopped
      }
    });
  }

  ngAfterViewInit(): void {
    // Initial update after the component and its inputs are fully initialized
    this.updateDuration();
  }

  private startTimer(): void {
    this.stopTimer(); // Clear any existing timer
    // Use simple setInterval instead of complex timer services for now
    this.intervalId = window.setInterval(() => {
      if (this.isRunning()) {
        this.updateDuration();
      }
    }, 100);
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private updateDuration(): void {
    try {
      // Add safety checks
      const getDurationFn = this.getDuration();
      if (typeof getDurationFn !== 'function') {
        console.error('getDuration is not a function:', getDurationFn);
        return;
      }
      
      const duration = getDurationFn();
      
      if (typeof duration !== 'number' || isNaN(duration)) {
        console.error('Invalid duration returned:', duration);
        return;
      }
      this.currentDuration.set(Math.max(0, duration));
    } catch (error) {
      console.error('Error in updateDuration:', error);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}