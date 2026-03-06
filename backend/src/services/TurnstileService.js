import { isProduction } from '../utils/environment.js';
import loggerService from '../logging/Logger.js';

const TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_WINDOW_MS = 30_000;

class TurnstileService {
  constructor() {
    const prod = isProduction();
    let secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
      if (prod) {
        throw new Error('TURNSTILE_SECRET_KEY is required in production');
      }
      secret = TEST_SECRET_KEY;
    } else if (prod && secret === TEST_SECRET_KEY) {
      throw new Error('Turnstile test secret key is not allowed in production');
    }

    this.secret = secret;
    this._consecutiveFailures = 0;
    this._firstFailureAt = null;
  }

  async verify(token, remoteIP) {
    if (!token) {
      if (isProduction()) {
        loggerService.warn(`Turnstile token missing ip=${remoteIP} — rejected (production)`);
        return { success: false, errorCodes: ['missing-input-response'] };
      }
      loggerService.warn(`Turnstile token missing ip=${remoteIP} (fail-open, non-production)`);
      return { success: true, failOpen: true };
    }

    try {
      const res = await fetch(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: this.secret,
          response: token,
          remoteip: remoteIP ?? undefined
        }),
        signal: AbortSignal.timeout(5000)
      });

      const result = await res.json();
      const success = result.success === true;
      const errorCodes = result['error-codes'] || [];

      if (success) {
        this._resetCircuitBreaker();
      } else {
        loggerService.warn(`Turnstile verification rejected ip=${remoteIP} errorCodes=${JSON.stringify(errorCodes)}`);
      }

      return { success, errorCodes };
    } catch (err) {
      return this._handleVerifyError(err, remoteIP);
    }
  }

  _handleVerifyError(err, remoteIP) {
    const now = Date.now();

    if (this._firstFailureAt && (now - this._firstFailureAt) > CIRCUIT_BREAKER_WINDOW_MS) {
      this._resetCircuitBreaker();
    }

    if (this._firstFailureAt === null) {
      this._firstFailureAt = now;
    }
    this._consecutiveFailures++;

    if (this._consecutiveFailures > CIRCUIT_BREAKER_THRESHOLD) {
      loggerService.warn(
        `Turnstile siteverify unreachable ip=${remoteIP} — circuit breaker OPEN ` +
        `(${this._consecutiveFailures} consecutive failures): ${err.message}`
      );
      return { success: false, errorCodes: ['siteverify-unreachable'] };
    }

    loggerService.warn(
      `Turnstile siteverify unreachable ip=${remoteIP} (fail-open, ` +
      `failure ${this._consecutiveFailures}/${CIRCUIT_BREAKER_THRESHOLD}): ${err.message}`
    );
    return { success: true, failOpen: true };
  }

  _resetCircuitBreaker() {
    this._consecutiveFailures = 0;
    this._firstFailureAt = null;
  }
}

export default new TurnstileService();
