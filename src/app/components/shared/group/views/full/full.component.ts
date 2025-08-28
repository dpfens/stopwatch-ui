import { Component, OnInit, signal } from '@angular/core';
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
import { GroupEvaluationBehavior, GroupTimingBehavior, GroupTraitPreset } from '../../../../../models/sequence/interfaces';
import { StopwatchGridDetailViewComponent } from "../../../stopwatch/views/grid/stopwatch-grid-detail/stopwatch-detail.component";

@Component({
  selector: 'full-group-detail',
  imports: [
    MatCardModule,
    FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule,
    StopwatchListGridViewComponent
],
  templateUrl: './full.component.html',
  styleUrl: './full.component.scss'
})
export class FullGroupDetailComponent extends BaseGroupDetailViewComponent implements OnInit {
  isEditting = signal(false);

  formGroup = new FormGroup({
    title: new FormControl(''),
    description: new FormControl(''),
    traitPreset: new FormControl<GroupTraitPreset>('normal'),
    traitTiming: new FormControl<GroupTimingBehavior>('independent'),
    traitEvaluation: new FormControl<GroupEvaluationBehavior[]>([])
  });
  groupTimingOptions = GroupTimingOptions;
  groupEvaluationBehaviorOptions = GroupEvaluationBehaviorOptions;
  groupPresetOptions = GroupPresetOptions;

  ngOnInit(): void {
    const instance = this.getInstance();
    if (instance) {
      this.formGroup.patchValue({
        ...instance.annotation,
        traitTiming: instance.traits?.timing,
        traitEvaluation: instance.traits?.evaluation,
        traitPreset: this.preset() as GroupTraitPreset
      });
    }
  }

  handlePreset(): void {
  }

  async saveSettings(): Promise<void> {
    const instance = {...this.getInstance()};
    if (this.formGroup.controls.traitTiming.value) {
      instance.traits.timing = this.formGroup.controls.traitTiming.value;
    }
    if (this.formGroup.controls.traitEvaluation.value) {
      instance.traits.evaluation = this.formGroup.controls.traitEvaluation.value;
    }
    if (this.formGroup.controls.title.value) {
      instance.annotation.title = this.formGroup.controls.title.value;
    }
    if (this.formGroup.controls.description.value) {
      instance.annotation.description = this.formGroup.controls.description.value;
    }
    await this.service.update(instance);
  }
}
