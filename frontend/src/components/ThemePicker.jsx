import { getAllPresets } from '@/utils/themePresets';

/**
 * Compact swatch grid for selecting an event theme.
 * Shows color circles in a wrap layout with the selected mood's
 * name and description displayed below.
 */
export default function ThemePicker({ selectedTheme, onSelect, disabled = false }) {
  const presets = getAllPresets();
  const selected = presets.find((p) => p.id === selectedTheme) || presets[0];

  return (
    <div data-testid="theme-picker">
      <div className="flex flex-wrap gap-2 pt-1">
        {presets.map((preset) => {
          const isSelected = preset.id === selectedTheme;
          return (
            <button
              key={preset.id}
              type="button"
              data-testid={`theme-card-${preset.id}`}
              disabled={disabled}
              onClick={() => !disabled && onSelect?.(preset.id)}
              className={`w-10 h-10 rounded-full border-2 transition-all overflow-hidden ${
                isSelected
                  ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                  : 'border-transparent hover:border-border'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label={`${preset.name} — ${preset.description}`}
              aria-pressed={isSelected}
            >
              <div className="w-full h-1/2" style={{ backgroundColor: preset.dark.accent }} />
              <div className="w-full h-1/2" style={{ backgroundColor: preset.light.accent }} />
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-sm">
        <span className="text-foreground">{selected.name}</span>
        <span className="text-muted-foreground"> — {selected.description}</span>
      </p>
    </div>
  );
}
