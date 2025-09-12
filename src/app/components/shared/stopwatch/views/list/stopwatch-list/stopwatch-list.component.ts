import { Component } from '@angular/core';
import { BaseStopwatchListViewComponent } from '../../base-stopwatch-list-view';
import { StopwatchListDetailViewComponent } from '../stopwatch-list-detail/stopwatch-detail.component';
import { GlobalActionBarComponent } from "../../../../action-bar/action-bar.component";

@Component({
  selector: 'stopwatch-list-view',
  imports: [StopwatchListDetailViewComponent, GlobalActionBarComponent],
  templateUrl: './stopwatch-list.component.html',
  styleUrl: './stopwatch-list.component.scss'
})
export class StopwatchListViewComponent extends BaseStopwatchListViewComponent {
}
