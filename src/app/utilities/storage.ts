/**
 * @file Storage adapters for different storage mechanisms in TypeScript
 * @description A collection of storage adapter classes that provide a consistent interface
 * for working with different storage mechanisms including IndexedDB, localStorage, and 
 * other storage-like interfaces. All adapters support generic typing for improved type safety.
 * @author Doug Fenstermacher
 * @version 1.0.0
 */

"use strict";

import { UniquelyIdentifiable } from "../shared/models/sequence/interfaces";


/**
 * Interface for storage-like objects that provide getItem and setItem methods
 * @interface Storage
 */
interface Storage {
  /**
   * Retrieves an item from storage by key
   * @param key - The key to retrieve
   * @returns The stored value, or null if not found
   */
  getItem(key: string): any;
  
  /**
   * Stores a value with the specified key
   * @param key - The key to store the value under
   * @param value - The value to store
   */
  setItem(key: string, value: any): void;
}


/**
 * Adapter for working with IndexedDB storage
 * @class IndexedDBStorageAdapter
 * @template T - The type of items to be stored, must extend BaseStorageItem
 */
export abstract class IndexedDBStorageAdapter<T extends UniquelyIdentifiable> {
  private database: string;
  private version: number;
  private dbPromise: Promise<IDBDatabase>;

  /**
   * Creates a new IndexedDB storage adapter
   * @param database - The name of the IndexedDB database
   * @param version - The version of the database schema
   */
  constructor(database: string, version: number) {
    this.database = database;
    this.version = version;
    this.dbPromise = this.initDatabase();
  }

