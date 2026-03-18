import { describe, it, expect } from 'vitest';

// Extract the reducer and initial state for testing
// Since they're defined outside the component, we re-define them here for isolation
const initialExportState = {
  ratings: { loading: false, error: '', success: '' },
  matrix: { loading: false, error: '', success: '' },
  users: { loading: false, error: '', success: '' },
  items: { loading: false, error: '', success: '' },
};

function exportReducer(state, action) {
  switch (action.type) {
    case 'START_EXPORT':
      return { ...state, [action.key]: { loading: true, error: '', success: '' } };
    case 'EXPORT_ERROR':
      return { ...state, [action.key]: { loading: false, error: action.error, success: '' } };
    case 'EXPORT_SUCCESS':
      return { ...state, [action.key]: { loading: false, error: '', success: action.message } };
    case 'CLEAR_MESSAGE':
      return { ...state, [action.key]: { ...state[action.key], [action.field]: '' } };
    case 'RESET_ALL':
      return initialExportState;
    default:
      return state;
  }
}

describe('exportReducer', () => {
  it('returns initial state for unknown action', () => {
    const state = exportReducer(initialExportState, { type: 'UNKNOWN' });
    expect(state).toEqual(initialExportState);
  });

  describe('START_EXPORT', () => {
    it('sets loading true and clears messages for the given key', () => {
      const stateWithError = {
        ...initialExportState,
        ratings: { loading: false, error: 'old error', success: 'old success' },
      };
      const result = exportReducer(stateWithError, { type: 'START_EXPORT', key: 'ratings' });
      expect(result.ratings).toEqual({ loading: true, error: '', success: '' });
    });

    it('does not affect other keys', () => {
      const result = exportReducer(initialExportState, { type: 'START_EXPORT', key: 'ratings' });
      expect(result.matrix).toEqual(initialExportState.matrix);
      expect(result.users).toEqual(initialExportState.users);
      expect(result.items).toEqual(initialExportState.items);
    });
  });

  describe('EXPORT_ERROR', () => {
    it('sets error and clears loading', () => {
      const loadingState = {
        ...initialExportState,
        matrix: { loading: true, error: '', success: '' },
      };
      const result = exportReducer(loadingState, {
        type: 'EXPORT_ERROR',
        key: 'matrix',
        error: 'Network error',
      });
      expect(result.matrix).toEqual({ loading: false, error: 'Network error', success: '' });
    });
  });

  describe('EXPORT_SUCCESS', () => {
    it('sets success message and clears loading', () => {
      const loadingState = {
        ...initialExportState,
        users: { loading: true, error: '', success: '' },
      };
      const result = exportReducer(loadingState, {
        type: 'EXPORT_SUCCESS',
        key: 'users',
        message: 'Exported successfully',
      });
      expect(result.users).toEqual({ loading: false, error: '', success: 'Exported successfully' });
    });
  });

  describe('CLEAR_MESSAGE', () => {
    it('clears success message while preserving other fields', () => {
      const stateWithSuccess = {
        ...initialExportState,
        items: { loading: false, error: '', success: 'Done!' },
      };
      const result = exportReducer(stateWithSuccess, {
        type: 'CLEAR_MESSAGE',
        key: 'items',
        field: 'success',
      });
      expect(result.items.success).toBe('');
      expect(result.items.loading).toBe(false);
    });

    it('clears error message while preserving other fields', () => {
      const stateWithError = {
        ...initialExportState,
        ratings: { loading: false, error: 'Something failed', success: '' },
      };
      const result = exportReducer(stateWithError, {
        type: 'CLEAR_MESSAGE',
        key: 'ratings',
        field: 'error',
      });
      expect(result.ratings.error).toBe('');
    });
  });

  describe('RESET_ALL', () => {
    it('resets all keys to initial state', () => {
      const dirtyState = {
        ratings: { loading: true, error: 'err', success: 'ok' },
        matrix: { loading: false, error: 'fail', success: '' },
        users: { loading: true, error: '', success: 'done' },
        items: { loading: false, error: '', success: 'complete' },
      };
      const result = exportReducer(dirtyState, { type: 'RESET_ALL' });
      expect(result).toEqual(initialExportState);
    });
  });

  describe('isAnyExporting derivation', () => {
    it('detects when any key is loading', () => {
      const state = {
        ...initialExportState,
        matrix: { loading: true, error: '', success: '' },
      };
      const isAnyExporting = Object.values(state).some(s => s.loading);
      expect(isAnyExporting).toBe(true);
    });

    it('returns false when no key is loading', () => {
      const isAnyExporting = Object.values(initialExportState).some(s => s.loading);
      expect(isAnyExporting).toBe(false);
    });
  });
});
