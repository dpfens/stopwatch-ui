import { AfterViewInit, Component, computed, inject, signal, WritableSignal, DestroyRef, input, effect, OnInit } from '@angular/core';
import { ContextualStopwatchEntity, IStopwatchStateController, SelectOptGroup, UniqueIdentifier, VisibleSplit } from '../../../../models/sequence/interfaces';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TimeService } from '../../../../services/time/time.service';
import { LapUnits, ONE_MINUTE, Time } from '../../../../utilities/constants';
import { FormBuilder, FormControl, FormsModule, Validators } from '@angular/forms';
import { TZDate } from '../../../../models/date';
import { GroupService } from '../../../../services/group/group.service';
import { StopwatchStateController } from '../../../../controllers/stopwatch/stopwatch-state-controller';
import { StopwatchSelectionService } from '../../../../services/stopwatch/stopwatch-selection/stopwatch-selection.service';

// Define strongly-typed form interface
interface StopwatchSettingsForm {
  title: FormControl<string | null>;
  description: FormControl<string | null>;
  lapValue: FormControl<number | null>;
  lapUnit: FormControl<string | null>;
  groups: FormControl<UniqueIdentifier[]>;
}

@Component({
  selector: 'base-stopwatch-detail-view',
  imports: [FormsModule],
  template: ''
})
export class BaseStopwatchDetailViewComponent implements OnInit, AfterViewInit {
  protected readonly service = inject(StopwatchService);
  protected readonly groupService = inject(GroupService);
  protected readonly timeService = inject(TimeService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly fb = inject(FormBuilder);
  protected readonly selectionService = inject(StopwatchSelectionService);

  id = input.required<UniqueIdentifier>();
  instance = computed(() => 
    this.service.instances().find(inst => inst.id === this.id())
  );
  selectionMode = input(false);

  showControls = input(true);
  showBasicControls = input(true);
  showCheckpointControls = input(true);
  MILLISECOND_THRESHOLD = ONE_MINUTE;

  getInstance(): ContextualStopwatchEntity {
    const inst = this.instance();
    if (!inst) {
      throw new Error(`Stopwatch ${this.id()} not found`);
    }
    return inst;
  }

  groups = this.groupService.instances;
  loading = this.service.isLoading;
  error = this.service.error;
  displaySettings = signal(false);
  lapUnits: SelectOptGroup<string>[] = LapUnits;
  visibleSplits: WritableSignal<VisibleSplit[]> = signal([]);

  readonly hasSplits = computed(() => 
    this.controller().getEvents('split').length > 0
  );

  readonly hasLaps = computed(() => 
    this.controller().getEvents('lap').length > 0
  );

  readonly totalDurationCalc = () => this.controller().getElapsedTime();
  
  readonly splitDurationCalc = () => {
    const lastSplitEvent = this.controller().getState().sequence.findLast(event => event.type === 'split');
    return lastSplitEvent ? this.controller().getElapsedTimeBetweenEvents(lastSplitEvent.id, null) : 0;
  };
  
  readonly lapDurationCalc = () => {
    const lastLapEvent = this.controller().getState().sequence.findLast(event => event.type === 'lap');
    return lastLapEvent ? this.controller().getElapsedTimeBetweenEvents(lastLapEvent.id, null) : 0;
  };

  // Strongly-typed reactive form
  settingsForm = this.fb.group<StopwatchSettingsForm>({
    title: this.fb.control<string | null>(null),
    description: this.fb.control<string | null>(null),
    lapValue: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    lapUnit: this.fb.control<string | null>('m'),
    groups: this.fb.control<UniqueIdentifier[]>([], { nonNullable: true })
  });

  // Computed form state signals
  readonly hasLapSettings = computed(() => {
    const lapValue = this.settingsForm.controls.lapValue.value;
    const lapUnit = this.settingsForm.controls.lapUnit.value;
    return !!(lapValue && lapUnit);
  });

  private _controllerCache?: IStopwatchStateController;
  private _lastInstanceVersion?: string;
  
  readonly controller = computed(() => {
    const instance = this.getInstance();
    if (!instance) {
      throw new Error('Instance must be set before accessing controller');
    }
    
    // Create a version string based on instance modification timestamp
    const currentVersion = `${instance.id}-${instance.metadata.lastModification?.timestamp || 0}`;
    
    // Invalidate cache if instance has changed
    if (this._lastInstanceVersion !== currentVersion) {
      this._controllerCache = undefined;
      this._lastInstanceVersion = currentVersion;
    }
    
    // Create new controller if not cached
    if (!this._controllerCache) {
      this._controllerCache = new StopwatchStateController(instance.state);
    }
    
    return this._controllerCache;
  });

  readonly timingBehaviors = computed(() => {
    const instance = this.getInstance();
    return instance.groups.flatMap(group => group.traits.timing);
  });

  readonly evaluationBehaviors = computed(() => {
    const instance = this.getInstance();
    return instance.groups.flatMap(group => group.traits.evaluation);
  });

  constructor() {
    // Auto-populate form when instance changes
    effect(() => {
      const instance = this.instance();
      if (instance && this.displaySettings()) {
        this.populateForm(instance);
      }
    });

    effect(() => {
      const instance = this.instance();
      if (!instance) return;
      // Update component state when instance changes externally
      // This will trigger when bulk operations update the stopwatch
      this.refreshComponentState();
    });
  }

  private refreshComponentState(): void {
    const controller = this.controller();
    
    if (controller.isActive()) {
      this.buildSplits();
    } else {
      this.visibleSplits.set([]);
    }
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  ngAfterViewInit(): void {
    const controller = this.controller();
    if (controller.isActive()) {
      this.buildSplits();
    }
  }

  private initializeForm(): void {
    const instance = this.getInstance();

    this.settingsForm.patchValue({
      title: instance.annotation.title,
      description: instance.annotation.description,
      lapValue: instance.state.lap?.value || 400,
      lapUnit: instance.state.lap?.unit || 'm',
      groups: instance.groups.map(g => g.id)
    });
  }

  // Simplified form population
  private populateForm(instance: ContextualStopwatchEntity): void {
    const state = this.controller().getState();
    
    this.settingsForm.patchValue({
      title: instance.annotation.title || null,
      description: instance.annotation.description || null,
      lapValue: state.lap?.value || null,
      lapUnit: state.lap?.unit || 'm',
      groups: instance.groups.map(group => group.id)
    }, { emitEvent: false }); // Don't trigger valueChanges during initial population
  }

  showSettings(): void {
    this.initializeForm();
    this.displaySettings.set(true);
  }

  // Simplified and more reactive settings change handler
  async handleSettingsChange(): Promise<void> {
    if (!this.settingsForm.valid) {
      return;
    }

    const instance = this.getInstance();
    const formValue = this.settingsForm.value;

    // Update instance annotation
    if (formValue.title !== undefined) {
      instance.annotation.title = formValue.title || '';
    }
    if (formValue.description !== undefined) {
      instance.annotation.description = formValue.description || '';
    }

    // Handle group assignments
    await this.updateGroupAssignments(instance, formValue.groups || []);

    // Handle lap settings
    if (formValue.lapValue && formValue.lapUnit) {
      const lap = { value: formValue.lapValue, unit: formValue.lapUnit };
      this.controller().setLap(lap);
    } else {
      this.controller().setLap(null);
    }

    // Update metadata
    instance.metadata.lastModification = {
      timestamp: TZDate.now()
    };

    await this.service.update({ ...instance, state: this.controller().getState() });
  }

  // Extracted group assignment logic for better reusability
  private async updateGroupAssignments(instance: ContextualStopwatchEntity, newGroupIds: UniqueIdentifier[]): Promise<void> {
    const success = await this.service.setGroupMemberships(instance.id, newGroupIds);
    
    if (!success) {
      throw new Error('Failed to update group memberships');
    }
  }

  // Form validation helpers
  getFieldError(fieldName: keyof StopwatchSettingsForm): string | null {
    const control = this.settingsForm.controls[fieldName];
    if (control.errors && control.touched) {
      if (control.errors['required']) return `${fieldName} is required`;
      if (control.errors['min']) return `${fieldName} must be greater than 0`;
    }
    return null;
  }

  // Reset form to initial state
  resetForm(): void {
    this.settingsForm.reset();
    this.populateForm(this.getInstance());
  }

  // Check if form has unsaved changes
  hasUnsavedChanges(): boolean {
    return this.settingsForm.dirty;
  }

  // Discard changes and close settings
  discardChanges(): void {
    this.initializeForm();
    this.displaySettings.set(false);
  }

  // Save and close settings
  async saveAndClose(): Promise<void> {
    if (!this.settingsForm.valid) {
      return;
    }

    const formValue = this.settingsForm.value;
    
    try {
      // Update stopwatch metadata
      const updatedStopwatch = {
        ...this.getInstance(),
        annotation: {
          title: formValue.title || '',
          description: formValue.description || ''
        },
      };

      if (formValue.lapValue && formValue.lapUnit) {
        const lap = { value: formValue.lapValue, unit: formValue.lapUnit };
        updatedStopwatch.state.lap = lap;
      } else {
        updatedStopwatch.state.lap = null;
      }

      updatedStopwatch.metadata.lastModification = {
        timestamp: TZDate.now()
      };

      // Save stopwatch changes
      const success = await this.service.update(updatedStopwatch);
      
      if (success) {
        const groupIds = formValue.groups || [];
        const membershipSuccess = await this.service.setGroupMemberships(
          this.getInstance().id, 
          groupIds
        );
        
        if (membershipSuccess) {
          this.displaySettings.set(false);
        } else {
          console.error('Failed to update group memberships');
          // Handle error appropriately
        }
      } else {
        console.error('Failed to update stopwatch');
        // Handle error appropriately
      }
    } catch (error) {
      console.error('Error saving stopwatch:', error);
      // Handle error appropriately
    }
  }

  async start() {
    const now = new Date();
    this.controller().start(now);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async stop() {
    const now = new Date();
    this.controller().stop(now);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async resume() {
    const now = new Date();
    this.controller().resume(now);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...this.getInstance(), metadata, state: this.controller().getState()});
  }

  async lap() {
    const now = new Date();
    const eventType = 'lap';
    const eventName = this.findAvailableEventName(eventType);
    this.controller().addEvent(eventType, eventName, now);
    const state = this.controller().getState();
    if (state.lap) {
      const lapEvents = this.controller().getEvents('lap');
      const lastLapEvent = lapEvents.at(-1);
      if (lastLapEvent) {
        lastLapEvent.unit = {value: state.lap!.value * lapEvents.length, unit: state.lap?.unit};
      }
    }

    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    this.buildSplits();
    await this.service.update({...this.getInstance(), metadata, state});
  }

  async split() {
    const now = new Date();
    const eventType = 'split';
    const eventName = this.findAvailableEventName(eventType);
    this.controller().addEvent(eventType, eventName, now);
    const instance = this.getInstance();
    const metadata = {...instance.metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    this.buildSplits();
    await this.service.update({...instance, metadata, state: this.controller().getState()});
  }

  async reset() {
    const now = new Date();
    this.controller().reset(now);
    const defaultTime = {milliseconds: 0};
    this.visibleSplits.set([]);

    const instance = this.getInstance();
    const metadata = {...instance.metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.service.update({...instance, metadata, state: this.controller().getState()});
  }

  async fork() {
    const instance = this.getInstance();
    const newInstance = {
      ...instance,
      id: crypto.randomUUID(),
      state: this.controller().getState(),
      metadata: {
        ...instance.metadata,
        clone: { source: instance.id}
      }
    };
    await this.service.create(newInstance);
    await Promise.all(
      instance.groups.map(g => this.groupService.addMember(g.id, newInstance.id))
    );
  }

  async delete() {
    const instance = this.getInstance();
    await this.service.delete(instance.id);
    this.snackbar.open(`Deleted stopwatch "${instance.annotation.title || instance.id}"`, 'Close');
    setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  private buildSplits() {
    const state = this.controller().getState();
    const eligibleSplits = state.sequence.filter(event => !['stop', 'resume'].includes(event.type));
    const visibleSplits: VisibleSplit[] = [];
    let previousLapDuration: number | undefined;
    
    for(let i = 1; i < eligibleSplits.length; i++) {
      const rawSplitDuration = this.controller().getElapsedTimeBetweenEvents(eligibleSplits[i - 1].id, eligibleSplits[i].id);
      const splitDuration = this.timeService.toDurationObject(rawSplitDuration);
      const event = eligibleSplits[i];
      
      // Calculate difference only for laps (compared to previous lap)
      let difference: number | undefined;
      if (event.type === 'lap') {
        if (previousLapDuration !== undefined) {
          difference = rawSplitDuration - previousLapDuration;
        }
        previousLapDuration = rawSplitDuration;
      }
      
      visibleSplits.push({
        duration: splitDuration, 
        event, 
        unit: event.unit,
        difference
      });
    }
    this.visibleSplits.set(visibleSplits);
  }

  async handleSplitUpdate(instance: VisibleSplit) {
    const event = instance.event;
    const state = this.controller().getState();
    const index = state.sequence.findIndex(evt => evt.id === event.id);
    if (index) {
      state.sequence[index] = event;
      
      const visibleSplits = this.visibleSplits();
      const visibleSplitIndex = visibleSplits.findIndex(split => split.event.id === event.id);
      visibleSplits[visibleSplitIndex] = instance;
      this.visibleSplits.set([...visibleSplits]);

      this.service.update({...this.getInstance(), state});
    }
  }

  async handleSplitDelete(instance: VisibleSplit) {
    const event = instance.event;
    this.controller().removeEvent(event);
    this.buildSplits();
    this.service.update({...this.getInstance(), state: this.controller().getState()});
  }

  private findAvailableEventName(eventType: string): string {
    const existingEvents = this.controller().getState().sequence.filter(event => event.type === eventType).length;
    let exists = true;
    let newEventName: string = '';
    let newNumber = existingEvents;
    while (exists) {
      newNumber++;
      newEventName = `${eventType} #${newNumber}`;
      exists = !!this.controller().getState().sequence.find(event => event.annotation.title === newEventName);
      if (!exists) {
        break;
      }
    }
    return newEventName;
  }

  // Computed selection state
  readonly isSelected = computed(() => 
    this.selectionService.isSelected(this.id())
  );
  
  readonly hasAnySelection = computed(() => 
    this.selectionService.hasSelection()
  );

  /**
   * Toggles selection state of this stopwatch
   */
  toggleSelection(): void {
    this.selectionService.toggleSelection(this.id());
  }

  /**
   * Handles card click - toggles selection when in selection mode
   */
  onCardClick(event: Event): void {
    // Only handle selection when in selection mode
    if (this.selectionMode() || this.hasAnySelection()) {
      // Don't prevent default here - let it bubble up to parent if needed
      this.toggleSelection();
    }
  }

  /**
   * Handles selection icon click/keyboard interaction
   */
  onSelectionChange(event: Event): void {
    // Always stop propagation for the selection icon to prevent card click
    event.preventDefault();
    event.stopPropagation();
    
    // For keyboard events, only respond to Enter and Space
    if (event instanceof KeyboardEvent) {
      if (event.code !== 'Enter' && event.code !== 'Space') {
        return;
      }
    }
    
    this.toggleSelection();
  }

  async onGroupSelectionChange(selectedGroupIds: UniqueIdentifier[]): Promise<void> {
    try {
      const success = await this.service.setGroupMemberships(
        this.getInstance().id,
        selectedGroupIds
      );
      
      if (!success) {
        console.error('Failed to update group memberships');
        // Revert the form control to previous state
        this.settingsForm.patchValue({
          groups: this.getInstance().groups.map(g => g.id)
        });
      }
    } catch (error) {
      console.error('Error updating group memberships:', error);
      // Revert the form control to previous state
      this.settingsForm.patchValue({
        groups: this.getInstance().groups.map(g => g.id)
      });
    }
  }
}