import { StopwatchInstance, PersistentStopWatchInstance, Objective, StopwatchGroupMembership } from "../shared/models/sequence/interfaces";
import { TZDate } from "../shared/models/date";
import { SerializableRegistry, SerializableType } from "../utilities/serialization";
import { registry } from "../shared/models/sequence/objective";
import { 
  IndexedDBStorageAdapter, 
} from "../utilities/storage";
import { StopwatchEvent } from "../shared/models/sequence/interfaces";
import { BaseRepository, StopwatchDatabase } from "./application";



/**
 * Adapter for managing Stopwatch instances in IndexedDB using the new storage API
 * @class StopwatchRepository
 */
export class StopwatchRepository extends BaseRepository {
  private static readonly objectiveRegistry: SerializableRegistry<Objective> = registry;
  private static readonly STOPWATCH_STORE = "stopwatches";
  private static readonly GROUP_MEMBERSHIP_STORE = "groupMemberships";

  private adapter: IndexedDBStorageAdapter<PersistentStopWatchInstance>;
  private membershipAdapter: IndexedDBStorageAdapter<StopwatchGroupMembership>;
  private database: StopwatchDatabase;

  /**
   * Creates a new StopwatchRepository
   */
  constructor() {
    super();
    this.database = new StopwatchDatabase(StopwatchRepository.DB_NAME, StopwatchRepository.DB_VERSION);
    this.adapter = new IndexedDBStorageAdapter<PersistentStopWatchInstance>(this.database);
    this.membershipAdapter = new IndexedDBStorageAdapter<StopwatchGroupMembership>(this.database);
  }

  /**
   * Fetches all stopwatches from the database
   * @returns A promise that resolves to an array of stopwatch instances
   */
  async getAll(): Promise<StopwatchInstance[]> {
    const repo = this.adapter.getRepository();
    const persistentInstances = await repo.getAll(StopwatchRepository.STOPWATCH_STORE);
    return persistentInstances.map(instance => StopwatchRepository.fromPersistentInstance(instance));
  }

  /**
   * Fetches a stopwatch by ID
   * @param id - The ID of the stopwatch to fetch
   * @returns A promise that resolves to the stopwatch instance, or null if not found
   */
  async get(id: string): Promise<StopwatchInstance | null> {
    const repo = this.adapter.getRepository();
    const persistentInstance = await repo.getById(StopwatchRepository.STOPWATCH_STORE, id);
    
    if (!persistentInstance) {
      return null;
    }
    
    return StopwatchRepository.fromPersistentInstance(persistentInstance);
  }

  /**
   * Fetches stopwatches by group ID
   * @param groupId - The ID of the group
   * @returns A promise that resolves to an array of stopwatch instances
   */
  async byGroup(groupId: string): Promise<StopwatchInstance[]> {
    const membershipRepo = this.membershipAdapter.getIndexRepository();
    const stopwatchRepo = this.adapter.getRepository();
    
    // Get all memberships for this group
    const memberships = await membershipRepo.getAllByIndex(
      StopwatchRepository.GROUP_MEMBERSHIP_STORE,
      "groupId",
      IDBKeyRange.only(groupId)
    );
    
    if (memberships.length === 0) {
      return [];
    }
    
    // Get all stopwatches for the membership records
    const stopwatchIds = memberships.map(m => m.stopwatchId);
    const persistentInstances = await stopwatchRepo.getByIds(
      StopwatchRepository.STOPWATCH_STORE,
      stopwatchIds
    );
    
    return persistentInstances.map(instance => StopwatchRepository.fromPersistentInstance(instance));
  }

  /**
   * Saves a stopwatch to the database
   * @param stopwatch - The stopwatch to save
   * @returns A promise that resolves to the ID of the saved stopwatch
   */
  async save(stopwatch: StopwatchInstance): Promise<string> {
    const repo = this.adapter.getRepository();
    const serialized = StopwatchRepository.toPersistentInstance(stopwatch);
    
    // If the stopwatch has an ID, update it; otherwise, add it
    if (stopwatch.id) {
      await repo.update(StopwatchRepository.STOPWATCH_STORE, serialized);
      return stopwatch.id;
    } else {
      // Generate a new ID if not present
      serialized.id = this.generateId();
      await repo.add(StopwatchRepository.STOPWATCH_STORE, serialized);
      return serialized.id;
    }
  }

  /**
   * Deletes a stopwatch from the database
   * @param id - The ID of the stopwatch to delete
   * @returns A promise that resolves when the operation is complete
   */
  async delete(id: string): Promise<void> {
    const stopwatchRepo = this.adapter.getRepository();
    const membershipRepo = this.membershipAdapter.getIndexRepository();
    
    // Delete the stopwatch
    await stopwatchRepo.delete(StopwatchRepository.STOPWATCH_STORE, id);
    
    // Find and delete all group memberships for this stopwatch
    const memberships = await membershipRepo.getAllByIndex(
      StopwatchRepository.GROUP_MEMBERSHIP_STORE,
      "stopwatchId",
      IDBKeyRange.only(id)
    );
    
    if (memberships.length > 0) {
      const membershipIds = memberships.map(m => m.id);
      await this.membershipAdapter.getRepository().deleteMany(
        StopwatchRepository.GROUP_MEMBERSHIP_STORE,
        membershipIds as (string | number)[]
      );
    }
  }

  /**
   * Converts a StopwatchInstance to a persistable PersistentStopWatchInstance format
   * using the SerializableRegistry<Objective> for objective serialization
   */
  public static toPersistentInstance(instance: StopwatchInstance): PersistentStopWatchInstance {
    // Create base persistent instance
    const persistent: PersistentStopWatchInstance = {
      id: instance.id,
      annotation: instance.annotation,
      core: {
        ...instance.core,
        // Ensure the sequence events have the right format
        sequence: instance.core.sequence.map((event: StopwatchEvent )=> ({
          ...event,
          // Ensure the timestamp is serialized properly
          timestamp: event.timestamp instanceof TZDate ? 
            event.timestamp : 
            TZDate.fromJSON(event.timestamp)
        }))
      },
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
   * Restores a StopwatchInstance from a PersistentStopWatchInstance format
   * using the SerializableRegistry for objective deserialization
   */
  public static fromPersistentInstance(persistent: PersistentStopWatchInstance): StopwatchInstance {
    // Create base instance
    const instance: StopwatchInstance = {
      id: persistent.id,
      annotation: persistent.annotation,
      core: {
        ...persistent.core,
        // Convert serialized timestamps back to TZDate objects
        sequence: persistent.core.sequence.map((event: StopwatchEvent) => ({
          ...event,
          // Convert serialized TimeZonedDate to TZDate instance
          timestamp: event.timestamp instanceof TZDate ? 
            event.timestamp : 
            TZDate.fromJSON(event.timestamp)
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