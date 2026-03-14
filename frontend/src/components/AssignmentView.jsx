import { useState, useMemo, useCallback } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronsRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useItemTerminology } from '@/utils/itemTerminology';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AssignmentButton from '@/components/AssignmentButton';
import BottomSheetPicker from '@/components/BottomSheetPicker';
import ListCard from '@/components/ListCard';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * AssignmentView — shared assignment UI for the number-first grid workflow.
 * Used by both EventAdminPage (drawer) and ItemAssignmentPage (standalone).
 */
export default function AssignmentView({
  eventId,
  event,
  items,
  isLoadingItems,
  onAssignItem,
  onPauseEvent,
  onItemsChange,
}) {
  const { singular, singularLower, plural, pluralLower } = useItemTerminology(event);

  const [selectedNumber, setSelectedNumber] = useState(null);
  const [assigningNumber, setAssigningNumber] = useState(null);
  const [bottleListExpanded, setBottleListExpanded] = useState(false);
  const [sheetMode, setSheetMode] = useState('pick'); // 'pick' | 'review'
  const [searchQuery, setSearchQuery] = useState('');
  const [isPausing, setIsPausing] = useState(false);

  const isPaused = event?.state === 'paused';

  // Derive available IDs (same logic as EventPage)
  const availableIds = useMemo(() => {
    if (!event?.itemConfiguration) return [];
    const { numberOfItems, excludedItemIds = [] } = event.itemConfiguration;
    return Array.from({ length: numberOfItems }, (_, i) => i + 1)
      .filter(id => !excludedItemIds.includes(id));
  }, [event]);

  // Map of assigned tasting number → item
  const assignedMap = useMemo(() => {
    const map = new Map();
    (items || []).forEach(item => {
      if (item.itemId != null) map.set(item.itemId, item);
    });
    return map;
  }, [items]);

  const unassignedBottles = useMemo(
    () => (items || []).filter(item => item.itemId == null),
    [items],
  );

  const assignedCount = assignedMap.size;
  const totalSlots = availableIds.length;

  // Resolve owner display name from event.users, falling back to email
  const getOwnerName = useCallback((ownerEmail) => {
    if (event?.users && event.users[ownerEmail]?.name) {
      return event.users[ownerEmail].name;
    }
    return ownerEmail;
  }, [event]);

  // The item currently assigned to the selected number (for review mode)
  const selectedItem = selectedNumber != null ? assignedMap.get(selectedNumber) : null;

  // Filtered bottles for the picker (search applied)
  const filteredBottles = useMemo(() => {
    let bottles = unassignedBottles;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      bottles = bottles.filter(item =>
        item.name.toLowerCase().includes(q) ||
        getOwnerName(item.ownerEmail).toLowerCase().includes(q) ||
        item.ownerEmail.toLowerCase().includes(q),
      );
    }
    return bottles;
  }, [unassignedBottles, searchQuery, getOwnerName]);

  // --- Handlers ---

  const handleButtonTap = useCallback((numberTapped) => {
    if (!isPaused) return;
    const isAssigned = assignedMap.has(numberTapped);
    setSelectedNumber(numberTapped);
    setSheetMode(isAssigned ? 'review' : 'pick');
    setSearchQuery('');
  }, [isPaused, assignedMap]);

  const handleCloseSheet = useCallback(() => {
    setSelectedNumber(null);
    setSheetMode('pick');
    setSearchQuery('');
  }, []);

  const handleAssign = useCallback(async (bottle) => {
    const numberToAssign = selectedNumber;
    const previousItems = [...items];

    // Optimistic: close sheet, show loading on button
    setSelectedNumber(null);
    setAssigningNumber(numberToAssign);

    try {
      const updatedItem = await onAssignItem(bottle.id, numberToAssign);
      onItemsChange(
        items.map(i => (i.id === bottle.id ? updatedItem : i)),
      );
    } catch (error) {
      onItemsChange(previousItems);
      toast.error(error.message || `Failed to assign ${singularLower} ID`);
    } finally {
      setAssigningNumber(null);
    }
  }, [selectedNumber, items, onAssignItem, onItemsChange, singularLower]);

  const handleClear = useCallback(async () => {
    if (!selectedItem) return;
    const numberToClear = selectedNumber;
    const previousItems = [...items];

    setSelectedNumber(null);
    setAssigningNumber(numberToClear);

    try {
      const updatedItem = await onAssignItem(selectedItem.id, null);
      onItemsChange(
        items.map(i => (i.id === selectedItem.id ? updatedItem : i)),
      );
    } catch (error) {
      onItemsChange(previousItems);
      toast.error(error.message || `Failed to clear ${singularLower} assignment`);
    } finally {
      setAssigningNumber(null);
    }
  }, [selectedItem, selectedNumber, items, onAssignItem, onItemsChange, singularLower]);

  const handleChangeMode = useCallback(() => {
    setSheetMode('pick');
    setSearchQuery('');
  }, []);

  const handlePause = useCallback(async () => {
    if (!onPauseEvent) return;
    setIsPausing(true);
    try {
      await onPauseEvent();
    } catch (error) {
      toast.error(error.message || 'Failed to pause event');
    } finally {
      setIsPausing(false);
    }
  }, [onPauseEvent]);

  // --- Instructional text based on event state ---
  const baseDescription = `Match each numbered ${singularLower} to the real ${singularLower} that guests registered. Tap a number below to assign it.`;
  const instructionText = useMemo(() => {
    switch (event?.state) {
      case 'paused':
        return baseDescription;
      case 'started':
        return `${baseDescription} Assignment is only available when the event is paused.`;
      case 'created':
        return `${baseDescription} Assignment is only available when the event is paused.`;
      case 'completed':
        return `${baseDescription} Assignment is not available after the event is completed.`;
      default:
        return '';
    }
  }, [event?.state, baseDescription]);

  // --- Progress text ---
  const progressText = useMemo(() => {
    if (assignedCount === totalSlots && totalSlots > 0) {
      return 'All assigned ✓';
    }
    const remainingLabel = unassignedBottles.length === 1 ? singularLower : pluralLower;
    return `${assignedCount} of ${totalSlots} assigned. ${unassignedBottles.length} registered ${remainingLabel} remaining`;
  }, [assignedCount, totalSlots, unassignedBottles.length, singularLower, pluralLower]);

  const progressPercent = totalSlots > 0 ? (assignedCount / totalSlots) * 100 : 0;

  // --- Bottom sheet title ---
  const sheetTitle = useMemo(() => {
    if (selectedNumber == null) return '';
    if (sheetMode === 'review' && selectedItem) {
      return `#${selectedNumber} — ${selectedItem.name}`;
    }
    return `Assign #${selectedNumber}`;
  }, [selectedNumber, sheetMode, selectedItem]);

  if (isLoadingItems) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instructional text */}
      <p className="text-sm text-muted-foreground" data-testid="instruction-text">
        {instructionText}
      </p>

      {/* Pause CTA — only when event is started and onPauseEvent is provided */}
      {event?.state === 'started' && onPauseEvent && (
        <div className="flex justify-center">
          <Button
            onClick={handlePause}
            disabled={isPausing}
            className="w-full max-w-xs"
            data-testid="pause-cta"
          >
            {isPausing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Pausing…
              </>
            ) : (
              'Pause Event to Begin Assignment'
            )}
          </Button>
        </div>
      )}

      {/* Progress indicator */}
      {totalSlots > 0 && (
        <div className="space-y-1" data-testid="progress-indicator">
          <p className={cn(
            'text-center text-xs',
            assignedCount === totalSlots ? 'text-green-600 font-medium' : 'text-muted-foreground',
          )}>
            {progressText}
          </p>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                assignedCount === totalSlots ? 'bg-green-500' : 'bg-primary',
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Number button grid */}
      <div className={cn('flex justify-center', !isPaused && 'opacity-50')}>
        <div className="grid grid-cols-3 gap-6 justify-items-center" style={{ width: 'fit-content' }}>
          {availableIds.map(id => (
            <AssignmentButton
              key={id}
              itemId={id}
              isAssigned={assignedMap.has(id)}
              isDisabled={!isPaused}
              isLoading={assigningNumber === id}
              onClick={handleButtonTap}
            />
          ))}
        </div>
      </div>

      {/* Registered bottles verification list */}
      {items && items.length > 0 && (
        <div className="border rounded-lg" data-testid="registered-bottles-section">
          <button
            onClick={() => setBottleListExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 rounded-lg"
            data-testid="registered-bottles-toggle"
          >
            <span className="flex items-center gap-1.5">
              {bottleListExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Registered {plural}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {items.length}
            </Badge>
          </button>

          {bottleListExpanded && (
            <div className="border-t px-3 pb-2 space-y-1" data-testid="registered-bottles-list">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-1.5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-medium truncate block">{item.name}</span>
                    <span className="text-muted-foreground truncate block">
                      {getOwnerName(item.ownerEmail)}
                    </span>
                  </div>
                  {item.itemId != null ? (
                    <Badge variant="outline" className="text-[10px] ml-2 flex-shrink-0">
                      #{item.itemId}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] ml-2 flex-shrink-0 text-muted-foreground">
                      Unassigned
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom sheet */}
      <BottomSheetPicker
        isOpen={selectedNumber != null}
        onClose={handleCloseSheet}
        title={sheetTitle}
      >
        {sheetMode === 'review' && selectedItem ? (
          /* Review mode: show current assignment with Change / Clear */
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">
              Currently assigned to <span className="font-semibold text-foreground">#{selectedNumber}</span>
            </p>
            <ListCard handle={selectedNumber}>
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium truncate">{selectedItem.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {getOwnerName(selectedItem.ownerEmail)}
                </p>
              </div>
            </ListCard>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleChangeMode}
                data-testid="change-assignment-btn"
              >
                Change
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={handleClear}
                data-testid="clear-assignment-btn"
              >
                Clear
              </Button>
            </div>
          </div>
        ) : (
          /* Pick mode: show unassigned bottles */
          <div className="space-y-3">
            {/* Helper prompt */}
            <p className="text-xs text-muted-foreground text-center">
              Select a {singularLower} to assign to <span className="font-semibold text-foreground">#{selectedNumber}</span>
            </p>

            {/* Search input when 6+ unassigned bottles */}
            {unassignedBottles.length >= 6 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={`Search ${pluralLower}…`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  data-testid="bottle-search-input"
                />
              </div>
            )}

            {filteredBottles.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4" data-testid="empty-state">
                {unassignedBottles.length === 0
                  ? `All registered ${pluralLower} have been assigned`
                  : `No ${pluralLower} match your search`}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
                {filteredBottles.map(bottle => (
                  <ListCard
                    key={bottle.id}
                    as="button"
                    onClick={() => handleAssign(bottle)}
                    className="w-full group hover:bg-muted/60 active:bg-muted transition-colors cursor-pointer"
                    data-testid={`bottle-option-${bottle.id}`}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate text-left">{bottle.name}</p>
                        <p className="text-xs text-muted-foreground truncate text-left">
                          {getOwnerName(bottle.ownerEmail)}
                        </p>
                      </div>
                      <ChevronsRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 transition-colors" />
                    </div>
                  </ListCard>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheetPicker>
    </div>
  );
}
