import { Component, inject, Input, signal } from '@angular/core';
import { UniqueIdentifier, VisibleSplit } from '../../../models/sequence/interfaces';
import {MatExpansionModule} from '@angular/material/expansion';
import { SelectableSplitTypes } from '../../../utilities/constants';
import { TimeService } from '../../../services/time/time.service';


@Component({
  selector: 'base-split-view',
  imports: [MatExpansionModule],
  template: '',
})
export class BaseSplitComponent {
  protected _stopwatchId = signal<UniqueIdentifier | undefined>(undefined);
  selectableSplitTypes = SelectableSplitTypes;
  
  @Input({required: true}) 
  set stopwatchId(value: UniqueIdentifier) {
    this._stopwatchId.set(value);
  }
  get stopwatchId(): UniqueIdentifier {
    const stopwatchId = this._stopwatchId();
    if (!stopwatchId) {
      throw new Error('Id not set');
    }
    return stopwatchId;
  }


  protected _instance = signal<VisibleSplit | undefined>(undefined);
    
  @Input({required: true}) 
  set instance(value: VisibleSplit) {
    this._instance.set(value);
  }
  
  get instance(): VisibleSplit {
    const instance = this._instance();
    if (!instance) {
      throw new Error('Instance not set');
    }
    return instance;
  }

  timeService = inject(TimeService);
}
