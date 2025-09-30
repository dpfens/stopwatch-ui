import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { HeaderActionService } from '../../../../services/action/header-action.service';
import { GLOBAL } from '../../../../utilities/constants';
import { StopwatchCollectionViewComponent } from "../../../shared/stopwatch/collection/stopwatch-collection.component";
import { StopwatchSelectionService } from '../../../../services/stopwatch/stopwatch-selection/stopwatch-selection.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'stopwatch-list',
  imports: [ StopwatchCollectionViewComponent, MatCardModule, MatProgressBarModule, MatIconModule, MatButtonModule],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListComponent implements OnInit, OnDestroy {
  private readonly service = inject(StopwatchService);
  private readonly headerActionService = inject(HeaderActionService);
  private readonly selectionService = inject(StopwatchSelectionService);
  
  instances = this.service.instances;
  loading = this.service.isLoading
  error = this.service.error;

  ngOnInit(): void {
    this.headerActionService.set(GLOBAL.CREATE, this.createNew.bind(this));
  }

  async createNew(): Promise<void> {
    const instance = await this.service.blank('', '');
    await this.service.create(instance);
  }

  ngOnDestroy() {
    if (this.headerActionService.has(GLOBAL.CREATE)) {
      this.headerActionService.delete(GLOBAL.CREATE);
    }
    if (this.selectionService.selectedCount() > 0) {
      this.selectionService.clearSelection();
    }
  }
}
