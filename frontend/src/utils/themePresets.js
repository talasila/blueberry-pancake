/**
 * Theme preset definitions for event visual theming.
 *
 * Each preset provides light and dark palettes using oklch color values.
 * The "classic" preset mirrors the existing design tokens from globals.css
 * so that un-themed events render identically to the pre-feature appearance.
 */

const THEME_PRESETS = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'The timeless choice',
    light: {
      accent: 'oklch(0.205 0 0)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.97 0 0)',
      surfaceForeground: 'oklch(0.145 0 0)',
      headerBg: 'oklch(1 0 0)',
    },
    dark: {
      accent: 'oklch(0.922 0 0)',
      accentForeground: 'oklch(0.205 0 0)',
      surface: 'oklch(0.269 0 0)',
      surfaceForeground: 'oklch(0.985 0 0)',
      headerBg: 'oklch(0.145 0 0)',
    },
  },

  cellar: {
    id: 'cellar',
    name: 'Cellar',
    description: 'Aged oak & candlelight',
    light: {
      accent: 'oklch(0.45 0.15 15)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.96 0.02 30)',
      surfaceForeground: 'oklch(0.25 0.05 15)',
      headerBg: 'oklch(0.95 0.02 15)',
    },
    dark: {
      accent: 'oklch(0.65 0.15 15)',
      accentForeground: 'oklch(0.15 0.02 15)',
      surface: 'oklch(0.25 0.05 15)',
      surfaceForeground: 'oklch(0.92 0.02 30)',
      headerBg: 'oklch(0.22 0.03 15)',
    },
  },

  terracotta: {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Sun-baked countryside',
    light: {
      accent: 'oklch(0.55 0.14 45)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.96 0.02 45)',
      surfaceForeground: 'oklch(0.25 0.04 45)',
      headerBg: 'oklch(0.95 0.02 45)',
    },
    dark: {
      accent: 'oklch(0.70 0.13 45)',
      accentForeground: 'oklch(0.15 0.03 45)',
      surface: 'oklch(0.25 0.04 45)',
      surfaceForeground: 'oklch(0.92 0.02 45)',
      headerBg: 'oklch(0.22 0.03 45)',
    },
  },

  golden: {
    id: 'golden',
    name: 'Golden',
    description: 'Sunset on the vineyard',
    light: {
      accent: 'oklch(0.65 0.17 75)',
      accentForeground: 'oklch(0.20 0.03 75)',
      surface: 'oklch(0.96 0.03 75)',
      surfaceForeground: 'oklch(0.25 0.04 75)',
      headerBg: 'oklch(0.95 0.03 75)',
    },
    dark: {
      accent: 'oklch(0.75 0.15 75)',
      accentForeground: 'oklch(0.20 0.04 75)',
      surface: 'oklch(0.25 0.04 75)',
      surfaceForeground: 'oklch(0.92 0.02 75)',
      headerBg: 'oklch(0.22 0.03 75)',
    },
  },

  olive: {
    id: 'olive',
    name: 'Olive',
    description: 'Tuscan hillside',
    light: {
      accent: 'oklch(0.52 0.10 125)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.96 0.02 125)',
      surfaceForeground: 'oklch(0.25 0.04 125)',
      headerBg: 'oklch(0.95 0.02 125)',
    },
    dark: {
      accent: 'oklch(0.68 0.10 125)',
      accentForeground: 'oklch(0.15 0.03 125)',
      surface: 'oklch(0.25 0.04 125)',
      surfaceForeground: 'oklch(0.92 0.02 125)',
      headerBg: 'oklch(0.22 0.03 125)',
    },
  },

  garden: {
    id: 'garden',
    name: 'Garden',
    description: 'Al fresco afternoon',
    light: {
      accent: 'oklch(0.55 0.15 155)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.96 0.03 155)',
      surfaceForeground: 'oklch(0.20 0.05 155)',
      headerBg: 'oklch(0.95 0.02 155)',
    },
    dark: {
      accent: 'oklch(0.70 0.15 155)',
      accentForeground: 'oklch(0.15 0.03 155)',
      surface: 'oklch(0.25 0.04 155)',
      surfaceForeground: 'oklch(0.92 0.02 155)',
      headerBg: 'oklch(0.22 0.03 155)',
    },
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Seaside aperitivo',
    light: {
      accent: 'oklch(0.50 0.12 200)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.96 0.02 200)',
      surfaceForeground: 'oklch(0.22 0.04 200)',
      headerBg: 'oklch(0.95 0.02 200)',
    },
    dark: {
      accent: 'oklch(0.68 0.12 200)',
      accentForeground: 'oklch(0.15 0.03 200)',
      surface: 'oklch(0.24 0.04 200)',
      surfaceForeground: 'oklch(0.92 0.02 200)',
      headerBg: 'oklch(0.21 0.03 200)',
    },
  },

  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Late-night lounge',
    light: {
      accent: 'oklch(0.40 0.12 260)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.95 0.02 260)',
      surfaceForeground: 'oklch(0.25 0.05 260)',
      headerBg: 'oklch(0.95 0.02 260)',
    },
    dark: {
      accent: 'oklch(0.65 0.12 260)',
      accentForeground: 'oklch(0.15 0.03 260)',
      surface: 'oklch(0.22 0.04 260)',
      surfaceForeground: 'oklch(0.90 0.02 260)',
      headerBg: 'oklch(0.20 0.03 260)',
    },
  },

  lavender: {
    id: 'lavender',
    name: 'Lavender',
    description: 'Provençal evening',
    light: {
      accent: 'oklch(0.55 0.14 300)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.96 0.02 300)',
      surfaceForeground: 'oklch(0.28 0.05 300)',
      headerBg: 'oklch(0.95 0.02 300)',
    },
    dark: {
      accent: 'oklch(0.70 0.13 300)',
      accentForeground: 'oklch(0.15 0.03 300)',
      surface: 'oklch(0.25 0.04 300)',
      surfaceForeground: 'oklch(0.92 0.02 300)',
      headerBg: 'oklch(0.22 0.03 300)',
    },
  },

  rose: {
    id: 'rose',
    name: 'Rosé',
    description: 'Patio brunch vibes',
    light: {
      accent: 'oklch(0.65 0.15 350)',
      accentForeground: 'oklch(0.985 0 0)',
      surface: 'oklch(0.96 0.03 350)',
      surfaceForeground: 'oklch(0.30 0.05 350)',
      headerBg: 'oklch(0.95 0.02 350)',
    },
    dark: {
      accent: 'oklch(0.72 0.14 350)',
      accentForeground: 'oklch(0.20 0.03 350)',
      surface: 'oklch(0.25 0.04 350)',
      surfaceForeground: 'oklch(0.92 0.02 350)',
      headerBg: 'oklch(0.22 0.03 350)',
    },
  },
};

/**
 * Get a preset by ID. Falls back to "classic" for unrecognized IDs.
 */
export function getPreset(id) {
  return THEME_PRESETS[id] || THEME_PRESETS.classic;
}

/**
 * Get all presets as an ordered array.
 */
export function getAllPresets() {
  return Object.values(THEME_PRESETS);
}

/**
 * Build a CSS custom-property object for the given preset and mode.
 * Returns an object like { '--event-accent': 'oklch(...)' } ready for
 * use as an inline style prop.
 */
export function getThemeVars(presetId, isDark = false) {
  const preset = getPreset(presetId);
  const palette = isDark ? preset.dark : preset.light;

  return {
    '--event-accent': palette.accent,
    '--event-accent-fg': palette.accentForeground,
    '--event-surface': palette.surface,
    '--event-surface-fg': palette.surfaceForeground,
    '--event-header-bg': palette.headerBg,
    '--primary': palette.accent,
    '--primary-foreground': isDark ? palette.accentForeground : 'oklch(0.985 0 0)',
  };
}

export { THEME_PRESETS };
