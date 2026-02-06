#!/usr/bin/env node
/**
 * Setup script for DynamoDB Local
 * Creates the table with the required schema for local development and testing
 * 
 * Usage:
 *   npm run dynamo:setup          - Create table if not exists
 *   npm run dynamo:reset          - Force recreate table (deletes existing data)
 */

import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'blueberry-pancake-dev';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const REGION = process.env.AWS_REGION || 'us-east-1';

const forceRecreate = process.argv.includes('--force');

const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
});

const tableDefinition = {
  TableName: TABLE_NAME,
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
    { AttributeName: 'GSI1PK', AttributeType: 'S' },
    { AttributeName: 'GSI1SK', AttributeType: 'S' },
  ],
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },
    { AttributeName: 'SK', KeyType: 'RANGE' },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'GSI1',
      KeySchema: [
        { AttributeName: 'GSI1PK', KeyType: 'HASH' },
        { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
      ],
      Projection: {
        ProjectionType: 'ALL',
      },
    },
  ],
  BillingMode: 'PAY_PER_REQUEST',
};

async function tableExists() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    return true;
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

async function deleteTable() {
  console.log(`[DynamoDB Setup] Deleting table: ${TABLE_NAME}...`);
  await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
  
  // Wait for table to be deleted
  let attempts = 0;
  while (attempts < 30) {
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log('[DynamoDB Setup] Table deleted successfully');
        return;
      }
      throw error;
    }
  }
  throw new Error('Timeout waiting for table deletion');
}

async function createTable() {
  console.log(`[DynamoDB Setup] Creating table: ${TABLE_NAME}...`);
  await client.send(new CreateTableCommand(tableDefinition));
  
  // Wait for table to be active
  let attempts = 0;
  while (attempts < 30) {
    const response = await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    if (response.Table?.TableStatus === 'ACTIVE') {
      console.log('[DynamoDB Setup] Table created successfully');
      console.log(`[DynamoDB Setup] Table schema:`);
      console.log(`  - Primary Key: PK (HASH), SK (RANGE)`);
      console.log(`  - GSI1: GSI1PK (HASH), GSI1SK (RANGE)`);
      console.log(`  - TTL Attribute: TTL (enabled in production)`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  throw new Error('Timeout waiting for table creation');
}

async function main() {
  console.log(`[DynamoDB Setup] Connecting to: ${ENDPOINT}`);
  console.log(`[DynamoDB Setup] Table name: ${TABLE_NAME}`);
  
  try {
    const exists = await tableExists();
    
    if (exists && forceRecreate) {
      await deleteTable();
      await createTable();
    } else if (exists) {
      console.log(`[DynamoDB Setup] Table already exists: ${TABLE_NAME}`);
      console.log('[DynamoDB Setup] Use --force to recreate the table');
    } else {
      await createTable();
    }
    
    console.log('[DynamoDB Setup] Setup complete!');
    console.log(`[DynamoDB Setup] Admin UI available at: http://localhost:8001`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      console.error('[DynamoDB Setup] ERROR: Cannot connect to DynamoDB Local');
      console.error('[DynamoDB Setup] Make sure Docker is running: npm run dynamo:start');
      process.exit(1);
    }
    console.error('[DynamoDB Setup] ERROR:', error.message);
    process.exit(1);
  }
}

main();
