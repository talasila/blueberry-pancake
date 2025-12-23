import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CreateEventPage from './pages/CreateEventPage.jsx';
import EventPage from './pages/EventPage.jsx';
import EventAdminPage from './pages/EventAdminPage.jsx';
import EmailEntryPage from './pages/EmailEntryPage.jsx';
import PINEntryPage from './pages/PINEntryPage.jsx';
import EventOTPEntryPage from './pages/EventOTPEntryPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ItemAssignmentPage from './pages/ItemAssignmentPage.jsx';
import SystemPage from './pages/SystemPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import DashboardRoute from './components/DashboardRoute.jsx';
import { EventContextProvider } from './contexts/EventContext.jsx';
import { PINProvider } from './contexts/PINContext.jsx';
import { Toaster } from './components/ui/sonner';
import useEventPolling from '@/hooks/useEventPolling';
import { useEffect, useState } from 'react';
import apiClient from './services/apiClient.js';

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
  
  // Set viewport height for mobile browsers (accounts for browser UI)
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };
    
    // Update on resize and orientation change
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    
    // Initial update after a short delay to ensure accurate measurement
    const timer = setTimeout(updateViewportHeight, 100);
    
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      clearTimeout(timer);
    };
  }, []);
  
  const content = (
    <div 
      className="bg-background flex flex-col overflow-hidden"
      style={{ height: `${viewportHeight}px` }}
    >
      <Header />
      <main className="flex-1 overflow-y-auto pt-16 min-h-0">
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
          
          {/* System admin routes */}
          <Route 
            path="/system" 
            element={
              <ProtectedRoute>
                <SystemPage />
              </ProtectedRoute>
            } 
          />
          {/* System login redirects to auth page */}
          <Route 
            path="/system/login" 
            element={<AuthPage />} 
          />
          {/* Email entry route - first step, public, no authentication required */}
          <Route 
            path="/event/:eventId/email" 
            element={<EmailEntryPage />} 
          />
          {/* PIN entry route - step 2 for regular users, public, no authentication required */}
          <Route 
            path="/event/:eventId/pin" 
            element={
              <PINProvider>
                <PINEntryPage />
              </PINProvider>
            } 
          />
          {/* OTP entry route - step 2 for admins, public, no authentication required */}
          <Route 
            path="/event/:eventId/otp" 
            element={<EventOTPEntryPage />} 
          />
          <Route 
            path="/event/:eventId" 
            element={
              <PINProvider>
                <EventPage />
              </PINProvider>
            } 
          />
          <Route 
            path="/event/:eventId/admin" 
            element={
              <ProtectedRoute>
                <PINProvider>
                  <AdminRoute>
                    <EventAdminPage />
                  </AdminRoute>
                </PINProvider>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/event/:eventId/admin/items/assign" 
            element={
              <ProtectedRoute>
                <PINProvider>
                  <AdminRoute>
                    <ItemAssignmentPage />
                  </AdminRoute>
                </PINProvider>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/event/:eventId/profile" 
            element={
              <PINProvider>
                <ProfilePage />
              </PINProvider>
            } 
          />
          <Route 
            path="/event/:eventId/dashboard" 
            element={
              <PINProvider>
                <DashboardRoute>
                  <DashboardPage />
                </DashboardRoute>
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
  
  // Check authentication before polling
  // Must have a valid (non-empty) JWT token
  const jwtToken = apiClient.getJWTToken();
  const hasAuth = !!(jwtToken && jwtToken.trim());
  
  // Only poll if we have authentication
  const { event: polledEvent } = useEventPolling(hasAuth ? eventId : null);
  
  // Fetch initial event data
  useEffect(() => {
    if (!eventId) return;
    
    // Check authentication before attempting to fetch
    // Must have a valid (non-empty) JWT token
    const jwtToken = apiClient.getJWTToken();
    const hasAuth = !!(jwtToken && jwtToken.trim());
    
    if (!hasAuth) {
      // Don't fetch if no authentication - let the page component handle redirect
      return;
    }
    
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
      <Toaster />
    </Router>
  );
}

export default App;
