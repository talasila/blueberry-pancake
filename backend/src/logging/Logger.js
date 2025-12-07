import { writeFile, appendFile, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import configLoader from '../config/configLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Logger service for application-wide logging
 * Supports file-based logging with rotation and console output
 */
class Logger {
  constructor() {
    this.initialized = false;
    this.logDirectory = null;
    this.currentLogFile = null;
    this.config = null;
    this.logLevel = 'info';
  }

  /**
   * Initialize the logger
   * Creates log directory and sets up file logging
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    this.config = configLoader.get('logging') || {};
    
    // Check if logging is enabled
    if (this.config.enabled === false) {
      this.initialized = true;
      return;
    }

    // Get log directory from config
    this.logDirectory = this.config.directory || './logs';
    
    // Resolve absolute path
    if (!this.logDirectory.startsWith('/')) {
      const projectRoot = join(__dirname, '../../..');
      this.logDirectory = join(projectRoot, this.logDirectory);
    }

    // Create log directory if it doesn't exist
    if (!existsSync(this.logDirectory)) {
      await mkdir(this.logDirectory, { recursive: true });
    }

    // Set log level
    this.logLevel = this.config.level || 'info';

    // Initialize current log file
    await this.rotateLogFileIfNeeded();

    this.initialized = true;
  }

  /**
   * Get current log file path
   * @returns {string} Path to current log file
   */
  getCurrentLogFile() {
    if (!this.logDirectory) {
      return null;
    }

    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return join(this.logDirectory, `app-${date}.log`);
  }

  /**
   * Check if log file needs rotation and rotate if necessary
   */
  async rotateLogFileIfNeeded() {
    if (!this.logDirectory) {
      return;
    }

    const logFile = this.getCurrentLogFile();
    
    // Check if file exists and exceeds max size
    if (existsSync(logFile)) {
      try {
        const stats = await stat(logFile);
        const maxSize = this.config.maxFileSize || 10 * 1024 * 1024; // 10MB default

        if (stats.size >= maxSize) {
          // Rotate: rename existing file with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedFile = join(this.logDirectory, `app-${timestamp}.log`);
          const { rename } = await import('fs/promises');
          await rename(logFile, rotatedFile);

          // Clean up old files if maxFiles is set
          await this.cleanupOldLogs();
        }
      } catch (error) {
        // If we can't check/rotate, continue with current file
        console.error('Error rotating log file:', error);
      }
    }

    this.currentLogFile = logFile;
  }

  /**
   * Clean up old log files, keeping only the most recent ones
   */
  async cleanupOldLogs() {
    if (!this.logDirectory) {
      return;
    }

    const maxFiles = this.config.maxFiles || 5;
    
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(this.logDirectory);
      
      // Filter log files and sort by modification time
      const logFiles = files
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: join(this.logDirectory, file)
        }));

      // Sort by name (which includes date) descending
      logFiles.sort((a, b) => b.name.localeCompare(a.name));

      // Remove files beyond maxFiles
      if (logFiles.length > maxFiles) {
        const { unlink } = await import('fs/promises');
        for (let i = maxFiles; i < logFiles.length; i++) {
          await unlink(logFiles[i].path).catch(() => {
            // Ignore errors deleting old logs
          });
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Check if a log level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} True if level should be logged
   */
  shouldLog(level) {
    if (!this.initialized || this.config.enabled === false) {
      return false;
    }

    const levelValue = LOG_LEVELS[level.toLowerCase()] ?? LOG_LEVELS.info;
    const configuredLevel = LOG_LEVELS[this.logLevel.toLowerCase()] ?? LOG_LEVELS.info;
    
    return levelValue <= configuredLevel;
  }

  /**
   * Format log message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   * @returns {string} Formatted log string
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(5);
    
    let logLine = `[${timestamp}] ${levelUpper} ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logLine += ` ${JSON.stringify(meta)}`;
    }
    
    return logLine;
  }

  /**
   * Write log to file
   * @param {string} message - Formatted log message
   */
  async writeToFile(message) {
    if (!this.initialized || this.config.enabled === false || !this.currentLogFile) {
      return;
    }

    try {
      // Rotate if needed before writing
      await this.rotateLogFileIfNeeded();
      
      // Append to log file
      await appendFile(this.currentLogFile, message + '\n', 'utf-8');
    } catch (error) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', error);
      console.log(message);
    }
  }

  /**
   * Write log to console if enabled
   * @param {string} level - Log level
   * @param {string} message - Formatted log message
   */
  writeToConsole(level, message) {
    const consoleEnabled = this.config.console !== false;
    
    if (!consoleEnabled) {
      return;
    }

    const levelLower = level.toLowerCase();
    
    switch (levelLower) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  /**
   * Log a message
   * @param {string} level - Log level (error, warn, info, debug)
   * @param {string} message - Log message
   * @param {object} meta - Additional metadata
   */
  async log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Write to console
    this.writeToConsole(level, formattedMessage);
    
    // Write to file
    await this.writeToFile(formattedMessage);
  }

  /**
   * Log error
   * @param {string} message - Error message
   * @param {object} meta - Additional metadata
   */
  async error(message, meta = {}) {
    await this.log('error', message, meta);
  }

  /**
   * Log warning
   * @param {string} message - Warning message
   * @param {object} meta - Additional metadata
   */
  async warn(message, meta = {}) {
    await this.log('warn', message, meta);
  }

  /**
   * Log info
   * @param {string} message - Info message
   * @param {object} meta - Additional metadata
   */
  async info(message, meta = {}) {
    await this.log('info', message, meta);
  }

  /**
   * Log debug
   * @param {string} message - Debug message
   * @param {object} meta - Additional metadata
   */
  async debug(message, meta = {}) {
    await this.log('debug', message, meta);
  }
}

// Export singleton instance
export default new Logger();
