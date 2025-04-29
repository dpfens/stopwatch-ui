import { ComputedEvent, StopwatchCore, StopwatchInstance } from "../interfaces";

export interface AnalysisComponent {
    analyze(stopwatch: StopwatchCore): ComputedEvent[];
    isApplicable(stopwatch: StopwatchInstance): boolean;
}
