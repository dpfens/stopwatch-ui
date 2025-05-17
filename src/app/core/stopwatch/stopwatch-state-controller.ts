import { TZDate } from "../../models/date";
import { 
  StopwatchEvent, 
  StopWatchEventType, 
  UnitValue, 
  StopwatchState,
  ActionTracking,
  IStopwatchStateController,
} from "../../models/sequence/interfaces";

/**
 * Implementation of the StopwatchInterface that manages stopwatch state
 * and provides operations for controlling and analyzing stopwatch events.
 */
export class StopwatchStateController implements IStopwatchStateController {
  private state: StopwatchState = { sequence: [] };
  
  /**
   * Creates a new StopwatchController instance
   * @param existingState Optional existing state to initialize with
   */
  constructor(state?: StopwatchState) {
    // Set initial state if provided
    if (state) {
      this.state = { ...state };
    }
  }
  
  /**
   * Starts the stopwatch
   * @param timestamp Time when the start occurred
   */
  start(timestamp: Date): void {
    // Prevent starting if already running
    if (this.isRunning()) {
      throw new Error("Cannot start: stopwatch is already running");
    }
    
    this.addEvent('start', "Start", timestamp);
  }
  
  /**
   * Stops the stopwatch
   * @param timestamp Time when the stop occurred
   */
  stop(timestamp: Date): void {
    // Prevent stopping if not running
    if (!this.isRunning()) {
      throw new Error("Cannot stop: stopwatch is not running");
    }
    
    this.addEvent('stop', "Stop", timestamp);
  }
  
  /**
   * Resets the stopwatch to initial state
   * @param timestamp Time when the reset occurred
   */
  reset(timestamp: Date): void {
    // Clear all events
    this.state = { sequence: [] };
  }
  
  /**
   * Resumes the stopwatch after stopping
   * @param timestamp Time when the resume occurred
   */
  resume(timestamp: Date): void {
    // Prevent resuming if already running or never started
    if (this.isRunning()) {
      throw new Error("Cannot resume: stopwatch is already running");
    }
    
    if (!this.isActive()) {
      throw new Error("Cannot resume: stopwatch has never been started");
    }
    
    const lastEvent = this.getLastEvent();
    if (lastEvent?.type !== 'stop') {
      throw new Error("Cannot resume: last event is not a stop event");
    }
    
    this.addEvent('resume', "Resume", timestamp);
  }
  
  /**
   * Adds a new event to the stopwatch sequence
   * @param type Type of event to add
   * @param title Display title for the event
   * @param timestamp Time when the event occurred
   * @param description Optional detailed description
   * @param unit Optional unit value (e.g., distance, laps, etc.)
   */
  addEvent(
    type: StopWatchEventType, 
    title: string, 
    timestamp: Date, 
    description: string = "", 
    unit?: UnitValue
  ): void {
    // Create event metadata
    const now = this.createActionTracking();
    
    // Create the new event
    const event: StopwatchEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new TZDate(timestamp),
      annotation: { title, description },
      metadata: {
        creation: now,
        lastModification: now
      },
      unit
    };
    
