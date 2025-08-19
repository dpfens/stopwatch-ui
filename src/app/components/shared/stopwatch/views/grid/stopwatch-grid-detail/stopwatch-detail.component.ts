import { Component } from '@angular/core';
import { BaseStopwatchDetailViewComponent } from '../../base-stopwatch-detail-view';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';

@Component({
  selector: 'stopwatch-grid-detail-view',
  imports: [MatCardModule, MatButtonToggleModule, MatButtonModule, MatMenuModule, MatIconModule, MatChipsModule],
  templateUrl: './stopwatch-detail.component.html',
  styleUrl: './stopwatch-detail.component.scss'
})
export class StopwatchGridDetailViewComponent extends BaseStopwatchDetailViewComponent {
}
