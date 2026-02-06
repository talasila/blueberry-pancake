/**
 * Lambda Handler
 * 
 * Wraps the Express application for AWS Lambda deployment.
 * Uses @codegenie/serverless-express to handle the Lambda-Express bridge.
 */

import serverlessExpress from '@codegenie/serverless-express';
import app from './app.js';

// Create the serverless-express handler
const serverlessExpressInstance = serverlessExpress({ app });

/**
 * Lambda handler function
 * 
 * Handles warmup events for keeping the Lambda warm,
 * then proxies all other events to the Express app.
 * 
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Promise<Object>} Lambda response
 */
export const handler = async (event, context) => {
  // Handle warmup events (from EventBridge Scheduler)
  if (event.source === 'aws.events' || event.warmup) {
    console.log('Warmup event received');
    return { statusCode: 200, body: 'Warmed up' };
  }

  // Proxy to Express app
  return serverlessExpressInstance(event, context);
};