    // Add to sequence
    this.state = {
      sequence: [...this.state.sequence, event]
    };
  }
  
  /**
   * Gets the total duration (wall clock time) since the first start event
   * @returns Duration in milliseconds
   */
  getTotalDuration(): number {
    const events = this.state.sequence;
    
    if (events.length === 0) {
      return 0;
    }
    
    // Find first start event
    const firstStartEvent = events.find(event => event.type === 'start');
    if (!firstStartEvent) {
      return 0; // No start event
    }
    
    const lastEvent = events[events.length - 1];
    // Wall clock time from first start to last event
    return lastEvent.timestamp.durationFrom(firstStartEvent.timestamp);
  }
  
  /**
   * Gets the elapsed time, excluding periods when stopwatch was stopped
   * @returns Elapsed time in milliseconds
   */
  getElapsedTime(): number {
    return this.getElapsedTimeBetweenEvents(null, null);
  }
  
  
  /**
   * Gets events, optionally filtered by type
   * @param type Optional event type to filter by
   * @returns Array of matching events
   */
  getEvents(type?: StopWatchEventType): StopwatchEvent[] {
    if (!type) {
      return [...this.state.sequence];
    }
    
    return this.state.sequence.filter((event: StopwatchEvent) => event.type === type);
  }
  
  /**
   * Gets the raw timestamp duration between two specific events
   * This is simply the wall clock time difference, not accounting for stopwatch stops
   * @param eventId1 ID of first event
   * @param eventId2 ID of second event
   * @returns Duration in milliseconds, or -1 if events not found
   */
  getDurationBetweenEvents(eventId1: string | number, eventId2: string | number): number {
    const event1 = this.state.sequence.find(e => e.id === eventId1);
    const event2 = this.state.sequence.find(e => e.id === eventId2);
    
    if (!event1 || !event2) {
      return -1;
    }
    
    return event2.timestamp.durationFrom(event1.timestamp);
  }

  /**
   * Gets the elapsed active time between two events or event boundaries
   * This accounts for stop/resume periods by only counting active time periods
   * 
   * @param startEventId ID of start event, or null for first event
   * @param endEventId ID of end event, or null for last event or current time if running
   * @returns Elapsed time in milliseconds, or -1 if events not found
   */
  getElapsedTimeBetweenEvents(startEventId: string | number | null, endEventId: string | number | null): number {
    const events = this.state.sequence;
    
    if (events.length === 0) {
      return 0;
    }
    
    // Determine start and end indices
    const indices = this.getEventIndices(startEventId, endEventId);
    if (indices === null) return -1;
    
    const { startIndex, endIndex } = indices;
    
    // Fast path: check if we can use simple calculation
    if (this.canUseSimpleElapsedCalculation(startIndex, endIndex)) {
      return this.calculateSimpleElapsedTime(startIndex, endIndex);
    }
    
    // Complex path: use interval-based calculation
    return this.calculateIntervalBasedElapsedTime(startIndex, endIndex);
  }
  
  /**
   * Gets the start and end indices for the elapsed time calculation
   * @param startEventId ID of start event, or null for first event
   * @param endEventId ID of end event, or null for last event
   * @returns Object with start and end indices, or null if events not found
   */
  private getEventIndices(startEventId: string | number | null, endEventId: string | number | null): { startIndex: number, endIndex: number } | null {
    const events = this.state.sequence;
    
    let startIndex = 0;
    let endIndex = events.length - 1;
    
    if (startEventId !== null) {
      const startEventIndex = events.findIndex(e => e.id === startEventId);
      if (startEventIndex === -1) return null;
      startIndex = startEventIndex;
    }
    
    if (endEventId !== null) {
      const endEventIndex = events.findIndex(e => e.id === endEventId);
      if (endEventIndex === -1) return null;
      endIndex = endEventIndex;
    }
    
    // Ensure start comes before end
    if (startIndex > endIndex) {
      return null;
    }
    
    return { startIndex, endIndex };
  }
  
  /**
   * Checks if the fast path calculation can be used
   * @param startIndex Start event index
   * @param endIndex End event index
   * @returns True if simple calculation can be used
   */
  private canUseSimpleElapsedCalculation(startIndex: number, endIndex: number): boolean {
    const events = this.state.sequence;
    
    // Check if there are any stop or resume events in our range
    const hasStopOrResumeEvents = events
      .slice(startIndex, endIndex + 1)
      .some(e => e.type === 'stop' || e.type === 'resume');
      
    if (hasStopOrResumeEvents) {
      return false;
    }
    
    // Check if we're starting from a running state
    if (startIndex === 0) {
      // If starting from the first event, check if it's a start event
      return events[0].type === 'start';
    } else {
      // Otherwise look back for the most recent start/stop/resume
      for (let i = startIndex - 1; i >= 0; i--) {
        if (events[i].type === 'start' || events[i].type === 'resume') {
          return true;
        } else if (events[i].type === 'stop') {
          return false;
        }
      }
    }
    
    // Default to false if we can't determine
    return false;
  }
  
  /**
   * Calculates elapsed time using the simple method (no stops/resumes)
   * @param startIndex Start event index
   * @param endIndex End event index
   * @returns Elapsed time in milliseconds
   */
  private calculateSimpleElapsedTime(startIndex: number, endIndex: number): number {
    const events = this.state.sequence;
    
    // Simple case: all time is elapsed time
    const endTime = endIndex === events.length - 1 && this.isRunning() 
      ? new TZDate()  // Use current time if still running
      : events[endIndex].timestamp;
      
    return endTime.durationFrom(events[startIndex].timestamp);
  }
  
  /**
   * Calculates elapsed time using the interval-based method
   * @param startIndex Start event index
   * @param endIndex End event index
   * @returns Elapsed time in milliseconds
   */
  private calculateIntervalBasedElapsedTime(startIndex: number, endIndex: number): number {
    const events = this.state.sequence;
    
    // Build a map of active intervals
    const runningIntervals = this.findRunningIntervals();
    
    // Calculate the active time between our start and end indices
    let totalTime = 0;
    
    for (const interval of runningIntervals) {
      // Skip intervals that don't overlap with our range
      if (interval.start > endIndex || interval.end <= startIndex) {
        continue;
      }
      
      // Calculate overlap with our target range
      const overlapStart = Math.max(interval.start, startIndex);
      const overlapEnd = Math.min(interval.end, endIndex + 1);
      
      // For the edge case where interval.end is beyond our events array
      const endEvent = overlapEnd < events.length 
        ? events[overlapEnd] 
        : (this.isRunning() ? { timestamp: new TZDate() } : null);
      
      if (endEvent) {
        const startEvent = events[overlapStart];
        totalTime += endEvent.timestamp.durationFrom(startEvent.timestamp);
      }
    }
    
    return totalTime;
  }
  
  /**
   * Finds all running intervals in the event sequence
   * @returns Array of start/end index pairs representing active periods
   */
  private findRunningIntervals(): Array<{ start: number, end: number }> {
    const events = this.state.sequence;
    const runningIntervals: { start: number, end: number }[] = [];
    let currentStartIndex: number | null = null;
    
    // Find all active intervals
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (event.type === 'start' || event.type === 'resume') {
        currentStartIndex = i;
      } else if (event.type === 'stop' && currentStartIndex !== null) {
        runningIntervals.push({ start: currentStartIndex, end: i });
        currentStartIndex = null;
      }
    }
    
    // If still running, add the last interval
    if (currentStartIndex !== null) {
      runningIntervals.push({ 
        start: currentStartIndex, 
        end: events.length // End is one past the last event
      });
    }
    
    return runningIntervals;
  }
  
  
  /**
   * Gets the last event, optionally filtered by type
   * @param type Optional event type to filter by
   * @returns The last matching event, or undefined if none
   */
  getLastEvent(type?: StopWatchEventType): StopwatchEvent | undefined {
    const events = this.getEvents(type);
    
    if (events.length === 0) {
      return undefined;
    }
    
    return events[events.length - 1];
  }
  
  /**
   * Checks if the stopwatch is currently running
   * @returns True if running, false otherwise
   */
  isRunning(): boolean {
    if (this.state.sequence.length === 0) {
      return false;
    }
    
    const lastEvent = this.state.sequence[this.state.sequence.length - 1];
    
    // Check if last event was a start or resume
    return lastEvent.type === 'start' || lastEvent.type === 'resume';
  }
  
  /**
   * Checks if the stopwatch has been started at least once
   * @returns True if started, false otherwise
   */
  isActive(): boolean {
    // Check if there's at least one start event
    return this.state.sequence.some((event: StopwatchEvent) => event.type === 'start');
  }
    
  /**
   * Gets a copy of the current state
   * @returns Current state
   */
  getState(): StopwatchState {
    return { ...this.state };
  }
  
  /**
   * Creates an action tracking object for the current time
   * @param timestamp Optional timestamp, defaults to now
   * @returns Action tracking object
   */
  private createActionTracking(timestamp: Date = new Date()): ActionTracking {
    return {
      timestamp: new TZDate(timestamp)
    };
  }
}