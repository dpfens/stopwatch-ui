import { GroupTraitPreset, GroupTraits, ObjectiveType } from "../models/sequence/interfaces";

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