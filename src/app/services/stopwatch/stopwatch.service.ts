import { Injectable } from '@angular/core';
import { Objective, SerializedStopwatchEntity, ContextualStopwatchEntity } from '../../shared/models/sequence/interfaces';
import { SerializableRegistry, SerializableType } from '../../utilities/serialization';
import { registry } from '../../shared/models/sequence/objective';
import { TZDate } from '../../shared/models/date';

@Injectable({
  providedIn: 'root'
})
export class StopwatchService {
  static objectiveRegistry: SerializableRegistry<Objective> = registry;

  constructor() {}


  /**
   * Converts a ContextualStopwatchEntity to a persistable SerializedStopWatchEntity format
   * using the SerializableRegistry<Objective> for objective serialization
   */
  public static toPersistentInstance(instance: ContextualStopwatchEntity): SerializedStopwatchEntity {
    // Create base persistent instance
    const persistent: SerializedStopwatchEntity = {
      id: instance.id,
      annotation: instance.annotation,
      state: instance.state,
      metadata: instance.metadata
    };

    // Serialize the objective if one exists
    if (instance.objective) {
      const serializedObjective = this.objectiveRegistry.serialize(instance.objective as Objective & SerializableType<Objective>);
      if (serializedObjective) {
        persistent.objective = {
          type: instance.objective.type,
          configuration: serializedObjective.configuration
        };
      }
    }

    return persistent;
  }

  /**
   * Restores a ContextualStopwatchEntity from a SerializedStopWatchEntity format
   * using the SerializableRegistry for objective deserialization
   */
  public static fromPersistentInstance(persistent: SerializedStopwatchEntity): ContextualStopwatchEntity {
    // Create base instance
    const instance: ContextualStopwatchEntity = {
      id: persistent.id,
      annotation: persistent.annotation,
      state: {
        ...persistent.state,
        // Convert serialized timestamps back to TZDate objects
        sequence: persistent.state.sequence.map(event => ({
          ...event,
          // Convert serialized TimeZonedDate to TZDate instance
          timestamp: TZDate.fromJSON(event.timestamp)
        }))
      },
      metadata: persistent.metadata
    };

    // Deserialize the objective if one exists
    if (persistent.objective) {
      instance.objective = this.objectiveRegistry.deserialize({
        type: persistent.objective.type,
        configuration: persistent.objective.configuration
      });
    }

    return instance;
  }
}
