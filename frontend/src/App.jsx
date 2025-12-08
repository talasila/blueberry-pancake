import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.jsx';
import LandingPage from './pages/LandingPage.jsx';

function App() {
  const handleSignInClick = (e) => {
    e.preventDefault();
    // No functional action - visual feedback handled by CSS
  };

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Header onSignInClick={handleSignInClick} />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
