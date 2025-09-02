import { AfterViewInit, Component, computed, inject, signal, WritableSignal, DestroyRef, OnDestroy, input, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ContextualStopwatchEntity, IStopwatchStateController, SelectOptGroup, StopwatchEvent, UniqueIdentifier, UnitValue } from '../../../../models/sequence/interfaces';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DurationFormatOptions, TimeService } from '../../../../services/time/time.service';
import { LapUnits, Time } from '../../../../utilities/constants';
import { AnimationTimerService } from '../../../../services/timer/animation-timer.service';
import { TimerService } from '../../../../services/timer/timer.service';
import { FormBuilder, FormControl, FormsModule, Validators } from '@angular/forms';
import { TZDate } from '../../../../models/date';
import { GroupService } from '../../../../services/group/group.service';
import { StopwatchStateController } from '../../../../controllers/stopwatch/stopwatch-state-controller';
import { StopwatchSelectionService } from '../../../../services/stopwatch/stopwatch-selection/stopwatch-selection.service';

// Define strongly-typed form interface
interface StopwatchSettingsForm {
  title: FormControl<string | null>;
  description: FormControl<string | null>;
  lapValue: FormControl<number | null>;
  lapUnit: FormControl<string | null>;
  groups: FormControl<UniqueIdentifier[]>;
}

type DurationCalculator = () => number;
type DurationUpdater = (durationMs: number, durationFormat: DurationFormatOptions) => void;

