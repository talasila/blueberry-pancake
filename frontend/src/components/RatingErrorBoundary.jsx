import React from 'react';
import Message from './Message';
import { Button } from './ui/button';

/**
 * RatingErrorBoundary Component (T081)
 * Error boundary for rating operations
 * Catches errors in rating-related components and displays user-friendly error messages
 */
class RatingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('RatingErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="p-6 space-y-4">
          <Message type="error">
            <div className="space-y-2">
              <p className="font-semibold">Something went wrong with rating operations</p>
              <p className="text-sm">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </Message>
          <Button onClick={this.handleReset} variant="outline" className="w-full">
            Try Again
          </Button>
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded">
                {this.state.error?.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default RatingErrorBoundary;
