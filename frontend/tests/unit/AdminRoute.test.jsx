import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Routes, Route, MemoryRouter } from 'react-router-dom';
import AdminRoute from '../../src/components/AdminRoute.jsx';
import useEvent from '../../src/hooks/useEvent.js';
import apiClient from '../../src/services/apiClient.js';

// Mock hooks
vi.mock('../../src/hooks/useEvent.js', () => {
  return {
    default: vi.fn()
  };
});

vi.mock('../../src/services/apiClient.js', () => {
  return {
    default: {
      isAuthenticated: vi.fn(() => true),
      getUserEmail: vi.fn()
    }
  };
});

// Test component to render inside AdminRoute
const TestComponent = () => <div>Admin Content</div>;

describe('AdminRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Case-insensitive email comparison', () => {
    it('should allow access when emails match (case-insensitive)', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useEvent.mockReturnValue({
        event: mockEvent,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      apiClient.getUserEmail.mockReturnValue('ADMIN@EXAMPLE.COM');

      render(
        <MemoryRouter initialEntries={['/event/A5ohYrHe/admin']}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <AdminRoute>
                <TestComponent />
              </AdminRoute>
            } />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('should allow access when emails match (lowercase)', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useEvent.mockReturnValue({
        event: mockEvent,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      apiClient.getUserEmail.mockReturnValue('admin@example.com');

      render(
        <MemoryRouter initialEntries={['/event/A5ohYrHe/admin']}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <AdminRoute>
                <TestComponent />
              </AdminRoute>
            } />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('should deny access when emails do not match', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useEvent.mockReturnValue({
        event: mockEvent,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      apiClient.getUserEmail.mockReturnValue('user@example.com');

      render(
        <MemoryRouter initialEntries={['/event/A5ohYrHe/admin']}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <AdminRoute>
                <TestComponent />
              </AdminRoute>
            } />
            <Route path="/event/:eventId" element={<div>Event Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Event Page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator while checking permissions', () => {
      useEvent.mockReturnValue({
        event: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      });

      apiClient.getUserEmail.mockReturnValue('admin@example.com');

      render(
        <MemoryRouter initialEntries={['/event/A5ohYrHe/admin']}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <AdminRoute>
                <TestComponent />
              </AdminRoute>
            } />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/checking permissions/i)).toBeInTheDocument();
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Event not found', () => {
    it('should deny access when event does not exist', async () => {
      useEvent.mockReturnValue({
        event: null,
        isLoading: false,
        error: 'Event not found',
        refetch: vi.fn()
      });

      apiClient.getUserEmail.mockReturnValue('admin@example.com');

      render(
        <MemoryRouter initialEntries={['/event/A5ohYrHe/admin']}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <AdminRoute>
                <TestComponent />
              </AdminRoute>
            } />
            <Route path="/event/:eventId" element={<div>Event Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Event Page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Email from session', () => {
    it('should grant access when getUserEmail returns matching email', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useEvent.mockReturnValue({
        event: mockEvent,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      apiClient.getUserEmail.mockReturnValue('admin@example.com');

      render(
        <MemoryRouter initialEntries={['/event/A5ohYrHe/admin']}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <AdminRoute>
                <TestComponent />
              </AdminRoute>
            } />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(apiClient.getUserEmail).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('should handle missing email in session', async () => {
      const mockEvent = {
        eventId: 'A5ohYrHe',
        name: 'Test Event',
        state: 'started',
        typeOfItem: 'wine',
        administrator: 'admin@example.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      useEvent.mockReturnValue({
        event: mockEvent,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      });

      apiClient.getUserEmail.mockReturnValue(null);

      render(
        <MemoryRouter initialEntries={['/event/A5ohYrHe/admin']}>
          <Routes>
            <Route path="/event/:eventId/admin" element={
              <AdminRoute>
                <TestComponent />
              </AdminRoute>
            } />
            <Route path="/event/:eventId" element={<div>Event Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Event Page')).toBeInTheDocument();
      });

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });
});
