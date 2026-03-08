import { getAllPresets } from '@/utils/themePresets';

/**
 * Full-width list of preset rows for selecting an event theme.
 * Each row shows color swatches, the name, and a short description.
 */
export default function ThemePicker({ selectedTheme, onSelect, disabled = false }) {
  const presets = getAllPresets();

  return (
    <div className="flex flex-col gap-1.5" data-testid="theme-picker">
      {presets.map((preset) => {
        const isSelected = preset.id === selectedTheme;
        const accent = preset.light.accent;
        const headerBg = preset.light.headerBg;

        return (
          <button
            key={preset.id}
            type="button"
            data-testid={`theme-card-${preset.id}`}
            disabled={disabled}
            onClick={() => !disabled && onSelect?.(preset.id)}
            className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left border transition-shadow ${
              isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
          >
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="inline-block w-4 h-4 rounded-full border border-black/10"
                style={{ backgroundColor: accent }}
              />
              <span
                className="inline-block w-4 h-4 rounded-full border border-black/10"
                style={{ backgroundColor: headerBg }}
              />
            </div>
            <span className="flex-shrink-0 font-medium text-sm text-foreground">{preset.name}</span>
            <span className="ml-auto truncate text-xs text-muted-foreground">{preset.description}</span>
          </button>
        );
      })}
    </div>
  );
}
