import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';
import { StopwatchListGridViewComponent } from '../../../shared/stopwatch/views/grid/stopwatch-grid/stopwatch-list.component';

@Component({
  selector: 'stopwatch-list',
  imports: [StopwatchListGridViewComponent],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListComponent implements OnInit, OnDestroy {
  private readonly service = inject(StopwatchService);
  private readonly headerActionService = inject(HeaderActionService);
  
  instances = this.service.instances;
  loading = this.service.isLoading
  error = this.service.error;

  ngOnInit(): void {
    this.headerActionService.set(GLOBAL.CREATE, this.createNew.bind(this));
  }

  async createNew(): Promise<void> {
    const instance = this.service.blank('', '');
    await this.service.create(instance);
  }

  ngOnDestroy() {
    if (this.headerActionService.has(GLOBAL.CREATE)) {
      this.headerActionService.delete(GLOBAL.CREATE);
    }
  }
}
