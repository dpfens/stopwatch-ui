import { Annotatable, BaseCreationModificationDates, StopwatchAnalyticsTrait, TimeStampRange, UniqueIdentifier, UniquelyIdentifiable } from "../interfaces";

export interface AnalysisResult<T extends StopwatchAnalyticsTrait> {
    trait: T;
    evidence: AnalysisEvidence;
    confidence: number;
    data: TraitDataMapping[T];
    metadata: BaseCreationModificationDates;
    analysis: {
        metadata: AnalysisMetadata;
    };
}


export interface AnomalyData {
    anomalyScore: number;
    expectedValue?: number;
    actualValue?: number;
    standardDeviations: number;
}

export interface TrendData {
    trendDirection: 'improving' | 'declining' | 'stable';
    trendStrength: number;
    changeRate?: number;
    correlation: number;
    pValue?: number;
}

export interface ThresholdData {
    threshold: {
        value: number;
        operator: 'greater' | 'less' | 'equal';
        unit?: string;
    };
    breachSeverity: number;
    breachCount: number;
}

export interface PerformanceScoreData {
    score: number;
    benchmarks?: {
        personal?: number;
        peer?: number;
        target?: number;
    };
    components: Record<string, number>; // Individual scoring factors
}

export interface StatisticalSummaryData {
    mean: number;
    median: number;
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
    quartiles: [number, number, number];
    outlierCount: number;
}

export interface ForecastData {
    predictions: Array<{
        timeHorizon: number; // periods ahead
        predictedValue: number;
        confidenceInterval: [number, number];
    }>;
    modelType: string;
    accuracy: number;
}

export interface SmoothingData {
    smoothedValues: number[];
    algorithm: string;
    smoothingFactor: number;
}

export interface BenchmarkData {
    comparisonResults: Array<{
        benchmarkName: string;
        performanceRatio: number;
        deviation: number;
    }>;
}

export interface InterpolationData {
    interpolatedPoints: Array<{
        timestamp: number;
        value: number;
        confidence: number;
    }>;
    method: string;
}

export interface SeasonalityData {
    patterns: Array<{
        period: number; // in time units
        strength: number;
        phase: number;
    }>;
    dominantPeriod?: number;
}

export interface TraitDataMapping {
    'anomaly-detection': AnomalyData;
    'trend-analysis': TrendData;
    'threshold-alerting': ThresholdData;
    'performance-scoring': PerformanceScoreData;
    'statistical-summary': StatisticalSummaryData;
    'forecasting': ForecastData;
    'smoothing': SmoothingData;
    'benchmark-comparison': BenchmarkData;
    'interpolation': InterpolationData;
    'seasonality-detection': SeasonalityData;
}

export type AnomalyResult = AnalysisResult<'anomaly-detection'>;
export type TrendResult = AnalysisResult<'trend-analysis'>;
export type ThresholdResult = AnalysisResult<'threshold-alerting'>;
export type PerformanceScoreResult = AnalysisResult<'performance-scoring'>;
export type StatisticalSummaryResult = AnalysisResult<'statistical-summary'>;
export type ForecastResult = AnalysisResult<'forecasting'>;
export type SmoothingResult = AnalysisResult<'smoothing'>;
export type InterpolationResult = AnalysisResult<'interpolation'>;
export type SeasonalityDetectionResult = AnalysisResult<'seasonality-detection'>;


export interface AnalysisInsight<T extends StopwatchAnalyticsTrait> extends UniquelyIdentifiable {
    annotation: Annotatable;
    result: AnalysisResult<T>
    interpretation: {
        severity: 'low' | 'medium' | 'high';
        recommendations: string[];
        explanation: string;
        context: string; // 'coach-view', 'athlete-summary', etc.
    };
    interpreter: string; // Which interpretation strategy was used
}

// Different types of evidence that support insights
export type AnalysisEvidence = 
    | EventEvidence
    | IntervalEvidence  
    | SequenceEvidence
    | DistributedEvidence
    | AggregateEvidence;

// Points to specific events
export interface EventEvidence {
    type: 'event';
    eventIds: UniqueIdentifier[];
    context?: string; // "outlier", "threshold-breach", etc.
}

// References a time period
export interface IntervalEvidence {
    type: 'interval';
    timeRange: TimeStampRange;
    affectedEvents?: UniqueIdentifier[]; // Events within this range
    context?: string; // "trend-period", "stability-window", etc.
}

// References a sequence of events
export interface SequenceEvidence {
    type: 'sequence';
    eventSequence: UniqueIdentifier[];
    context?: string; // "declining-trend", "improvement-pattern", etc.
}

// References non-contiguous events with pattern
export interface DistributedEvidence {
    type: 'distributed';
    eventGroups: {
        pattern: string; // "every-4th", "odd-laps", "morning-sessions"
        eventIds: UniqueIdentifier[];
    }[];
}

// Applies to entire dataset or major portions
export interface AggregateEvidence {
    type: 'aggregate';
    scope: 'full-dataset' | 'recent' | 'historical';
    timeRange?: TimeStampRange;
    eventCount?: number;
}

// Metadata about the analysis
export interface AnalysisMetadata {
    parameters: Record<string, unknown>;
    algorithmVersion?: string;
    processingTime?: number; // milliseconds
}

// Rendering configuration for UI components
export interface InsightRenderingConfiguration {
    display: {
        visualType: 'alert' | 'trend-line' | 'highlight' | 'badge' | 'chart' | 'metric';
        priority: 'low' | 'medium' | 'high';
        color?: string;
        icon?: string;
        timelinePosition?: 'overlay' | 'annotation' | 'separate';
    };
    interaction: {
        expandable?: boolean;
        clickable?: boolean;
        contextMenu?: string[];
    };
}

export interface RenderableInsight<T extends StopwatchAnalyticsTrait = StopwatchAnalyticsTrait> extends AnalysisInsight<T> {
    rendering: InsightRenderingConfiguration;
}


export const isAnomalyResult = (result: AnalysisResult<any>): result is AnomalyResult => 
    result.trait === 'anomaly-detection';

export const isTrendResult = (result: AnalysisResult<any>): result is TrendResult => 
    result.trait === 'trend-analysis';

export const isThresholdResult = (result: AnalysisResult<any>): result is ThresholdResult => 
    result.trait === 'threshold-alerting';

export const isPerformanceScoreResult = (result: AnalysisResult<any>): result is PerformanceScoreResult => 
    result.trait == 'performance-scoring';

export const isStatisticalSummaryResult = (result: AnalysisResult<any>): result is StatisticalSummaryResult => 
    result.trait == 'statistical-summary';

export const isForecastResult = (result: AnalysisResult<any>): result is ForecastResult => 
    result.trait === 'forecasting';

export const isSmoothingResult = (result: AnalysisResult<any>): result is SmoothingResult => 
    result.trait === 'smoothing';

export const isInterpolationResult = (result: AnalysisResult<any>): result is InterpolationResult => 
    result.trait === 'interpolation';

export const isSeasonalityDetectionResult = (result: AnalysisResult<any>): result is SeasonalityDetectionResult => 
    result.trait == 'seasonality-detection';