import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from 'lucide-react';
import ProgressBar from './ProgressBar';
import RatingDistribution from './RatingDistribution';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * ItemRatingsTable Component
 * 
 * Displays a sortable table of item ratings with columns:
 * - ID: Item identifier
 * - Rating Progression: Progress bar showing percentage of users who rated
 * - Average Rating: Arithmetic mean of ratings, formatted to 2 decimal places
 * - Weighted Average: Bayesian weighted average, formatted to 2 decimal places
 * 
 * Default sort: Item ID ascending
 * All columns are sortable (ascending/descending)
 * 
 * @param {object} props
 * @param {Array} props.itemSummaries - Array of item summary objects
 * @param {Array} props.ratingConfiguration - Rating configuration array
 * @param {function} props.onRowClick - Optional click handler for table rows (receives itemId)
 */
function ItemRatingsTable({ itemSummaries = [], ratingConfiguration = [], onRowClick }) {
  const { event } = useEventContext();
  const { singularLower, pluralLower } = useItemTerminology(event);
  const [sortColumn, setSortColumn] = useState('itemId');
  const [sortDirection, setSortDirection] = useState('asc');

  // Handle column header click
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort items based on current sort column and direction
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
        aValue = a.averageRating ?? -1; // null values go to end
        bValue = b.averageRating ?? -1;
        break;
      case 'weightedAverage':
        aValue = a.weightedAverage ?? -1; // null values go to end
        bValue = b.weightedAverage ?? -1;
        break;
      default:
        return 0;
    }

    // Handle null values (sort to end)
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    // Compare values
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Render sort icon
  const renderSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Format number to 2 decimal places or show "N/A"
  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  // Get tooltip message for null values
  const getTooltipMessage = (value, type) => {
    if (value !== null && value !== undefined) return null;
    
    if (type === 'weightedAverage') {
      return 'No ratings submitted yet or insufficient data';
    }
    return 'No ratings submitted yet';
  };

  if (itemSummaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {pluralLower} available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th
              className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 text-sm"
              onClick={() => handleSort('itemId')}
            >
              <div className="flex items-center">
                ID
                {renderSortIcon('itemId')}
              </div>
            </th>
            <th
              className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 text-sm"
              onClick={() => handleSort('ratingProgression')}
            >
              <div className="flex items-center">
                Progress
                {renderSortIcon('ratingProgression')}
              </div>
            </th>
            <th
              className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 text-sm"
              onClick={() => handleSort('averageRating')}
            >
              <div className="flex items-center">
                Avg.
                {renderSortIcon('averageRating')}
              </div>
            </th>
            <th
              className="text-left p-2 font-medium cursor-pointer hover:bg-muted/50 text-sm"
              onClick={() => handleSort('weightedAverage')}
            >
              <div className="flex items-center">
                Wt.Avg.
                {renderSortIcon('weightedAverage')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const avgRatingTooltip = getTooltipMessage(item.averageRating, 'averageRating');
            const weightedAvgTooltip = getTooltipMessage(item.weightedAverage, 'weightedAverage');

            return (
              <tr 
                key={item.itemId} 
                className={`border-b hover:bg-muted/50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(item.itemId)}
              >
                <td className="p-2 text-sm">{item.itemId}</td>
                <td className="p-2">
                  <div className="w-full max-w-xs space-y-2">
                    <ProgressBar percentage={item.ratingProgression || 0} />
                    <RatingDistribution
                      ratingDistribution={item.ratingDistribution || {}}
                      ratingConfiguration={ratingConfiguration}
                      totalRatings={item.numberOfRaters || 0}
                    />
                  </div>
                </td>
                <td className="p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{formatValue(item.averageRating)}</span>
                    {avgRatingTooltip && (
                      <div className="group relative">
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border whitespace-nowrap">
                            {avgRatingTooltip}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span>{formatValue(item.weightedAverage)}</span>
                    {weightedAvgTooltip && (
                      <div className="group relative">
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border whitespace-nowrap">
                            {weightedAvgTooltip}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ItemRatingsTable;
