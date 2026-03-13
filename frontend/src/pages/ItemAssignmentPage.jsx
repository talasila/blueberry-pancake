import { useParams, useNavigate } from 'react-router-dom';
import { useEventContext } from '@/contexts/EventContext';
import useEventPolling from '@/hooks/useEventPolling';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';
import AssignmentView from '@/components/AssignmentView';
import itemService from '@/services/itemService';
import { useItemTerminology } from '@/utils/itemTerminology';
import apiClient from '@/services/apiClient';
import { toast } from 'sonner';

function ItemAssignmentPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event: contextEvent } = useEventContext();
  const { event: polledEvent } = useEventPolling(eventId);
  const [event, setEvent] = useState(contextEvent);
  const itemTerminology = useItemTerminology(event);
  const [items, setItems] = useState([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      navigate('/auth', {
        state: { from: { pathname: `/event/${eventId}/admin/items/assign` } },
        replace: true,
      });
    }
  }, [eventId, navigate]);

  useEffect(() => {
    if (polledEvent) {
      setEvent(polledEvent);
    } else if (contextEvent) {
      setEvent(contextEvent);
    }
  }, [contextEvent, polledEvent]);

  useEffect(() => {
    const fetchItems = async () => {
      if (!eventId) return;
      setIsLoadingItems(true);
      try {
        const allItems = await itemService.getItems(eventId);
        setItems(allItems || []);
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    if (eventId) fetchItems();
  }, [eventId]);

  const handleAssignItemId = async (itemId, itemIdToAssign) => {
    if (!eventId) return;
    const updatedItem = await itemService.assignItemId(eventId, itemId, itemIdToAssign);
    if (itemIdToAssign === null) {
      toast.success(`${itemTerminology.singular} ID assignment cleared`);
    } else {
      toast.success(`${itemTerminology.singular} ID ${itemIdToAssign} assigned successfully`);
    }
    return updatedItem;
  };

  const handlePauseEvent = async () => {
    const updatedEvent = await apiClient.transitionEventState(eventId, 'paused', event.state);
    setEvent(updatedEvent);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/event/${eventId}/admin`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold">{itemTerminology.singular} Assignment</h1>
      </header>
      <main className="p-4">
        {!event ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <AssignmentView
            eventId={eventId}
            event={event}
            items={items}
            isLoadingItems={isLoadingItems}
            onAssignItem={handleAssignItemId}
            onPauseEvent={handlePauseEvent}
            onItemsChange={setItems}
          />
        )}
      </main>
    </div>
  );
}

export default ItemAssignmentPage;
