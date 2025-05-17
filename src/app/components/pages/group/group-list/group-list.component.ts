import { Component, effect, inject, signal, WritableSignal } from '@angular/core';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchGroup } from '../../../../models/sequence/interfaces';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { GroupService } from '../../../../services/group/group.service';

@Component({
  selector: 'group-list',
  imports: [],
  templateUrl: './group-list.component.html',
  styleUrl: './group-list.component.scss'
})
export class GroupListComponent {
  private groupService = inject(GroupService);

  private readonly repository: GroupRepository  = new GroupRepository();
  private readonly stopwatchRepository: StopwatchRepository = new StopwatchRepository();

  instances: WritableSignal<StopwatchGroup[]> = signal([]);
  loading = signal(true);
  error = signal<Error | null>(null);


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
      console.log(groups);
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
  }
}
