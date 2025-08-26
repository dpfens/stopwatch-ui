import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { GroupTraitPreset, GroupTraits, StopwatchEntity, StopwatchGroup } from '../../../../models/sequence/interfaces';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { GroupPresets, Time } from '../../../../utilities/constants';
import { TZDate } from '../../../../models/date';
import { TimeService } from '../../../../services/time/time.service';


@Component({
  selector: 'base-group-detail-view',
  template: ''
})
export class BaseGroupDetailViewComponent implements OnInit {
  @Input({required: true}) instance!: StopwatchGroup;
  protected readonly service = inject(StopwatchService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly time = inject(TimeService);

  protected readonly repository: GroupRepository = new GroupRepository();
  protected readonly stopwatchRepository: StopwatchRepository = new StopwatchRepository();

  @Output() deleteEmitter: EventEmitter<StopwatchGroup> = new EventEmitter();
  members = signal<StopwatchEntity[]>([]);
  loading = signal(false);
  error = signal<Error | null>(null);

  preset = computed(() => {
    if (!this.instance.traits) {
      return 'Custom';
    }
    const presets: GroupTraitPreset[] = Object.keys(GroupPresets) as GroupTraitPreset[];
    const matchingPreset = presets.find(preset => {
      const traits: GroupTraits = GroupPresets[preset];
      return this.instance.traits.timing == traits.timing 
        && this.instance.traits.evaluation.sort().join(',') === traits.evaluation.sort().join(',')
    });
    return matchingPreset ?? 'Custom';
  });

  async ngOnInit(): Promise<void> {
    
  }

  async delete(event: Event) {
      event.preventDefault();
      event.stopPropagation();
      this.deleteEmitter.emit(this.instance);
      await this.repository.delete(this.instance.id);
      this.snackbar.open(`Deleted group "${this.instance.annotation.title || this.instance.id}"`, 'Close');
      setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  relativeTime(date: TZDate): string {
    const durationMs = date.durationFrom(TZDate.now());
    const relativeTimeInfo = this.time.getRelativeTimeInfo(durationMs);
    return this.time.relativeTimeFormatter().format(relativeTimeInfo.value, relativeTimeInfo.unit);
  }
}
