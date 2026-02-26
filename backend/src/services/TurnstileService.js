const TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

class TurnstileService {
  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';
    let secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
      if (isProduction) {
        throw new Error('TURNSTILE_SECRET_KEY is required in production');
      }
      secret = TEST_SECRET_KEY;
    } else if (isProduction && secret === TEST_SECRET_KEY) {
      throw new Error('Turnstile test secret key is not allowed in production');
    }

    this.secret = secret;
  }

  async verify(token, remoteIP) {
    if (!token) {
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

      if (!success) {
        console.log(`Turnstile verification rejected ip=${remoteIP} errorCodes=${JSON.stringify(errorCodes)}`);
      }

      return { success, errorCodes };
    } catch (err) {
      console.warn(`Turnstile siteverify failed (fail-open): ${err.message}`);
      return { success: true, failOpen: true };
    }
  }
}

export default new TurnstileService();
