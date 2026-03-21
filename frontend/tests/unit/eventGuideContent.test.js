import { describe, it, expect } from 'vitest';
import * as icons from 'lucide-react';
import {
  eventGuideSteps,
  phases,
  getStepVisualState,
} from '../../src/data/eventGuideContent';

const VALID_PHASES = ['before-event', 'event-day-setup', 'during-tasting', 'the-reveal'];
const VALID_STEP_TYPES = ['real-world', 'in-app'];
const REQUIRED_FIELDS = ['id', 'heading', 'description', 'icon', 'phase', 'stepType', 'position'];

describe('eventGuideContent', () => {
  it('exports exactly 11 steps', () => {
    expect(eventGuideSteps).toHaveLength(11);
  });

  it('exports exactly 4 phases', () => {
    expect(phases).toHaveLength(4);
  });

  it('each step has all required fields as non-empty values', () => {
    for (const step of eventGuideSteps) {
      for (const field of REQUIRED_FIELDS) {
        expect(step, `step ${step.id} missing field ${field}`).toHaveProperty(field);
        if (field === 'position') {
          expect(typeof step[field]).toBe('number');
        } else {
          expect(typeof step[field]).toBe('string');
          expect(step[field].trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('positions are sequential from 1 to 11', () => {
    const positions = eventGuideSteps.map((s) => s.position);
    expect(positions).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
  });

  it('all step IDs are globally unique', () => {
    const allIds = eventGuideSteps.map((s) => s.id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('each step icon is a valid lucide-react export', () => {
    for (const step of eventGuideSteps) {
      expect(icons, `step ${step.id} has invalid icon: ${step.icon}`).toHaveProperty(step.icon);
    }
  });

  it('each step phase is one of the valid phase IDs', () => {
    for (const step of eventGuideSteps) {
      expect(VALID_PHASES).toContain(step.phase);
    }
  });

  it('each step stepType is real-world or in-app', () => {
    for (const step of eventGuideSteps) {
      expect(VALID_STEP_TYPES).toContain(step.stepType);
    }
  });

  it('phase step ranges cover all 11 steps without gaps or overlaps', () => {
    const covered = new Set();
    for (const phase of phases) {
      const [start, end] = phase.stepRange;
      for (let i = start; i <= end; i++) {
        expect(covered.has(i), `position ${i} covered by multiple phases`).toBe(false);
        covered.add(i);
      }
    }
    expect(covered.size).toBe(11);
    for (let i = 1; i <= 11; i++) {
      expect(covered.has(i), `position ${i} not covered by any phase`).toBe(true);
    }
  });

  it('each phase ID matches valid phase values', () => {
    for (const phase of phases) {
      expect(VALID_PHASES).toContain(phase.id);
    }
  });

  it('steps within each phase have matching phase field', () => {
    for (const phase of phases) {
      const [start, end] = phase.stepRange;
      const phaseSteps = eventGuideSteps.filter(
        (s) => s.position >= start && s.position <= end,
      );
      for (const step of phaseSteps) {
        expect(step.phase, `step ${step.id} has phase ${step.phase}, expected ${phase.id}`).toBe(
          phase.id,
        );
      }
    }
  });
});

describe('getStepVisualState', () => {
  it('returns correct states for created event', () => {
    // now: 1-6, ahead: 7-11
    expect(getStepVisualState('created', 1)).toBe('now');
    expect(getStepVisualState('created', 6)).toBe('now');
    expect(getStepVisualState('created', 7)).toBe('ahead');
    expect(getStepVisualState('created', 11)).toBe('ahead');
  });

  it('returns correct states for started event', () => {
    // done: 1-6, now: 7, ahead: 8-11
    expect(getStepVisualState('started', 6)).toBe('done');
    expect(getStepVisualState('started', 7)).toBe('now');
    expect(getStepVisualState('started', 8)).toBe('ahead');
  });

  it('returns correct states for paused event', () => {
    // done: 1-7, now: 8-10, ahead: 11
    expect(getStepVisualState('paused', 7)).toBe('done');
    expect(getStepVisualState('paused', 8)).toBe('now');
    expect(getStepVisualState('paused', 10)).toBe('now');
    expect(getStepVisualState('paused', 11)).toBe('ahead');
  });

  it('returns correct states for completed event', () => {
    // done: 1-10, now: 11, ahead: none
    expect(getStepVisualState('completed', 10)).toBe('done');
    expect(getStepVisualState('completed', 11)).toBe('now');
  });

  it('returns ahead for unknown event state', () => {
    expect(getStepVisualState('unknown', 1)).toBe('ahead');
  });
});
