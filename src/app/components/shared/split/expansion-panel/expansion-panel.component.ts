import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseSplitComponent } from '../base-split.component';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { StopWatchEventType, VisibleSplit } from '../../../../models/sequence/interfaces';
import { MatButtonModule } from '@angular/material/button';
import { LapUnits } from '../../../../utilities/constants';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';


@Component({
  selector: 'split-expansion-panel',
  imports: [
    MatExpansionModule,
    FormsModule, ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule,
    MatListModule, MatButtonModule, MatIconModule],
  templateUrl: './expansion-panel.component.html',
  styleUrl: './expansion-panel.component.scss'
})
export class SplitExpansionPanelComponent extends BaseSplitComponent implements OnInit {
  form = new FormGroup({
    title: new FormControl(''),
    splitType: new FormControl(''),
    splitValue: new FormControl(''),
    splitUnit: new FormControl('')
  });
  isEditting = signal(false);
  lapUnits = LapUnits;

  @Output() updateEmitter: EventEmitter<VisibleSplit> = new EventEmitter<VisibleSplit>();
  @Output() deleteEmitter: EventEmitter<VisibleSplit> = new EventEmitter<VisibleSplit>();

  ngOnInit(): void {
    this.form.controls.splitType.patchValue(this.instance.event.type);
    this.form.controls.title.patchValue(this.instance.event.annotation.title);
  }

  handleChange() {
    if (this.form.controls.splitType) {
      this.instance.event.type = this.form.controls.splitType.value as StopWatchEventType;
    }
    if (this.form.controls.title) {
      this.instance.event.annotation.title = this.form.controls.title.value as string;
    }
    this.updateEmitter.emit(this.instance);
  }

  delete() {
    this.deleteEmitter.emit(this.instance);
  }
}
