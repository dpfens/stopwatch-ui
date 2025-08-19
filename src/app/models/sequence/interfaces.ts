import { TimeZonedDate, TZDate } from "../date";
import { AnalysisRegistry } from "./analysis/registry";

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
    source: UniqueIdentifier;
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
    analysis: AnalysisRegistry;
}

export interface SerializedStopwatchEntity extends Omit<BaseStopwatchEntity, 'metadata' | 'analytics'> {
    objective?: {
        type: ObjectiveType;
        configuration?: Record<string, unknown>
    };
    metadata: SerializedCreationModificationDates;
}


export type GroupView =
    | 'normal'         // Displays the stopwatches normally
    | 'competition';   // Displays a leaderboard with rankings and comparative metrics

export type GroupTimingBehavior = 
    | 'parallel'        // Stopwatches run simultaneously (e.g., team members working on the same task)
    | 'sequential'      // Stopwatches run in a defined order (e.g., relay race or assembly line)
    | 'independent'     // No timing constraints
    | 'synchronized'    // Start/stop together
    | 'overlapping';    // Partial temporal overlap (e.g., shift handoffs)

export type GroupEvaluationBehavior =
    | 'comparative'     // Ranked/compared against each other
    | 'cumulative'      // Summed for totals
    | 'threshold'       // Measured against targets/SLAs
    | 'proportional'    // Analyzed as percentages of whole
    | 'trending';       // Tracked for patterns over time

export interface GroupTraits {
    timing: GroupTimingBehavior;
    evaluation: GroupEvaluationBehavior[];
    analytics: AnalyticsConfiguration[];
}

export type GroupTraitPreset = 
    | 'normal'
    | 'competition'
    | 'workflow'
    | 'billing';

export interface BaseStopwatchGroup extends UniquelyIdentifiable {
    annotation: Annotatable;
    metadata: CreationModificationDates;
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
    getState(): StopwatchState;
    
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