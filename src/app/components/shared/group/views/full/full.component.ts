import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { BaseGroupDetailViewComponent } from '../base-group-detail-view';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StopwatchListGridViewComponent } from "../../../stopwatch/views/grid/stopwatch-grid/stopwatch-list.component";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { GroupEvaluationBehaviorOptions, GroupPresetOptions, GroupTimingOptions } from '../../../../../utilities/constants';

@Component({
  selector: 'full-group-detail',
  imports: [
    MatCardModule,
    FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, StopwatchListGridViewComponent
  ],
  templateUrl: './full.component.html',
  styleUrl: './full.component.scss'
})
export class FullGroupDetailComponent extends BaseGroupDetailViewComponent {
  isEditting = signal(false);

  formGroup = new FormGroup({
    title: new FormControl(''),
    description: new FormControl(''),
    traitPreset: new FormControl(''),
    traitTiming: new FormControl(''),
    traitEvaluation: new FormControl([])
  });
  groupTimingOptions = GroupTimingOptions;
  groupEvaluationBehaviorOptions = GroupEvaluationBehaviorOptions;
  groupPresetOptions = GroupPresetOptions;
}
