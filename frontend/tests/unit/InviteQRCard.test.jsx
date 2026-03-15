import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('qrcode.react', () => {
  const { forwardRef } = require('react');
  return {
    QRCodeSVG: ({ value, size }) =>
      React.createElement('svg', { 'data-testid': 'qr-svg', 'data-value': value, width: size, height: size }),
    QRCodeCanvas: forwardRef(({ value, size }, ref) =>
      React.createElement('canvas', { 'data-testid': 'qr-canvas', 'data-value': value, width: size, height: size, ref })
    ),
  };
});

import InviteQRCard from '../../src/components/InviteQRCard.jsx';

describe('InviteQRCard', () => {
  const eventUrl = 'https://example.com/event/ABC123';
  const pin = '7842';

  it('renders a QR code SVG encoding the event URL', () => {
    render(<InviteQRCard eventUrl={eventUrl} pin={pin} />);

    const svg = screen.getByTestId('qr-svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('data-value', eventUrl);
  });

  it('renders the PIN in spaced monospace text', () => {
    render(<InviteQRCard eventUrl={eventUrl} pin={pin} />);

    expect(screen.getByText(/7\s+8\s+4\s+2/)).toBeInTheDocument();
  });

  it('shows placeholder when PIN is missing', () => {
    render(<InviteQRCard eventUrl={eventUrl} pin={null} />);

    expect(screen.getByText('No PIN assigned')).toBeInTheDocument();
  });

  it('shows a loading placeholder when eventUrl is missing', () => {
    render(<InviteQRCard eventUrl="" pin={pin} />);

    expect(screen.queryByTestId('qr-svg')).not.toBeInTheDocument();
  });

  it('renders a hidden canvas for PNG export', () => {
    render(<InviteQRCard eventUrl={eventUrl} pin={pin} />);

    const canvas = screen.getByTestId('qr-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('calls onCanvasReady with the canvas element', () => {
    const onCanvasReady = vi.fn();
    render(<InviteQRCard eventUrl={eventUrl} pin={pin} onCanvasReady={onCanvasReady} />);

    expect(onCanvasReady).toHaveBeenCalledWith(expect.any(HTMLElement));
  });
});
