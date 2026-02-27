import turnstileService from '../services/TurnstileService.js';
import loggerService from '../logging/Logger.js';

export async function verifyTurnstile(req, res) {
  const turnstileToken = req.body?.turnstileToken ?? req.query?.turnstileToken;
  const clientIP = req.ip ?? req.headers['x-forwarded-for'];

  const result = await turnstileService.verify(turnstileToken, clientIP);

  if (result.success) {
    return { success: true };
  }

  loggerService.warn('Turnstile verification failed', {
    ip: clientIP,
    path: req.originalUrl,
    errorCodes: result.errorCodes
  });
  res.status(400).json({ error: 'Request could not be processed. Please try again.' });
  return { success: false };
}
