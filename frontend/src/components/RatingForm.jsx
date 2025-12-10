import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import { ratingService } from '@/services/ratingService';
import { useParams } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { useQuotes } from '@/hooks/useQuotes';

/**
 * RatingForm Component
 * Form for submitting ratings with optional notes
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
  

  const [selectedRating, setSelectedRating] = useState(existingRating?.rating || null);
  const [note, setNote] = useState(existingRating?.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const MAX_RETRIES = 3; // Maximum number of retry attempts

  // Quotes hook for note suggestions
  const { getSuggestionsForRating } = useQuotes();
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Reset form state when itemId or existingRating changes
  useEffect(() => {
    setSelectedRating(existingRating?.rating || null);
    setNote(existingRating?.note || '');
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
    setRetryCount(0);
    setIsDropdownOpen(false);
    setSuggestions([]); // Clear suggestions when item changes
  }, [itemId, existingRating]);

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
          const newSuggestions = await getSuggestionsForRating(selectedRating);
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
  }, [selectedRating, eventType, noteSuggestionsEnabled, getSuggestionsForRating]);

  /**
   * Append suggestion to note with spacing logic
   * Adds a space only if existing text doesn't end with whitespace
   * @param {string} currentNote - Current note text
   * @param {string} suggestionText - Suggestion text to append
   * @returns {string} Updated note text
   */
  const appendSuggestion = (currentNote, suggestionText) => {
    if (!suggestionText) return currentNote;
    
    const trimmedNote = currentNote.trimEnd();
    const needsSpace = trimmedNote.length > 0 && !/\s$/.test(trimmedNote);
    const space = needsSpace ? ' ' : '';
    
    return trimmedNote + space + suggestionText;
  };

  /**
   * Append suggestion to note with character limit handling
   * If suggestion would exceed 500 character limit, adds partial text to stay within limit
   * @param {string} currentNote - Current note text
   * @param {string} suggestionText - Suggestion text to append
   * @returns {string} Updated note text (within 500 character limit)
   */
  const appendSuggestionWithLimit = (currentNote, suggestionText) => {
    if (!suggestionText) return currentNote;
    
    const MAX_LENGTH = 500;
    const noteWithSuggestion = appendSuggestion(currentNote, suggestionText);
    
    // If within limit, return full text
    if (noteWithSuggestion.length <= MAX_LENGTH) {
      return noteWithSuggestion;
    }
    
    // Otherwise, add as much of the suggestion as possible
    const trimmedNote = currentNote.trimEnd();
    const needsSpace = trimmedNote.length > 0 && !/\s$/.test(trimmedNote);
    const space = needsSpace ? ' ' : '';
    const availableSpace = MAX_LENGTH - (trimmedNote.length + space.length);
    
    if (availableSpace > 0) {
      const partialSuggestion = suggestionText.substring(0, availableSpace);
      return trimmedNote + space + partialSuggestion;
    }
    
    // If no space available, return current note unchanged
    return currentNote;
  };

  /**
   * Handle suggestion button click
   * Adds suggestion text to note field
   * @param {string} suggestionText - Text of the clicked suggestion
   */
  const handleSuggestionClick = (suggestionText) => {
    const updatedNote = appendSuggestionWithLimit(note, suggestionText);
    setNote(updatedNote);
  };

  /**
   * Handle clear button click
   * Clears both the selected rating and note
   */
  const handleClear = () => {
    setSelectedRating(null);
    setNote('');
    setError(null);
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

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

    // Retry logic (T083)
    const MAX_RETRIES = 3; // Maximum number of retry attempts
    const RETRY_DELAY = 1000; // 1 second

    const attemptSubmit = async (attemptNumber = 0) => {
      try {
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

        setSuccess(true);
        setRetryCount(0);
        
        // Close drawer after short delay to show success
        setTimeout(() => {
          onClose();
          // Trigger custom event to refresh ratings (EventPage will listen)
          window.dispatchEvent(new CustomEvent('ratingSubmitted', { 
            detail: { eventId: effectiveEventId, itemId } 
          }));
        }, 1000);
      } catch (err) {
        // Check if error is retryable (network errors, 5xx errors)
        const isRetryable = 
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('network') ||
          err.message?.includes('timeout') ||
          (err.status >= 500 && err.status < 600);

        if (isRetryable && attemptNumber < MAX_RETRIES) {
          // Retry after delay
          setRetryCount(attemptNumber + 1);
          setTimeout(() => {
            attemptSubmit(attemptNumber + 1);
          }, RETRY_DELAY * (attemptNumber + 1)); // Exponential backoff
        } else {
          // Max retries reached or non-retryable error
          setError(
            err.message || 
            (attemptNumber >= MAX_RETRIES 
              ? 'Failed to submit rating after multiple attempts. Please try again later.'
              : 'Failed to submit rating. Please try again.')
          );
          setIsSubmitting(false);
          setRetryCount(0);
        }
      }
    };

    attemptSubmit();
  };

  if (!ratingConfig) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading rating options...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rating Options */}
      <div>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ring transition-colors flex items-center justify-between"
            style={
              selectedRating
                ? {
                    backgroundColor: ratingConfig.ratings.find(r => r.value === selectedRating)?.color || '',
                    color: 'white',
                    borderColor: ratingConfig.ratings.find(r => r.value === selectedRating)?.color || ''
                  }
                : {
                    backgroundColor: 'var(--background)',
                    color: 'var(--foreground)',
                    borderColor: 'var(--input)'
                  }
            }
          >
            <div className="flex items-center gap-2">
              {selectedRating ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      backgroundColor: ratingConfig.ratings.find(r => r.value === selectedRating)?.color || ''
                    }}
                  />
                  <span>
                    {selectedRating} - {ratingConfig.ratings.find(r => r.value === selectedRating)?.label || ''}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">-- Select a rating --</span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-auto">
              {/* No rating option */}
              <button
                type="button"
                onClick={() => {
                  setSelectedRating(null);
                  setIsDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 transition-colors"
                style={{
                  backgroundColor: selectedRating === null ? 'var(--muted)' : undefined,
                  color: selectedRating === null ? 'var(--muted-foreground)' : undefined
                }}
              >
                <div className="w-5 h-5 rounded-full flex-shrink-0 border-2 border-muted-foreground" />
                <span className="text-muted-foreground">No rating</span>
              </button>
              {ratingConfig.ratings.map((ratingOption) => (
                <button
                  key={ratingOption.value}
                  type="button"
                  onClick={() => {
                    setSelectedRating(ratingOption.value);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-2 transition-colors"
                  style={{
                    backgroundColor: selectedRating === ratingOption.value ? ratingOption.color : undefined,
                    color: selectedRating === ratingOption.value ? 'white' : undefined
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ratingOption.color }}
                  />
                  <span>
                    {ratingOption.value} - {ratingOption.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Note Suggestions - Only for wine events with suggestions enabled */}
      {eventType === 'wine' && noteSuggestionsEnabled !== false && selectedRating !== null && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Note Suggestions</Label>
          {loadingSuggestions ? (
            <div className="text-xs text-muted-foreground py-2">Loading suggestions...</div>
          ) : suggestions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion.text)}
                  onKeyDown={(e) => {
                    // Keyboard navigation support
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSuggestionClick(suggestion.text);
                    }
                  }}
                  className="text-xs text-left justify-start h-auto py-2 px-3 break-words whitespace-normal"
                  aria-label={`Add suggestion: ${suggestion.text.substring(0, 50)}${suggestion.text.length > 50 ? '...' : ''}`}
                  tabIndex={0}
                >
                  {suggestion.text}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Note Field */}
      <div>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="(Optional) Add a note about this item..."
        />
        {note.length > 500 && (
          <p className="text-sm text-destructive mt-1">
            Note exceeds 500 character limit
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
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
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={isSubmitting || (!selectedRating && !note && !existingRating)}
          className="flex-1"
        >
          Clear
        </Button>
        <Button
          type="submit"
          disabled={(!selectedRating && !existingRating) || isSubmitting || note.length > 500}
          className="flex-1"
        >
          {isSubmitting 
            ? (retryCount > 0 ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Submitting...')
            : existingRating && !selectedRating
            ? 'Remove Rating'
            : existingRating 
            ? 'Update Rating' 
            : 'Submit Rating'}
        </Button>
      </div>
    </form>
  );
}

export default RatingForm;
