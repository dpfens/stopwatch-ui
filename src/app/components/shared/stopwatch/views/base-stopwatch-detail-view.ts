import { AfterViewInit, Component, computed, EventEmitter, inject, Output, signal, WritableSignal, DestroyRef, OnDestroy, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { ContextualStopwatchEntity, IStopwatchStateController, SelectOptGroup, StopwatchEvent, UniqueIdentifier, UnitValue } from '../../../../models/sequence/interfaces';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { CachedStopwatchStateController } from '../../../../controllers/stopwatch/cached-stopwatch-state-controller';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DurationFormatOptions, TimeService } from '../../../../services/time/time.service';
import { LapUnits, Time } from '../../../../utilities/constants';
import { AnimationTimerService } from '../../../../services/timer/animation-timer.service';
import { TimerService } from '../../../../services/timer/timer.service';
import { FormControl, FormGroup, FormsModule } from '@angular/forms';
import { TZDate } from '../../../../models/date';
import { GroupService } from '../../../../services/group/group.service';

type DurationCalculator = () => number;
type DurationUpdater = (durationMs: number, durationFormat: DurationFormatOptions) => void;

interface VisibleSplit {
  duration: Intl.Duration;
  event: StopwatchEvent;
  unit?: UnitValue
}

/**
 * Timer subscription tracking for proper cleanup and management.
 */
interface TimerSubscription {
  id: string;
  calculator: DurationCalculator;
  updater: DurationUpdater;
  subscription?: any;
  lastDuration: number;
}

@Component({
  selector: 'base-stopwatch-detail-view',
  imports: [FormsModule],
  template: ''
})
export class BaseStopwatchDetailViewComponent implements AfterViewInit, OnDestroy {
  protected readonly service = inject(StopwatchService);
  protected readonly groupService = inject(GroupService);

