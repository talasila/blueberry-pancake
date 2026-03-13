import { useState, useMemo } from 'react';
import { ArrowUp, ArrowDown, Medal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ProgressBar from './ProgressBar';
import RatingDistribution from './RatingDistribution';
import ListCard from './ListCard';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * ItemRatingsTable Component
 *
 * Displays a sortable card list of item ratings. Each card shows:
 * - Item ID as a handle strip
 * - Avg and Wt.Avg on one line
 * - Progress bar (percentage of users who rated)
 * - Rating distribution bar (color breakdown)
 *
 * Sort options: ID, Progress, Avg., Wt.Avg. (pill-style toggle buttons)
 * Cards are clickable to open item details drawer.
 *
 * @param {object} props
 * @param {Array} props.itemSummaries - Array of item summary objects
 * @param {Array} props.ratingConfiguration - Rating configuration array
 * @param {function} props.onRowClick - Optional click handler, receives itemId
 */
function ItemRatingsTable({ itemSummaries = [], ratingConfiguration = [], onRowClick }) {
  const { event } = useEventContext();
  const { pluralLower } = useItemTerminology(event);
  const [sortColumn, setSortColumn] = useState('weightedAverage');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedItems = [...itemSummaries].sort((a, b) => {
    let aValue, bValue;

    switch (sortColumn) {
      case 'itemId':
        aValue = a.itemId;
        bValue = b.itemId;
        break;
      case 'ratingProgression':
        aValue = a.ratingProgression || 0;
        bValue = b.ratingProgression || 0;
        break;
      case 'averageRating':
        aValue = a.averageRating ?? -1;
        bValue = b.averageRating ?? -1;
        break;
      case 'weightedAverage':
        aValue = a.weightedAverage ?? -1;
        bValue = b.weightedAverage ?? -1;
        break;
      default:
        return 0;
    }

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  const rankByItemId = useMemo(() => {
    const ranked = [...itemSummaries]
      .filter(i => i.weightedAverage != null)
      .sort((a, b) => (b.weightedAverage ?? -1) - (a.weightedAverage ?? -1));
    const map = {};
    ranked.forEach((item, idx) => { map[item.itemId] = idx + 1; });
    return map;
  }, [itemSummaries]);

  const sortOptions = [
    { key: 'itemId', label: 'ID' },
    { key: 'ratingProgression', label: 'Progress' },
    { key: 'averageRating', label: 'Avg.' },
    { key: 'weightedAverage', label: 'Wt.Avg.' },
  ];

  if (itemSummaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {pluralLower} available
      </div>
    );
  }

  return (
    <div>
      {/* Sort pills */}
      <div className="flex items-center justify-end pt-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground mr-1">Sort:</span>
          {sortOptions.map(({ key, label }) => {
            const isActive = sortColumn === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSort(key)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  isActive
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
                {isActive && (
                  sortDirection === 'asc'
                    ? <ArrowUp className="inline h-3 w-3 ml-0.5" />
                    : <ArrowDown className="inline h-3 w-3 ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item cards */}
      <div className="space-y-2">
        {sortedItems.map((item) => (
          <ListCard
            key={item.itemId}
            as="button"
            type="button"
            handle={item.itemId}
            onClick={() => onRowClick && onRowClick(item.itemId)}
            className="w-full text-left active:scale-[0.99] transition-all duration-150 hover:bg-muted/60"
          >
            <div className="px-3 py-2">
              {/* Row 1: Avg + Wt.Avg + Rank badge */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                <span>Avg: {formatValue(item.averageRating)}</span>
                <span>Wt: {formatValue(item.weightedAverage)}</span>
                {rankByItemId[item.itemId] != null && rankByItemId[item.itemId] <= 3 && (
                  <Badge
                    variant="default"
                    className={`text-[9px] px-1 py-0 font-semibold flex items-center gap-0.5 ml-auto ${
                      rankByItemId[item.itemId] === 1
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-950 border-yellow-600 shadow-sm dark:from-yellow-500 dark:to-yellow-600 dark:text-yellow-50 dark:border-yellow-700 hover:from-yellow-400 hover:to-yellow-500 hover:text-yellow-950 dark:hover:from-yellow-500 dark:hover:to-yellow-600 dark:hover:text-yellow-50'
                        : rankByItemId[item.itemId] === 2
                        ? 'bg-slate-300 text-slate-800 border-slate-400 dark:bg-slate-500 dark:text-slate-50 dark:border-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500'
                        : 'bg-amber-700 text-amber-50 border-amber-800 dark:bg-amber-800 dark:text-amber-50 dark:border-amber-900 hover:bg-amber-700 dark:hover:bg-amber-800'
                    }`}
                  >
                    {rankByItemId[item.itemId] === 1 && <Medal className="h-2 w-2" />}
                    #{rankByItemId[item.itemId]}
                  </Badge>
                )}
              </div>

              {/* Row 2-3: Progress + Distribution bars */}
              <div className="mt-1.5 space-y-1.5">
                <ProgressBar percentage={item.ratingProgression || 0} />
                <RatingDistribution
                  ratingDistribution={item.ratingDistribution || {}}
                  ratingConfiguration={ratingConfiguration}
                  totalRatings={item.numberOfRaters || 0}
                />
              </div>
            </div>
          </ListCard>
        ))}
      </div>
    </div>
  );
}

export default ItemRatingsTable;
