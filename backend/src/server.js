import app from './app.js';
import configLoader from './config/configLoader.js';
import loggerService from './logging/Logger.js';

const port = configLoader.get('server.port');
const host = configLoader.get('server.host');

const server = app.listen(port, host, async () => {
  await loggerService.info(`Server running at http://${host}:${port}`, {
    environment: configLoader.get('environment'),
    port,
    host,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await loggerService.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await loggerService.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  await loggerService.info('SIGINT received, shutting down gracefully');
  server.close(async () => {
    await loggerService.info('Server closed');
    process.exit(0);
  });
});
