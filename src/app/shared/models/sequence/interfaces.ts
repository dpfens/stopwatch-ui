import { TZDate } from "../date";

export interface ActionTracking {
    readonly timestamp: TZDate;
}


interface BaseCreationModificationDates {
    readonly creation: ActionTracking;
    lastModification: ActionTracking;
}


interface BaseMetadata {
    timestamps: BaseCreationModificationDates;
}


interface CloneMetadata {
    source: string;
}


export interface StopWatchCreationModificationDates extends BaseCreationModificationDates {
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
    metadata: BaseMetadata;
    type: T;
    unit?: UnitValue;
}

/**
 * Concrete events stored on a stopwatch
 */
export interface StopwatchEvent extends BaseEvent<StopWatchEventType> {
    timestamp: TZDate;
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

export interface BaseStopwatchEntity extends UniquelyIdentifiable {
    id: string;
    annotation: Annotatable;
    state: StopwatchState;
    metadata: StopWatchCreationModificationDates;
}

export interface StopwatchEntity extends BaseStopwatchEntity {
    objective?: Objective;
}


export interface ContextualStopwatchEntity extends StopwatchEntity {
    groups: BaseStopwatchGroup[];
}

export interface SerializedStopwatchEntity extends BaseStopwatchEntity {
    objective?: {
        type: ObjectiveType;
        configuration?: Record<string, unknown>
    };
}


/**
 * Interface for serialized group data
 */
export interface BaseStopwatchGroup extends UniquelyIdentifiable, Annotatable {
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

export interface IContextualStopwatchController {
    // Metadata and annotations
    getMetadata(): StopWatchCreationModificationDates;
    getAnnotation(): Annotatable;
    updateAnnotation(title: string, description: string): void;
    
    // Objective handling
    setObjective(objective: Objective): void;
    getObjective(): Objective | undefined;
    evaluatePerformance(): number | undefined;
}