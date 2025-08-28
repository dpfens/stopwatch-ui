import { Injectable, signal, WritableSignal, computed, PLATFORM_ID, inject, DestroyRef } from '@angular/core';
import { 
  ContextualStopwatchEntity, 
  StopwatchEntity, 
  UniqueIdentifier,
  BaseStopwatchGroup 
} from '../../models/sequence/interfaces';
import { TZDate } from '../../models/date';
import { StopwatchRepository } from '../../repositories/stopwatch';
import { GroupRepository } from '../../repositories/group';
import { AnalysisRegistry } from '../../models/sequence/analysis/registry';
import { isPlatformBrowser } from '@angular/common';
import { SynchronizationService } from '../synchronization/synchronization.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class StopwatchService {
  platformId = inject(PLATFORM_ID);
  private repository = new StopwatchRepository();
  private groupRepository = new GroupRepository();

  private destroyRef = inject(DestroyRef);
  private syncService = inject(SynchronizationService);
  
  private _instances: WritableSignal<ContextualStopwatchEntity[]> = signal<ContextualStopwatchEntity[]>([]);
  private _isLoading: WritableSignal<boolean> = signal<boolean>(false);
  private _error: WritableSignal<string | null> = signal<string | null>(null);
  
  // Public readonly signals
  instances = this._instances.asReadonly();
  isLoading = this._isLoading.asReadonly();
  error = this._error.asReadonly();
  
  // Computed signals for derived state
  instanceCount = computed(() => this.instances().length);
  hasInstances = computed(() => this.instances().length > 0);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadInstances();

      // Listen for group membership changes and refresh OUR OWN stopwatch data
      this.syncService.groupEvents$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          if (['updated', 'deleted'].includes(event.action)) {
            this.refreshStopwatchesByGroup(event.groupId);
          }
        });
      
      // Listen for group membership changes and refresh OUR OWN stopwatch data
      this.syncService.membershipEvents$
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(event => {
          this.refreshGroups(event.stopwatchId);
        });
    }
  }

  /**
   * Creates a blank stopwatch entity with default values
   */
  blank(title: string, description: string): StopwatchEntity {
    const now = TZDate.now();
    return {
      id: crypto.randomUUID(),
      annotation: {
        title, 
        description
      },
      state: { 
        sequence: [],
        lap: null
      },
      metadata: {
        creation: { timestamp: now },
        lastModification: { timestamp: now }
      }
    };
  }

  /**
   * Creates a contextual stopwatch entity from a base entity
   */
  private async createContextualEntity(entity: StopwatchEntity): Promise<ContextualStopwatchEntity> {
    // Get groups this stopwatch belongs to
    const groupIds = await this.groupRepository.byStopwatch(entity.id);
    const groups = await this.groupRepository.getByIds(groupIds);
    
    return {
      ...entity,
      groups,
      analysis: new AnalysisRegistry() // Initialize with empty analysis registry
    };
  }

  /**
   * Loads all instances from the repository
   */
  async loadInstances(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);
      
      const entities = await this.repository.getAll();
      const contextualEntities = await Promise.all(
        entities.map(entity => this.createContextualEntity(entity))
      );
      
      this._instances.set(contextualEntities);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to load stopwatches');
      console.error('Error loading stopwatches:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Gets a stopwatch by ID
   */
  async getById(id: UniqueIdentifier): Promise<ContextualStopwatchEntity | null> {
    // First check in-memory instances
    const existing = this.instances().find(inst => inst.id === id);
    if (existing) {
      return existing;
    }

    // If not found in memory, try loading from repository
    try {
      const entity = await this.repository.get(id);
      if (entity) {
        return await this.createContextualEntity(entity);
      }
      return null;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get stopwatch');
      return null;
    }
  }

  /**
   * Creates a new stopwatch instance
   */
  async create(instance: StopwatchEntity): Promise<ContextualStopwatchEntity | null> {
    try {
      this._error.set(null);
      
      // Ensure we have an ID
      if (!instance.id) {
        instance.id = crypto.randomUUID();
      }
      
      // Update modification timestamp
      instance.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.create(instance);
      
      // Create contextual entity
      const contextualEntity = await this.createContextualEntity(instance);
      
      // Update in-memory state
      this._instances.set([...this.instances(), contextualEntity]);
      
      return contextualEntity;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to create stopwatch');
      console.error('Error creating stopwatch:', error);
      return null;
    }
  }

  /**
   * Updates an existing stopwatch instance
   */
  async update(instance: ContextualStopwatchEntity): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Update modification timestamp
      instance.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.update(instance);
      this.syncService.notifyStopwatchUpdated(instance.id);
      
      // Update in-memory state
      const index = this.instances().findIndex(inst => inst.id === instance.id);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = instance;
        this._instances.set(instances);
        return true;
      }
      
      return false;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to update stopwatch');
      console.error('Error updating stopwatch:', error);
      return false;
    }
  }

  /**
   * Deletes a stopwatch instance
   */
  async delete(id: UniqueIdentifier): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Delete from repository
      await this.repository.delete(id);
      
      // Update in-memory state
      const instances = this.instances().filter(inst => inst.id !== id);
      this._instances.set(instances);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to delete stopwatch');
      console.error('Error deleting stopwatch:', error);
      return false;
    }
  }

  /**
   * Gets stopwatches by group ID
   */
  async getByGroupId(groupId: UniqueIdentifier): Promise<ContextualStopwatchEntity[]> {
    try {
      const entities = await this.repository.byGroup(groupId);
      return await Promise.all(
        entities.map(entity => this.createContextualEntity(entity))
      );
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get stopwatches by group');
      console.error('Error getting stopwatches by group:', error);
      return [];
    }
  }

  /**
   * Refreshes the groups for a specific stopwatch
   */
  async refreshGroups(stopwatchId: UniqueIdentifier): Promise<void> {
    const instance = this.instances().find(inst => inst.id === stopwatchId);
    if (!instance) return;

    try {
      const groupIds = await this.groupRepository.byStopwatch(stopwatchId);
      const groups = await this.groupRepository.getByIds(groupIds);
      
      // Update the instance with new groups
      const updatedInstance = { ...instance, groups };
      
      const index = this.instances().findIndex(inst => inst.id === stopwatchId);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = updatedInstance;
        this._instances.set(instances);
      }
    } catch (error) {
      console.error('Error refreshing groups for stopwatch:', error);
    }
  }

  private async refreshStopwatchesByGroup(groupId: UniqueIdentifier): Promise<void> {
    const entities = await this.getByGroupId(groupId);
    const instances = this.instances();
    entities.forEach(entity => {
      const index = instances.findIndex(instance => instance.id === entity.id);
      if (index > -1) {
        instances[index] = entity;
      }
    });
    this._instances.set([...instances]);
  }

  /**
   * Clears all error states
   */
  clearError(): void {
    this._error.set(null);
  }
}