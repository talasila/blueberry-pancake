import { describe, it, expect } from 'vitest';
import {
  getAllPresets,
  getPreset,
  getThemeVars,
  THEME_PRESETS,
} from '../../src/utils/themePresets.js';

const REQUIRED_PRESET_KEYS = ['id', 'name', 'description', 'light', 'dark'];
const PALETTE_KEYS = [
  'accent',
  'accentForeground',
  'surface',
  'surfaceForeground',
  'headerBg',
];
const CSS_VAR_KEYS = [
  '--event-accent',
  '--event-accent-fg',
  '--event-surface',
  '--event-surface-fg',
  '--event-header-bg',
];

describe('themePresets', () => {
  describe('preset structure', () => {
    it('all 10 presets have required fields (id, name, description, light, dark)', () => {
      const presets = Object.values(THEME_PRESETS);
      expect(presets).toHaveLength(10);

      presets.forEach((preset) => {
        REQUIRED_PRESET_KEYS.forEach((key) => {
          expect(preset).toHaveProperty(key);
        });
      });
    });

    it('each preset has all palette fields in both light and dark', () => {
      const presets = Object.values(THEME_PRESETS);

      presets.forEach((preset) => {
        PALETTE_KEYS.forEach((key) => {
          expect(preset.light).toHaveProperty(key);
          expect(preset.dark).toHaveProperty(key);
        });
      });
    });
  });

  describe('getPreset', () => {
    it('returns the cellar preset for getPreset("cellar")', () => {
      const preset = getPreset('cellar');
      expect(preset.id).toBe('cellar');
      expect(preset.name).toBe('Cellar');
    });

    it('returns the classic preset for unknown ID', () => {
      const preset = getPreset('unknown');
      expect(preset.id).toBe('classic');
    });

    it('returns the classic preset for undefined', () => {
      const preset = getPreset(undefined);
      expect(preset.id).toBe('classic');
    });
  });

  describe('getAllPresets', () => {
    it('returns array of 10 presets', () => {
      const presets = getAllPresets();
      expect(presets).toHaveLength(10);
      expect(Array.isArray(presets)).toBe(true);
    });
  });

  describe('getThemeVars', () => {
    it('returns object with all 5 CSS var keys for light mode', () => {
      const vars = getThemeVars('cellar', false);
      CSS_VAR_KEYS.forEach((key) => {
        expect(vars).toHaveProperty(key);
      });
    });

    it('returns dark variant values when isDark is true', () => {
      const lightVars = getThemeVars('cellar', false);
      const darkVars = getThemeVars('cellar', true);

      expect(darkVars['--event-accent']).toBe(
        THEME_PRESETS.cellar.dark.accent
      );
      expect(darkVars['--event-accent']).not.toBe(lightVars['--event-accent']);
    });
  });

  describe('classic preset compatibility', () => {
    it('classic preset light accent matches oklch(0.205 0 0) (app --primary)', () => {
      const preset = getPreset('classic');
      expect(preset.light.accent).toBe('oklch(0.205 0 0)');
    });
  });
});
