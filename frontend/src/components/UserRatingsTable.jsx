import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import UserRatingProgress from './UserRatingProgress';
import ListCard from './ListCard';
import { getPersonalityName } from '@/utils/personalityContent';

/**
 * UserRatingsTable Component
 *
 * Displays a sortable card list of user ratings. Each card shows:
 * - User name with average rating right-aligned
 * - Optional tasting personality
 * - Rating timeline bar (chronological progress)
 * - Rating distribution bar
 *
 * Sort options: Name, # Rated, Avg. Rating (pill-style toggle buttons)
 * Cards are clickable to open user details drawer.
 *
 * @param {object} props
 * @param {Array} props.userSummaries - Array of user summary objects
 * @param {Array} props.ratingConfiguration - Rating configuration array
 * @param {function} props.onRowClick - Callback when a card is clicked, receives userId
 */
function UserRatingsTable({ userSummaries = [], ratingConfiguration = [], onRowClick, personalityEnabled = true }) {
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedUsers = [...userSummaries].sort((a, b) => {
    let aValue, bValue;

    switch (sortColumn) {
      case 'name':
        aValue = (a.name || '').toLowerCase();
        bValue = (b.name || '').toLowerCase();
        break;
      case 'numberOfBottlesRated':
        aValue = a.numberOfBottlesRated || 0;
        bValue = b.numberOfBottlesRated || 0;
        break;
      case 'averageRating':
        aValue = a.averageRating ?? -1;
        bValue = b.averageRating ?? -1;
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

  const formatAvg = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return typeof value === 'number' ? value.toFixed(2) : value;
  };

  const getUserDisplayName = (user) => {
    return user.name || 'Guest';
  };

  const sortOptions = [
    { key: 'name', label: 'Name' },
    { key: 'numberOfBottlesRated', label: '# Rated' },
    { key: 'averageRating', label: 'Avg. Rating' },
  ];

  if (userSummaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No users available
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

      {/* User cards */}
      <div className="space-y-2">
        {sortedUsers.map((user) => (
          <ListCard
            key={user.userId}
            as="button"
            type="button"
            onClick={() => onRowClick && onRowClick(user.userId)}
            className="w-full text-left active:scale-[0.99] transition-all duration-150 hover:bg-muted/60"
          >
            <div className="px-3 py-2">
              {/* Row 1: Name + Avg rating */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate">
                  {getUserDisplayName(user)}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2 tabular-nums">
                  Avg: {formatAvg(user.averageRating)}
                </span>
              </div>

              {/* Row 2: Personality */}
              {personalityEnabled && user.personality && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  <span className="italic">{getPersonalityName(user.personality)}</span>
                </div>
              )}

              {/* Row 3–4: Rating bars */}
              <div className="mt-1.5">
                <UserRatingProgress
                  ratingProgression={user.ratingProgression || 0}
                  ratingDistribution={user.ratingDistribution || {}}
                  ratings={user.ratings || []}
                  ratingConfiguration={ratingConfiguration}
                  totalRatings={user.totalRatings || 0}
                  barHeight="h-2"
                />
              </div>
            </div>
          </ListCard>
        ))}
      </div>
    </div>
  );
}

export default UserRatingsTable;
