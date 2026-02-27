import { useParams } from 'react-router-dom';
import { usePIN } from '@/contexts/PINContext';

/**
 * usePINVerification Hook
 * 
 * Hook for checking PIN verification state from context
 * 
 * @returns {{isVerified: boolean, sessionId: string|null, eventId: string|undefined}}
 */
export function usePINVerification() {
  const { eventId } = useParams();
  const { pinVerified, sessionId } = usePIN();

  return {
    isVerified: pinVerified && !!sessionId,
    sessionId,
    eventId
  };
}

export default usePINVerification;
