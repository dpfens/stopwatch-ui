import { ComputedEvent, StopwatchCore, StopwatchInstance } from "../interfaces";
import { AnalysisComponent } from "./component";

export class AnalysisRegistry<EventType> {
    private components: Map<string, AnalysisComponent<EventType>> = new Map();

    set(name: string, component: AnalysisComponent<EventType>): void {
        this.components.set(name, component);
    }

    delete(name: string): boolean {
        return this.components.delete(name);
    }

    has(name: string): boolean {
        return this.components.has(name);
    }

    clear(): void {
        return this.components.clear();
    }

    analyze(stopwatch: StopwatchInstance): ComputedEvent[] {
        const events: ComputedEvent[] = [];
        this.components.forEach(function(component: AnalysisComponent<EventType>, name: string): void {
            if (component.isApplicable(stopwatch)) {
                console.debug(`Component ${name} is applicable to this stopwatch`);
                const componentEvents = component.analyze(stopwatch.core);
                for (let i = 0; i < componentEvents.length; i++) {
                    events.push(componentEvents[i]);
                }
            } else {
                console.debug(`Component ${name} is not applicable to this stopwatch`);
            }
        });
        return events;
    }
}
