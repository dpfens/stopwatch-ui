import { Injectable, signal, WritableSignal, computed, inject, PLATFORM_ID } from '@angular/core';
import { 
  StopwatchGroup, 
  BaseStopwatchGroup, 
  UniqueIdentifier,
  GroupTraits,
  GroupTraitPreset,
  GroupTimingBehavior,
  GroupEvaluationBehavior
} from '../../models/sequence/interfaces';
import { TZDate } from '../../models/date';
import { GroupRepository } from '../../repositories/group';
import { StopwatchRepository } from '../../repositories/stopwatch';
import { AnalysisRegistry } from '../../models/sequence/analysis/registry';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  platformId = inject(PLATFORM_ID);

  private repository = new GroupRepository();
  private stopwatchRepository = new StopwatchRepository();
  
  private _instances: WritableSignal<StopwatchGroup[]> = signal<StopwatchGroup[]>([]);
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
    }
  }

  /**
   * Creates a blank group with default traits
   */
  blank(title: string, description: string, preset: GroupTraitPreset = 'normal'): StopwatchGroup {
    const now = TZDate.now();
    return {
      id: crypto.randomUUID(),
      annotation: {
        title,
        description
      },
      traits: this.getTraitsFromPreset(preset),
      metadata: {
        creation: { timestamp: now },
        lastModification: { timestamp: now }
      },
      members: []
    };
  }

  /**
   * Gets default traits based on preset
   */
  private getTraitsFromPreset(preset: GroupTraitPreset): GroupTraits {
    const presetConfigs: Record<GroupTraitPreset, GroupTraits> = {
      'normal': {
        timing: 'independent',
        evaluation: ['independent'],
        analytics: []
      },
      'competition': {
        timing: 'synchronized',
        evaluation: ['comparative', 'trending'],
        analytics: []
      },
      'workflow': {
        timing: 'sequential',
        evaluation: ['cumulative', 'threshold'],
        analytics: []
      },
      'billing': {
        timing: 'independent',
        evaluation: ['cumulative', 'proportional'],
        analytics: []
      }
    };
    
    return presetConfigs[preset];
  }

  /**
   * Creates a contextual group entity from a base entity
   */
  private async createContextualGroup(baseGroup: BaseStopwatchGroup): Promise<StopwatchGroup> {
    // Get stopwatch members for this group
    const stopwatchEntities = await this.stopwatchRepository.byGroup(baseGroup.id);
    
    // Convert to contextual entities
    const members = await Promise.all(
      stopwatchEntities.map(async (entity) => {
        const groupIds = await this.repository.byStopwatch(entity.id);
        const groups = await this.repository.getByIds(groupIds);
        
        return {
          ...entity,
          groups,
          analysis: new AnalysisRegistry()
        };
      })
    );
    
    return {
      ...baseGroup,
      members
    };
  }

  /**
   * Loads all instances from the repository
   */
  async loadInstances(): Promise<void> {
    try {
      this._isLoading.set(true);
      this._error.set(null);
      
      const baseGroups = await this.repository.getAll();
      const contextualGroups = await Promise.all(
        baseGroups.map(group => this.createContextualGroup(group))
      );
      
      this._instances.set(contextualGroups);
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to load groups');
      console.error('Error loading groups:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Gets a group by ID
   */
  async getById(id: UniqueIdentifier): Promise<StopwatchGroup | null> {
    // First check in-memory instances
    const existing = this.instances().find(inst => inst.id === id);
    if (existing) {
      return existing;
    }

    // If not found in memory, try loading from repository
    try {
      const baseGroup = await this.repository.get(id);
      if (baseGroup) {
        return await this.createContextualGroup(baseGroup);
      }
      return null;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to get group');
      return null;
    }
  }

  /**
   * Creates a new group
   */
  async create(group: StopwatchGroup): Promise<StopwatchGroup | null> {
    try {
      this._error.set(null);
      
      // Ensure we have an ID
      if (!group.id) {
        group.id = crypto.randomUUID();
      }
      
      // Update modification timestamp
      group.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.create(group);
      
      // Update in-memory state
      this._instances.set([...this.instances(), group]);
      
      return group;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to create group');
      console.error('Error creating group:', error);
      return null;
    }
  }

  /**
   * Updates an existing group
   */
  async update(group: StopwatchGroup): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Update modification timestamp
      group.metadata.lastModification = {
        timestamp: TZDate.now()
      };
      
      // Save to repository
      await this.repository.update(group);
      
      // Update in-memory state
      const index = this.instances().findIndex(inst => inst.id === group.id);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = group;
        this._instances.set(instances);
        return true;
      }
      
      return false;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to update group');
      console.error('Error updating group:', error);
      return false;
    }
  }

  /**
   * Deletes a group
   */
  async delete(id: UniqueIdentifier): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Delete from repository (this will also clear memberships)
      await this.repository.delete(id);
      
      // Update in-memory state
      const instances = this.instances().filter(inst => inst.id !== id);
      this._instances.set(instances);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to delete group');
      console.error('Error deleting group:', error);
      return false;
    }
  }

  /**
   * Adds a stopwatch to a group
   */
  async addMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Add membership in repository
      await this.repository.addMember(groupId, stopwatchId);
      
      // Refresh the affected group in memory
      await this.refreshGroup(groupId);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to add group member');
      console.error('Error adding group member:', error);
      return false;
    }
  }

  /**
   * Removes a stopwatch from a group
   */
  async removeMember(groupId: UniqueIdentifier, stopwatchId: UniqueIdentifier): Promise<boolean> {
    try {
      this._error.set(null);
      
      // Remove membership in repository
      await this.repository.removeMember(groupId, stopwatchId);
      
      // Refresh the affected group in memory
      await this.refreshGroup(groupId);
      
      return true;
    } catch (error) {
      this._error.set(error instanceof Error ? error.message : 'Failed to remove group member');
      console.error('Error removing group member:', error);
      return false;
    }
  }

  /**
   * Gets groups that a stopwatch belongs to
   */
  async getGroupsForStopwatch(stopwatchId: UniqueIdentifier): Promise<BaseStopwatchGroup[]> {
    try {
      const groupIds = await this.repository.byStopwatch(stopwatchId);
      return await this.repository.getByIds(groupIds);
    } catch (error) {
      console.error('Error getting groups for stopwatch:', error);
      return [];
    }
  }

  /**
   * Refreshes a specific group from the repository
   */
  async refreshGroup(groupId: UniqueIdentifier): Promise<void> {
    try {
      const baseGroup = await this.repository.get(groupId);
      if (!baseGroup) return;
      
      const contextualGroup = await this.createContextualGroup(baseGroup);
      
      const index = this.instances().findIndex(inst => inst.id === groupId);
      if (index !== -1) {
        const instances = [...this.instances()];
        instances[index] = contextualGroup;
        this._instances.set(instances);
      } else {
        // Group not in memory, add it
        this._instances.set([...this.instances(), contextualGroup]);
      }
    } catch (error) {
      console.error('Error refreshing group:', error);
    }
  }

  /**
   * Updates group traits
   */
  async updateTraits(groupId: UniqueIdentifier, traits: GroupTraits): Promise<boolean> {
    const group = this.instances().find(g => g.id === groupId);
    if (!group) return false;
    
    const updatedGroup = {
      ...group,
      traits,
      metadata: {
        ...group.metadata,
        lastModification: { timestamp: TZDate.now() }
      }
    };
    
    return await this.update(updatedGroup);
  }

  /**
   * Gets groups by timing behavior
   */
  getGroupsByTimingBehavior(behavior: GroupTimingBehavior): StopwatchGroup[] {
    return this.instances().filter(group => group.traits.timing === behavior);
  }

  /**
   * Gets groups that have specific evaluation behavior
   */
  getGroupsByEvaluationBehavior(behavior: GroupEvaluationBehavior): StopwatchGroup[] {
    return this.instances().filter(group => 
      group.traits.evaluation.includes(behavior)
    );
  }

  /**
   * Clears all error states
   */
  clearError(): void {
    this._error.set(null);
  }

  /**
   * Gets available trait presets
   */
  getAvailablePresets(): { value: GroupTraitPreset; display: string; description: string }[] {
    return [
      {
        value: 'normal',
        display: 'Normal',
        description: 'Independent timing and evaluation'
      },
      {
        value: 'competition',
        display: 'Competition',
        description: 'Synchronized timing with comparative evaluation'
      },
      {
        value: 'workflow',
        display: 'Workflow',
        description: 'Sequential timing with cumulative evaluation'
      },
      {
        value: 'billing',
        display: 'Billing',
        description: 'Independent timing with cumulative and proportional evaluation'
      }
    ];
  }
}