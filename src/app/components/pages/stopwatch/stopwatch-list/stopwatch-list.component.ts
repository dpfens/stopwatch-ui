import { Component, effect, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { BaseStopwatchGroup, ContextualStopwatchEntity, StopwatchEntity, UniqueIdentifier } from '../../../../models/sequence/interfaces';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { AnalysisRegistry } from '../../../../models/sequence/analysis/registry';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';

@Component({
  selector: 'stopwatch-list',
  imports: [],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListComponent implements OnInit, OnDestroy {
  private readonly service = inject(StopwatchService);
  private readonly headerActionService = inject(HeaderActionService);

  private readonly repository: StopwatchRepository = new StopwatchRepository();
  private readonly groupRepository: GroupRepository = new GroupRepository();
  
  instances: WritableSignal<ContextualStopwatchEntity[]> = signal([]);
  loading = signal(true);
  error = signal<Error | null>(null);

  ngOnInit(): void {
    this.headerActionService.set(GLOBAL.CREATE, this.createNew.bind(this));
  }

  __after_load__ = effect(() => {
    this.getAll();
  });

  async getAll(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [baseStopwatches, groups] = await Promise.all([
        this.repository.getAll(),
        this.groupRepository.getAll()
      ]);
      const groupLookup = groups.reduce<Record<UniqueIdentifier, BaseStopwatchGroup>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      const stopwatches = await Promise.all(
        baseStopwatches.map(async baseStopwatch => {
          const groupIds = await this.groupRepository.byStopwatch(baseStopwatch.id);
          return {
            ...baseStopwatch,
            groups: groupIds.map(id => groupLookup[id]),
            analysis: new AnalysisRegistry()
          }
        })
      );
      this.instances.set(stopwatches);
    } catch(e) {
      this.error.set(e as Error);
    } finally {
      this.loading.set(false);
    }
  }

  async createNew(): Promise<void> {
    const instance = this.service.create('', '');
    const id = await this.repository.create(instance);

    this.instances.set([
      ...this.instances(),
      {
        ...instance,
        groups: [],
        analysis: new AnalysisRegistry()
      }
    ]);
  }

  ngOnDestroy() {
    if (this.headerActionService.has(GLOBAL.CREATE)) {
      this.headerActionService.delete(GLOBAL.CREATE);
    }
  }
}
