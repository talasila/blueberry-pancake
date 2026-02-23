/**
 * Lambda Handler
 *
 * Wraps the Express application for AWS Lambda deployment.
 * Uses @codegenie/serverless-express to handle the Lambda-Express bridge.
 *
 * API Gateway HTTP API includes the stage in the path (e.g. /prod/api/csrf-token).
 * We strip the stage prefix so Express receives /api/csrf-token.
 */

import serverlessExpress from '@codegenie/serverless-express';
import app from './app.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const awsApiGatewayV2 = require('@codegenie/serverless-express/src/event-sources/aws/api-gateway-v2');

const stage = process.env.NODE_ENV || 'prod'; // NODE_ENV holds Environment (prod/dev/staging)
const basePath = `/${stage}`;

const customGetRequest = ({ event }) => {
  const result = awsApiGatewayV2.getRequest({ event });
  if (result.path.startsWith(basePath)) {
    result.path = result.path.slice(basePath.length) || '/';
  }
  return result;
};

const serverlessExpressInstance = serverlessExpress({
  app,
  eventSource: {
    ...awsApiGatewayV2,
    getRequest: customGetRequest,
  },
});

export const handler = async (event, context) => {
  if (event.source === 'aws.events' || event.warmup) {
    console.log('Warmup event received');
    return { statusCode: 200, body: 'Warmed up' };
  }
  return serverlessExpressInstance(event, context);
};