interface VisibleSplit {
  duration: Intl.Duration;
  event: StopwatchEvent;
  unit?: UnitValue
}

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
  protected readonly fb = inject(FormBuilder);
  protected readonly selectionService = inject(StopwatchSelectionService);

  id = input.required<UniqueIdentifier>();
  instance = computed(() => 
    this.service.instances().find(inst => inst.id === this.id())
  );
  selectionMode = input(false);

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

  // Strongly-typed reactive form
  settingsForm = this.fb.group<StopwatchSettingsForm>({
    title: this.fb.control<string | null>(null),
    description: this.fb.control<string | null>(null),
    lapValue: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    lapUnit: this.fb.control<string | null>('m'),
    groups: this.fb.control<UniqueIdentifier[]>([], { nonNullable: true })
  });

  // Computed form state signals
  readonly hasLapSettings = computed(() => {
    const lapValue = this.settingsForm.controls.lapValue.value;
    const lapUnit = this.settingsForm.controls.lapUnit.value;
    return !!(lapValue && lapUnit);
  });

  private activeTimers: Map<string, TimerSubscription> = new Map();
  private stopTimers$ = new Subject<void>();

  // FIXED: Controller with proper cache invalidation based on instance changes
  private _controllerCache?: IStopwatchStateController;
  private _lastInstanceVersion?: string;
  
  readonly controller = computed(() => {
    const instance = this.getInstance();
    if (!instance) {
      throw new Error('Instance must be set before accessing controller');
    }
    
    // Create a version string based on instance modification timestamp
    const currentVersion = `${instance.id}-${instance.metadata.lastModification?.timestamp || 0}`;
    
    // Invalidate cache if instance has changed
    if (this._lastInstanceVersion !== currentVersion) {
      this._controllerCache = undefined;
      this._lastInstanceVersion = currentVersion;
    }
    
    // Create new controller if not cached
    if (!this._controllerCache) {
      this._controllerCache = new StopwatchStateController(instance.state);
    }
    
    return this._controllerCache;
  });

  constructor() {
    // Auto-save form changes with debouncing
    effect(() => {
      if (this.displaySettings()) {
        this.settingsForm.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
          if (this.settingsForm.valid) {
            this.handleSettingsChange();
          }
        });
      }
    });

    // Auto-populate form when instance changes
    effect(() => {
      const instance = this.instance();
      if (instance && this.displaySettings()) {
        this.populateForm(instance);
      }
    });

    // FIXED: Effect to handle external updates (like bulk operations)
    effect(() => {
      const instance = this.instance();
      if (!instance) return;
      
      // Track the modification timestamp to detect external changes
      const modificationTimestamp = instance.metadata.lastModification?.timestamp;
      
      // Update component state when instance changes externally
      // This will trigger when bulk operations update the stopwatch
      this.refreshComponentState();
    });
  }

  // FIXED: Method to refresh component state when instance changes
  private refreshComponentState(): void {
    const controller = this.controller();
    
    if (controller.isActive()) {
      this.buildSplits();
      this.updateStaticDurations();
      
      // Only start clock if currently running and timers aren't already active
      if (controller.isRunning() && this.activeTimers.size === 0) {
        this.startClock();
      } else if (!controller.isRunning()) {
        this.cancelInstanceTimers();
      }
    } else {
      // Reset for inactive stopwatches
      this.totalDuration.set({milliseconds: Time.ZERO});
      this.splitDuration.set(undefined);
      this.lapDuration.set(undefined);
      this.visibleSplits.set([]);
      this.cancelInstanceTimers();
    }
  }

  // FIXED: Update static durations without starting timers
  private updateStaticDurations(): void {
    const controller = this.controller();
    
    if (!controller.isRunning()) {
      const rawTotalElapsedTime = controller.getElapsedTime();
      this.totalDuration.set(this.timeService.toDurationObject(rawTotalElapsedTime));

      const lastSplitEvent = controller.getState().sequence.findLast(event => event.type === 'split');
      const rawSplitElapsedTime = lastSplitEvent ? controller.getElapsedTimeBetweenEvents(lastSplitEvent.id, null) : 0;
      this.splitDuration.set(rawSplitElapsedTime > 0 ? this.timeService.toDurationObject(rawSplitElapsedTime) : undefined);

      const lastLapEvent = controller.getState().sequence.findLast(event => event.type === 'lap');
      const rawLapElapsedTime = lastLapEvent ? controller.getElapsedTimeBetweenEvents(lastLapEvent.id, null) : 0;
      this.lapDuration.set(rawLapElapsedTime > 0 ? this.timeService.toDurationObject(rawLapElapsedTime) : undefined);
    }
  }

  ngAfterViewInit(): void {
    const controller = this.controller();
    if (controller.isActive()) {
      this.buildSplits();
      if (controller.isRunning()) {
        this.startClock();
      } else {
        this.updateStaticDurations();
      }
    }
  }

  ngOnDestroy(): void {
    this.cancelInstanceTimers();
  }

  // Simplified form population
  private populateForm(instance: ContextualStopwatchEntity): void {
    const state = this.controller().getState();
    
    this.settingsForm.patchValue({
      title: instance.annotation.title || null,
      description: instance.annotation.description || null,
      lapValue: state.lap?.value || null,
      lapUnit: state.lap?.unit || 'm',
      groups: instance.groups.map(group => group.id)
    }, { emitEvent: false }); // Don't trigger valueChanges during initial population
  }

  showSettings(): void {
    const instance = this.getInstance();
    this.populateForm(instance);
    this.displaySettings.set(true);
  }

  // Simplified and more reactive settings change handler
  async handleSettingsChange(): Promise<void> {
    if (!this.settingsForm.valid) {
      return;
    }

    const instance = this.getInstance();
    const formValue = this.settingsForm.value;

    // Update instance annotation
    if (formValue.title !== undefined) {
      instance.annotation.title = formValue.title || '';
    }
    if (formValue.description !== undefined) {
      instance.annotation.description = formValue.description || '';
    }

    // Handle group assignments
    await this.updateGroupAssignments(instance, formValue.groups || []);

    // Handle lap settings
    if (formValue.lapValue && formValue.lapUnit) {
      const lap = { value: formValue.lapValue, unit: formValue.lapUnit };
      this.controller().setLap(lap);
    } else {
      this.controller().setLap(null);
    }

    // Update metadata
    instance.metadata.lastModification = {
      timestamp: TZDate.now()
    };

    await this.service.update({ ...instance, state: this.controller().getState() });
  }

  // Extracted group assignment logic for better reusability
  private async updateGroupAssignments(instance: ContextualStopwatchEntity, newGroupIds: UniqueIdentifier[]): Promise<void> {
    const existingGroupIds = instance.groups.map(group => group.id);
    const groupsChanged = JSON.stringify(newGroupIds.sort()) !== JSON.stringify(existingGroupIds.sort());
    
    if (!groupsChanged) {
      return;
    }

    const allGroups = this.groups();
    
    // Remove from all existing groups
    await Promise.all(
      allGroups.map(group => 
        this.groupService.removeMember(group.id, instance.id)
      )
    );

    // Add to new groups
    await Promise.all(
      newGroupIds.map(groupId => 
        this.groupService.addMember(groupId, instance.id)
      )
    );
  }

  // Form validation helpers
  getFieldError(fieldName: keyof StopwatchSettingsForm): string | null {
    const control = this.settingsForm.controls[fieldName];
    if (control.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['min']) return `${fieldName} must be greater than 0`;
    }
    return null;
  }

  // Reset form to initial state
  resetForm(): void {
    this.settingsForm.reset();
    this.populateForm(this.getInstance());
  }

  // Check if form has unsaved changes
  hasUnsavedChanges(): boolean {
    return this.settingsForm.dirty;
  }

  // Discard changes and close settings
  discardChanges(): void {
    this.resetForm();
    this.displaySettings.set(false);
  }

  // Save and close settings
  async saveAndClose(): Promise<void> {
    if (this.settingsForm.valid) {
      await this.handleSettingsChange();
      this.settingsForm.markAsPristine();
      this.displaySettings.set(false);
    }
  }

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
    await Promise.all(
      this.getInstance().groups.map(g => this.groupService.addMember(g.id, newInstance.id))
    );
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
      'lap',
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
    const useAnimationTimer = initialDuration < Time.ONE_MINUTE;
    const durationFormat = this.timeService.toDurationObject(initialDuration);
    if (!useAnimationTimer) {
      durationFormat.milliseconds = 0;
    }
    updateCallback(initialDuration, durationFormat);

    // Create timer subscription record
    const timerSub: TimerSubscription = {
      id: timerId,
      calculator: calculateDuration,
      updater: updateCallback,
      lastDuration: initialDuration
    };

    // Choose appropriate timer service based on duration
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
    const includeMs = currentDuration < Time.ONE_MINUTE;
    const durationFormat = this.timeService.toDurationObject(currentDuration);
    durationFormat.milliseconds = durationFormat.milliseconds || 0;
    if (includeMs) {
      durationFormat.milliseconds = parseInt(durationFormat.milliseconds.toString().substring(0, 3).padEnd(3, '0'));
    } else {
      durationFormat.milliseconds = 0;
    }
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

  // Computed selection state
  readonly isSelected = computed(() => 
    this.selectionService.isSelected(this.id())
  );
  
  readonly hasAnySelection = computed(() => 
    this.selectionService.hasSelection()
  );

  /**
   * Toggles selection state of this stopwatch
   */
  toggleSelection(): void {
    this.selectionService.toggleSelection(this.id());
  }

  /**
   * Handles card click - toggles selection when in selection mode
   */
  onCardClick(event: Event): void {
    // Only handle selection when in selection mode
    if (this.selectionMode() || this.hasAnySelection()) {
      // Don't prevent default here - let it bubble up to parent if needed
      this.toggleSelection();
    }
  }

  /**
   * Handles selection icon click/keyboard interaction
   */
  onSelectionChange(event: Event): void {
    // Always stop propagation for the selection icon to prevent card click
    event.preventDefault();
    event.stopPropagation();
    
    // For keyboard events, only respond to Enter and Space
    if (event instanceof KeyboardEvent) {
      if (event.code !== 'Enter' && event.code !== 'Space') {
        return;
      }
    }
    
    this.toggleSelection();
  }
}