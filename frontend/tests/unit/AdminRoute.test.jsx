import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route, MemoryRouter } from 'react-router-dom';
import AdminRoute from '../../src/components/AdminRoute.jsx';
import useEvent from '../../src/hooks/useEvent.js';
import apiClient from '../../src/services/apiClient.js';

// Mock hooks
vi.mock('../../src/hooks/useEvent.js', () => {
  return {
    default: vi.fn()
  };
});

// Mock API client
vi.mock('../../src/services/apiClient.js', () => {
  return {
    default: {
      getJWTToken: vi.fn()
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

      // Mock JWT token with uppercase email
      apiClient.getJWTToken.mockReturnValue('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6IkFETUlOQEVYQU1QTEUuQ09NIiwiaWF0IjoxNjAwMDAwMDAwfQ.test');
      
      // Decode mock token payload: { email: "ADMIN@EXAMPLE.COM" }
      vi.spyOn(global, 'atob').mockReturnValue('{"email":"ADMIN@EXAMPLE.COM","iat":1600000000}');

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

      apiClient.getJWTToken.mockReturnValue('mock-token');
      vi.spyOn(global, 'atob').mockReturnValue('{"email":"admin@example.com","iat":1600000000}');

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

      apiClient.getJWTToken.mockReturnValue('mock-token');
      vi.spyOn(global, 'atob').mockReturnValue('{"email":"user@example.com","iat":1600000000}');

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

      apiClient.getJWTToken.mockReturnValue('mock-token');

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

      apiClient.getJWTToken.mockReturnValue('mock-token');

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

  describe('JWT token extraction', () => {
    it('should extract email from JWT token', async () => {
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

      apiClient.getJWTToken.mockReturnValue('mock-token');
      vi.spyOn(global, 'atob').mockReturnValue('{"email":"admin@example.com","iat":1600000000}');

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
        expect(apiClient.getJWTToken).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('should handle missing email in JWT token', async () => {
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

      apiClient.getJWTToken.mockReturnValue('mock-token');
      vi.spyOn(global, 'atob').mockReturnValue('{"iat":1600000000}'); // No email

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
