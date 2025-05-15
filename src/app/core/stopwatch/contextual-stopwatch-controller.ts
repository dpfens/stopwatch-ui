import { TZDate } from "../../shared/models/date";
import { 
  Annotatable, 
  Objective, 
  StopWatchCreationModificationDates,
  StopwatchState,
  ActionTracking,
  IContextualStopwatchController,
} from "../../shared/models/sequence/interfaces";

/**
 * Implementation of the StopwatchInterface that manages stopwatch state
 * and provides operations for controlling and analyzing stopwatch events.
 */
export class ContextualStopwatchController implements IContextualStopwatchController {
  private state: StopwatchState = { sequence: [] };
  private objective?: Objective;
  private annotation: Annotatable;
  private metadata: StopWatchCreationModificationDates;
  private id: string | number;
  
  /**
   * Creates a new StopwatchController instance
   * @param id Unique identifier for this stopwatch
   * @param title Display title for the stopwatch
   * @param description Optional detailed description
   * @param existingState Optional existing state to initialize with
   * @param objective Optional performance objective
   */
  constructor(
    id: string | number, 
    title: string, 
    description: string = "", 
    objective?: Objective
  ) {
    this.id = id;
    this.annotation = { title, description };
    
    // Initialize metadata with creation timestamp
    const now = this.createActionTracking();
    this.metadata = {
      creation: now,
      lastModification: now
    };
    
    // Set objective if provided
    if (objective) {
      this.objective = objective;
    }
  }
  
  /**
   * Gets the stopwatch metadata
   * @returns Metadata object
   */
  getMetadata(): StopWatchCreationModificationDates {
    return { ...this.metadata };
  }
  
  /**
   * Gets the stopwatch annotation
   * @returns Annotation object
   */
  getAnnotation(): Annotatable {
    return { ...this.annotation };
  }
  
  /**
   * Updates the stopwatch annotation
   * @param title New title
   * @param description New description
   */
  updateAnnotation(title: string, description: string): void {
    this.annotation = { title, description };
    this.updateLastModified(new Date());
  }
  
  /**
   * Sets the performance objective
   * @param objective Objective to set
   */
  setObjective(objective: Objective): void {
    this.objective = objective;
    this.updateLastModified(new Date());
  }
  
  /**
   * Gets the current performance objective
   * @returns Current objective or undefined if none set
   */
  getObjective(): Objective | undefined {
    return this.objective;
  }
  
  /**
   * Evaluates current performance based on the objective
   * @returns Performance score, or undefined if no objective set
   */
  evaluatePerformance(): number | undefined {
    if (!this.objective) {
      return undefined;
    }
    
    return this.objective.evaluate(this.state);
  }
  
  /**
   * Gets the unique ID of this stopwatch
   * @returns Stopwatch ID
   */
  getId(): string | number {
    return this.id;
  }
  
  /**
   * Gets a copy of the current state
   * @returns Current state
   */
  getState(): StopwatchState {
    return { ...this.state };
  }
  
  /**
   * Creates an action tracking object for the current time
   * @param timestamp Optional timestamp, defaults to now
   * @returns Action tracking object
   */
  private createActionTracking(timestamp: Date = new Date()): ActionTracking {
    return {
      timestamp: new TZDate(timestamp)
    };
  }
  
  /**
   * Updates the last modified timestamp
   * @param timestamp Time of modification
   */
  private updateLastModified(timestamp: Date): void {
    this.metadata.lastModification = this.createActionTracking(timestamp);
  }
}