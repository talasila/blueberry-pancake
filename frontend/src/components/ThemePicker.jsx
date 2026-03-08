import { getAllPresets } from '@/utils/themePresets';

/**
 * Grid of self-styled preset cards for selecting an event theme.
 * Each card renders in the preset's own palette so the card IS the preview.
 */
export default function ThemePicker({ selectedTheme, onSelect, disabled = false }) {
  const presets = getAllPresets();

  return (
    <div className="grid grid-cols-2 gap-2" data-testid="theme-picker">
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
            className={`rounded-lg p-3 text-left border border-border transition-shadow ${
              isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-block w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                style={{ backgroundColor: accent }}
              />
              <span
                className="inline-block w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                style={{ backgroundColor: headerBg }}
              />
            </div>
            <span className="font-medium text-sm text-foreground">{preset.name}</span>
            <p className="text-xs text-muted-foreground">{preset.description}</p>
          </button>
        );
      })}
    </div>
  );
}
