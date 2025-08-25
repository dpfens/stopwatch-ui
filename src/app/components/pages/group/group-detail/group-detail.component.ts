import { Component, effect, inject, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { GroupRepository } from '../../../../repositories/group';
import { BaseStopwatchGroup, StopwatchGroup, UniqueIdentifier } from '../../../../models/sequence/interfaces';
import { StopwatchListGridViewComponent } from '../../../shared/stopwatch/views/grid/stopwatch-grid/stopwatch-list.component';
import { AnalysisRegistry } from '../../../../models/sequence/analysis/registry';

@Component({
  selector: 'group-detail',
  imports: [StopwatchListGridViewComponent],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.scss'
})
export class GroupDetailComponent {
  private route = inject(ActivatedRoute);
  private readonly stopwatchRepository: StopwatchRepository = new StopwatchRepository();
  private readonly repository: GroupRepository = new GroupRepository();
    
  id = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id'))
    ),
    { initialValue: null }
  );
  loading = signal(true);
  error = signal<Error | null>(null);
  instance: WritableSignal<StopwatchGroup | undefined> = signal(undefined);

  __after_id__ = effect(() => {
    const currentId = this.id();
    if (currentId) {
      this.get(currentId)
    }
  });

  async get(id: UniqueIdentifier): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [baseGroup, baseStopwatches, groups] = await Promise.all([
          this.repository.get(id),
          this.stopwatchRepository.byGroup(id),
          this.repository.getAll()
      ]);
      if (!baseGroup) {
        return;
      }
      const groupLookup = groups.reduce<Record<UniqueIdentifier, BaseStopwatchGroup>>((acc, item) => {
          acc[item.id] = item;
          return acc;
      }, {});
      const stopwatches = await Promise.all(
        baseStopwatches.map(async baseStopwatch => {
          const groupIds = await this.repository.byStopwatch(baseStopwatch.id);
          return  {
            ...baseStopwatch,
            groups: groupIds.map(id => groupLookup[id]),
            analysis: new AnalysisRegistry()
          }
        })
      );
      this.instance.set({
        ...baseGroup,
        members: stopwatches
      });
    } catch(e) {
      this.error.set(e as Error);
    } finally {
      this.loading.set(false);
    }
  }
}
