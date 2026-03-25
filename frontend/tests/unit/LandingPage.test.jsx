import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from '../../src/pages/LandingPage.jsx';
import apiClient from '../../src/services/apiClient.js';
import { useLocation } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useLocation: vi.fn(() => ({ state: null, pathname: '/' }))
  };
});

vi.mock('../../src/services/apiClient.js', () => ({
  default: {
    isAuthenticated: vi.fn(() => false)
  }
}));

vi.mock('../../src/hooks/useDarkMode.js', () => ({
  default: vi.fn(() => ({ isDark: false, toggleDark: vi.fn() }))
}));

vi.mock('../../src/utils/helpers', () => ({
  clearSuccessMessage: vi.fn()
}));

// Helper to render component with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('LandingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset useLocation to default (no state)
    useLocation.mockReturnValue({ state: null, pathname: '/' });
    apiClient.isAuthenticated.mockReturnValue(false);
  });

  describe('Headline and Subtitle', () => {
    it('should render the headline text', () => {
      renderWithRouter(<LandingPage />);

      const headline = screen.getByText('Who brought the best bottle?');
      expect(headline).toBeInTheDocument();
      expect(headline.tagName).toBe('H1');
    });

    it('should render the subtitle text', () => {
      renderWithRouter(<LandingPage />);

      const subtitle = screen.getByText(
        /Host a blind tasting party, rate the mystery bottles/i
      );
      expect(subtitle).toBeInTheDocument();
    });
  });

  describe('Three-Step Icons', () => {
    it('should render Cover, Taste, and Reveal step labels', () => {
      renderWithRouter(<LandingPage />);

      expect(screen.getByText('Cover')).toBeInTheDocument();
      expect(screen.getByText('Taste')).toBeInTheDocument();
      expect(screen.getByText('Reveal')).toBeInTheDocument();
    });
  });

  describe('Host a Tasting Button', () => {
    it('should render the Host a Tasting button', () => {
      renderWithRouter(<LandingPage />);

      const hostButton = screen.getByRole('button', { name: /host a tasting/i });
      expect(hostButton).toBeInTheDocument();
    });

    it('should navigate to /create-event when authenticated', () => {
      apiClient.isAuthenticated.mockReturnValue(true);
      renderWithRouter(<LandingPage />);

      const hostButton = screen.getByRole('button', { name: /host a tasting/i });
      fireEvent.click(hostButton);

      expect(mockNavigate).toHaveBeenCalledWith('/create-event');
    });

    it('should navigate to /auth with redirect state when not authenticated', () => {
      apiClient.isAuthenticated.mockReturnValue(false);
      renderWithRouter(<LandingPage />);

      const hostButton = screen.getByRole('button', { name: /host a tasting/i });
      fireEvent.click(hostButton);

      expect(mockNavigate).toHaveBeenCalledWith('/auth', {
        state: { from: { pathname: '/create-event' } }
      });
    });
  });

  describe('My Events Button', () => {
    it('should render the My Events button', () => {
      renderWithRouter(<LandingPage />);

      const myEventsButton = screen.getByRole('button', { name: /my events/i });
      expect(myEventsButton).toBeInTheDocument();
    });

    it('should navigate to /my-events when authenticated', () => {
      apiClient.isAuthenticated.mockReturnValue(true);
      renderWithRouter(<LandingPage />);

      const myEventsButton = screen.getByRole('button', { name: /my events/i });
      fireEvent.click(myEventsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/my-events');
    });

    it('should navigate to /auth with redirect state when not authenticated', () => {
      apiClient.isAuthenticated.mockReturnValue(false);
      renderWithRouter(<LandingPage />);

      const myEventsButton = screen.getByRole('button', { name: /my events/i });
      fireEvent.click(myEventsButton);

      expect(mockNavigate).toHaveBeenCalledWith('/auth', {
        state: { from: { pathname: '/my-events' } }
      });
    });
  });

  describe('Event Code Toggle and Input', () => {
    it('should render "Have an event code?" text link', () => {
      renderWithRouter(<LandingPage />);

      const codeLink = screen.getByText('Have an event code?');
      expect(codeLink).toBeInTheDocument();
    });

    it('should not show code input initially', () => {
      renderWithRouter(<LandingPage />);

      expect(screen.queryByPlaceholderText(/ABCD1234/i)).not.toBeInTheDocument();
    });

    it('should reveal code input when "Have an event code?" is clicked', () => {
      renderWithRouter(<LandingPage />);

      const codeLink = screen.getByText('Have an event code?');
      fireEvent.click(codeLink);

      const input = screen.getByPlaceholderText(/ABCD1234/i);
      expect(input).toBeInTheDocument();
    });

    it('should keep "Have an event code?" link visible as a toggle after it is clicked', () => {
      renderWithRouter(<LandingPage />);

      const codeLink = screen.getByText('Have an event code?');
      fireEvent.click(codeLink);

      expect(screen.getByText('Have an event code?')).toBeInTheDocument();
    });

    it('should auto-focus the code input when revealed', async () => {
      renderWithRouter(<LandingPage />);

      const codeLink = screen.getByText('Have an event code?');
      fireEvent.click(codeLink);

      const input = screen.getByPlaceholderText(/ABCD1234/i);
      await waitFor(() => {
        expect(input).toHaveFocus();
      });
    });

    it('should render a Go submit button alongside the input', () => {
      renderWithRouter(<LandingPage />);

      fireEvent.click(screen.getByText('Have an event code?'));

      const goButton = screen.getByRole('button', { name: /go/i });
      expect(goButton).toBeInTheDocument();
    });

    it('should disable Go button when input is empty', () => {
      renderWithRouter(<LandingPage />);

      fireEvent.click(screen.getByText('Have an event code?'));

      const goButton = screen.getByRole('button', { name: /go/i });
      expect(goButton).toBeDisabled();
    });

    it('should enable Go button when input has a value', () => {
      renderWithRouter(<LandingPage />);

      fireEvent.click(screen.getByText('Have an event code?'));

      const input = screen.getByPlaceholderText(/ABCD1234/i);
      fireEvent.change(input, { target: { value: 'abc123' } });

      const goButton = screen.getByRole('button', { name: /go/i });
      expect(goButton).not.toBeDisabled();
    });

    it('should accept text input and display it', () => {
      renderWithRouter(<LandingPage />);

      fireEvent.click(screen.getByText('Have an event code?'));

      const input = screen.getByPlaceholderText(/ABCD1234/i);
      fireEvent.change(input, { target: { value: 'myEvent99' } });

      expect(input).toHaveValue('myEvent99');
    });
  });

  describe('Event Code Submission', () => {
    it('should navigate to /event/${CODE} in uppercase on submit', () => {
      renderWithRouter(<LandingPage />);

      fireEvent.click(screen.getByText('Have an event code?'));

      const input = screen.getByPlaceholderText(/ABCD1234/i);
      fireEvent.change(input, { target: { value: 'abc123' } });

      const goButton = screen.getByRole('button', { name: /go/i });
      fireEvent.click(goButton);

      expect(mockNavigate).toHaveBeenCalledWith('/event/ABC123');
    });

    it('should trim whitespace before navigating', () => {
      renderWithRouter(<LandingPage />);

      fireEvent.click(screen.getByText('Have an event code?'));

      const input = screen.getByPlaceholderText(/ABCD1234/i);
      fireEvent.change(input, { target: { value: '  xyz789  ' } });

      const goButton = screen.getByRole('button', { name: /go/i });
      fireEvent.click(goButton);

      expect(mockNavigate).toHaveBeenCalledWith('/event/XYZ789');
    });

    it('should not navigate when input is only whitespace', () => {
      renderWithRouter(<LandingPage />);

      fireEvent.click(screen.getByText('Have an event code?'));

      const input = screen.getByPlaceholderText(/ABCD1234/i);
      fireEvent.change(input, { target: { value: '   ' } });

      // Go button should be disabled with only whitespace
      const goButton = screen.getByRole('button', { name: /go/i });
      expect(goButton).toBeDisabled();
    });
  });

  describe('Success Message from Navigation State', () => {
    it('should display success message when present in location state', () => {
      useLocation.mockReturnValue({
        state: { message: 'Event created successfully!', messageType: 'success' },
        pathname: '/'
      });

      renderWithRouter(<LandingPage />);

      expect(screen.getByText('Event created successfully!')).toBeInTheDocument();
    });

    it('should not display success message when location state is null', () => {
      useLocation.mockReturnValue({ state: null, pathname: '/' });

      renderWithRouter(<LandingPage />);

      // No success message element should be present
      expect(screen.queryByText('Event created successfully!')).not.toBeInTheDocument();
    });

    it('should not display message when messageType is not success', () => {
      useLocation.mockReturnValue({
        state: { message: 'Something happened', messageType: 'error' },
        pathname: '/'
      });

      renderWithRouter(<LandingPage />);

      expect(screen.queryByText('Something happened')).not.toBeInTheDocument();
    });
  });
});
