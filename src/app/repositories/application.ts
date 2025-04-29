import { IndexedDBDatabase } from "../utilities/storage";

/**
 * Database implementation for application data
 * This ensures schema consistency across both adapters
 */
/**
 * Database implementation for Stopwatch data
 */
export class StopwatchDatabase extends IndexedDBDatabase {
  private static readonly GROUP_STORE = "groups";
  private static readonly GROUP_MEMBERSHIP_STORE = "groupMemberships";
  private static readonly STOPWATCH_STORE = "stopwatches";

  /**
   * Handles database schema upgrades
   * @param event - The version change event
   */
  protected handleUpgrade(event: IDBVersionChangeEvent): void {
    const db = (event.target as IDBOpenDBRequest).result;
    
    // Create groups store if it doesn't exist
    if (!db.objectStoreNames.contains(StopwatchDatabase.GROUP_STORE)) {
      const groupStore = db.createObjectStore(StopwatchDatabase.GROUP_STORE, { keyPath: "id" });
      groupStore.createIndex("title", "title", { unique: false });
    }
    
    // Create stopwatches store if it doesn't exist (for compatibility)
    if (!db.objectStoreNames.contains(StopwatchDatabase.STOPWATCH_STORE)) {
      const stopwatchStore = db.createObjectStore(StopwatchDatabase.STOPWATCH_STORE, { keyPath: "id" });
      
      // Create indices for efficient querying
      stopwatchStore.createIndex("creationDate", "metadata.creation.timestamp", { unique: false });
      stopwatchStore.createIndex("modificationDate", "metadata.lastModification.timestamp", { unique: false });
    }
    
    // Create group membership store if it doesn't exist (for compatibility)
    if (!db.objectStoreNames.contains(StopwatchDatabase.GROUP_MEMBERSHIP_STORE)) {
      const groupMembershipStore = db.createObjectStore(StopwatchDatabase.GROUP_MEMBERSHIP_STORE, { 
        keyPath: "id", 
        autoIncrement: true 
      });
      
      // Create indices for efficient querying
      groupMembershipStore.createIndex("groupId", "groupId", { unique: false });
      groupMembershipStore.createIndex("stopwatchId", "stopwatchId", { unique: false });

      groupMembershipStore.createIndex("groupStopwatch", ["groupId", "stopwatchId"], { unique: true });
    }
  }
}


export class BaseRepository {
  static readonly DB_NAME = "stopwatch";
  static readonly DB_VERSION = 1;

  /**
   * Generates a unique ID for a new stopwatch
   * @private
   * @returns The generated ID
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }
}