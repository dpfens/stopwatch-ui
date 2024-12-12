import { ComputedEvent, StopwatchCore, StopwatchInstance } from "../interfaces";

export interface AnalysisComponent<EventType> {
    analyze(stopwatch: StopwatchCore): ComputedEvent[];
    isApplicable(stopwatch: StopwatchInstance): boolean;
}
