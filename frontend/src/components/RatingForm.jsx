import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronDown } from 'lucide-react';
import { ratingService } from '@/services/ratingService';
import { useParams } from 'react-router-dom';
import apiClient from '@/services/apiClient';

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
 */
function RatingForm({ itemId, eventId, existingRating, ratingConfig, onClose }) {
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

  // Reset form state when itemId or existingRating changes
  useEffect(() => {
    setSelectedRating(existingRating?.rating || null);
    setNote(existingRating?.note || '');
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
    setRetryCount(0);
    setIsDropdownOpen(false);
  }, [itemId, existingRating]);

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

    // Validate rating is selected
    if (!selectedRating) {
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
        await ratingService.submitRating(
          effectiveEventId,
          itemId,
          selectedRating,
          note
        );

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

      {/* Note Field */}
      <div>
        <Label htmlFor="note" className="text-base font-semibold mb-2 block">
          Note (Optional)
        </Label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={4}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Add a note about this item..."
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-muted-foreground">
            {note.length > 450 && (
              <span className={note.length > 500 ? 'text-destructive' : 'text-yellow-600'}>
                {500 - note.length} characters remaining
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {note.length}/500
          </span>
        </div>
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

      {/* Submit Button */}
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
          disabled={!selectedRating || isSubmitting || note.length > 500}
          className="flex-1"
        >
          {isSubmitting 
            ? (retryCount > 0 ? `Retrying... (${retryCount}/${MAX_RETRIES})` : 'Submitting...')
            : existingRating 
            ? 'Update Rating' 
            : 'Submit Rating'}
        </Button>
      </div>
    </form>
  );
}

export default RatingForm;
