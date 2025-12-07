import configLoader from './configLoader.js';

/**
 * Configuration validator
 * Validates required fields and types from application configuration
 */
class ConfigValidator {
  /**
   * Validate all configuration
   * @returns {object} Validation result with isValid flag and errors array
   */
  validate() {
    const errors = [];
    const config = configLoader.getAll();

    // Validate environment
    if (!config.environment || !['development', 'staging', 'production'].includes(config.environment)) {
      errors.push('environment must be one of: development, staging, production');
    }

    // Validate dataDirectory
    if (!config.dataDirectory || typeof config.dataDirectory !== 'string') {
      errors.push('dataDirectory must be a valid string path');
    }

    // Validate server configuration
    if (!config.server) {
      errors.push('server configuration is required');
    } else {
      if (!config.server.port || typeof config.server.port !== 'number' || 
          config.server.port < 1 || config.server.port > 65535) {
        errors.push('server.port must be a valid port number (1-65535)');
      }
      if (!config.server.host || typeof config.server.host !== 'string') {
        errors.push('server.host must be a valid string');
      }
    }

    // Validate cache configuration
    if (!config.cache) {
      errors.push('cache configuration is required');
    } else {
      if (typeof config.cache.enabled !== 'boolean') {
        errors.push('cache.enabled must be a boolean');
      }
      if (!config.cache.ttl || typeof config.cache.ttl !== 'number' || config.cache.ttl <= 0) {
        errors.push('cache.ttl must be a positive integer (seconds)');
      }
      if (!config.cache.maxSize || typeof config.cache.maxSize !== 'number' || config.cache.maxSize <= 0) {
        errors.push('cache.maxSize must be a positive integer');
      }
    }

    // Validate security configuration
    if (!config.security) {
      errors.push('security configuration is required');
    } else {
      if (!config.security.jwtSecret || typeof config.security.jwtSecret !== 'string') {
        errors.push('security.jwtSecret must be a valid string (should reference environment variable)');
      }
      if (config.security.jwtSecret === 'CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR' && 
          config.environment === 'production') {
        errors.push('security.jwtSecret must be set via environment variable in production');
      }
      if (config.security.jwtExpiration && typeof config.security.jwtExpiration !== 'string') {
        errors.push('security.jwtExpiration must be a valid string (e.g., "24h")');
      }
      if (typeof config.security.xsrfEnabled !== 'boolean') {
        errors.push('security.xsrfEnabled must be a boolean');
      }
    }

    // Validate frontend configuration
    if (!config.frontend) {
      errors.push('frontend configuration is required');
    } else {
      if (!config.frontend.apiBaseUrl || typeof config.frontend.apiBaseUrl !== 'string') {
        errors.push('frontend.apiBaseUrl must be a valid URL string');
      }
    }

    // Validate logging configuration (optional, but if present must be valid)
    if (config.logging) {
      if (typeof config.logging.enabled !== 'undefined' && typeof config.logging.enabled !== 'boolean') {
        errors.push('logging.enabled must be a boolean');
      }
      if (config.logging.directory && typeof config.logging.directory !== 'string') {
        errors.push('logging.directory must be a valid string path');
      }
      if (config.logging.level && !['error', 'warn', 'info', 'debug'].includes(config.logging.level)) {
        errors.push('logging.level must be one of: error, warn, info, debug');
      }
      if (config.logging.maxFileSize && (typeof config.logging.maxFileSize !== 'number' || config.logging.maxFileSize <= 0)) {
        errors.push('logging.maxFileSize must be a positive number (bytes)');
      }
      if (config.logging.maxFiles && (typeof config.logging.maxFiles !== 'number' || config.logging.maxFiles <= 0)) {
        errors.push('logging.maxFiles must be a positive integer');
      }
      if (typeof config.logging.console !== 'undefined' && typeof config.logging.console !== 'boolean') {
        errors.push('logging.console must be a boolean');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate and throw if invalid
   * @throws {Error} If configuration is invalid
   */
  validateOrThrow() {
    const result = this.validate();
    if (!result.isValid) {
      throw new Error(`Configuration validation failed:\n${result.errors.join('\n')}`);
    }
  }
}

export default new ConfigValidator();
