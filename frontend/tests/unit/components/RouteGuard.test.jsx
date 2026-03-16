import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import RouteGuard from '../../../src/components/RouteGuard.jsx';

// Helper to render RouteGuard within a router
function renderWithRouter(ui, { initialEntries = ['/protected'] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/protected" element={ui} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/home" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RouteGuard Component', () => {
  describe('Loading state', () => {
    it('should show default loading text while checking permissions', () => {
      // checkPermission that never resolves
      const checkPermission = () => new Promise(() => {});

      renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login">
          <div>Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom loading text', () => {
      const checkPermission = () => new Promise(() => {});

      renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login" loadingText="Checking permissions...">
          <div>Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
    });

    it('should show spinner when showSpinner is true', () => {
      const checkPermission = () => new Promise(() => {});

      const { container } = renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login" showSpinner loadingText="Checking...">
          <div>Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByText('Checking...')).toBeInTheDocument();
      // Check that the spinner element exists
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Successful permission', () => {
    it('should render children when permission is granted', async () => {
      const checkPermission = vi.fn(() => ({ allowed: true }));

      renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login">
          <div>Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(checkPermission).toHaveBeenCalled();
    });

    it('should render children when async permission resolves to allowed', async () => {
      const checkPermission = vi.fn(async () => {
        return { allowed: true };
      });

      renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login">
          <div>Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });
  });

  describe('Failed permission (redirect)', () => {
    it('should redirect to default path when permission denied', async () => {
      const checkPermission = vi.fn(() => ({ allowed: false }));

      renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login">
          <div>Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to custom path when permission returns redirectTo', async () => {
      const checkPermission = vi.fn(() => ({ allowed: false, redirectTo: '/home' }));

      renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login">
          <div>Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Home Page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to default path when checkPermission throws', async () => {
      const checkPermission = vi.fn(() => {
        throw new Error('Network error');
      });

      renderWithRouter(
        <RouteGuard checkPermission={checkPermission} redirectTo="/login">
          <div>Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});
