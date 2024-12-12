import { SerializableRegistry } from "../../../utilities/serialization";
import { Objective, PersistentStopWatchInstance, StopwatchInstance } from "./interfaces";
import { SynchronicityObjective, TimeMinimizationObjective, UnitAccumulationObjective, registry } from "./objective";

/**
 * Manages the conversion between runtime StopwatchInstance objects and
 * their persistent storage representation (PersistentStopWatchInstance).
 */
export class Persistence {
    /**
     * The registry used for serializing and deserializing Objective instances
     */
    private static objectiveRegistry = new SerializableRegistry<Objective>();
  
    /**
     * Registers all available objective types with the registry
     */
    public static initialize(): void {
      // Clear any existing registrations (useful for testing)
      this.objectiveRegistry.clear();
      
      // Register all available objective types
      this.registerObjectiveTypes();
    }
  
    /**
     * Registers specific objective implementation classes with the registry
     */
    private static registerObjectiveTypes(): void {
      // Manual registration is an alternative to using decorators
      this.objectiveRegistry.register('time-minimization')(TimeMinimizationObjective);
      this.objectiveRegistry.register('unit-accumulation')(UnitAccumulationObjective);
      this.objectiveRegistry.register('synchronicity')(SynchronicityObjective);
    }
  
    /**
     * Converts a StopwatchInstance to a persistable PersistentStopWatchInstance format
     * using the SerializableRegistry for objective serialization
     */
    public static toPersistentInstance(instance: StopwatchInstance): PersistentStopWatchInstance {
      // Create base persistent instance
      const persistent: PersistentStopWatchInstance = {
        id: instance.id,
        annotation: instance.annotation,
        core: instance.core,
        metadata: instance.metadata
      };
  
      // Serialize the objective if one exists
      if (instance.objective) {
        const serializedObjective = this.objectiveRegistry.serialize(instance.objective);
        if (serializedObjective) {
          persistent.objective = {
            type: serializedObjective.type,
            configuration: serializedObjective.configuration
          };
        }
      }
  
      return persistent;
    }
  
    /**
     * Restores a StopwatchInstance from a PersistentStopWatchInstance format
     * using the SerializableRegistry for objective deserialization
     */
    public static fromPersistentInstance(persistent: PersistentStopWatchInstance): StopwatchInstance {
      // Create base instance
      const instance: StopwatchInstance = {
        id: persistent.id,
        annotation: persistent.annotation,
        core: persistent.core,
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
  
    /**
     * Serializes a StopwatchInstance to a JSON string
     */
    public static serialize(instance: StopwatchInstance): string {
      const persistent = this.toPersistentInstance(instance);
      return JSON.stringify(persistent);
    }
  
    /**
     * Deserializes a JSON string to a StopwatchInstance
     */
    public static deserialize(json: string): StopwatchInstance {
      const persistent = JSON.parse(json) as PersistentStopWatchInstance;
      return this.fromPersistentInstance(persistent);
    }
  }
  
  // Initialize the registry when the module loads
  StopwatchPersistence.initialize();