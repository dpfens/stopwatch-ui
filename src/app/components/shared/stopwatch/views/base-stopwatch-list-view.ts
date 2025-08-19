import { Component,  inject,  Input,  signal } from '@angular/core';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { ContextualStopwatchEntity } from '../../../../models/sequence/interfaces';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';


@Component({
  selector: 'base-stopwatch-list-view',
  template: ''
})
export class BaseStopwatchListViewComponent {
  @Input({required: true}) instances: ContextualStopwatchEntity[] = [];
  protected readonly service = inject(StopwatchService);

  protected readonly repository: StopwatchRepository = new StopwatchRepository();
  protected readonly groupRepository: GroupRepository = new GroupRepository();

  loading = signal(false);
  error = signal<Error | null>(null);

  handleDelete(instance: ContextualStopwatchEntity) {
    const index = this.instances.lastIndexOf(instance);
    this.instances.splice(index, 1);
  }

  handleFork(instance: ContextualStopwatchEntity) {
    this.instances.push(instance);
  }
}
