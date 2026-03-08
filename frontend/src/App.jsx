import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CreateEventPage from './pages/CreateEventPage.jsx';
import MyEventsPage from './pages/MyEventsPage.jsx';
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
import { useViewportHeight } from '@/hooks/useViewportHeight';
import { useEffect, useState, useCallback, useMemo } from 'react';
import apiClient from './services/apiClient.js';
import { isUserAdmin } from './utils/adminCheck.js';
import GuideDrawer from './components/guide/GuideDrawer';
import AdminGuideDrawer from './components/guide/AdminGuideDrawer';
import MembershipRevokedDialog from './components/MembershipRevokedDialog';
import EventThemeProvider from './components/EventThemeProvider';

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

  // Redirect non-uppercase event IDs to canonical uppercase URL
  if (eventId && eventId !== eventId.toUpperCase()) {
    const canonicalPath = location.pathname.replace(
      `/event/${eventId}`,
      `/event/${eventId.toUpperCase()}`
    );
    return <Navigate to={canonicalPath + location.search + location.hash} replace />;
  }
  
  const viewportHeight = useViewportHeight();
  
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  const [adminGuideOpen, setAdminGuideOpen] = useState(false);
  const closeAdminGuide = useCallback(() => setAdminGuideOpen(false), []);

  const isAdminRoute = /^\/event\/[A-Za-z0-9]+\/admin(\/.*)?$/.test(location.pathname);
  const isSystemRoute = location.pathname.startsWith('/system');

  const guideVariant = useMemo(() => {
    if (isAdminRoute) return 'admin';
    if (isSystemRoute) return null;
    return 'hosting';
  }, [isAdminRoute, isSystemRoute]);

  const isGuideOpen = guideVariant === 'admin' ? adminGuideOpen : guideOpen;

  const onToggleGuide = useCallback(() => {
    if (guideVariant === 'admin') {
      setAdminGuideOpen(prev => !prev);
    } else if (guideVariant === 'hosting') {
      setGuideOpen(prev => !prev);
    }
  }, [guideVariant]);

  const content = (
    <div 
      className="bg-background flex flex-col overflow-hidden"
      style={{ height: `${viewportHeight}px` }}
    >
      <Header onToggleGuide={onToggleGuide} guideVariant={guideVariant} isGuideOpen={isGuideOpen} />
      <main className="flex-1 overflow-y-auto pt-[49px] min-h-0">
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
          <Route 
            path="/my-events" 
            element={
              <ProtectedRoute>
                <MyEventsPage />
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
                    <EventAdminPage onOpenAdminGuide={() => setAdminGuideOpen(true)} />
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
      {!isAdminRoute && !isSystemRoute && <GuideDrawer isOpen={guideOpen} onClose={closeGuide} />}
      {isAdminRoute && <AdminGuideDrawer isOpen={adminGuideOpen} onClose={closeAdminGuide} />}
    </div>
  );

  // For event routes, wrap with EventContextProvider at the app level so Header can access it
  if (isEventRoute && eventId) {
    return (
      <EventContextProviderForRoute eventId={eventId}>
        <EventThemeProvider>
          {content}
        </EventThemeProvider>
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
  
  const hasAuth = apiClient.hasEventAccess(eventId);
  const { event: polledEvent, refetch } = useEventPolling(hasAuth ? eventId : null);
  
  // Fetch initial event data
  useEffect(() => {
    if (!eventId) return;
    
    if (!apiClient.hasEventAccess(eventId)) {
      // Don't fetch if no event-specific authentication - let the page component handle redirect
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
  
  const userEmail = apiClient.getUserEmail();
  const isAdmin = isUserAdmin(userEmail, currentEvent);

  return (
    <EventContextProvider event={currentEvent} eventId={eventId} isAdmin={isAdmin} refetch={refetch}>
      {children}
    </EventContextProvider>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
      <Toaster />
      <MembershipRevokedDialog />
    </Router>
  );
}

export default App;
