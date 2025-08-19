import { Component } from '@angular/core';
import { BaseStopwatchListViewComponent } from '../../base-stopwatch-list-view';
import { StopwatchGridDetailViewComponent } from '../stopwatch-grid-detail/stopwatch-detail.component';

@Component({
  selector: 'stopwatch-list-grid-view',
  imports: [StopwatchGridDetailViewComponent],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListGridViewComponent extends BaseStopwatchListViewComponent {
}
