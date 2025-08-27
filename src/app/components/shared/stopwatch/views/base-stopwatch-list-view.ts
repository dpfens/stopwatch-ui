import { Component, inject } from '@angular/core';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';


@Component({
  selector: 'base-stopwatch-list-view',
  template: ''
})
export class BaseStopwatchListViewComponent {
  protected readonly service = inject(StopwatchService);
  instances = this.service.instances;

  loading = this.service.isLoading;
  error = this.service.error;
}
