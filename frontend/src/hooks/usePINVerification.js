import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePIN } from '@/contexts/PINContext';

/**
 * usePINVerification Hook
 * 
 * Hook for managing PIN verification state and checking session validity
 * 
 * @returns {{isVerified: boolean, sessionId: string|null, checkVerification: function}}
 */
export function usePINVerification() {
  const { eventId } = useParams();
  const { pinVerified, sessionId } = usePIN();
  const [isVerified, setIsVerified] = useState(false);

  // Update verification state when context changes
  useEffect(() => {
    setIsVerified(pinVerified && !!sessionId);
  }, [pinVerified, sessionId]);

  /**
   * Check if PIN verification is valid for current event
   * @returns {boolean} True if PIN is verified
   */
  const checkVerification = () => {
    if (!eventId) return false;
    
    // Check localStorage for session
    const stored = localStorage.getItem(`pin:session:${eventId}`);
    return !!stored;
  };

  return {
    isVerified: isVerified || checkVerification(),
    sessionId,
    eventId
  };
}

export default usePINVerification;
