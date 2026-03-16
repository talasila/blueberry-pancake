import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

/**
 * RouteGuard Component
 *
 * A reusable route protection wrapper that handles the common pattern of:
 * 1. Show a loading spinner while checking permissions
 * 2. Redirect if permission check fails
 * 3. Render children if permission check succeeds
 *
 * @param {Object} props
 * @param {function} props.checkPermission - Callback returning { allowed: boolean, redirectTo?: string }
 * @param {string} props.redirectTo - Default redirect path when permission denied
 * @param {string} [props.loadingText='Loading...'] - Text shown while checking
 * @param {boolean} [props.showSpinner=false] - Whether to show animated spinner alongside text
 * @param {Object} [props.navigateState] - Optional state passed to Navigate (e.g. { from: location })
 * @param {React.ReactNode} props.children - Content to render when allowed
 */
function RouteGuard({ checkPermission, redirectTo, loadingText = 'Loading...', showSpinner = false, navigateState, children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'allowed' | 'denied'
  const [resolvedRedirect, setResolvedRedirect] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const result = await checkPermission();
        if (cancelled) return;

        if (result.allowed) {
          setStatus('allowed');
        } else {
          setResolvedRedirect(result.redirectTo || redirectTo);
          setStatus('denied');
        }
      } catch {
        if (!cancelled) {
          setResolvedRedirect(redirectTo);
          setStatus('denied');
        }
      }
    };

    setStatus('checking');
    check();

    return () => {
      cancelled = true;
    };
  }, [checkPermission, redirectTo]);

  if (status === 'checking') {
    if (showSpinner) {
      return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div className="text-muted-foreground">{loadingText}</div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">{loadingText}</div>
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to={resolvedRedirect} state={navigateState} replace />;
  }

  return children;
}

export default RouteGuard;
