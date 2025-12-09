import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CreateEventPage from './pages/CreateEventPage.jsx';
import EventPage from './pages/EventPage.jsx';
import EventAdminPage from './pages/EventAdminPage.jsx';
import PINEntryPage from './pages/PINEntryPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import { EventContextProvider } from './contexts/EventContext.jsx';
import { PINProvider } from './contexts/PINContext.jsx';
import { useParams } from 'react-router-dom';
import useEvent from './hooks/useEvent.js';
import useEventPolling from './hooks/useEventPolling.js';
import { useEffect, useState } from 'react';
import apiClient from './services/apiClient.js';

/**
 * EventRouteWrapper Component
 * 
 * Wraps event routes to provide EventContext with event data and polling updates
 */
function EventRouteWrapper({ children }) {
  const { eventId } = useParams();
  const { event: initialEvent } = useEvent();
  const { event: polledEvent } = useEventPolling(eventId);
  const [currentEvent, setCurrentEvent] = useState(initialEvent);
  
  // Update current event when initial load or polling updates
  useEffect(() => {
    if (polledEvent) {
      setCurrentEvent(polledEvent);
    } else if (initialEvent) {
      setCurrentEvent(initialEvent);
    }
  }, [initialEvent, polledEvent]);
  
  // Extract user email from JWT token for admin check
  const getUserId = () => {
    try {
      const token = apiClient.getJWTToken();
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          return payload.email?.toLowerCase() || null;
        }
      }
    } catch (error) {
      console.error('Error extracting user email from token:', error);
    }
    return null;
  };

  const userEmail = getUserId();
  let isAdmin = false;
  
  if (userEmail && currentEvent?.administrators) {
    // Check if user email exists in administrators object (case-insensitive)
    const normalizedUserEmail = userEmail.toLowerCase();
    isAdmin = Object.keys(currentEvent.administrators).some(
      adminEmail => adminEmail.toLowerCase() === normalizedUserEmail
    );
  } else if (userEmail && currentEvent?.administrator) {
    // Fallback: support old administrator field for backward compatibility
    const adminEmail = currentEvent.administrator?.toLowerCase();
    isAdmin = userEmail === adminEmail;
  }

  return (
    <EventContextProvider event={currentEvent} eventId={eventId} isAdmin={isAdmin}>
      {children}
    </EventContextProvider>
  );
}

/**
 * EventLayout Component
 * 
 * Wraps event routes with EventContextProvider so Header can access event data
 */
function EventLayout({ children }) {
  return (
    <EventRouteWrapper>
      {children}
    </EventRouteWrapper>
  );
}

/**
 * AppLayout Component
 * 
 * Provides layout with Header and routes, with conditional EventContext for event routes
 */
function AppLayout() {
  const location = useLocation();
  const isEventRoute = location.pathname.startsWith('/event/');
  
  // Extract eventId from pathname for event routes
  const eventIdMatch = location.pathname.match(/^\/event\/([A-Za-z0-9]{8})/);
  const eventId = eventIdMatch ? eventIdMatch[1] : null;
  
  const content = (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto pt-16">
        <Routes>
          {/* Public routes - no authentication required */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Protected routes - authentication required */}
          <Route 
            path="/create-event" 
            element={
              <ProtectedRoute>
                <CreateEventPage />
              </ProtectedRoute>
            } 
          />
          {/* PIN entry route - public, no authentication required */}
          <Route 
            path="/event/:eventId/pin" 
            element={
              <PINProvider>
                <PINEntryPage />
              </PINProvider>
            } 
          />
          <Route 
            path="/event/:eventId" 
            element={
              <PINProvider>
                <EventLayout>
                  <EventPage />
                </EventLayout>
              </PINProvider>
            } 
          />
          <Route 
            path="/event/:eventId/admin" 
            element={
              <ProtectedRoute>
                <PINProvider>
                  <EventLayout>
                    <AdminRoute>
                      <EventAdminPage />
                    </AdminRoute>
                  </EventLayout>
                </PINProvider>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/event/:eventId/profile" 
            element={
              <PINProvider>
                <EventLayout>
                  <ProfilePage />
                </EventLayout>
              </PINProvider>
            } 
          />
        </Routes>
      </main>
    </div>
  );

  // For event routes, wrap with EventContextProvider at the app level so Header can access it
  if (isEventRoute && eventId) {
    return (
      <EventContextProviderForRoute eventId={eventId}>
        {content}
      </EventContextProviderForRoute>
    );
  }

  return content;
}

/**
 * EventContextProviderForRoute Component
 * 
 * Provides EventContext at app level for event routes so Header can access event data
 */
function EventContextProviderForRoute({ eventId, children }) {
  const [currentEvent, setCurrentEvent] = useState(null);
  const { event: polledEvent } = useEventPolling(eventId);
  
  // Fetch initial event data
  useEffect(() => {
    if (!eventId) return;
    
    const fetchEvent = async () => {
      try {
        const eventData = await apiClient.getEvent(eventId);
        setCurrentEvent(eventData);
      } catch (error) {
        console.error('Error fetching event for header:', error);
        // Don't set error state here, let the page handle it
      }
    };
    
    fetchEvent();
  }, [eventId]);
  
  // Update current event when polling updates
  useEffect(() => {
    if (polledEvent) {
      setCurrentEvent(polledEvent);
    }
  }, [polledEvent]);
  
  // Extract user email from JWT token for admin check
  const getUserId = () => {
    try {
      const token = apiClient.getJWTToken();
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          return payload.email?.toLowerCase() || null;
        }
      }
    } catch (error) {
      console.error('Error extracting user email from token:', error);
    }
    return null;
  };

  const userEmail = getUserId();
  let isAdmin = false;
  
  if (userEmail && currentEvent?.administrators) {
    // Check if user email exists in administrators object (case-insensitive)
    const normalizedUserEmail = userEmail.toLowerCase();
    isAdmin = Object.keys(currentEvent.administrators).some(
      adminEmail => adminEmail.toLowerCase() === normalizedUserEmail
    );
  } else if (userEmail && currentEvent?.administrator) {
    // Fallback: support old administrator field for backward compatibility
    const adminEmail = currentEvent.administrator?.toLowerCase();
    isAdmin = userEmail === adminEmail;
  }

  return (
    <EventContextProvider event={currentEvent} eventId={eventId} isAdmin={isAdmin}>
      {children}
    </EventContextProvider>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;
