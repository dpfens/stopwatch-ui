import { TimeZonedDate, TZDate } from "../date";

export interface ActionTracking {
    readonly timestamp: TZDate;
}

export interface SerializedActionTracking {
    readonly timestamp: TimeZonedDate;
}

interface BaseCreationModificationDates {
    readonly creation: ActionTracking;
    lastModification: ActionTracking;
}

interface CloneMetadata {
    source: string;
}


export interface CreationModificationDates extends BaseCreationModificationDates {
    clone?: CloneMetadata;
}

export interface SerializedCreationModificationDates {
    readonly creation: SerializedActionTracking;
    lastModification: SerializedActionTracking;
    clone?: CloneMetadata;
}


export type UniqueIdentifier = string | number;


export interface UniquelyIdentifiable {
    id: UniqueIdentifier;
}


export interface Annotatable {
    title: string;
    description: string;
}


type FundamentalStopWatchEventType = 'start' | 'stop' | 'resume';
type PerformanceMonitoringStopWatchEventType = 'split' | 'cyclic' | 'latency' | 'capacity' | 'threshold';
type QualityStabilityStopWatchEventType = 'drift' | 'equilibrium' | 'oscillation' | 'variance' | 'compensation' | 'stability';
type ProgressStopWatchEventType = 'accumulation' | 'convergence' | 'state-transition' | 'saturation' | 'milestone' | 'acceleration' | 'deceleration';
type AnalyticEventType = 'forecast' | 'trend' | 'anomaly';
export type ComputedEventType = AnalyticEventType | QualityStabilityStopWatchEventType | ProgressStopWatchEventType;
export type StopWatchEventType = FundamentalStopWatchEventType | PerformanceMonitoringStopWatchEventType | QualityStabilityStopWatchEventType | ProgressStopWatchEventType;


export type StopwatchAnalyticsTrait = 
    | 'anomaly-detection'     // Flags unusual timing patterns or outliers
    | 'trend-analysis'        // Identifies patterns like negative splits or progressive improvements
    | 'interpolation'         // Fills gaps between recorded splits for incomplete data
    | 'forecasting'           // Predicts future performance based on current data
    | 'statistical-summary'   // Provides statistical insights (mean, median, variance, etc.)
    | 'threshold-alerting'    // Notifies when metrics cross defined thresholds
    | 'smoothing'             // Reduces noise in timing data to reveal underlying patterns
    | 'seasonality-detection' // Identifies cyclical patterns in recurring activities
    | 'benchmark-comparison'  // Compares performance against historical or reference data
    | 'performance-scoring';  // Generates a normalized score based on timing data

export interface AnalyticsConfiguration {
    trait: StopwatchAnalyticsTrait;
    parameters?: Record<string, unknown>; // Configurable parameters for each trait
}

export interface BaseStopwatchGroup extends UniquelyIdentifiable, Annotatable {
    metadata: CreationModificationDates;
}


export type ObjectiveType = 'unit-accumulation' | 'time-minimization' | 'synchronicity';

export interface Objective {
    /**
     * 
     */
    type: ObjectiveType;
    /**
     * Returns a human-readable name of the objective.
     */
    title: string;

    /**
     * Returns a human-readable description of the objective
     */
    description: string;
    /**
     * Evaluate a sequence of events are returns a score
     * Higher scores indicate better performance
     */
    evaluate(stopwatch: StopwatchState): number;

    /**
     * Compares two sequences of events and returns
     * positive if a is better, negative if b is better, 0 if equal
     */
    compare(a: StopwatchState, b: StopwatchState): number;
}

export interface UnitValue {
    value: number;
    unit?: string;
}

export interface TimeStampRange {
    lowerBound: TZDate;
    upperBound: TZDate;
}

export interface BaseEvent<T extends StopWatchEventType | ComputedEventType> extends UniquelyIdentifiable {
    annotation: Annotatable;
    metadata: CreationModificationDates;
    type: T;
    unit?: UnitValue;
}

/**
 * Concrete events stored on a stopwatch
 */
export interface StopwatchEvent extends BaseEvent<StopWatchEventType> {
    timestamp: TZDate;
}

export interface SerializedStopwatchEvent extends Omit<StopwatchEvent, 'timestamp' | 'metadata'> {
    timestamp: TimeZonedDate;
    metadata: SerializedCreationModificationDates;
}

/**
 * Computed events for representing data derived from
 * concrete/user-submitted events from a stopwatch
 */
