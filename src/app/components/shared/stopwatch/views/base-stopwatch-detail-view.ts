import { AfterViewInit, Component, computed, EventEmitter, inject, Input, Output, signal, WritableSignal } from '@angular/core';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { ContextualStopwatchEntity, IStopwatchStateController, StopwatchEvent } from '../../../../models/sequence/interfaces';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { CachedStopwatchStateController } from '../../../../controllers/stopwatch/cached-stopwatch-state-controller';
import {MatSnackBar} from '@angular/material/snack-bar';
import { DurationFormatOptions, TimeService } from '../../../../services/time/time.service';
import { Time } from '../../../../utilities/constants';
import { Writable } from 'stream';

type DurationCalculator = () => number;
type DurationUpdater = (durationMs: number, durationFormat: DurationFormatOptions) => void;

interface VisibleSplit {
  duration: Intl.Duration;
  event: StopwatchEvent;
}

@Component({
  selector: 'base-stopwatch-detail-view',
  template: ''
})
export class BaseStopwatchDetailViewComponent implements AfterViewInit {
  protected readonly service = inject(StopwatchService);
  protected readonly timeService = inject(TimeService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly repository: StopwatchRepository = new StopwatchRepository();
  protected readonly groupRepository: GroupRepository = new GroupRepository();

  @Output() forkEmitter: EventEmitter<ContextualStopwatchEntity> = new EventEmitter();
  @Output() deleteEmitter: EventEmitter<ContextualStopwatchEntity> = new EventEmitter();

  private _instance = signal<ContextualStopwatchEntity | undefined>(undefined);
  
  @Input({required: true}) 
  set instance(value: ContextualStopwatchEntity) {
    this._instance.set(value);
  }
  get instance(): ContextualStopwatchEntity {
    const instance = this._instance();
    if (!instance) {
      throw new Error('Instance not set');
    }
    return instance;
  }

  loading = signal(false);
  error = signal<Error | null>(null);

  totalDuration: WritableSignal<DurationFormatOptions> = signal({milliseconds: Time.ZERO});
  splitDuration: WritableSignal<DurationFormatOptions | undefined> = signal(undefined);
  lapDuration: WritableSignal<DurationFormatOptions | undefined> = signal(undefined);
  visibleSplits: WritableSignal<VisibleSplit[]> = signal([]);

  durationFormatter = computed(() => {
    if ('DurationFormat' in Intl) {
      return new Intl.DurationFormat(Intl.DateTimeFormat().resolvedOptions().locale, { style: 'digital' });
    }
    return {
      format: (durationFormat: DurationFormatOptions) => {
        return '';
      }
    }
  });

  ngAfterViewInit(): void {
    const controller = this.controller();
    if (controller.isActive()) {
      this.buildSplits();
      if (controller.isRunning()) {
        this.startClock();
      } else {
        const rawTotalElapsedTime =controller.getElapsedTime();
        this.totalDuration.set(this.timeService.toDurationObject(rawTotalElapsedTime));

        const lastSplitEvent = controller.getState().sequence.findLast(event => event.type === 'split');
        const rawSplitElapsedTime = lastSplitEvent ? controller.getElapsedTimeBetweenEvents(lastSplitEvent.id, null) : 0;
        this.splitDuration.set(this.timeService.toDurationObject(rawSplitElapsedTime));

        const lastLapEvent = controller.getState().sequence.findLast(event => event.type === 'cyclic');
        const rawLapElapsedTime = lastLapEvent ? controller.getElapsedTimeBetweenEvents(lastLapEvent.id, null) : 0;
        this.lapDuration.set(this.timeService.toDurationObject(rawLapElapsedTime));
      }
    }
  }
  
  private _controllerCache?: IStopwatchStateController;
  
  readonly controller = computed(() => {
    const instance = this._instance();
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
    await this.repository.update({...this.instance, state: this.controller().getState()});
  }

  async stop() {
    const now = new Date();
    this.controller().stop(now);
    await this.repository.update({...this.instance, state: this.controller().getState()});
  }

  async resume() {
    const now = new Date();
    this.controller().resume(now);
    this.startClock();
    await this.repository.update({...this.instance, state: this.controller().getState()});
  }

  async split() {
    const now = new Date();
    this.controller().addEvent('split', 'Split', now);
    this.buildSplits();
    await this.repository.update({...this.instance, state: this.controller().getState()});
  }

  async reset() {
    const now = new Date();
    this.controller().reset(now);
    const defaultTime = {milliseconds: 0};
    this.totalDuration.set(defaultTime);
    this.splitDuration.set(defaultTime);
    this.lapDuration.set(defaultTime);
    this.visibleSplits.set([]);
    await this.repository.update({...this.instance, state: this.controller().getState()});
  }

  async fork() {
    const newInstance = {
      ...this.instance,
      id: crypto.randomUUID(),
      state: this.controller().getState(),
      metadata: {
        ...this.instance.metadata,
        clone: { source: this.instance.id}
      }
    };
    this.forkEmitter.emit(newInstance);
    await this.repository.create(newInstance);
  }

  async delete() {
    this.deleteEmitter.emit(this.instance);
    await this.repository.delete(this.instance.id);
    this.snackbar.open(`Deleted stopwatch "${this.instance.annotation.title || this.instance.id}"`, 'Close');
    setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  startClock() {
    // Start updating total duration
    this.startDurationUpdate(
      () => this.controller().getElapsedTime(),
      (durationMs, durationFormat) => {
        this.totalDuration.set(durationFormat);
      }
    );

    // Start updating split duration if we have split events
    this.startDurationUpdate(
      () => {
        const lastSplitEvent = this.controller().getState().sequence.findLast(event => event.type === 'split');
        return lastSplitEvent ? this.controller().getElapsedTimeBetweenEvents(lastSplitEvent.id, null) : 0;
      },
      (durationMs, durationFormat) => {
        if (durationMs > 0) {
          this.splitDuration.set(durationFormat);
        }
      }
    );

    // Start updating lap duration if we have lap events
    this.startDurationUpdate(
      () => {
        const lastLapEvent = this.controller().getState().sequence.findLast(event => event.type === 'cyclic');
        return lastLapEvent ? this.controller().getElapsedTimeBetweenEvents(lastLapEvent.id, null) : 0;
      },
      (durationMs, durationFormat) => {
        if (durationMs > 0) {
          this.lapDuration.set(durationFormat);
        }
      }
    );
  }

  /**
   * Generic method for updating duration displays with smart timing
   * @param calculateDuration Function that returns the current duration in milliseconds
   * @param updateCallback Function that updates the appropriate signal/display
   */
  private startDurationUpdate(
    calculateDuration: DurationCalculator,
    updateCallback: DurationUpdater
  ) {
    const rawDuration = calculateDuration();
    const durationFormat = this.timeService.toDurationObject(rawDuration);
    updateCallback(rawDuration, durationFormat);

    if (!this.controller().isRunning()) {
      return;
    }

    // Use the same timing logic for all durations
    this.scheduleNextUpdate(rawDuration, () => {
      this.startDurationUpdate(calculateDuration, updateCallback);
    });
  }

  /**
   * Determines whether to use fast or slow updates based on duration
   * @param durationMs Current duration in milliseconds
   * @param callback Function to call for the next update
   */
  private scheduleNextUpdate(durationMs: number, callback: () => void) {
    if (durationMs < Time.ONE_MINUTE) {
      // Fast updates for durations under 60 seconds (using requestAnimationFrame)
      requestAnimationFrame(callback);
    } else {
      // Slower updates for longer durations (using 1-second intervals)
      setTimeout(callback, Time.ONE_SECOND);
    }
  }

  private buildSplits() {
    const state = this.controller().getState();
    const eligibleSplits = state.sequence.filter(event => !['start', 'stop', 'resume'].includes(event.type));
    const visibleSplits: VisibleSplit[] = [];
    for(let i = 1; i < eligibleSplits.length; i++) {
      const rawSplitDuration = this.controller().getElapsedTimeBetweenEvents(eligibleSplits[i - 1].id, eligibleSplits[i].id);
      const splitDuration = this.timeService.toDurationObject(rawSplitDuration);
      visibleSplits.push({duration: splitDuration, event: eligibleSplits[i]});
    }
    this.visibleSplits.set(visibleSplits);
  }
}
