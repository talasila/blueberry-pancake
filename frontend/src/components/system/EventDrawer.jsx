import { useState, useEffect } from 'react';
import SideDrawer from '@/components/SideDrawer.jsx';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Users, 
  Star, 
  Package, 
  User, 
  Hash,
  Settings,
  Trash2,
  AlertTriangle,
  Activity
} from 'lucide-react';
import systemApi from '@/services/systemApi.js';

/**
 * State badge colors
 */
const STATE_COLORS = {
  created: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  started: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * EventDrawer Component
 * 
 * Displays detailed event information in a slide-out drawer.
 * Includes delete functionality with confirmation.
 */
export default function EventDrawer({ 
  event, 
  isOpen, 
  onClose, 
  onDelete,
  onRefresh 
}) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch full event details when event changes
  useEffect(() => {
    if (!event?.eventId || !isOpen) {
      setDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await systemApi.getEventDetails(event.eventId);
        setDetails(data);
      } catch (err) {
        setError(err.message || 'Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [event?.eventId, isOpen]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle delete
  const handleDelete = async () => {
    if (!details?.eventId) return;
    
    setIsDeleting(true);
    try {
      await systemApi.deleteEvent(details.eventId);
      setShowDeleteConfirm(false);
      onDelete?.(details.eventId);
      onClose();
      onRefresh?.();
    } catch (err) {
      setError(err.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  // Detail row component
  const DetailRow = ({ icon: Icon, label, value, className }) => (
    <div className={cn("flex items-start gap-3 py-2", className)}>
      <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium break-words">{value}</p>
      </div>
    </div>
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Event Details"
      width="w-full max-w-lg"
    >
      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-accent"
          >
            Close
          </button>
        </div>
      )}

      {/* Content */}
      {details && !isLoading && !error && (
        <div className="space-y-6">
          {/* Header with name and state */}
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h3 className="text-xl font-semibold">{details.name}</h3>
              <Badge 
                variant="outline" 
                className={cn("text-sm", STATE_COLORS[details.state])}
              >
                {details.state}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{details.eventId}</p>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{details.itemCount || 0}</p>
                <p className="text-xs text-muted-foreground">Items</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{details.participantCount || 0}</p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Star className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{details.ratingCount || 0}</p>
                <p className="text-xs text-muted-foreground">Ratings</p>
              </CardContent>
            </Card>
          </div>

          {/* Details list */}
          <div className="space-y-1 divide-y">
            <DetailRow 
              icon={Hash} 
              label="Event ID" 
              value={details.eventId} 
            />
            <DetailRow 
              icon={User} 
              label="Owner" 
              value={details.ownerEmail} 
            />
            <DetailRow 
              icon={Activity} 
              label="State" 
              value={details.state || 'created'} 
            />
            <DetailRow 
              icon={Settings} 
              label="Type of Item" 
              value={details.typeOfItem || 'wine'} 
            />
            <DetailRow 
              icon={Star} 
              label="Max Rating" 
              value={details.maxRating || 4} 
            />
            <DetailRow 
              icon={Calendar} 
              label="Created" 
              value={formatDate(details.createdAt)} 
            />
            {details.admins && details.admins.length > 0 && (
              <DetailRow 
                icon={User} 
                label="Administrators" 
                value={details.admins.join(', ')} 
              />
            )}
          </div>

          {/* Registered items list (items brought by participants) */}
          {details.registeredItems && details.registeredItems.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Registered Items ({details.registeredItems.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {details.registeredItems.map((item, idx) => (
                  <div key={item.itemId || idx} className="text-sm p-2 bg-muted/50 rounded">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">{item.ownerEmail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete section */}
          <div className="pt-4 border-t">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 text-destructive border border-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Event
              </button>
            ) : (
              <div className="space-y-3">
                {details.state === 'started' && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">
                      This event is currently active. Deleting it will affect participants who are currently using it.
                    </p>
                  </div>
                )}
                <p className="text-sm text-center">
                  Are you sure you want to delete <strong>{details.name}</strong>?
                  <br />
                  <span className="text-muted-foreground">This action cannot be undone.</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 border rounded-md hover:bg-accent disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </SideDrawer>
  );
}