  /**
   * Initializes the database connection
   * @private
   * @returns A promise that resolves to the IDBDatabase instance
   * @throws If there's an error opening the database
   */
  private async initDatabase(): Promise<IDBDatabase> {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.database, this.version);
      request.onupgradeneeded = this.upgrade.bind(this);
      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };
      request.onerror = (e: Event) => {
        console.log((e as any).error);
        reject(e);
      };
    });
  }

  /**
   * Handles database schema upgrades
   * @protected
   * @param event - The version change event
   * @throws Error indicating that this method must be implemented by subclasses
   */
  abstract upgrade(event: IDBVersionChangeEvent): void;

  /**
   * Opens a key cursor on the specified index
   * @param storeName - The name of the object store
   * @param indexName - The name of the index to use
   * @returns A promise that resolves to the cursor
   */
  async keyCursor(storeName: string, indexName: string): Promise<IDBCursor> {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    
    return new Promise<IDBCursor>((resolve, reject) => {
      const request = index.openKeyCursor();
      request.onsuccess = (event: Event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event: Event) => {
        reject(event);
      };
    });
  }

  /**
   * Retrieves all items from the store, optionally filtered by an index and range
   * @param storeName - The name of the object store
   * @param indexName - Optional name of an index to use for filtering
   * @param range - Optional key range to use with the index
   * @returns A promise that resolves to either a cursor (if indexName and range provided) or an array of items
   */
  async getAll(storeName: string, indexName?: string, range?: IDBKeyRange): Promise<IDBCursorWithValue | T[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    
    if (indexName && range) {
      const index = store.index(indexName);
      const request = index.openCursor(range);
      
      return new Promise<IDBCursorWithValue>((resolve, reject) => {
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
        request.onerror = (event: Event) => {
          reject(event);
        };
      });
    }
    
    const request = store.getAll();
    return new Promise<T[]>((resolve, reject) => {
      request.onsuccess = (event: Event) => {
        resolve((event.target as IDBRequest).result);
      };
      request.onerror = (event: Event) => {
        reject(event);
      };
    });
  }

  /**
   * Retrieves specific items by their IDs
   * @param storeName - The name of the object store
   * @param ids - One or more IDs of items to retrieve
   * @returns A promise that resolves to an array of Event objects containing the results
   */
  async get(storeName: string, ...ids: Array<string | number>): Promise<Event[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    
    const promises: Promise<Event>[] = [];
    
    for (const id of ids) {
      const request = store.get(id);
      const promise = new Promise<Event>((resolve, reject) => {
        request.onsuccess = (response: Event) => resolve(response);
        request.onerror = (response: Event) => reject(response);
      });
      promises.push(promise);
    }
    
    return Promise.all(promises);
  }

  /**
   * Adds new items to the store
   * @param storeName - The name of the object store
   * @param items - One or more items to add
   * @returns A promise that resolves to an array of Event objects containing the results
   * @throws If any items cannot be added (e.g., due to key constraints)
   */
  async add(storeName: string, ...items: T[]): Promise<Event[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    
    const promises: Promise<Event>[] = [];
    
    for (const item of items) {
      const request = store.add(item);
      const promise = new Promise<Event>((resolve, reject) => {
        request.onsuccess = (response: Event) => resolve(response);
        request.onerror = (response: Event) => reject(response);
      });
      promises.push(promise);
    }
    
    return Promise.all(promises);
  }

  /**
   * Updates existing items in the store
   * @param storeName - The name of the object store
   * @param items - One or more items to update (must have a valid ID property)
   * @returns A promise that resolves to an array of key values for the updated items
   */
  async update(storeName: string, ...items: T[]): Promise<IDBValidKey[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    
    const promises: Promise<IDBValidKey>[] = [];
    
    for (const item of items) {
      const request = store.put(item);
      const promise = new Promise<IDBValidKey>((resolve, reject) => {
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
        request.onerror = (event: Event) => {
          reject(event);
        };
      });
      promises.push(promise);
    }
    
    return Promise.all(promises);
  }

  /**
   * Deletes items from the store by their IDs
   * @param storeName - The name of the object store
   * @param ids - One or more IDs of items to delete
   * @returns A promise that resolves to an array of results from the delete operations
   */
  async delete(storeName: string, ...ids: Array<string | number>): Promise<any[]> {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    
    const promises: Promise<any>[] = [];
    
    for (const id of ids) {
      const request = store.delete(id);
      const promise = new Promise<any>((resolve, reject) => {
        request.onsuccess = (event: Event) => {
          resolve((event.target as IDBRequest).result);
        };
        request.onerror = (event: Event) => {
          reject(event);
        };
      });
      promises.push(promise);
    }
    
    return Promise.all(promises);
  }

  /**
   * Executes a compound transaction across multiple object stores
   * 
   * @template R - The type of the result returned by the transaction
   * @param storeNames - Array of object store names to include in the transaction
   * @param mode - Transaction mode ('readonly' or 'readwrite')
   * @param callback - Function that performs operations within the transaction
   *                  and returns a result (either directly or as a Promise)
   * @returns A promise that resolves to the result of the callback function
   * @throws If the transaction fails or if the callback throws an error
   * 
   * @example
   * // Example usage to fetch stopwatches for a group
   * const stopwatches = await this.compoundTransaction(
   *   ['groupMemberships', 'stopwatches'], 
   *   'readonly',
   *   async (tx) => {
   *     // Get memberships from one store
   *     const memberships = await getGroupMemberships(tx, groupId);
   *     
   *     // Get stopwatches from another store in the same transaction
   *     return getStopwatchesByIds(tx, memberships.map(m => m.stopwatchId));
   *   }
   * );
   */
  async compoundTransaction<R>(
    storeNames: string[], 
    mode: IDBTransactionMode, 
    callback: (tx: IDBTransaction) => Promise<R>
  ): Promise<R> {
    const db = await this.dbPromise;
    const transaction = db.transaction(storeNames, mode);
    
    return new Promise<R>((resolve, reject) => {
      try {
        const result = callback(transaction);
        
        // Handle both synchronous and asynchronous callbacks
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result as R);
        }
        
        // Handle transaction completion or error
        transaction.oncomplete = () => {
          if (!(result instanceof Promise)) {
            resolve(result as R);
          }
        };
        
        transaction.onerror = (event) => {
          reject(event);
        };
      } catch (error) {
        reject(error);
      }
    });
  }
}

/**
 * Adapter for working with simple storage mechanisms like localStorage
 * @class StorageAdapter
 * @template T - The type of items to be stored, must extend BaseStorageItem
 */
export class StorageAdapter<T extends UniquelyIdentifiable> {
  private key: string;
  private storage: Storage;
  private data: { [key: string | number]: T };

