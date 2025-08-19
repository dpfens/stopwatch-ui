import { Injectable } from '@angular/core';

// Define our own Intl.DurationFormatOptions since it's not in the standard TS types
export interface DurationFormatOptions {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}


@Injectable({
  providedIn: 'root'
})
export class TimeService {

  /**
   * Converts a duration (in milliseconds) to DurationFormat
   * 
   * @param durationMs Duration in milliseconds
   * 
   */
  toDurationObject(durationMs: number): DurationFormatOptions {
    const milliseconds = durationMs % 1000;
    const seconds = Math.floor(durationMs / 1000) % 60;
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
    const hours = Math.floor(durationMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      
    return { days, hours, minutes, seconds, milliseconds };
  }

  /**
   * Get values needed for RelativeTimeFormat
   */
  getRelativeTimeInfo(diffMs: number): { value: number; unit: Intl.RelativeTimeFormatUnit } {
    // Calculate the appropriate unit and value
    const seconds = diffMs / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const months = days / 30; // Approximate
    const years = days / 365; // Approximate
    
    if (Math.abs(seconds) < 60) return { value: Math.round(seconds), unit: 'second' };
    if (Math.abs(minutes) < 60) return { value: Math.round(minutes), unit: 'minute' };
    if (Math.abs(hours) < 24) return { value: Math.round(hours), unit: 'hour' };
    if (Math.abs(days) < 30) return { value: Math.round(days), unit: 'day' };
    if (Math.abs(months) < 12) return { value: Math.round(months), unit: 'month' };
    return { value: Math.round(years), unit: 'year' };
  }
}
