import { Component, effect, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchGroup } from '../../../../models/sequence/interfaces';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { GroupService } from '../../../../services/group/group.service';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';

@Component({
  selector: 'group-list',
  imports: [],
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
      const baseGroups = await this.repository.getAll();
      const groups = await Promise.all(
        baseGroups.map(async baseGroup => {
          return {
            ...baseGroup,
            members: await this.stopwatchRepository.byGroup(baseGroup.id)
          }
        })
      );
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
    this.instances.set([...this.instances(),instance]);
  }

  ngOnDestroy() {
    if (this.headerActionService.has(GLOBAL.CREATE)) {
      this.headerActionService.delete(GLOBAL.CREATE);
    }
  }
}
