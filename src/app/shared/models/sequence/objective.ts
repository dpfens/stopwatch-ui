import { ObjectiveType, StopwatchCore } from "./interfaces";
import { SerializableRegistry, SerializableType, SerializedForm } from "../../../utilities/serialization";

export interface Objective extends SerializableType<Objective> {
    type: ObjectiveType;
    title: string;
    description: string;
    evaluate(stopwatch: StopwatchCore): number;
    compare(a: StopwatchCore, b: StopwatchCore): number;
}


// Create a registry for objectives
export const registry = new SerializableRegistry<Objective>();

@registry.register('time-minimization')
export class TimeMinimizationObjective implements Objective {
    type: ObjectiveType = 'time-minimization';
    title: string = 'Time Minimization';
    description: string = 'Minimize the total time taken to complete the race.';

    evaluate(stopwatch: StopwatchCore): number {
        const totalTime = stopwatch.sequence.reduce((acc, event) => {
            if (event.type !== 'start') {
                return acc + (event.unit?.value || 0);
            }
            return acc;
        }, 0);
        return -totalTime; // Negative because lower time is better
    }

    compare(a: StopwatchCore, b: StopwatchCore): number {
        return this.evaluate(a) - this.evaluate(b);
    }

    serialize(): SerializedForm<Objective> {
        return {
            type: 'time-minimization'
        };
    }

    deserialize(configuration?: Record<string, any>): Objective {
        return TimeMinimizationObjective.fromConfig(configuration);
    }


    static fromConfig(configuration?: Record<string, any>): TimeMinimizationObjective {
        return new TimeMinimizationObjective();
    }
}

@registry.register('unit-accumulation')
export class UnitAccumulationObjective implements Objective {
    type: ObjectiveType = 'unit-accumulation';
    title: string = 'Unit Accumulation';
    description: string = 'Maximize the total units (e.g., distance) covered in a fixed time.';

    evaluate(stopwatch: StopwatchCore): number {
        const totalUnits = stopwatch.sequence.reduce((acc, event) => {
            if (event.type === 'split' || event.type === 'stop') {
                return acc + (event.unit?.value || 0);
            }
            return acc;
        }, 0);
        return totalUnits; // Higher units are better
    }

    compare(a: StopwatchCore, b: StopwatchCore): number {
        return this.evaluate(a) - this.evaluate(b); // Higher is better
    }

    serialize(): SerializedForm<Objective> {
        return {
            type: 'unit-accumulation'
        };
    }

    deserialize(configuration?: Record<string, any>): Objective {
        // No special configuration to apply
        return UnitAccumulationObjective.fromConfig(configuration);
    }

    static fromConfig(configuration?: Record<string, any>): TimeMinimizationObjective {
        return new UnitAccumulationObjective();
    }
}


@registry.register('synchronicity')
export class SynchronicityObjective implements Objective {
    type: ObjectiveType = 'synchronicity';
    title: string = 'Synchronicity';
    description: string = 'Measure how well events align with target intervals.';
    
    // Configuration properties
    targetInterval: number = 60; // 60 seconds by default
    tolerance: number = 5; // 5% tolerance by default
    
    // Static factory method for deserialization
    static fromConfig(configuration?: Record<string, any>): SynchronicityObjective {
        const objective = new SynchronicityObjective();
        
        if (configuration) {
            if (typeof configuration['targetInterval'] === 'number') {
                objective.targetInterval = configuration['targetInterval'];
            }
            if (typeof configuration['tolerance'] === 'number') {
                objective.tolerance = configuration['tolerance'];
            }
        }
        
        return objective;
    }
    
    evaluate(stopwatch: StopwatchCore): number {
        if (stopwatch.sequence.length < 2) return 0;
        
        let totalDeviation = 0;
        let intervals = 0;
        
        for (let i = 1; i < stopwatch.sequence.length; i++) {
            const current = stopwatch.sequence[i];
            const previous = stopwatch.sequence[i-1];
            
            if ((current.type === 'split' || current.type === 'stop') && 
                (previous.type === 'start' || previous.type === 'split' || previous.type === 'resume')) {
                // Calculate time interval using the durationFrom method
                const interval = Math.abs(current.timestamp.durationFrom(previous.timestamp));
                // Calculate deviation from target (target is in seconds, interval is in ms)
                const deviation = Math.abs(interval - this.targetInterval * 1000);
                // Add to total (normalized by target interval)
                totalDeviation += deviation / (this.targetInterval * 1000);
                intervals++;
            }
        }
        
        if (intervals === 0) return 0;
        
        // Calculate average deviation (lower is better)
        const avgDeviation = totalDeviation / intervals;
        // Convert to a score where 1.0 is perfect synchronicity and 0 is very poor
        return Math.max(0, 1 - avgDeviation);
    }
    
    compare(a: StopwatchCore, b: StopwatchCore): number {
        return this.evaluate(a) - this.evaluate(b);
    }
    
    serialize(): SerializedForm<Objective> {
        return {
            type: 'synchronicity',
            configuration: {
                targetInterval: this.targetInterval,
                tolerance: this.tolerance
            }
        };
    }
    
    // Instance method required by interface, but delegates to static method
    deserialize(configuration?: Record<string, any>): Objective {
        return SynchronicityObjective.fromConfig(configuration);
    }
}