  protected readonly timeService = inject(TimeService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly animationTimer = inject(AnimationTimerService);
  protected readonly intervalTimer = inject(TimerService);
  protected readonly destroyRef = inject(DestroyRef);
  id = input.required<UniqueIdentifier>();
  instance = computed(() => 
    this.service.instances().find(inst => inst.id === this.id())
  );

  getInstance(): ContextualStopwatchEntity {
    const inst = this.instance();
    if (!inst) {
      throw new Error(`Stopwatch ${this.id()} not found`);
    }
    return inst;
  }

  groups = this.groupService.instances;
  loading = this.service.isLoading;
  error = this.service.error;
  displaySettings = signal(false);
  lapUnits: SelectOptGroup<string>[] = LapUnits;

  totalDuration: WritableSignal<DurationFormatOptions> = signal({milliseconds: Time.ZERO});
  splitDuration: WritableSignal<DurationFormatOptions | undefined> = signal(undefined);
  lapDuration: WritableSignal<DurationFormatOptions | undefined> = signal(undefined);
  visibleSplits: WritableSignal<VisibleSplit[]> = signal([]);

  settingsForm = new FormGroup({
    title: new FormControl(''),
    description: new FormControl(''),
    lapValue: new FormControl<number>(0),
    lapUnit: new FormControl('m'),
    groups: new FormControl<UniqueIdentifier[]>([])
  });
  /**
   * Tracks active timer subscriptions for proper cleanup.
   * @private
   */
  private activeTimers: Map<string, TimerSubscription> = new Map();

  /**
   * Subject for coordinating timer cleanup.
   * @private
   */
  private stopTimers$ = new Subject<void>();

  ngAfterViewInit(): void {
    const controller = this.controller();
    if (controller.isActive()) {
      this.buildSplits();
      if (controller.isRunning()) {
        this.startClock();
      } else {
        const rawTotalElapsedTime = controller.getElapsedTime();
        this.totalDuration.set(this.timeService.toDurationObject(rawTotalElapsedTime));

        const lastSplitEvent = controller.getState().sequence.findLast(event => event.type === 'split');
        const rawSplitElapsedTime = lastSplitEvent ? controller.getElapsedTimeBetweenEvents(lastSplitEvent.id, null) : 0;
        this.splitDuration.set(this.timeService.toDurationObject(rawSplitElapsedTime));

        const lastLapEvent = controller.getState().sequence.findLast(event => event.type === 'lap');
        const rawLapElapsedTime = lastLapEvent ? controller.getElapsedTimeBetweenEvents(lastLapEvent.id, null) : 0;
        this.lapDuration.set(this.timeService.toDurationObject(rawLapElapsedTime));
      }
    }
  }

  ngOnDestroy(): void {
    // Only cancel timers specific to this stopwatch instance
    this.cancelInstanceTimers();
  }
  
  private _controllerCache?: IStopwatchStateController;
  
  readonly controller = computed(() => {
    const instance = this.getInstance();
    if (!instance) {
      throw new Error('Instance must be set before accessing controller');
    }
    if (!this._controllerCache) {
      this._controllerCache = new CachedStopwatchStateController(instance.state);
    }
    return this._controllerCache;
  });

  async start() {
    const now = new Date();
    this.controller().start(now);
    this.startClock();
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async stop() {
    const now = new Date();
    this.controller().stop(now);
    this.cancelInstanceTimers();
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async resume() {
    const now = new Date();
    this.controller().resume(now);
    this.startClock();
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async lap() {
    const now = new Date();
    const eventType = 'lap';
    const eventName = this.findAvailableEventName(eventType);
    this.controller().addEvent(eventType, eventName, now);
    const state = this.controller().getState();
    if (state.lap) {
      const lapEvents = this.controller().getEvents('lap');
      const lastLapEvent = lapEvents.at(-1);
      if (lastLapEvent) {
        lastLapEvent.unit = {value: state.lap!.value * lapEvents.length, unit: state.lap?.unit};
      }
    }

    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    this.buildSplits();
    await this.service.update({...this.getInstance(), metadata, state});
  }

  async split() {
    const now = new Date();
    const eventType = 'split';
    const eventName = this.findAvailableEventName(eventType);
    this.controller().addEvent(eventType, eventName, now);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    this.buildSplits();
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async reset() {
    const now = new Date();
    this.controller().reset(now);
    const defaultTime = {milliseconds: 0};
    this.totalDuration.set(defaultTime);
    this.splitDuration.set(undefined);
    this.lapDuration.set(undefined);
    this.visibleSplits.set([]);
    this.cancelInstanceTimers();

    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async fork() {
    const newInstance = {
      ...this.getInstance(),
      id: crypto.randomUUID(),
      state: this.controller().getState(),
      metadata: {
        ...this.getInstance().metadata,
        clone: { source: this.getInstance().id}
      }
    };
    await this.service.create(newInstance);
  }

  async delete() {
    const instance = this.getInstance();
    await this.service.delete(instance.id);
    this.snackbar.open(`Deleted stopwatch "${instance.annotation.title || instance.id}"`, 'Close');
    setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  /**
   * Starts all duration timers using the appropriate timer service based on duration.
   * Automatically switches between fast (RAF) and slow (setTimeout) timers as needed.
   */
  startClock() {
    // Stop any existing timers for this instance first
    this.cancelInstanceTimers();

    // Start updating total duration
    this.startDurationTimer(
      'total',
      () => this.controller().getElapsedTime(),
      (durationMs, durationFormat) => {
        this.totalDuration.set(durationFormat);
      }
    );

    // Start updating split duration if we have split events
    this.startDurationTimer(
      'split',
      () => {
        const lastSplitEvent = this.controller().getState().sequence.findLast(event => event.type === 'split');
        return lastSplitEvent ? this.controller().getElapsedTimeBetweenEvents(lastSplitEvent.id, null) : 0;
      },
      (durationMs, durationFormat) => {
        if (durationMs > 0) {
          this.splitDuration.set(durationFormat);
        } else {
          this.splitDuration.set(undefined);
        }
      }
    );

    // Start updating lap duration if we have lap events
    this.startDurationTimer(
      'cyclic',
      () => {
        const lastLapEvent = this.controller().getState().sequence.findLast(event => event.type === 'lap');
        return lastLapEvent ? this.controller().getElapsedTimeBetweenEvents(lastLapEvent.id, null) : 0;
      },
      (durationMs, durationFormat) => {
        if (durationMs > 0) {
          this.lapDuration.set(durationFormat);
        } else {
          this.lapDuration.set(undefined);
        }
      }
    );
  }

  /**
   * Starts a duration timer using the appropriate timer service.
   * Automatically switches between AnimationTimerService (for smooth updates under 1 minute)
   * and TimerService (for efficient updates over 1 minute).
   * 
   * @param timerType - Type of timer ('total', 'split', 'lap')
   * @param calculateDuration - Function that returns the current duration in milliseconds
   * @param updateCallback - Function that updates the appropriate signal/display
   * @private
   */
  private startDurationTimer(
    timerType: string,
    calculateDuration: DurationCalculator,
    updateCallback: DurationUpdater
  ) {
    if (!this.controller().isRunning()) {
      return;
    }

    // Create instance-specific timer ID
    const timerId = `${this.getInstance().id}-${timerType}`;

    // Calculate initial duration to determine timer type
    const initialDuration = calculateDuration();
    const durationFormat = this.timeService.toDurationObject(initialDuration);
    updateCallback(initialDuration, durationFormat);

    // Create timer subscription record
    const timerSub: TimerSubscription = {
      id: timerId,
      calculator: calculateDuration,
      updater: updateCallback,
      lastDuration: initialDuration
    };

    // Choose appropriate timer service based on duration
    const useAnimationTimer = initialDuration < Time.ONE_MINUTE;
    const timerService = useAnimationTimer ? this.animationTimer : this.intervalTimer;
    
    // Create timer configuration with instance-specific ID
    const timerConfig = {
      id: timerId,
      delay: useAnimationTimer ? Time.ONE_MINUTE : Time.ONE_SECOND, // Switch threshold or interval
      repeat: true,
      immediate: false
    };

    // Subscribe to timer events
    timerSub.subscription = timerService.createTimer(timerConfig).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (event) => {
        if (event.type === 'tick') {
          this.updateDuration(timerSub);
        }
      },
      error: (error) => {
        console.error(`Timer ${timerId} error:`, error);
      }
    });

    // Store the subscription for cleanup
    this.activeTimers.set(timerId, timerSub);
  }

  /**
   * Updates a duration timer and potentially switches timer types based on duration.
   * 
   * @param timerSub - Timer subscription to update
   * @private
   */
  private updateDuration(timerSub: TimerSubscription) {
    if (!this.controller().isRunning()) {
      return;
    }

    const currentDuration = timerSub.calculator();
    const durationFormat = this.timeService.toDurationObject(currentDuration);
    timerSub.updater(currentDuration, durationFormat);

    // Check if we need to switch timer types
    const wasUnderMinute = timerSub.lastDuration < Time.ONE_MINUTE;
    const isUnderMinute = currentDuration < Time.ONE_MINUTE;

    if (wasUnderMinute !== isUnderMinute) {
      // Cancel current subscription
      if (timerSub.subscription) {
        timerSub.subscription.unsubscribe();
      }

      // Extract timer type from the ID (format: instanceId-timerType)
      const timerType = timerSub.id.split('-').pop() || 'unknown';
      
      // Restart with new timer type
      this.startDurationTimer(timerType, timerSub.calculator, timerSub.updater);
    }

    timerSub.lastDuration = currentDuration;
  }

  /**
   * Cancels all timers specific to this stopwatch instance.
   * Does not affect timers from other stopwatch instances.
   * @private
   */
  private cancelInstanceTimers(): void {
    const instanceId = this.id();
    const timerTypes = ['total', 'split', 'lap'];
    
    timerTypes.forEach(timerType => {
      const timerId = `${instanceId}-${timerType}`;
      
      // Cancel timer in the appropriate service
      this.animationTimer.cancelTimer(timerId);
      this.intervalTimer.cancelTimer(timerId);
      
      // Clean up local subscription tracking
      const timerSub = this.activeTimers.get(timerId);
      if (timerSub?.subscription) {
        timerSub.subscription.unsubscribe();
      }
      this.activeTimers.delete(timerId);
    });
  }

  /**
   * Stops all active timers and cleans up subscriptions.
   * @deprecated Use cancelInstanceTimers() instead to avoid affecting other instances
   * @private
   */
  private stopAllTimers(): void {
    console.warn('stopAllTimers() is deprecated and affects all instances. Use cancelInstanceTimers() instead.');
    this.activeTimers.forEach(timerSub => {
      if (timerSub.subscription) {
        timerSub.subscription.unsubscribe();
      }
    });
    this.activeTimers.clear();
    this.stopTimers$.next();
  }

  /**
   * Manually pause all timer services globally.
   * ⚠️ Warning: This affects ALL stopwatch instances, not just this one.
   * Useful for debugging or global pause control.
   */
  pauseTimers(): void {
    this.animationTimer.pause();
    this.intervalTimer.pause();
  }

  /**
   * Manually resume all timer services globally.
   * ⚠️ Warning: This affects ALL stopwatch instances, not just this one.
   * Useful for debugging or global resume control.
   */
  resumeTimers(): void {
    this.animationTimer.resume();
    this.intervalTimer.resume();
  }

  private buildSplits() {
    const state = this.controller().getState();
    const eligibleSplits = state.sequence.filter(event => !['stop', 'resume'].includes(event.type));
    const visibleSplits: VisibleSplit[] = [];
    for(let i = 1; i < eligibleSplits.length; i++) {
      const rawSplitDuration = this.controller().getElapsedTimeBetweenEvents(eligibleSplits[i - 1].id, eligibleSplits[i].id);
      const splitDuration = this.timeService.toDurationObject(rawSplitDuration);
      const event = eligibleSplits[i];
      visibleSplits.push({duration: splitDuration, event, unit: event.unit});
    }
    this.visibleSplits.set(visibleSplits);
  }

  async handleSplitUpdate(instance: VisibleSplit) {
    const event = instance.event;
    const state = this.controller().getState();
    const index = state.sequence.findIndex(evt => evt.id === event.id);
    if (index) {
      state.sequence[index] = event;
      
      const visibleSplits = this.visibleSplits();
      const visibleSplitIndex = visibleSplits.findIndex(split => split.event.id === event.id);
      visibleSplits[visibleSplitIndex] = instance;
      this.visibleSplits.set([...visibleSplits]);

      this.service.update({...this.getInstance(), state});
    }
  }

  async handleSplitDelete(instance: VisibleSplit) {
    const event = instance.event;
    this.controller().removeEvent(event);
    this.buildSplits();
    this.service.update({...this.getInstance(), state: this.controller().getState()});
  }

  showSettings(){
    const instance = this.getInstance();
    this.settingsForm.controls.title.patchValue(instance.annotation.title);
    this.settingsForm.controls.description.patchValue(instance.annotation.description);
    this.settingsForm.controls.groups.patchValue(instance.groups.map(group => group.id));
    this.displaySettings.set(true);
  }

  async handleSettingsChange() {this.getInstance();
    const instance = this.getInstance();
    if (this.settingsForm.controls.title.value) {
      instance.annotation.title = this.settingsForm.controls.title.value as string;
    }
    if (this.settingsForm.controls.description.value) {
      instance.annotation.description = this.settingsForm.controls.description.value as string;
    }
    const existingGroupAssignments = instance.groups.map((group) => group.id);
    if (JSON.stringify(this.settingsForm.controls.groups.value) !== JSON.stringify(existingGroupAssignments)) {
      const groupIds = (this.settingsForm.controls.groups.value || []) as UniqueIdentifier[];
      const groups = this.groups();
      await Promise.all(
        groups.map((group) => this.groupService.removeMember(group.id, instance.id))
      );
      await Promise.all(
        groupIds.map((id) => this.groupService.addMember(id, instance.id))
      );
    }
    const state = this.controller().getState();
    if (this.settingsForm.controls.lapValue.value && this.settingsForm.controls.lapUnit.value) {
      const lap = {value: this.settingsForm.controls.lapValue.value, unit: this.settingsForm.controls.lapUnit.value};
      this.controller().setLap(lap);
    } else {
      this.controller().setLap(null);
    }
    await this.service.update({...instance, state: this.controller().getState()});
  }

  private findAvailableEventName(eventType: string): string {
    const existingEvents = this.controller().getState().sequence.filter(event => event.type === eventType).length;
    let exists = true;
    let newEventName: string = '';
    let newNumber = existingEvents;
    while (exists) {
      newNumber++;
      newEventName = `${eventType} #${newNumber}`;
      exists = !!this.controller().getState().sequence.find(event => event.annotation.title === newEventName);
      if (!exists) {
        break;
      }
    }
    return newEventName;
  }
}