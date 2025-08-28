import { Component, inject, input } from '@angular/core';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { ContextualStopwatchEntity } from '../../../../models/sequence/interfaces';


@Component({
  selector: 'base-stopwatch-list-view',
  template: ''
})
export class BaseStopwatchListViewComponent {
  protected readonly service = inject(StopwatchService);
  instances = input.required<ContextualStopwatchEntity[]>();

  loading = this.service.isLoading;
  error = this.service.error;
}
