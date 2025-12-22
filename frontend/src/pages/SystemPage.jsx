import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient.js';
import systemApi from '../services/systemApi.js';
import EventList from '../components/system/EventList.jsx';
import EventDrawer from '../components/system/EventDrawer.jsx';
import SystemStats from '../components/system/SystemStats.jsx';

/**
 * SystemPage - Root Admin Dashboard
 * 
 * Protected page accessible only to authenticated root administrators.
 * Displays list of all events, statistics, and admin controls.
 */
export default function SystemPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [listKey, setListKey] = useState(0); // Key to force EventList refresh

  // Check authorization on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if user is authenticated
        const token = apiClient.getJWTToken();
        if (!token) {
          navigate('/auth', { replace: true });
          return;
        }

        // Check if user is root admin
        const isRoot = await systemApi.isRootAdmin();
        if (!isRoot) {
          setIsAuthorized(false);
          setError('Root access required. You do not have permission to view this page.');
          setIsLoading(false);
          return;
        }

        setIsAuthorized(true);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to verify authorization');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  // Handle event selection (for drawer)
  const handleEventSelect = useCallback((event) => {
    setSelectedEvent(event);
    setIsDrawerOpen(true);
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setIsDrawerOpen(false);
    // Clear selection after animation completes
    setTimeout(() => setSelectedEvent(null), 300);
  }, []);

  // Handle event deletion - refresh the list
  const handleEventDelete = useCallback(() => {
    // Force EventList to refresh by changing key
    setListKey(prev => prev + 1);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking authorization...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-destructive text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">{error || 'You do not have permission to access this page.'}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authorized - show dashboard
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h4 className="text-xl font-bold mb-2">System Administration</h4>
        <p className="text-muted-foreground">Manage all events and view platform statistics</p>
      </div>

      {/* System statistics */}
      <SystemStats />

      {/* Event list */}
      <div>
        <h2 className="text-xl font-semibold mb-4">All Events</h2>
        <EventList 
          key={listKey}
          onEventSelect={handleEventSelect}
          filters={filters}
        />
      </div>

      {/* Event details drawer */}
      <EventDrawer
        event={selectedEvent}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onDelete={handleEventDelete}
        onRefresh={handleEventDelete}
      />
    </div>
  );
}
