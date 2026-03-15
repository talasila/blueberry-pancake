/**
 * Builds the formatted invitation text used by both
 * "Copy Invitation" and the native Share action.
 */
export function formatInvitationMessage(eventName, eventUrl, pin) {
  return [
    `You're invited to "${eventName}"!`,
    `Join here: ${eventUrl}`,
    `PIN: ${pin}`,
  ].join('\n');
}

/**
 * Composites the QR canvas onto a larger image with the event
 * name and PIN rendered as text, then triggers a PNG download.
 *
 * @param {HTMLCanvasElement} qrCanvas - The canvas element from QRCodeCanvas
 * @param {string} eventName - Event name (truncated if > 40 chars)
 * @param {string} pin - The event PIN
 */
export async function downloadQRImage(qrCanvas, eventName, pin) {
  const padding = 40;
  const qrSize = qrCanvas.width;
  const width = qrSize + padding * 2;
  const textAreaHeight = 80;
  const height = qrSize + padding * 2 + textAreaHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize);

  const displayName =
    eventName.length > 40 ? eventName.slice(0, 37) + '...' : eventName;

  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';

  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(displayName, width / 2, qrSize + padding + 30);

  ctx.font = 'bold 24px monospace';
  const spacedPin = pin.split('').join('  ');
  ctx.fillText(`PIN: ${spacedPin}`, width / 2, qrSize + padding + 62);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invite-${eventName.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30)}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
