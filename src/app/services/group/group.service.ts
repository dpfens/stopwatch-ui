import { Injectable } from '@angular/core';
import { StopwatchGroup } from '../../models/sequence/interfaces';
import { TZDate } from '../../models/date';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  constructor() { }

  create(title: string, description: string): StopwatchGroup {
    const now = TZDate.now();
    return {
      id: crypto.randomUUID(),
      title,
      description,
      members: [],
      trait: [],
      view: 'normal',
      metadata: {
        creation: {timestamp: now},
        lastModification: {timestamp: now}
      }
    };
  }
}
