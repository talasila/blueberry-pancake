import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CreateEventPage from './pages/CreateEventPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  const handleSignInClick = (e) => {
    e.preventDefault();
    // Navigate to auth page
    window.location.href = '/auth';
  };

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Header onSignInClick={handleSignInClick} />
        <main className="pt-16">
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
