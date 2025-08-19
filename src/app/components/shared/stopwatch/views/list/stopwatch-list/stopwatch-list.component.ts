import { Component } from '@angular/core';
import { BaseStopwatchListViewComponent } from '../../base-stopwatch-list-view';
import { StopwatchListDetailViewComponent } from '../stopwatch-list-detail/stopwatch-detail.component';

@Component({
  selector: 'stopwatch-list-view',
  imports: [StopwatchListDetailViewComponent],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListViewComponent extends BaseStopwatchListViewComponent {
}
