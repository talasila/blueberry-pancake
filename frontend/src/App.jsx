import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from './services/apiClient.js';
import LandingPage from './pages/LandingPage.jsx';

function App() {
  const [healthStatus, setHealthStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Test API connection on mount
    apiClient.get('/health')
      .then(data => {
        setHealthStatus(data);
        setError(null);
      })
      .catch(err => {
        // Provide more helpful error messages
        let errorMessage = err.message;
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to backend server';
        }
        setError(errorMessage);
        setHealthStatus(null);
      });
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
