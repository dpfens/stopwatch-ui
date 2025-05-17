import { Injectable } from '@angular/core';
import { StopwatchEntity } from '../../models/sequence/interfaces';
import { TZDate } from '../../models/date';


@Injectable({
  providedIn: 'root'
})
export class StopwatchService {
  constructor() {}


  create(title: string, description: string): StopwatchEntity {
    const now = TZDate.now();
    return {
      id: crypto.randomUUID(),
      annotation: {
        title, description
      },
      state: { sequence: []},
      metadata: {
        creation: {timestamp: now},
        lastModification: {timestamp: now}
      }
    };
  }
}
