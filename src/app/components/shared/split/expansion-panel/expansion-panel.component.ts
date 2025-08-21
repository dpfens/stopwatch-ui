import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseSplitComponent } from '../base-split.component';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { StopWatchEventType, VisibleSplit } from '../../../../models/sequence/interfaces';


@Component({
  selector: 'split-expansion-panel',
  imports: [FormsModule, ReactiveFormsModule, MatExpansionModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatIconModule],
  templateUrl: './expansion-panel.component.html',
  styleUrl: './expansion-panel.component.scss'
})
export class SplitExpansionPanelComponent extends BaseSplitComponent implements OnInit {
  form = new FormGroup({
    title: new FormControl(''),
    splitType: new FormControl(''),
  });

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
