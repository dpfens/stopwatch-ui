import { Component, inject } from '@angular/core';
import { GroupService } from '../../../../services/group/group.service';


@Component({
  selector: 'base-group-list-view',
  template: ''
})
export class BaseGroupListViewComponent {
  protected readonly service = inject(GroupService);
  instances = this.service.instances;

  loading = this.service.isLoading;
  error = this.service.error;
}
