import { Component, effect, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { GroupRepository } from '../../../../repositories/group';
import { BaseStopwatchGroup, ContextualStopwatchEntity, StopwatchGroup, UniqueIdentifier } from '../../../../models/sequence/interfaces';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { GroupService } from '../../../../services/group/group.service';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';
import { GroupGridViewComponent } from "../../../shared/group/views/grid/group-list/group-list.component";
import { GroupListViewComponent } from '../../../shared/group/views/list/group-list/group-list.component';
import {RouterOutlet} from '@angular/router';
import { AnalysisRegistry } from '../../../../models/sequence/analysis/registry';

@Component({
  selector: 'group-list',
  imports: [GroupListViewComponent, RouterOutlet],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss'
})
export class GroupListComponent implements OnInit, OnDestroy {
  private groupService = inject(GroupService);
  public readonly headerActionService = inject(HeaderActionService);

  private readonly repository: GroupRepository  = new GroupRepository();
  private readonly stopwatchRepository: StopwatchRepository = new StopwatchRepository();

  instances: WritableSignal<StopwatchGroup[]> = signal([]);
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
      const [baseGroups, baseStopwatches] = await Promise.all([
        this.repository.getAll(),
        this.stopwatchRepository.getAll(),
      ]);
      const groupLookup = baseGroups.reduce<Record<UniqueIdentifier, BaseStopwatchGroup>>((acc, item) => {
        acc[item.id] = item;
        return acc;
      }, {});
      const stopwatches: ContextualStopwatchEntity[] = await Promise.all(
        baseStopwatches.map(async (instance) => {
          const groupIds = await this.repository.byStopwatch(instance.id);
          return  {
            ...instance,
            groups: groupIds.map(id => groupLookup[id]),
            analysis: new AnalysisRegistry()
          }
        })
      );
      const stopwatchGroupLookup = stopwatches.reduce<Record<UniqueIdentifier, ContextualStopwatchEntity[]>>((acc, item) => {
        item.groups.map((group) => {
          acc[group.id] = acc[group.id] || [];
          acc[group.id].push(item);
        });
        return acc;
      }, {});
      const groups = baseGroups.map(baseGroup => {
        return {
          ...baseGroup,
          members: stopwatchGroupLookup[baseGroup.id]
        }
      });
      this.instances.set(groups);
    } catch(e) {
      this.error.set(e as Error);
    } finally {
      this.loading.set(false);
    }
  }

  async createNew(): Promise<void> {
    const instance = this.groupService.create('', '');
    this.repository.create(instance);
    this.instances.set([...this.instances(), instance]);
  }

  ngOnDestroy() {
    if (this.headerActionService.has(GLOBAL.CREATE)) {
      this.headerActionService.delete(GLOBAL.CREATE);
    }
  }
}
