import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ListCard from '@/components/ListCard';
import ItemForm from '@/components/ItemForm';
import { useItemTerminology } from '@/utils/itemTerminology';
import itemService from '@/services/itemService';
import apiClient from '@/services/apiClient';
import LoadingSpinner from '@/components/LoadingSpinner';

function formatRelativeTime(dateString) {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

/**
 * MyBottlesSheet — bottom sheet for viewing / managing the current user's
 * registered items (bottles) and display name.
 *
 * Follows the same sheet pattern as GuestWelcomeBottomSheet and RatingDrawer:
 * themed header, body scroll lock, back-button support, no grab handle.
 */
export default function MyBottlesSheet({ isOpen, onClose, event, eventId }) {
  const terminology = useItemTerminology(event);
  const { singular, singularLower, plural, pluralLower } = terminology;

  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const previousOverflowRef = useRef('');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const lastSavedNameRef = useRef('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const pendingDeleteRef = useRef(null);

  const canEdit = event?.state === 'created' || event?.state === 'started';
  const isCompleted = event?.state === 'completed';
  const isPaused = event?.state === 'paused';

  // --- Animation & body scroll lock (matches GuestWelcomeBottomSheet) ---
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      setIsAnimating(false);
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    }

    setIsAnimating(false);
    document.body.style.overflow = previousOverflowRef.current;
    const unmountTimer = setTimeout(() => setIsMounted(false), 350);
    return () => clearTimeout(unmountTimer);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflowRef.current || '';
    };
  }, []);

  // --- Back button support ---
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ myBottlesSheet: true }, '');

    const handlePopState = (e) => {
      if (e.state?.myBottlesSheet === undefined) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  // --- Fetch data when sheet opens ---
  useEffect(() => {
    if (!isOpen || !eventId) return;

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userItems, profile] = await Promise.all([
          itemService.getItems(eventId, true),
          apiClient.getUserProfile(eventId),
        ]);
        if (cancelled) return;
        setItems(userItems || []);
        const profileName = profile?.name || '';
        setName(profileName);
        lastSavedNameRef.current = profileName;
      } catch (err) {
        if (!cancelled) setError(err.message || `Failed to load ${pluralLower}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();

    return () => { cancelled = true; };
  }, [isOpen, eventId, pluralLower]);

  // Reset transient UI state when the sheet closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddForm(false);
      setEditingItemId(null);
    }
  }, [isOpen]);

  // --- Name auto-save on blur ---
  const handleNameBlur = useCallback(async () => {
    const trimmed = name.trim();
    if (trimmed === lastSavedNameRef.current) return;
    try {
      await apiClient.updateUserProfile(eventId, trimmed);
      lastSavedNameRef.current = trimmed;
      toast.success('Name updated');
    } catch {
      setName(lastSavedNameRef.current);
      toast.error('Failed to update name');
    }
  }, [name, eventId]);

  const handleAdd = useCallback(async (data) => {
    setFormLoading(true);
    try {
      const newItem = await itemService.registerItem(eventId, data);
      setItems((prev) => [...prev, newItem]);
      setShowAddForm(false);
      toast.success(`${singular} registered`);
    } catch (err) {
      toast.error(err.message || `Failed to register ${singularLower}`);
    } finally {
      setFormLoading(false);
    }
  }, [eventId, singular, singularLower]);

  const handleEdit = useCallback(async (data) => {
    setFormLoading(true);
    try {
      const updated = await itemService.updateItem(eventId, editingItemId, data);
      setItems((prev) => prev.map((i) => (i.id === editingItemId ? updated : i)));
      setEditingItemId(null);
      toast.success(`${singular} updated`);
    } catch (err) {
      toast.error(err.message || `Failed to update ${singularLower}`);
    } finally {
      setFormLoading(false);
    }
  }, [eventId, editingItemId, singular, singularLower]);

  const handleDelete = useCallback((itemToDelete) => {
    setItems((prev) => prev.filter((i) => i.id !== itemToDelete.id));
    if (editingItemId === itemToDelete.id) setEditingItemId(null);

    const timeoutId = setTimeout(async () => {
      pendingDeleteRef.current = null;
      try {
        await itemService.deleteItem(eventId, itemToDelete.id);
      } catch {
        setItems((prev) => [...prev, itemToDelete]);
        toast.error(`Failed to delete ${singularLower}`);
      }
    }, 5500);

    pendingDeleteRef.current = { itemId: itemToDelete.id, timeoutId };

    toast(`${singular} deleted`, {
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timeoutId);
          pendingDeleteRef.current = null;
          setItems((prev) => [...prev, itemToDelete]);
        },
      },
      duration: 5000,
    });
  }, [eventId, editingItemId, singular, singularLower]);

  const sheetTitle = `My ${plural}`;

  if (!isMounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
        data-testid="my-bottles-backdrop"
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-h-[calc(100dvh-60px)] bg-background shadow-xl z-50 rounded-t-lg transform transition-transform duration-300 ease-out ${
          isOpen && isAnimating ? 'translate-y-0' : 'translate-y-full'
        } ${!isOpen ? 'pointer-events-none' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={sheetTitle}
        aria-hidden={!isOpen}
        data-testid="my-bottles-sheet"
      >
        <div className="flex flex-col h-full max-h-[calc(100dvh-60px)]">
          {/* Header — themed to match RatingDrawer */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0 rounded-t-lg"
            style={{ backgroundColor: 'var(--event-header-bg)' }}
          >
            <h2 className="text-base font-semibold">{sheetTitle}</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8" data-testid="my-bottles-loading">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive text-center py-4">{error}</p>
            ) : (
              <div className="space-y-4" data-testid="my-bottles-content">
                {/* Name field */}
                <div>
                  <Label htmlFor="display-name">Your Name</Label>
                  <Input
                    id="display-name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleNameBlur}
                    disabled={!canEdit}
                    readOnly={!canEdit}
                    className="mt-1"
                    data-testid="my-bottles-name-input"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Shown alongside your ratings. Saves automatically.
                  </p>
                </div>

                <hr className="border-border" />

                {/* Section header + description */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Registered {plural}
                  </p>
                  {canEdit && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Register what you brought so the host can match it to a tasting number. Price and description are optional.
                    </p>
                  )}
                </div>

                {/* State-based messages */}
                {isPaused && (
                  <p className="text-sm text-muted-foreground bg-muted/60 rounded-md px-3 py-2">
                    Registration is closed while the event is paused.
                  </p>
                )}
                {isCompleted && (
                  <p className="text-sm text-muted-foreground bg-muted/60 rounded-md px-3 py-2">
                    The event has ended. {items.length > 0 ? `Your ${pluralLower} are shown below.` : ''}
                  </p>
                )}

                {/* Add button (only when items exist; empty state has its own CTA) */}
                {canEdit && !showAddForm && !editingItemId && items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(true)}
                    className="w-full"
                    data-testid="my-bottles-add-btn"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add {singular}
                  </Button>
                )}

                {/* Add form */}
                {showAddForm && canEdit && (
                  <div className="border rounded-md p-3" data-testid="my-bottles-add-form">
                    <ItemForm
                      onSubmit={handleAdd}
                      onCancel={() => setShowAddForm(false)}
                      isLoading={formLoading}
                      terminology={terminology}
                    />
                  </div>
                )}

                {/* Items list */}
                {items.length === 0 && canEdit && !showAddForm ? (
                  <div className="text-center py-4 space-y-3" data-testid="my-bottles-empty">
                    <p className="text-sm text-muted-foreground">
                      You haven&apos;t registered any {pluralLower} yet.
                      <br />
                      <span className="text-xs">Tap below to add what you brought.</span>
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add {singular}
                    </Button>
                  </div>
                ) : items.length === 0 && !canEdit && !showAddForm ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No {pluralLower} registered.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id}>
                        {editingItemId === item.id ? (
                          <div className="border rounded-md p-3" data-testid={`edit-form-${item.id}`}>
                            <ItemForm
                              initialValues={{
                                name: item.name,
                                price: item.price != null ? String(item.price) : '',
                                description: item.description || '',
                              }}
                              onSubmit={handleEdit}
                              onCancel={() => setEditingItemId(null)}
                              isEditing
                              isLoading={formLoading}
                              terminology={terminology}
                            />
                          </div>
                        ) : (
                          <ListCard
                            handle={isCompleted && item.itemId != null ? `#${item.itemId}` : undefined}
                            data-testid={`bottle-card-${item.id}`}
                          >
                            <div className="flex items-start justify-between p-2 gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                {item.price != null && (
                                  <p className="text-xs text-muted-foreground">
                                    Price: {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
                                  </p>
                                )}
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {formatRelativeTime(item.registeredAt || item.createdAt)}
                                </p>
                              </div>
                              {canEdit && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      setEditingItemId(item.id);
                                      setShowAddForm(false);
                                    }}
                                    aria-label={`Edit ${singularLower}`}
                                    data-testid={`edit-btn-${item.id}`}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(item)}
                                    aria-label={`Delete ${singularLower}`}
                                    data-testid={`delete-btn-${item.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </ListCard>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
