import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../src/App';

/**
 * Example unit test to verify Vitest setup with React
 */
describe('Vitest Setup with React', () => {
  it('should run unit tests successfully', () => {
    expect(true).toBe(true);
  });

  it('should render React components', () => {
    render(<App />);
    expect(screen.getByText(/Blind Tasting Events/i)).toBeInTheDocument();
  });
});
