import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from './services/apiClient.js';

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
            <Route path="/" element={
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Blind Tasting Events</h1>
                <p className="text-muted-foreground mb-4">Application is running</p>
                
                {healthStatus && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Backend connected: {healthStatus.status}
                    </p>
                    {healthStatus.cache && (
                      <p className="text-xs text-green-600 mt-2">
                        Cache: {healthStatus.cache.keys} keys, {healthStatus.cache.hits} hits
                      </p>
                    )}
                  </div>
                )}
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800 font-semibold">
                      ⚠️ Backend connection error
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {error}
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      Make sure the backend is running on <code className="bg-red-100 px-1 rounded">http://localhost:3001</code>
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Check the backend logs for errors: <code className="bg-red-100 px-1 rounded">tail -f backend.log</code>
                    </p>
                  </div>
                )}
              </div>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
