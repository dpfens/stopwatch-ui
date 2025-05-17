import { ComputedEvent, ContextualStopwatchEntity } from "../interfaces";
import { AnalysisComponent } from "./component";

export class AnalysisRegistry {
    private components = new Map<string, AnalysisComponent>();

    set(name: string, component: AnalysisComponent): void {
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

    analyze(stopwatch: ContextualStopwatchEntity): ComputedEvent[] {
        const events: ComputedEvent[] = [];
        this.components.forEach(function(component: AnalysisComponent, name: string): void {
            if (component.isApplicable(stopwatch)) {
                console.debug(`Component ${name} is applicable to this stopwatch`);
                const componentEvents = component.analyze(stopwatch.state);
                events.push(...componentEvents);
            } else {
                console.debug(`Component ${name} is not applicable to this stopwatch`);
            }
        });
        return events;
    }
}
