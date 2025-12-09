import { createContext, useContext, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * PINContext
 * 
 * Provides PIN verification session state to components
 */
const PINContext = createContext({
  pinVerified: false,
  sessionId: null,
  setPinVerified: () => {},
  clearPINSession: () => {}
});

/**
 * usePIN Hook
 * 
 * Hook to access PIN context
 * @returns {{pinVerified: boolean, sessionId: string|null, setPinVerified: function, clearPINSession: function}}
 */
export function usePIN() {
  return useContext(PINContext);
}

/**
 * PINContext Provider Component
 * 
 * Manages PIN verification session state for the current event
 * 
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function PINProvider({ children }) {
  const { eventId } = useParams();
  const [pinVerified, setPinVerified] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Load PIN session from localStorage when eventId changes
  // Also check if session is still valid by attempting to use it
  useEffect(() => {
    if (eventId) {
      const stored = localStorage.getItem(`pin:session:${eventId}`);
      if (stored) {
        setSessionId(stored);
        setPinVerified(true);
        
        // Note: Session validity is checked server-side on each request
        // If session is invalid, the API will return 401 and the component
        // should handle it by clearing the session and redirecting to PIN entry
      } else {
        setSessionId(null);
        setPinVerified(false);
      }
    }
  }, [eventId]);

  /**
   * Clear PIN session for current event
   */
  const clearPINSession = () => {
    if (eventId) {
      localStorage.removeItem(`pin:session:${eventId}`);
      setSessionId(null);
      setPinVerified(false);
    }
  };

  /**
   * Set PIN verification state
   * @param {boolean} verified - Whether PIN is verified
   * @param {string|null} newSessionId - Session ID if verified
   */
  const handleSetPinVerified = (verified, newSessionId = null) => {
    setPinVerified(verified);
    if (verified && newSessionId) {
      setSessionId(newSessionId);
      if (eventId) {
        localStorage.setItem(`pin:session:${eventId}`, newSessionId);
      }
    } else {
      setSessionId(null);
      if (eventId) {
        localStorage.removeItem(`pin:session:${eventId}`);
      }
    }
  };

  return (
    <PINContext.Provider value={{
      pinVerified,
      sessionId,
      setPinVerified: handleSetPinVerified,
      clearPINSession
    }}>
      {children}
    </PINContext.Provider>
  );
}

export default PINContext;
