import { GroupEvaluationBehavior, GroupTimingBehavior, GroupTraitPreset, GroupTraits, ObjectiveType, SelectOptGroup, SelectOption, StopWatchEventType } from "../models/sequence/interfaces";

// ACTIONS
export enum GLOBAL {
  CREATE = 'global.create',
  DELETE = 'global.delete',
  SEARCH = 'global.search'
}

export enum Time {
  ONE_MINUTE = 60000,
  ONE_SECOND = 1000,
  FIVE_SECONDS = 5000,
  ZERO = 0
}

/**
 * Predefined objective type presets for common use cases
 */
export const ObjectivePresets: Record<ObjectiveType, unknown> = {
    'time-minimization': {
        analytics: []
    },
    'unit-accumulation': {
        analytics: []
    },
    'synchronicity': {
        analytics: []
    }
} as const;

/**
 * Predefined group type presets for common use cases
 */
export const GroupPresets: Record<GroupTraitPreset, GroupTraits> = {
  normal: {
    timing: 'independent',
    evaluation: [],
    analytics: []
  },
  competition: {
    timing: 'parallel',
    evaluation: ['comparative'],
    analytics: []
  },
  workflow: {
    timing: 'sequential',
    evaluation: ['threshold', 'cumulative'],
    analytics: []
  },
  billing: {
    timing: 'independent',
    evaluation: ['cumulative', 'proportional'],
    analytics: []
  }
} as const;

export const SelectableSplitTypes: SelectOptGroup<StopWatchEventType>[] = [
  {
    display: 'User Controls',
    options: [
      {
        display: 'User Start',
        value: 'user_start'
      },
      {
        display: 'User Stop',
        value: 'user_stop'
      },
      {
        display: 'User Resume',
        value: 'user_resume'
      }
    ]
  },
  {
    display: 'Performance Monitoring',
    options: [
      {
        display: 'Split Time',
        value: 'split'
      },
      {
        display: 'Lap / Cyclic Event',
        value: 'cyclic'
      },
      {
        display: 'Latency Check',
        value: 'latency'
      },
      {
        display: 'Capacity Limit',
        value: 'capacity'
      },
      {
        display: 'Threshold Breach',
        value: 'threshold'
      }
    ]
  },
  {
    display: 'Quality & Stability',
    options: [
      {
        display: 'Performance Drift',
        value: 'drift'
      },
      {
        display: 'System Equilibrium',
        value: 'equilibrium'
      },
      {
        display: 'Value Oscillation',
        value: 'oscillation'
      },
      {
        display: 'Data Variance',
        value: 'variance'
      },
      {
        display: 'Auto Compensation',
        value: 'compensation'
      },
      {
        display: 'Stability Check',
        value: 'stability'
      }
    ]
  },
  {
    display: 'Progress Tracking',
    options: [
      {
        display: 'Data Accumulation',
        value: 'accumulation'
      },
      {
        display: 'Value Convergence',
        value: 'convergence'
      },
      {
        display: 'State Transition',
        value: 'state-transition'
      },
      {
        display: 'Saturation Point',
        value: 'saturation'
      },
      {
        display: 'Milestone Reached',
        value: 'milestone'
      },
      {
        display: 'Acceleration Event',
        value: 'acceleration'
      },
      {
        display: 'Deceleration Event',
        value: 'deceleration'
      }
    ]
  }
] as const;


export const LapUnits: SelectOptGroup<string>[] = [
    {
      display: 'Distance',
      options: [
        {
          display: 'Meters',
          value: 'm'
        },
        {
          display: 'Kilometers',
          value: 'km'
        },
        {
          display: 'Miles',
          value: 'mi'
        },
        {
          display: 'Yards',
          value: 'yd'
        }
      ]
    }
] as const;

/** 
 * Group Traits
 */
export const GroupPresetOptions: SelectOption<GroupTraitPreset>[] = [
  {
    value: 'normal',
    display: 'Normal'
  },
  {
    value: 'competition',
    display: 'Competition'
  },
  {
    value: 'workflow',
    display: 'Workflow'
  },
  {
    value: 'billing',
    display: 'Billing'
  },
] as const;

export const GroupTimingOptions: SelectOption<GroupTimingBehavior>[] = [
  {
    value: 'independent',
    display: 'Independent'
  },
  {
    value: 'overlapping',
    display: 'Overlapping'
  },
  {
    value: 'parallel',
    display: 'Parallel'
  },
  {
    value: 'sequential',
    display: 'Sequential'
  },
  {
    value: 'synchronized',
    display: 'Synchronized'
  }
] as const;

export const GroupEvaluationBehaviorOptions: SelectOption<GroupEvaluationBehavior>[] = [
  {
    value: 'independent',
    display: 'Independent'
  },
  {
    value: 'comparative',
    display: 'Comparative'
  },
  {
    value: 'cumulative',
    display: 'Parallel'
  },
  {
    value: 'threshold',
    display: 'Sequential'
  },
  {
    value: 'proportional',
    display: 'Synchronized'
  },
  {
    value: 'trending',
    display: 'Trending'
  }
] as const;