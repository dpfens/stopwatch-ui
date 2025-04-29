import { TZDate } from "../date";

interface ActionTracking {
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


export interface UniquelyIdentifiable {
    id: string | number;
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
    evaluate(stopwatch: StopwatchCore): number;

    /**
     * Compares two sequences of events and returns
     * positive if a is better, negative if b is better, 0 if equal
     */
    compare(a: StopwatchCore, b: StopwatchCore): number;
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

export interface StopwatchCore {
    sequence: StopwatchEvent[];
}

export interface BaseStopwatchInstance extends UniquelyIdentifiable {
    id: string;
    annotation: Annotatable;
    core: StopwatchCore;
    metadata: StopWatchCreationModificationDates;
}

export interface StopwatchInstance extends BaseStopwatchInstance {
    objective?: Objective;
}

export interface PersistentStopWatchInstance extends BaseStopwatchInstance {
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
    members: BaseStopwatchInstance[];
}

/**
 * Interface for group membership records
 */
export interface StopwatchGroupMembership extends UniquelyIdentifiable {
    stopwatchId: string;
    groupId: string;
  }