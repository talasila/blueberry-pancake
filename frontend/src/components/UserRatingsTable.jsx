import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import UserRatingProgress from './UserRatingProgress';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';

/**
 * UserRatingsTable Component
 * 
 * Displays a sortable table of user ratings with columns:
 * - User: Name with email below (trimmed)
 * - Progress: Two charts showing bottles rated and rating distribution
 * - Sparkline: Bar chart showing all ratings in order
 * 
 * Default sort: Email ascending
 * All columns are sortable (ascending/descending)
 * 
 * @param {object} props
 * @param {Array} props.userSummaries - Array of user summary objects
 * @param {Array} props.ratingConfiguration - Rating configuration array
 */
function UserRatingsTable({ userSummaries = [], ratingConfiguration = [] }) {
  const { event } = useEventContext();
  const { pluralLower } = useItemTerminology(event);
  const [sortColumn, setSortColumn] = useState('email');
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

  // Sort users based on current sort column and direction
  const sortedUsers = [...userSummaries].sort((a, b) => {
    let aValue, bValue;

    switch (sortColumn) {
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        // If names are equal, sort by email
        if (aValue === bValue) {
          aValue = a.email || '';
          bValue = b.email || '';
        }
        break;
      case 'numberOfBottlesRated':
        aValue = a.numberOfBottlesRated || 0;
        bValue = b.numberOfBottlesRated || 0;
        break;
      case 'ratingProgression':
        aValue = a.ratingProgression || 0;
        bValue = b.ratingProgression || 0;
        break;
      case 'averageRating':
        aValue = a.averageRating ?? -1; // null values go to end
        bValue = b.averageRating ?? -1;
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

  // Trim email for display (show first part before @)
  const trimEmail = (email) => {
    if (!email) return '';
    const parts = email.split('@');
    return parts[0] || email;
  };

  // Derive name from email if name is not specified
  const getUserDisplayName = (user) => {
    if (user.name) {
      return user.name;
    }
    // Derive from email by dropping @domain
    return trimEmail(user.email) || 'Unnamed User';
  };

  if (userSummaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No users available
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
              onClick={() => handleSort('email')}
            >
              <div className="flex items-center">
                User
                {renderSortIcon('email')}
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
                Avg. Rating
                {renderSortIcon('averageRating')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => {
            return (
              <tr 
                key={user.email} 
                className="border-b hover:bg-muted/50"
              >
                <td className="p-2 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {getUserDisplayName(user)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {trimEmail(user.email)}
                    </span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="w-full max-w-xs">
                    <UserRatingProgress
                      ratingProgression={user.ratingProgression || 0}
                      ratingDistribution={user.ratingDistribution || {}}
                      ratings={user.ratings || []}
                      ratingConfiguration={ratingConfiguration}
                      totalRatings={user.totalRatings || 0}
                    />
                  </div>
                </td>
                <td className="p-2 text-sm text-center">
                  {formatValue(user.averageRating)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default UserRatingsTable;

