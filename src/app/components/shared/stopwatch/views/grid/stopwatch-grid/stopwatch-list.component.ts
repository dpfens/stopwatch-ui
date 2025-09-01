import { Component, input } from '@angular/core';
import { BaseStopwatchListViewComponent } from '../../base-stopwatch-list-view';
import { StopwatchGridDetailViewComponent } from '../stopwatch-grid-detail/stopwatch-detail.component';
import { GlobalActionBarComponent } from "../../../../action-bar/action-bar.component";

@Component({
  selector: 'stopwatch-list-grid-view',
  imports: [StopwatchGridDetailViewComponent, GlobalActionBarComponent],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListGridViewComponent extends BaseStopwatchListViewComponent {
  columns = input('col-3')
}
