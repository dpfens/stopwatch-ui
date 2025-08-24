import { Component,  inject,  Input,  signal,  } from '@angular/core';
import { StopwatchRepository } from '../../../../repositories/stopwatch';
import { StopwatchGroup } from '../../../../models/sequence/interfaces';
import { GroupRepository } from '../../../../repositories/group';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';


@Component({
  selector: 'base-group-list-view',
  template: ''
})
export class BaseGroupListViewComponent {
  @Input({required: true}) instances: StopwatchGroup[] = [];
  protected readonly service = inject(StopwatchService);

  protected readonly repository: GroupRepository = new GroupRepository();
  protected readonly stopwatchRepository: StopwatchRepository = new StopwatchRepository();

  loading = signal(false);
  error = signal<Error | null>(null);

  handleDelete(instance: StopwatchGroup) {
      const index = this.instances.lastIndexOf(instance);
      this.instances.splice(index, 1);
  }
}