  /**
   * Creates a new storage adapter
   * @param storage - The storage mechanism to use
   * @param key - The key under which to store the data
   */
  constructor(storage: Storage, key: string) {
    this.key = key;
    this.storage = storage;
    this.data = storage.getItem(key);
  }

  /**
   * Retrieves all items from the store
   * @returns An array of all stored items
   */
  getAll(): T[] {
    const output: T[] = [];
    for (const id in this.data) {
      const item = this.data[id];
      output.push(item);
    }
    return output;
  }

  /**
   * Retrieves a specific item by ID
   * @param id - The ID of the item to retrieve
   * @returns The item, or undefined if not found
   */
  get(id: string | number): T {
    return this.data[id];
  }

  /**
   * Adds a new item to the store
   * @param item - The item to add
   */
  add(item: T): void {
    const keys = Object.keys(this.data);
    this.data[keys.length] = item;
    this.storage.setItem(this.key, this.data);
  }

  /**
   * Updates an existing item in the store
   * @param id - The ID of the item to update
   * @param item - The updated item data
   */
  update(id: string | number, item: T): void {
    if (id) {
      this.data[id] = item;
    }
    this.storage.setItem(this.key, this.data);
  }

  /**
   * Deletes items from the store by their IDs
   * @param ids - One or more IDs of items to delete
   */
  delete(...ids: Array<string | number>): void {
    for (const id of ids) {
      if (id in this.data) {
        delete this.data[id];
      }
    }
    this.storage.setItem(this.key, this.data);
  }
}

/**
 * Adapter for working with asynchronous storage mechanisms
 * @class AsynchronousStorageAdapter
 * @template T - The type of items to be stored, must extend BaseStorageItem
 */
export class AsynchronousStorageAdapter<T extends UniquelyIdentifiable> {
  private key: string;
  private storage: Storage;
  private data: { [key: string | number]: T };

  /**
   * Creates a new asynchronous storage adapter
   * @param storage - The storage mechanism to use
   * @param key - The key under which to store the data
   */
  constructor(storage: Storage, key: string) {
    this.key = key;
    this.storage = storage;
    this.data = storage.getItem(key) || {};
  }

  /**
   * Retrieves all items from the store
   * @param storeName - The name of the store (for API consistency)
   * @returns A promise that resolves to an array of all stored items
   */
  async getAll(_storeName: string): Promise<T[]> {
    const output: T[] = [];
    for (const id in this.data) {
      const item = this.data[id];
      output.push(item);
    }
    return output;
  }

  /**
   * Retrieves a specific item by ID
   * @param storeName - The name of the store (for API consistency)
   * @param id - The ID of the item to retrieve
   * @returns A promise that resolves to the item, or undefined if not found
   */
  async get(storeName: string, id: string | number): Promise<T> {
    return this.data[id];
  }

  /**
   * Adds new items to the store
   * @param storeName - The name of the store (for API consistency)
   * @param items - One or more items to add
   * @returns A promise that resolves when the operation is complete
   */
  async add(_storeName: string, ...items: T[]): Promise<void> {
    const keys = Object.keys(this.data);
    let openKey: string | number = keys.length;
    
    for (const item of items) {
      while (openKey in this.data) {
        openKey++;
      }
      item.id = openKey;
      this.data[openKey] = item;
    }
    
    this.storage.setItem(this.key, this.data);
  }

  /**
   * Updates existing items in the store
   * @param storeName - The name of the store (for API consistency)
   * @param items - One or more items to update (must have a valid ID property)
   * @returns A promise that resolves when the operation is complete
   */
  async update(_storeName: string, ...items: T[]): Promise<void> {
    for (const item of items) {
      const id = item.id;
      if (id !== undefined) {
        this.data[id] = item;
      }
    }
    
    this.storage.setItem(this.key, this.data);
  }

  /**
   * Deletes items from the store by their IDs
   * @param storeName - The name of the store (for API consistency)
   * @param ids - One or more IDs of items to delete
   * @returns A promise that resolves when the operation is complete
   */
  async delete(_storeName: string, ...ids: Array<string | number>): Promise<void> {
    for (const id of ids) {
      if (id in this.data) {
        delete this.data[id];
      }
    }
    
    this.storage.setItem(this.key, this.data);
  }
}