import { Injectable } from '@angular/core';
import { StopwatchGroup } from '../../models/sequence/interfaces';
import { TZDate } from '../../models/date';
import { GroupPresets } from '../../utilities/constants';

@Injectable({
  providedIn: 'root'
})
export class GroupService {

  constructor() { }

  create(title: string, description: string): StopwatchGroup {
    const now = TZDate.now();
    return {
      id: crypto.randomUUID(),
      annotation: {
        title,
        description,
      },
      members: [],
      traits: GroupPresets.normal,
      metadata: {
        creation: {timestamp: now},
        lastModification: {timestamp: now}
      }
    };
  }
}
