import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PrivacyPolicyPage from '../../src/pages/PrivacyPolicyPage.jsx';

function renderPage() {
  return render(
    <BrowserRouter>
      <PrivacyPolicyPage />
    </BrowserRouter>
  );
}

describe('PrivacyPolicyPage', () => {

  it('renders the Privacy Policy heading', () => {
    renderPage();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('displays the Last updated date (FR-004)', () => {
    renderPage();
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('renders all 6 sections', () => {
    renderPage();
    const sections = [
      'What we collect',
      'Third-party services',
      'Cookies',
      'Data retention',
      'Your rights',
      'Contact',
    ];
    for (const section of sections) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument();
    }
  });

  it('Resend link has target="_blank" and rel="noopener noreferrer"', () => {
    renderPage();
    const resendLink = screen.getByRole('link', { name: /Resend's privacy policy/i });
    expect(resendLink).toHaveAttribute('target', '_blank');
    expect(resendLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('uses Card layout for visual consistency (FR-009)', () => {
    const { container } = renderPage();
    // Card component renders a div with the bg-card class
    const card = container.querySelector('.bg-card');
    expect(card).toBeInTheDocument();
  });

  it('renders Back to home link', () => {
    renderPage();
    const homeLink = screen.getByRole('link', { name: /Back to home/i });
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
