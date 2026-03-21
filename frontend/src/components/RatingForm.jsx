import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Plus } from 'lucide-react';
import { ratingService } from '@/services/ratingService';
import { useParams } from 'react-router-dom';
import quoteService from '@/services/quoteService';
import { useEventContext } from '@/contexts/EventContext';
import { useItemTerminology } from '@/utils/itemTerminology';
import { retryWithBackoff } from '@/utils/retryWithBackoff';
import { appendWithCharLimit } from '@/utils/appendWithCharLimit';

/**
 * RatingForm Component
 * Rating selection with colored handle rows, optional tappable quote suggestions
 * (wine events), and a note textarea in a unified composition area.
 *
 * @param {object} props
 * @param {number} props.itemId - Item identifier
 * @param {string} props.eventId - Event identifier
 * @param {object} props.existingRating - Existing rating (if any)
 * @param {object} props.ratingConfig - Rating configuration { maxRating, ratings: [{value, label, color}] }
 * @param {function} props.onClose - Close handler (called after successful submission)
 * @param {string} props.eventType - Type of event (e.g., "wine")
 * @param {boolean} props.noteSuggestionsEnabled - Whether note suggestions are enabled for this event
 */
function RatingForm({ itemId, eventId, existingRating, ratingConfig, onClose, eventType, noteSuggestionsEnabled }) {
  const { eventId: eventIdFromParams } = useParams();
  const effectiveEventId = eventId || eventIdFromParams;
  const { event } = useEventContext();
  const { singularLower } = useItemTerminology(event);

  const [selectedRating, setSelectedRating] = useState(existingRating?.rating || null);
  const [note, setNote] = useState(existingRating?.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const timeoutRefs = useRef([]);
  const MAX_RETRIES = 3;

  // Quote service for note suggestions
  const getSuggestionsForRating = useCallback(async (ratingLevel, maxRating = 4) => {
    return quoteService.getSuggestionsForRating(ratingLevel, maxRating);
  }, []);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [usedSuggestionIndices, setUsedSuggestionIndices] = useState(new Set());

  // Clear pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);

  // Reset form state when itemId or existingRating changes
  useEffect(() => {
    setSelectedRating(existingRating?.rating || null);
    setNote(existingRating?.note || '');
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
    setRetryCount(0);
    setSuggestions([]);
    setUsedSuggestionIndices(new Set());
  }, [itemId, existingRating]);

  // Extract maxRating as primitive to avoid object reference issues in dependency array
  const maxRating = ratingConfig?.maxRating || 4;

  // Update suggestions when rating level changes
  useEffect(() => {
    const loadSuggestions = async () => {
      // Check if suggestions should be displayed
      const shouldShowSuggestions = 
        eventType === 'wine' && 
        noteSuggestionsEnabled !== false && 
        selectedRating !== null;

      if (shouldShowSuggestions) {
        try {
          setLoadingSuggestions(true);
          setUsedSuggestionIndices(new Set());
          const newSuggestions = await getSuggestionsForRating(selectedRating, maxRating);
          setSuggestions(newSuggestions || []);
        } catch (error) {
          console.error('Failed to load suggestions:', error);
          setSuggestions([]); // Graceful degradation
        } finally {
          setLoadingSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setLoadingSuggestions(false);
      }
    };

    loadSuggestions();
  }, [selectedRating, eventType, noteSuggestionsEnabled, getSuggestionsForRating, maxRating]);

  const handleSuggestionClick = (suggestionText, index) => {
    if (usedSuggestionIndices.has(index)) return;
    const updatedNote = appendWithCharLimit(note, suggestionText, 500);
    setNote(updatedNote);
    setUsedSuggestionIndices(prev => new Set(prev).add(index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate rating is selected (unless removing an existing rating)
    if (!selectedRating && !existingRating) {
      setError('Please select a rating');
      return;
    }

    // Validate note length
    if (note.length > 500) {
      setError('Note must not exceed 500 characters');
      return;
    }

    // Validate event ID
    if (!effectiveEventId || effectiveEventId === 'undefined' || effectiveEventId === 'null') {
      setError('Event ID is missing. Please refresh the page and try again.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await retryWithBackoff(
        async () => {
          // If there's an existing rating but no selected rating, delete it
          if (existingRating && !selectedRating) {
            await ratingService.deleteRating(effectiveEventId, itemId);
          } else {
            await ratingService.submitRating(
              effectiveEventId,
              itemId,
              selectedRating,
              note
            );
          }
        },
        { maxRetries: MAX_RETRIES, baseDelay: 1000 }
      );

      setSuccess(true);
      setRetryCount(0);

      const successTimeout = setTimeout(() => {
        onClose();
        window.dispatchEvent(new CustomEvent('ratingSubmitted', {
          detail: { eventId: effectiveEventId, itemId }
        }));
      }, 1000);
      timeoutRefs.current.push(successTimeout);
    } catch (err) {
      setError(
        err.message || 'Failed to submit rating. Please try again.'
      );
      setIsSubmitting(false);
      setRetryCount(0);
    }
  };

  if (!ratingConfig) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading rating options...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Rating Options - list with colored left handle */}
      <div
        role="radiogroup"
        aria-label="Rating"
        className="flex flex-col gap-1"
      >
        {ratingConfig.ratings.map((option) => {
          const isSelected = selectedRating === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedRating(isSelected ? null : option.value)}
              className="w-full rounded-lg flex items-stretch text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-[0.98] overflow-hidden bg-muted/50"
              style={
                isSelected
                  ? { backgroundColor: option.color, color: 'white', boxShadow: `0 0 0 2px color-mix(in srgb, ${option.color} 40%, transparent)` }
                  : {}
              }
            >
              <span
                className={`w-8 flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${isSelected ? '' : 'bg-muted-foreground/20'}`}
                style={isSelected ? { backgroundColor: 'rgba(255,255,255,0.15)' } : {}}
              >
                <span
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-150"
                  style={
                    isSelected
                      ? { backgroundColor: option.color, borderColor: 'white', color: 'white' }
                      : { backgroundColor: 'white', borderColor: option.color }
                  }
                >
                  {option.value}
                </span>
              </span>
              <span className="flex items-center px-3 py-2">
                <span className="font-medium text-sm">
                  {option.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Section label for suggestions */}
      {eventType === 'wine' && noteSuggestionsEnabled !== false && selectedRating !== null && (
        <span className="text-xs font-medium text-muted-foreground mb-1 block">Tap a suggestion or write your own</span>
      )}

      {/* Note composition area - quote suggestions + textarea as one unit */}
      <div className="rounded-lg border border-input overflow-hidden">
        {/* Tappable quote suggestions - shown for wine events */}
        {eventType === 'wine' && noteSuggestionsEnabled !== false && selectedRating !== null && (
          <div className="border-b border-input/50 bg-muted/30 transition-all duration-200">
            <div className="min-h-[80px]">
              {loadingSuggestions ? (
                <div className="text-xs text-muted-foreground px-3 py-2">Loading...</div>
              ) : suggestions.length > 0 ? (
                <div key={selectedRating} className="flex flex-col divide-y divide-input/30 animate-fade-in">
                  {suggestions.map((suggestion, index) => {
                    const isUsed = usedSuggestionIndices.has(index);
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion.text, index)}
                        disabled={isUsed}
                        className={`flex items-start gap-2 text-left px-3 py-2 transition-all duration-200 ${
                          isUsed
                            ? 'opacity-40'
                            : 'active:bg-accent/70'
                        }`}
                        aria-label={isUsed
                          ? `Already added: ${suggestion.text.substring(0, 50)}`
                          : `Add to note: ${suggestion.text.substring(0, 50)}${suggestion.text.length > 50 ? '...' : ''}`
                        }
                      >
                        {isUsed
                          ? <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          : <Plus className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        }
                        <span className={`text-xs italic leading-relaxed ${isUsed ? 'line-through text-muted-foreground' : ''}`}>
                          {suggestion.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          id="note"
          aria-label={`Optional note about this ${singularLower}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full px-3 py-2 border-0 bg-transparent focus:outline-none resize-none"
          placeholder={
            eventType === 'wine' && noteSuggestionsEnabled !== false && selectedRating !== null
              ? `Or write your own note...`
              : `Add a note about this ${singularLower} (optional)`
          }
        />

        {/* Character count */}
        <div className="px-3 pb-1.5">
          <p className={`text-xs text-right ${note.length > 450 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {note.length}/500
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <p className="text-sm text-green-600 dark:text-green-400">
            Rating submitted successfully!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={(!selectedRating && !existingRating) || isSubmitting || note.length > 500}
          className="flex-1"
        >
          {isSubmitting 
            ? (retryCount > 0 ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Submitting...')
            : existingRating && !selectedRating
            ? 'Remove'
            : existingRating 
            ? 'Update' 
            : 'Submit'}
        </Button>
      </div>
    </form>
  );
}

export default RatingForm;
