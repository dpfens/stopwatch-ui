import { Component, computed, inject, input, Signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContextualStopwatchEntity, GroupEvaluationBehavior, GroupTimingBehavior, GroupTraitPreset, StopwatchGroup, UniqueIdentifier } from '../../../../models/sequence/interfaces';
import { GroupPresets, PresetConfig, Time } from '../../../../utilities/constants';
import { TZDate } from '../../../../models/date';
import { TimeService } from '../../../../services/time/time.service';
import { GroupService } from '../../../../services/group/group.service';
import { Router } from '@angular/router';
import { StopwatchBulkOperationsService } from '../../../../services/stopwatch/bulk-operation/stopwatch-bulk-operation-service.service';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { StopwatchStateController } from '../../../../controllers/stopwatch/stopwatch-state-controller';


@Component({
  selector: 'base-group-detail-view',
  template: ''
})
export class BaseGroupDetailViewComponent {
  protected readonly service = inject(GroupService);
  protected readonly stopwatchService = inject(StopwatchService);
  private readonly bulkOpsService = inject(StopwatchBulkOperationsService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly time = inject(TimeService);
  protected readonly router = inject(Router);

  id = input.required<UniqueIdentifier>();
  instance = computed(() =>
    this.service.instances().find(inst => inst.id === this.id())
  );

  getInstance(): StopwatchGroup {
      const inst = this.instance();
      if (!inst) {
        throw new Error(`Group ${this.id()} not found`);
      }
      return inst;
  }

  // Single signal for the entire instance
  loading = this.service.isLoading;
  error = this.service.error;

  preset = computed(() => {
    const presets: GroupTraitPreset[] = Object.keys(GroupPresets) as GroupTraitPreset[];
    const matchingPreset = presets.find(preset => {
      const traits: PresetConfig = GroupPresets[preset];
      return this.getInstance().traits.timing == traits.timing 
        && this.getInstance().traits.evaluation.sort().join(',') === traits.evaluation.sort().join(',')
    });
    return matchingPreset ?? 'Custom';
  });

  timingBehavior: Signal<GroupTimingBehavior> = computed(() => {
    return this.getInstance().traits.timing;
  });

  evaluationBehaviors: Signal<GroupEvaluationBehavior[]> = computed(() => {
    return this.getInstance().traits.evaluation;
  });

  isTimingBehavior(timingBehavior: GroupTimingBehavior| GroupTimingBehavior[]): boolean {
    const selectedBehavior = this.getInstance().traits.timing;
    if (Array.isArray(timingBehavior)) {
      return timingBehavior.some(behavior => behavior === selectedBehavior);
    }
    return selectedBehavior === timingBehavior;
  }

  hasEvaluationBehavior(evaluationBehavior: GroupEvaluationBehavior | GroupEvaluationBehavior[]): boolean {
    const evaluations = this.getInstance().traits.evaluation;
    if (Array.isArray(evaluationBehavior)) {
      return evaluationBehavior.every(behavior => evaluations.includes(behavior));
    }
    return evaluations.includes(evaluationBehavior);
  }

  /**
   * Calculates the total cumulative time elapsed by all group stopwatches
   */
  readonly cumulativeTotalCalc = () => {
    const controllers = this.getInstance().members.map(sw => new StopwatchStateController(sw.state));
    return controllers.reduce((acc, controller) => acc + controller.getElapsedTime(), 0);
  };

  async clone() {
    const instance = this.getInstance();
    const clonedInstance = this.service.clone(instance);
    await this.service.create(clonedInstance);
    await Promise.all(
      instance.members.map(stopwatch => this.service.addMember(clonedInstance.id, stopwatch.id))
    );
  }

  async delete(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const instance = this.getInstance();
    await this.service.delete(instance.id);
    this.snackbar.open(`Deleted group "${instance.annotation.title || instance.id}"`, 'Close');
    // navigate away from group URL to prevent re-loading attempt
    this.router.navigate(['/group']);
    setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  relativeTime(date: TZDate): string {
    const durationMs = date.durationFrom(TZDate.now());
    const relativeTimeInfo = this.time.getRelativeTimeInfo(durationMs);
    return this.time.relativeTimeFormatter().format(relativeTimeInfo.value, relativeTimeInfo.unit);
  }


  // Computed command availability based on selected stopwatches
  readonly canStartAny = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.some(sw => !this.stopwatchService.isStopwatchActive(sw));
  });

  readonly canStartAll = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.every(sw => !this.stopwatchService.isStopwatchActive(sw));
  });
  
  // Stop actions
  readonly canStopAny = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchRunning(sw));
  });

  readonly canStopAll = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchRunning(sw));
  });

  // Resume actions
  readonly canResumeAny = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchStopped(sw));
  });

  readonly canResumeAll = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchStopped(sw));
  });

  // Reset actions
  readonly canResetAny = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchActive(sw));
  });

  readonly canResetAll = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchActive(sw));
  });

  // Split actions
  readonly canSplitAny = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.some(sw => this.stopwatchService.isStopwatchRunning(sw));
  });

  readonly canSplitAll = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && instances.every(sw => this.stopwatchService.isStopwatchRunning(sw));
  });

  // Lap actions
  readonly canLapAny = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && 
          instances.some(sw => this.stopwatchService.isStopwatchRunning(sw) && !!sw.state.lap);
  });

  readonly canLapAll = computed(() => {
    const instances = this.getInstance().members;
    return instances.length > 0 && 
          instances.every(sw => this.stopwatchService.isStopwatchRunning(sw) && !!sw.state.lap);
  });

  /**
   * Globally applicable group actions
   */
  async startAll() {
    await this.bulkOpsService.startAll(this.getInstance().members);
  }

  async resumeAll() {
    await this.bulkOpsService.resumeAll(this.getInstance().members);
  }

  async stopAll() {
    await this.bulkOpsService.stopAll(this.getInstance().members);
  }

  async resetAll() {
    await this.bulkOpsService.resetAll(this.getInstance().members);
  }

  async splitAll() {
    await this.bulkOpsService.splitAll(this.getInstance().members);
  }

  async lapAll() {
    await this.bulkOpsService.lapAll(this.getInstance().members);
  }

  /**
   * Actions unique to the "Sequential" timing behavior
   */
  async startNext() {
    const now = new Date();
    const stopwatches = this.getInstance().members;
    const runningStopwatch = stopwatches.findLast(sw => new StopwatchStateController(sw.state).isRunning());
    const inactiveStopwatch = stopwatches.find(sw => !(new StopwatchStateController(sw.state).isActive()));
    if (runningStopwatch) {
      await this.stop(runningStopwatch, now);
    }
    if (inactiveStopwatch) {
        await this.start(inactiveStopwatch, now);
    }
  }


  async start(stopwatch: ContextualStopwatchEntity, timestamp: Date) {
    const controller = new StopwatchStateController(stopwatch.state);
    controller.start(timestamp);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.stopwatchService.update({...stopwatch, metadata, state: controller.getState()});
  }

  async stop(stopwatch: ContextualStopwatchEntity, timestamp: Date) {
    const controller = new StopwatchStateController(stopwatch.state);
    controller.stop(timestamp);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.stopwatchService.update({...stopwatch, metadata, state: controller.getState()});
  }
}
