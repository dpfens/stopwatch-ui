import { Injectable, signal, computed, inject } from '@angular/core';
import { ContextualStopwatchEntity, UniqueIdentifier } from '../../../models/sequence/interfaces';
import { StopwatchStateController } from '../../../controllers/stopwatch/stopwatch-state-controller';
import { StopwatchService } from '../stopwatch.service';

/**
 * Service for managing stopwatch selection state and bulk operations
 */
@Injectable({
  providedIn: 'root'
})
export class StopwatchSelectionService {
  service = inject(StopwatchService);

  private _selectedIds = signal<Set<UniqueIdentifier>>(new Set());
  private allStopwatches = this.service.instances;
  
  // Public readonly signals
  readonly selectedIds = this._selectedIds.asReadonly();
  
  // Computed signals
  readonly selectedStopwatches = computed(() => {
    const selectedSet = this.selectedIds();
    return this.allStopwatches().filter(sw => selectedSet.has(sw.id));
  });
  
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly hasSelection = computed(() => this.selectedCount() > 0);
  readonly isAllSelected = computed(() => {
    const all = this.allStopwatches();
    const selected = this.selectedIds();
    return all.length > 0 && all.every(sw => selected.has(sw.id));
  });
  
  // Computed command availability based on selected stopwatches
  readonly canStartAll = computed(() => {
    const selected = this.selectedStopwatches();
    return selected.length > 0 && selected.some(sw => !this.isStopwatchActive(sw));
  });
  
  readonly canStopAll = computed(() => {
    const selected = this.selectedStopwatches();
    return selected.length > 0 && selected.some(sw => this.isStopwatchRunning(sw));
  });
  
  readonly canResumeAll = computed(() => {
    const selected = this.selectedStopwatches();
    return selected.length > 0 && selected.some(sw => this.isStopwatchStopped(sw));
  });
  
  readonly canResetAll = computed(() => {
    const selected = this.selectedStopwatches();
    return selected.length > 0 && selected.some(sw => this.isStopwatchActive(sw));
  });
  
  readonly canSplitAll = computed(() => {
    const selected = this.selectedStopwatches();
    return selected.length > 0 && selected.every(sw => this.isStopwatchRunning(sw));
  });
  
  readonly canLapAll = computed(() => {
    const selected = this.selectedStopwatches();
    return selected.length > 0 && 
           selected.every(sw => this.isStopwatchRunning(sw) && !!sw.state.lap);
  });

  /**
   * Updates the available stopwatches list
   */
  updateStopwatches(stopwatches: ContextualStopwatchEntity[]): void {
    // Remove any selected IDs that no longer exist
    const existingIds: Set<UniqueIdentifier> = new Set(stopwatches.map(sw => sw.id));
    const currentSelected = this.selectedIds();
    const validSelected = new Set([...currentSelected].filter(id => existingIds.has(id)));
    
    if (validSelected.size !== currentSelected.size) {
      this._selectedIds.set(validSelected);
    }
  }

  /**
   * Toggles selection for a stopwatch
   */
  toggleSelection(id: UniqueIdentifier): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }

  /**
   * Selects a stopwatch
   */
  select(id: UniqueIdentifier): void {
    this._selectedIds.update(selected => new Set(selected).add(id));
  }

  /**
   * Deselects a stopwatch
   */
  deselect(id: UniqueIdentifier): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      newSelected.delete(id);
      return newSelected;
    });
  }

  /**
   * Selects all stopwatches
   */
  selectAll(): void {
    const allIds = this.allStopwatches().map(sw => sw.id);
    this._selectedIds.set(new Set(allIds));
  }

  /**
   * Clears all selections
   */
  clearSelection(): void {
    this._selectedIds.set(new Set());
  }

  /**
   * Checks if a stopwatch is selected
   */
  isSelected(id: UniqueIdentifier): boolean {
    return this.selectedIds().has(id);
  }

  /**
   * Selects multiple stopwatches
   */
  selectMultiple(ids: UniqueIdentifier[]): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      ids.forEach(id => newSelected.add(id));
      return newSelected;
    });
  }

  /**
   * Deselects multiple stopwatches
   */
  deselectMultiple(ids: UniqueIdentifier[]): void {
    this._selectedIds.update(selected => {
      const newSelected = new Set(selected);
      ids.forEach(id => newSelected.delete(id));
      return newSelected;
    });
  }

  // Helper methods for checking stopwatch states
  private isStopwatchRunning(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isRunning();
  }

  private isStopwatchStopped(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isActive() && !controller.isRunning();
  }

  private isStopwatchActive(sw: ContextualStopwatchEntity): boolean {
    const controller = new StopwatchStateController(sw.state);
    return controller.isActive();
  }
}