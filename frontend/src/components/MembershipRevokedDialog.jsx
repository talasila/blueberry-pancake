import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiClient from '../services/apiClient.js';

function MembershipRevokedDialog() {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handler = (e) => {
      setMessage(e.detail?.message || 'Your access to this event has been removed');
      setVisible(true);
    };
    window.addEventListener('membership-revoked', handler);
    return () => window.removeEventListener('membership-revoked', handler);
  }, []);

  if (!visible) return null;

  const handleDismiss = async () => {
    await apiClient.clearJWTToken();
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div
        className="relative z-[110] w-full max-w-md mx-4 bg-background border border-destructive/20 rounded-lg shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-revoked-title"
      >
        <div className="flex items-center gap-3 p-6 border-b border-destructive/20">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h2 id="membership-revoked-title" className="text-xl font-semibold text-destructive">
            Access Removed
          </h2>
        </div>

        <div className="p-6 space-y-3">
          <p className="text-sm text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">
            You will be logged out when you dismiss this message.
          </p>
        </div>

        <div className="flex items-center justify-end p-6 border-t border-destructive/20 bg-muted/30">
          <Button variant="destructive" onClick={handleDismiss} data-testid="membership-revoked-ok">
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}

export default MembershipRevokedDialog;
