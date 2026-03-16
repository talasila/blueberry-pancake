import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PERSONALITY_CONTENT, getPersonalityDisplay } from '@/utils/personalityContent';
import {
  Heart, ThumbsDown, Zap, Repeat, Contrast, PenTool,
  TrendingUpDown, Scale, EyeOff, BrainCircuit, Compass
} from 'lucide-react';

const ICON_MAP = {
  Heart, ThumbsDown, Zap, Repeat, Contrast, PenTool,
  TrendingUpDown, Scale, EyeOff, BrainCircuit, Compass
};

const PERSONALITY_COLORS = {
  'golden-retriever': 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  'simon-cowell': 'bg-slate-100 text-slate-900 dark:bg-slate-800/40 dark:text-slate-200',
  'broken-record': 'bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200',
  'love-hate-critic': 'bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200',
  'speedrun': 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200',
  'novelist': 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-200',
  'rollercoaster': 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200',
  'diplomat': 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
  'ghost': 'bg-gray-100 text-gray-900 dark:bg-gray-800/40 dark:text-gray-200',
  'philosopher': 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200',
  'explorer': 'bg-lime-100 text-lime-900 dark:bg-lime-900/30 dark:text-lime-200',
};

/**
 * Aggregates tasting personalities and highlights the dominant one with a
 * featured quote. Remaining personalities appear as compact pills below.
 *
 * @param {object} props
 * @param {Array} props.userSummaries - Array of user summary objects with personality field
 * @param {{ singular: string, plural: string }} [props.itemTerms] - Item terminology for quote interpolation
 */
function PersonalitySummaryStrip({ userSummaries, itemTerms = {} }) {
  const sorted = useMemo(() => {
    const counts = (userSummaries || [])
      .filter(u => u.personality)
      .reduce((acc, u) => {
        acc[u.personality] = (acc[u.personality] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(counts)
      .map(([id, count]) => {
        const iconName = PERSONALITY_CONTENT[id]?.icon;
        return {
          id,
          count,
          name: PERSONALITY_CONTENT[id]?.name ?? id,
          IconComponent: ICON_MAP[iconName] || null,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [userSummaries]);

  const totalWithPersonality = sorted.reduce((sum, p) => sum + p.count, 0);

  const dominantQuote = useMemo(() => {
    if (sorted.length === 0) return null;
    const { id } = sorted[0];
    const templateVars = {
      item: itemTerms.singular || 'bottle',
      items: itemTerms.plural || 'bottles',
    };
    // Pick a stable-ish quote based on total count so it doesn't change on every render
    const quoteIndex = totalWithPersonality % (PERSONALITY_CONTENT[id]?.quotes?.length || 1);
    return getPersonalityDisplay(id, templateVars, quoteIndex);
  }, [sorted, itemTerms, totalWithPersonality]);

  if (sorted.length === 0) return null;

  const dominant = sorted[0];
  const DominantIcon = dominant.IconComponent;
  const rest = sorted.slice(1);

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-muted-foreground text-center mb-3 tracking-wide uppercase">
          Tasting Personalities
        </p>

        {/* Dominant personality hero */}
        <div className="flex flex-col items-center gap-1.5 mb-3">
          {DominantIcon && (
            <div className={`rounded-full p-2.5 ${PERSONALITY_COLORS[dominant.id] || 'bg-muted'}`}>
              <DominantIcon className="h-5 w-5" />
            </div>
          )}
          <span className="text-base font-semibold tracking-tight">{dominant.name}</span>
          <span className="text-xs text-muted-foreground">
            {dominant.count} of {totalWithPersonality} {totalWithPersonality === 1 ? 'person' : 'people'}
          </span>
          {dominantQuote?.quote && (
            <p className="text-xs text-muted-foreground/80 italic text-center max-w-[260px] leading-relaxed mt-0.5">
              &ldquo;{dominantQuote.quote}&rdquo;
            </p>
          )}
        </div>

        {/* Secondary personalities as compact pills */}
        {rest.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-center pt-2 border-t border-border/50">
            {rest.map(({ id, count, name, IconComponent }) => (
              <div
                key={id}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${PERSONALITY_COLORS[id] || 'bg-muted text-muted-foreground'}`}
              >
                {IconComponent && <IconComponent className="h-3 w-3" />}
                <span>{count}</span>
                <span className="opacity-75">{name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PersonalitySummaryStrip;
