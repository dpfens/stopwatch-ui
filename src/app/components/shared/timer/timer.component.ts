import { Component, input, computed, effect, inject, signal } from '@angular/core';
import { TimeService } from '../../../services/time/time.service';
import { BrowserStateService } from '../../../services/utility/browser/browser-page.service';

@Component({
  selector: 'simple-timer',
  standalone: true,
  template: `{{ displayTime() }}`,
  styles: []
})
export class SimpleTimerComponent {
  private readonly timeService = inject(TimeService);
  private readonly browserState = inject(BrowserStateService);

  getDuration = input.required<() => number>();
  isRunning = input<boolean>(false);
  includeMs = input<boolean>(true);
  
  // Internal state
  private currentDuration = signal(0);
  private intervalId?: number;
  private animationFrameId?: number;
  private shouldBeRunning = signal(false);
  
  // Display the formatted time
  displayTime = computed(() => {
    const ms = this.currentDuration();
    
    try {
      const duration = this.timeService.toDurationObject(ms);
      if (this.includeMs()) {
        return this.timeService.msDurationFormatter.format(duration);
      }
      return this.timeService.durationFormatter.format(duration);
    } catch (error) {
      console.error('Error formatting duration:', error, 'ms:', ms);
      return '00:00:00';
    }
  });

  constructor() {
    // Track running state changes
    effect(() => {
      const running = this.isRunning();
      this.shouldBeRunning.set(running);
      if (running) {
        this.startTimerIfVisible();
      } else {
        this.stopTimer();
        this.updateDuration(); // Update once when stopped
      }
      
      this.includeMs();
    });

    // Handle visibility changes
    effect(() => {
      const isVisible = this.browserState.visibility.isVisible();
      if (isVisible && this.shouldBeRunning()) {
        this.startTimerIfVisible();
      } else if (!isVisible) {
        this.stopTimer();
      }
    });

    effect(() => {
      const hasFocus = this.browserState.visibility.hasFocus();
      if (hasFocus && this.browserState.visibility.isVisible() && this.shouldBeRunning()) {
        this.startTimerIfVisible();
      }
    });
  }

  ngAfterViewInit(): void {
    this.updateDuration();
  }

  private startTimerIfVisible(): void {
    if (!this.browserState.visibility.isVisible() || !this.shouldBeRunning()) {
      return;
    }

    this.stopTimer();
    
    if (this.includeMs()) {
      this.startAnimationFrameTimer();
    } else {
      this.intervalId = window.setInterval(() => {
        if (this.shouldBeRunning() && this.browserState.visibility.isVisible()) {
          this.updateDuration();
        } else {
          this.stopTimer();
        }
      }, 100);
    }
  }

  private startAnimationFrameTimer(): void {
    const animate = () => {
      if (this.shouldBeRunning() && this.browserState.visibility.isVisible()) {
        this.updateDuration();
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = undefined;
      }
    };

    if (this.browserState.visibility.isVisible()) {
      this.animationFrameId = requestAnimationFrame(animate);
    }
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private updateDuration(): void {
    try {
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