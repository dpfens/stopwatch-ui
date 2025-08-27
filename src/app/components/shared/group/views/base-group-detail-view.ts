import { Component, computed, inject, input, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GroupTraitPreset, GroupTraits, StopwatchEntity, StopwatchGroup, UniqueIdentifier } from '../../../../models/sequence/interfaces';
import { GroupPresets, Time } from '../../../../utilities/constants';
import { TZDate } from '../../../../models/date';
import { TimeService } from '../../../../services/time/time.service';
import { GroupService } from '../../../../services/group/group.service';


@Component({
  selector: 'base-group-detail-view',
  template: ''
})
export class BaseGroupDetailViewComponent {
  protected readonly service = inject(GroupService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly time = inject(TimeService);

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
    if (!this.getInstance().traits) {
      return 'Custom';
    }
    const presets: GroupTraitPreset[] = Object.keys(GroupPresets) as GroupTraitPreset[];
    const matchingPreset = presets.find(preset => {
      const traits: GroupTraits = GroupPresets[preset];
      return this.getInstance().traits.timing == traits.timing 
        && this.getInstance().traits.evaluation.sort().join(',') === traits.evaluation.sort().join(',')
    });
    return matchingPreset ?? 'Custom';
  });

  async delete(event: Event) {
      event.preventDefault();
      event.stopPropagation();
      await this.service.delete(this.getInstance().id);
      this.snackbar.open(`Deleted group "${this.getInstance().annotation.title || this.getInstance().id}"`, 'Close');
      setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  relativeTime(date: TZDate): string {
    const durationMs = date.durationFrom(TZDate.now());
    const relativeTimeInfo = this.time.getRelativeTimeInfo(durationMs);
    return this.time.relativeTimeFormatter().format(relativeTimeInfo.value, relativeTimeInfo.unit);
  }
}
