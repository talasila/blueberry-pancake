import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { watch } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Lambda-only config: uses env vars, no config package (avoids bundling issues).
 * Used when AWS_LAMBDA_FUNCTION_NAME is set.
 */
function createLambdaConfig() {
  const frontendOrigin = process.env.FRONTEND_ORIGIN || process.env.FRONTEND_URL || '*';
  const jwtSecret = process.env.JWT_SECRET || '';
  const jwtExpiration = process.env.JWT_EXPIRATION || '24h';
  const refreshExpiration = process.env.REFRESH_TOKEN_EXPIRATION || '7d';
  const xsrfEnabled = process.env.XSRF_ENABLED !== 'false';
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com';
  const rootAdmins = process.env.ROOT_ADMIN_EMAILS
    ? process.env.ROOT_ADMIN_EMAILS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  const environment = process.env.NODE_ENV || 'production';

  const lambdaConfig = {
    environment,
    security: {
      jwtSecret,
      jwtExpiration,
      refreshTokenExpiration: refreshExpiration,
      xsrfEnabled,
    },
    frontend: { url: frontendOrigin, apiBaseUrl: frontendOrigin },
    email: { resendApiKey, fromAddress },
    rootAdmins,
    logging: { enabled: true, console: true, level: 'debug', file: false },
  };

  return {
    get(path) {
      const parts = path.split('.');
      let value = lambdaConfig;
      for (const p of parts) {
        value = value?.[p];
      }
      return value;
    },
    has(path) {
      return this.get(path) !== undefined;
    },
    getAll() {
      return {
        environment,
        dataDirectory: '/tmp',
        server: { port: 3001, host: '0.0.0.0' },
        cache: { enabled: true, ttl: 3600, flushInterval: 60, maxSize: 1000 },
        security: lambdaConfig.security,
        frontend: lambdaConfig.frontend,
        logging: lambdaConfig.logging,
      };
    },
    getRootAdmins: () => rootAdmins,
    isRootAdmin: (email) =>
      Boolean(email && typeof email === 'string' && rootAdmins.includes(email.toLowerCase())),
    onHotReload: () => {},
    enableHotReload: () => {},
    disableHotReload: () => {},
  };
}

/**
 * Config loader using config package (local dev).
 * Uses dynamic import so config can be marked external in Lambda builds.
 */
async function createNodeConfigLoader() {
  const { default: config } = await import('config');

  class ConfigLoader {
    constructor() {
      if (!process.env.NODE_CONFIG_DIR) {
        const projectRoot = join(__dirname, '../../..');
        process.env.NODE_CONFIG_DIR = join(projectRoot, 'config');
      }
      this.config = config;
      this.hotReloadCallbacks = new Set();
      this.watcher = null;
    }

    get(path) {
      return this.config.get(path);
    }

    has(path) {
      return this.config.has(path);
    }

    getAll() {
      return this.config.util.toObject();
    }

    onHotReload(callback) {
      this.hotReloadCallbacks.add(callback);
    }

    enableHotReload() {
      if (this.watcher) return;
      try {
        const configPath = join(__dirname, '../../../config');
        this.watcher = watch(configPath, { recursive: false }, (eventType, filename) => {
          if (filename?.endsWith('.json')) {
            this.config.util.loadFileConfigs();
            this.hotReloadCallbacks.forEach((cb) => {
              try {
                cb(this.getAll());
              } catch (e) {
                console.error('Error in hot-reload callback:', e);
              }
            });
          }
        });
      } catch (e) {
        console.warn('Could not enable config hot-reload:', e.message);
      }
    }

    disableHotReload() {
      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }
    }

    getRootAdmins() {
      if (!this.has('rootAdmins')) return [];
      const admins = this.get('rootAdmins');
      return Array.isArray(admins) ? admins.map((e) => e.toLowerCase()) : [];
    }

    isRootAdmin(email) {
      if (!email || typeof email !== 'string') return false;
      return this.getRootAdmins().includes(email.toLowerCase());
    }
  }

  return new ConfigLoader();
}

const configLoader =
  process.env.AWS_LAMBDA_FUNCTION_NAME
    ? createLambdaConfig()
    : await createNodeConfigLoader();

export default configLoader;
