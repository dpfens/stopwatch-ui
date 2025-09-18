import { StopwatchState, ContextualStopwatchEntity, StopwatchAnalyticsTrait } from "../interfaces";
import { AnalysisInsight } from "./interface";

export interface AnalysisComponent<T extends StopwatchAnalyticsTrait> {
    analyze(stopwatch: StopwatchState): AnalysisInsight<T>[];
    isApplicable(stopwatch: ContextualStopwatchEntity): boolean;
}