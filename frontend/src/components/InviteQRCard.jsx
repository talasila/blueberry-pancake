import { useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

/**
 * Self-contained invite card: QR code (scannable) + PIN (readable).
 *
 * Renders a visible QRCodeSVG for crisp display and a hidden
 * QRCodeCanvas whose ref is exposed via `onCanvasReady` for
 * PNG export by the parent.
 */
export default function InviteQRCard({ eventUrl, pin, onCanvasReady }) {
  const canvasRef = useRef(null);

  const handleCanvasRef = (el) => {
    canvasRef.current = el;
    if (el && onCanvasReady) onCanvasReady(el);
  };

  const spacedPin = pin ? pin.split('').join('  ') : null;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/40 p-6">
      {eventUrl ? (
        <>
          <QRCodeSVG
            value={eventUrl}
            size={200}
            level="M"
            className="rounded"
          />
          {/* Hidden canvas for PNG export */}
          <div className="hidden">
            <QRCodeCanvas
              value={eventUrl}
              size={200}
              level="M"
              ref={handleCanvasRef}
            />
          </div>
        </>
      ) : (
        <div className="h-[200px] w-[200px] rounded bg-muted animate-pulse" />
      )}

      {spacedPin ? (
        <p className="w-[200px] text-center text-lg font-bold tracking-[0.25em] font-mono text-foreground">
          {spacedPin}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No PIN assigned</p>
      )}
    </div>
  );
}
