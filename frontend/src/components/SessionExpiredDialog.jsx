import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '../services/apiClient.js';

function SessionExpiredDialog() {
  const [visible, setVisible] = useState(false);
  const [authMethod, setAuthMethod] = useState(null);
  const [email, setEmail] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (visible) return; // dedup: don't stack multiple prompts
      setAuthMethod(e.detail?.authMethod || null);
      setEmail(e.detail?.email || null);
      const eid = e.detail?.eventId || extractEventIdFromPath();
      setEventId(eid);
      setPin('');
      setError('');
      setVisible(true);
    };
    window.addEventListener('session-expired', handler);
    return () => window.removeEventListener('session-expired', handler);
  }, [visible]);

  useEffect(() => {
    if (visible && authMethod === 'pin' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible, authMethod]);

  const handlePINSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Name is required for verify-PIN — use stored name or derive from email
      const name = apiClient.getUserName() || localStorage.getItem('remembered:name') || email?.split('@')[0] || 'Guest';
      const response = await apiClient.verifyPIN(eventId, pin, email, name);

      if (response.user) {
        apiClient.setUserSession(response.user);
      }
      if (response.sessionId && eventId) {
        localStorage.setItem(`pin:session:${eventId}`, response.sessionId);
      }
      setVisible(false);
    } catch (err) {
      let msg = 'Invalid PIN. Please try again.';
      if (err.message?.includes('Too many attempts')) {
        msg = err.message;
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('Network error')) {
        msg = 'Unable to connect. Please check your connection.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [pin, eventId, email]);

  const handleOTPRedirect = useCallback(() => {
    if (eventId) {
      if (email) {
        sessionStorage.setItem(`event:${eventId}:email`, email);
      }
      window.location.href = `/event/${eventId}/otp`;
    } else {
      window.location.href = '/';
    }
  }, [eventId, email]);

  if (!visible) return null;

  const isPIN = authMethod === 'pin' || authMethod === null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center" data-testid="session-expired-dialog">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div
        className="relative z-[120] w-full max-w-md mx-4 bg-background border border-border rounded-lg shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expired-title"
      >
        <div className="flex items-center gap-3 p-6 border-b">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 id="session-expired-title" className="text-xl font-semibold">
            Welcome back!
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {isPIN ? (
            <form onSubmit={handlePINSubmit} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your session has expired. Enter your PIN to pick up where you left off.
              </p>

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  setError('');
                }}
                placeholder="Enter 6-digit PIN"
                className="w-full px-3 py-2 border rounded-md text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                disabled={loading}
                autoComplete="off"
                data-testid="session-expired-pin-input"
              />

              {error && (
                <p className="text-sm text-destructive" data-testid="session-expired-error">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || pin.length !== 6}
                data-testid="session-expired-pin-submit"
              >
                {loading ? 'Verifying...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Your session has expired. You'll need to verify your email again to continue.
              </p>

              {error && (
                <p className="text-sm text-destructive" data-testid="session-expired-error">{error}</p>
              )}

              <Button
                onClick={handleOTPRedirect}
                className="w-full"
                data-testid="session-expired-otp-continue"
              >
                Continue
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function extractEventIdFromPath() {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/\/event\/([A-Za-z0-9]{8})/);
  return match ? match[1] : null;
}

export default SessionExpiredDialog;
