import { ComputedEvent, StopwatchState, ContextualStopwatchEntity } from "../interfaces";

export interface AnalysisComponent {
    analyze(stopwatch: StopwatchState): ComputedEvent[];
    isApplicable(stopwatch: ContextualStopwatchEntity): boolean;
}