export interface ComputedEvent extends BaseEvent<ComputedEventType> {
    timestamp: TZDate | TimeStampRange;
}

export interface StopwatchState {
    sequence: StopwatchEvent[];
}

export interface SerializedStopwatchState {
    sequence: SerializedStopwatchEvent[];
}

export interface BaseStopwatchEntity extends UniquelyIdentifiable {
    id: string;
    annotation: Annotatable;
    state: StopwatchState;
    metadata: CreationModificationDates;
}

export interface StopwatchEntity extends BaseStopwatchEntity {
    objective?: Objective;
}


export interface ContextualStopwatchEntity extends StopwatchEntity {
    groups: BaseStopwatchGroup[];
}

export interface SerializedStopwatchEntity extends Omit<BaseStopwatchEntity, 'metadata' | 'analytics'> {
    objective?: {
        type: ObjectiveType;
        configuration?: Record<string, unknown>
    };
    metadata: SerializedCreationModificationDates;
}


/**
 * Interface for serialized group data
 */
export type GroupTrait = 
    | 'parallel'      // Stopwatches run simultaneously (e.g., team members working on the same task)
    | 'sequential'    // Stopwatches run in a defined order (e.g., relay race or assembly line)
    | 'comparative'   // Stopwatches are compared against each other (e.g., benchmarking different approaches)
    | 'aggregate'     // Stopwatches represent parts of a collective whole (e.g., accumulated contributions)
    | 'correlated'    // Stopwatches are expected to show similar patterns or timing (e.g., synchronized tasks)
    | 'hierarchical'  // Stopwatches have parent-child relationships (e.g., project and sub-tasks)
    | 'cyclical'      // Stopwatches represent recurring patterns (e.g., iterations or sprints)
    | 'threshold'     // Stopwatches are evaluated against specific time thresholds (e.g., SLAs)
    | 'distributed'   // Stopwatches represent different locations/contexts (e.g., global team performance)
    | 'proportional'; // Stopwatches represent relative allocations (e.g., time distribution across activities)

export type GroupView =
    | 'normal'         // Displays the stopwatches normally
    | 'competition';   // Displays a leaderboard with rankings and comparative metrics


export interface BaseStopwatchGroup extends UniquelyIdentifiable, Annotatable {
    metadata: CreationModificationDates;
    trait: GroupTrait[];
    view: GroupView;
}

export interface SerializedStopwatchGroup extends Omit<BaseStopwatchGroup, 'metadata'> {
    metadata: SerializedCreationModificationDates;
}

export interface StopwatchGroup extends BaseStopwatchGroup {
    members: StopwatchEntity[];
}

/**
 * Interface for group membership records
 */
export interface StopwatchGroupMembership extends UniquelyIdentifiable {
    stopwatchId: UniqueIdentifier;
    groupId: UniqueIdentifier;
}


/**
 * Interface definition for the stopwatch controller
 */
export interface IStopwatchStateController {
    // Core functionality
    start(timestamp: Date): void;
    stop(timestamp: Date): void;
    reset(timestamp: Date): void;
    resume(timestamp: Date): void;
    
    // Event management
    addEvent(type: StopWatchEventType, title: string, timestamp: Date, description?: string, unit?: UnitValue): void;
    
    // Time measurement
    getTotalDuration(): number;         // Get total wall clock duration since first start in milliseconds
    getElapsedTime(): number;           // Get elapsed active time since start (excluding stops)
    
    // Event retrieval
    getEvents(type?: StopWatchEventType): StopwatchEvent[];
    
    // Event analysis
    getDurationBetweenEvents(eventId1: string | number, eventId2: string | number): number;                         // Wall clock time between events
    getElapsedTimeBetweenEvents(startEventId: string | number | null, endEventId: string | number | null): number;  // Active time between events
    getLastEvent(type?: StopWatchEventType): StopwatchEvent | undefined;
    
    // State information
    isRunning(): boolean;
    isActive(): boolean;
}

export interface IAnnotatableController {
    getAnnotation(): Annotatable;
    updateAnnotation(title: string, description: string): void;
}

export interface IContextualStopwatchController extends IAnnotatableController {
    // Metadata
    getMetadata(): CreationModificationDates;
    
    // Objective handling
    setObjective(objective: Objective): void;
    getObjective(): Objective | undefined;
    evaluatePerformance(): number | undefined;
}