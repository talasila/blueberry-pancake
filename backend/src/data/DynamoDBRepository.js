/**
 * DynamoDB-based data repository implementation
 * Implements single-table design for event isolation
 * 
 * Single-Table Design Schema:
 * 
 * | Entity       | PK                   | SK                           | GSI1PK   | GSI1SK        |
 * |--------------|----------------------|------------------------------|----------|---------------|
 * | Event Config | EVENT#{eventId}      | CONFIG                       | EVENTS   | {createdAt}   |
 * | Rating       | EVENT#{eventId}      | RATING#{email}#{itemId}      | -        | -             |
 * | Bookmark     | EVENT#{eventId}      | BOOKMARK#{email}             | -        | -             |
 * | Dashboard    | EVENT#{eventId}      | DASHBOARD                    | -        | -             |
 * | OTP          | OTP#{email}          | OTP                          | -        | -             |
 * | RateLimit    | RATELIMIT#{id}#{act} | RATELIMIT                    | -        | -             |
 * | Suspension   | SUSPENSION#{email}   | SUSPENSION                   | -        | -             |
 * | FailedAttempt| FAILED#{email}       | FAILED                       | -        | -             |
 * | PINSession   | PINSESSION#{sid}     | PINSESSION                   | EVENT#{eventId} | PINSESSION#{sid} |
 * | SimilarUsers | SIMILAR#{eventId}    | SIMILAR#{email}              | -        | -             |
 * | RefreshToken | REFRESH#{hash}       | REFRESH                      | -        | -             |
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import DataRepository from './DataRepository.js';

class DynamoDBRepository extends DataRepository {
  constructor() {
    super();
    this.client = null;
    this.docClient = null;
    this.tableName = null;
    this.initialized = false;
  }

  /**
   * Initialize DynamoDB client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Get configuration from environment
    this.tableName = process.env.DYNAMODB_TABLE || 'blueberry-pancake-dev';
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    const region = process.env.AWS_REGION || 'us-east-1';

    const clientConfig = { region };

    // For local development with DynamoDB Local
    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
      };
    }

    this.client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
    });

    this.initialized = true;
    console.log(`[DynamoDB] Initialized: table=${this.tableName}, endpoint=${endpoint || 'AWS'}`);
  }

  /**
   * BatchWrite with automatic retry for UnprocessedItems (exponential backoff).
   */
  async _batchWrite(deleteItems) {
    const BATCH_SIZE = 25;
    const MAX_RETRIES = 3;

    for (let i = 0; i < deleteItems.length; i += BATCH_SIZE) {
      let requests = deleteItems.slice(i, i + BATCH_SIZE).map(item => ({
        DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
      }));

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const result = await this.docClient.send(new BatchWriteCommand({
          RequestItems: { [this.tableName]: requests },
        }));

        const unprocessed = result.UnprocessedItems?.[this.tableName];
        if (!unprocessed || unprocessed.length === 0) break;

        if (attempt === MAX_RETRIES) {
          throw new Error(`BatchWrite failed after ${MAX_RETRIES} retries, ${unprocessed.length} items unprocessed`);
        }

        requests = unprocessed;
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt)));
      }
    }
  }

  /**
   * Paginated Query that follows LastEvaluatedKey to return all items.
   */
  async _queryAll(params) {
    const allItems = [];
    let lastKey = undefined;

    do {
      const response = await this.docClient.send(new QueryCommand({
        ...params,
        ExclusiveStartKey: lastKey,
      }));
      allItems.push(...(response.Items || []));
      lastKey = response.LastEvaluatedKey;
    } while (lastKey);

    return allItems;
  }

  // ==================== KEY BUILDERS ====================

  eventPK(eventId) {
    return `EVENT#${eventId}`;
  }

  configSK() {
    return 'CONFIG';
  }

  ratingSK(email, itemId) {
    return `RATING#${email.toLowerCase()}#${itemId}`;
  }

  dashboardSK() {
    return 'DASHBOARD';
  }

  otpPK(email) {
    return `OTP#${email.toLowerCase()}`;
  }

  rateLimitPK(identifier, action) {
    return `RATELIMIT#${identifier}#${action}`;
  }

  suspensionPK(email) {
    return `SUSPENSION#${email.toLowerCase()}`;
  }

  failedAttemptsPK(email) {
    return `FAILED#${email.toLowerCase()}`;
  }

  pinSessionPK(sessionId) {
    return `PINSESSION#${sessionId}`;
  }

  similarUsersPK(eventId) {
    return `SIMILAR#${eventId}`;
  }

  similarUsersSK(email) {
    return `SIMILAR#${email.toLowerCase()}`;
  }

  bookmarkSK(email) {
    return `BOOKMARK#${email.toLowerCase()}`;
  }

  // ==================== EVENT CONFIG ====================

  async readEventConfig(eventId) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.configSK(),
      },
    }));

    if (!response.Item) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Remove DynamoDB keys from returned config
    const { PK, SK, GSI1PK, GSI1SK, ...config } = response.Item;
    return config;
  }

  async writeEventConfig(eventId, config) {
    await this.initialize();

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.eventPK(eventId),
        SK: this.configSK(),
        GSI1PK: 'EVENTS',
        GSI1SK: config.createdAt || new Date().toISOString(),
        ...config,
      },
    }));
  }

  async eventExists(eventId) {
    await this.initialize();

    try {
      const response = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: this.eventPK(eventId),
          SK: this.configSK(),
        },
        ProjectionExpression: 'PK',
      }));
      return !!response.Item;
    } catch {
      return false;
    }
  }

  async listEvents() {
    await this.initialize();

    const items = await this._queryAll({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'EVENTS',
      },
      ProjectionExpression: 'eventId',
    });

    return items.map(item => item.eventId);
  }

  async deleteEvent(eventId) {
    await this.initialize();

    const eventItems = await this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': this.eventPK(eventId) },
      ProjectionExpression: 'PK, SK',
    });

    if (eventItems.length === 0) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const similarItems = await this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': this.similarUsersPK(eventId) },
      ProjectionExpression: 'PK, SK',
    });

    await this.deleteEventPINSessions(eventId);
    await this.resetRateLimit(eventId, 'pin');
    await this._batchWrite([...eventItems, ...similarItems]);
  }

  /**
   * Atomically transition event state with optimistic locking
   * Uses DynamoDB conditional expressions to prevent race conditions
   */
  async transitionEventState(eventId, newState, expectedState) {
    await this.initialize();

    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: this.eventPK(eventId),
          SK: this.configSK(),
        },
        UpdateExpression: 'SET #state = :newState, updatedAt = :now',
        ConditionExpression: '#state = :expectedState',
        ExpressionAttributeNames: {
          '#state': 'state',
        },
        ExpressionAttributeValues: {
          ':newState': newState,
          ':expectedState': expectedState,
          ':now': new Date().toISOString(),
        },
      }));
      return { success: true };
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        // Optimistic lock failed - state was changed by another request
        return { success: false, reason: 'state_conflict' };
      }
      throw error;
    }
  }

  /**
   * Atomically register a user for an event
   * Uses DynamoDB UpdateExpression to prevent concurrent registration race conditions
   * Only adds the user if they don't already exist (if_not_exists)
   */
  async registerUserAtomic(eventId, email, registeredAt, name = undefined) {
    await this.initialize();

    const normalizedEmail = email.toLowerCase();
    const userData = { registeredAt, ...(name && { name }) };

    try {
      const result = await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: this.eventPK(eventId),
          SK: this.configSK(),
        },
        UpdateExpression: 'SET #users.#email = if_not_exists(#users.#email, :userData), updatedAt = :now',
        ConditionExpression: 'attribute_exists(PK)',
        ExpressionAttributeNames: {
          '#users': 'users',
          '#email': normalizedEmail,
        },
        ExpressionAttributeValues: {
          ':userData': userData,
          ':now': new Date().toISOString(),
        },
        ReturnValues: 'UPDATED_OLD',
      }));
      const alreadyExists = !!result.Attributes?.users?.[normalizedEmail];
      return { registered: true, alreadyExists };
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error(`Event not found: ${eventId}`);
      }
      throw error;
    }
  }

  /**
   * Atomically add an administrator to an event
   * Uses DynamoDB conditional expressions to prevent duplicate administrator race conditions
   * Fails if administrator already exists
   */
  async addAdministratorAtomic(eventId, email, assignedAt) {
    await this.initialize();

    const normalizedEmail = email.toLowerCase();

    try {
      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: this.eventPK(eventId),
          SK: this.configSK(),
        },
        UpdateExpression: 'SET #admins.#email = :adminData, #users.#email = if_not_exists(#users.#email, :userData), updatedAt = :now',
        ConditionExpression: 'attribute_exists(PK) AND attribute_not_exists(#admins.#email)',
        ExpressionAttributeNames: {
          '#admins': 'administrators',
          '#users': 'users',
          '#email': normalizedEmail,
        },
        ExpressionAttributeValues: {
          ':adminData': { assignedAt, owner: false },
          ':userData': { registeredAt: assignedAt },
          ':now': new Date().toISOString(),
        },
      }));
      return { added: true, alreadyExists: false };
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        // Check if it's because event doesn't exist or admin already exists
        // We need to distinguish these cases
        const event = await this.readEventConfig(eventId).catch(() => null);
        if (!event) {
          throw new Error(`Event not found: ${eventId}`);
        }
        // Admin already exists
        return { added: false, alreadyExists: true };
      }
      throw error;
    }
  }

  // ==================== RATINGS ====================

  async getRatings(eventId) {
    await this.initialize();

    const items = await this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': this.eventPK(eventId),
        ':prefix': 'RATING#',
      },
    });

    return items.map(({ PK, SK, ...rating }) => rating);
  }

  async addRating(eventId, rating) {
    await this.initialize();

    const timestamp = rating.timestamp || new Date().toISOString();
    const email = rating.email.toLowerCase();

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.eventPK(eventId),
        SK: this.ratingSK(email, rating.itemId),
        email,
        eventId,
        itemId: rating.itemId,
        rating: rating.rating,
        note: rating.note || null,
        timestamp,
      },
    }));
  }

  async updateRating(eventId, email, itemId, updates) {
    await this.initialize();

    const normalizedEmail = email.toLowerCase();
    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    if (updates.rating !== undefined) {
      updateExpressions.push('#rating = :rating');
      expressionValues[':rating'] = updates.rating;
      expressionNames['#rating'] = 'rating';
    }

    if (updates.note !== undefined) {
      updateExpressions.push('#note = :note');
      expressionValues[':note'] = updates.note;
      expressionNames['#note'] = 'note';
    }

    updateExpressions.push('#timestamp = :timestamp');
    expressionValues[':timestamp'] = new Date().toISOString();
    expressionNames['#timestamp'] = 'timestamp';

    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.ratingSK(normalizedEmail, itemId),
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
    }));
  }

  async deleteRating(eventId, email, itemId) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.ratingSK(email.toLowerCase(), itemId),
      },
    }));
  }

  async deleteAllRatings(eventId) {
    await this.initialize();

    const items = await this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': this.eventPK(eventId),
        ':prefix': 'RATING#',
      },
      ProjectionExpression: 'PK, SK',
    });

    if (items.length === 0) return;
    await this._batchWrite(items);
  }

  async getUserRatings(eventId, email) {
    await this.initialize();

    const normalizedEmail = email.toLowerCase();
    const items = await this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': this.eventPK(eventId),
        ':prefix': `RATING#${normalizedEmail}#`,
      },
    });

    return items.map(({ PK, SK, ...rating }) => rating);
  }

  async getRating(eventId, email, itemId) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.ratingSK(email.toLowerCase(), itemId),
      },
    }));

    if (!response.Item) {
      return null;
    }

    const { PK, SK, ...rating } = response.Item;
    return rating;
  }

  // ==================== DASHBOARD CACHE ====================

  async getDashboardCache(eventId) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.dashboardSK(),
      },
    }));

    if (!response.Item) {
      return null;
    }

    // Check if expired (TTL is in seconds since epoch)
    if (response.Item.TTL && response.Item.TTL < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const { PK, SK, TTL, ...dashboard } = response.Item;
    return dashboard;
  }

  async setDashboardCache(eventId, data, ttlSeconds = 300) {
    await this.initialize();

    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.eventPK(eventId),
        SK: this.dashboardSK(),
        TTL: ttl,
        cachedAt: new Date().toISOString(),
        ...data,
      },
    }));
  }

  async deleteDashboardCache(eventId) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.dashboardSK(),
      },
    }));
  }

  // ==================== OTP ====================

  async setOTP(email, code, ttlSeconds = 600) {
    await this.initialize();

    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;
    const normalizedEmail = email.toLowerCase();

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.otpPK(normalizedEmail),
        SK: 'OTP',
        TTL: ttl,
        email: normalizedEmail,
        code,
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
    }));
  }

  async getOTP(email) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.otpPK(email.toLowerCase()),
        SK: 'OTP',
      },
    }));

    if (!response.Item) {
      return null;
    }

    // Check if expired
    if (response.Item.TTL && response.Item.TTL < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const { PK, SK, TTL, ...otp } = response.Item;
    return otp;
  }

  async deleteOTP(email) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.otpPK(email.toLowerCase()),
        SK: 'OTP',
      },
    }));
  }

  async incrementOTPAttempts(email) {
    await this.initialize();

    const response = await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: this.otpPK(email.toLowerCase()),
        SK: 'OTP',
      },
      UpdateExpression: 'SET attempts = if_not_exists(attempts, :zero) + :inc',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
      },
      ReturnValues: 'UPDATED_NEW',
    }));

    return response.Attributes?.attempts || 1;
  }

  // ==================== RATE LIMITING ====================

  async incrementRateLimit(identifier, action, windowSeconds = 900) {
    await this.initialize();

    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + windowSeconds;

    try {
      const response = await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: this.rateLimitPK(identifier, action),
          SK: 'RATELIMIT',
        },
        UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc, windowStart = if_not_exists(windowStart, :now), #ttl = :ttl',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#ttl': 'TTL',
        },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':now': now.toISOString(),
          ':ttl': ttl,
        },
        ReturnValues: 'ALL_NEW',
      }));

      return {
        count: response.Attributes?.count || 1,
        windowStart: response.Attributes?.windowStart || now.toISOString(),
      };
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        const windowStart = now.toISOString();
        await this.docClient.send(new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: this.rateLimitPK(identifier, action),
            SK: 'RATELIMIT',
            TTL: ttl,
            count: 1,
            windowStart,
          },
        }));
        return { count: 1, windowStart };
      }
      throw error;
    }
  }

  async getRateLimit(identifier, action) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.rateLimitPK(identifier, action),
        SK: 'RATELIMIT',
      },
    }));

    if (!response.Item) {
      return null;
    }

    // Check if expired
    if (response.Item.TTL && response.Item.TTL < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      count: response.Item.count || 0,
      windowStart: response.Item.windowStart,
    };
  }

  async resetRateLimit(identifier, action) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.rateLimitPK(identifier, action),
        SK: 'RATELIMIT',
      },
    }));
  }

  // ==================== SUSPENSION ====================

  async suspendUser(email, reason, durationSeconds = 86400) {
    await this.initialize();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationSeconds * 1000);
    const ttl = Math.floor(expiresAt.getTime() / 1000);
    const normalizedEmail = email.toLowerCase();

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.suspensionPK(normalizedEmail),
        SK: 'SUSPENSION',
        TTL: ttl,
        email: normalizedEmail,
        reason,
        suspendedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    }));
  }

  async getSuspension(email) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.suspensionPK(email.toLowerCase()),
        SK: 'SUSPENSION',
      },
    }));

    if (!response.Item) {
      return null;
    }

    // Check if expired
    if (response.Item.TTL && response.Item.TTL < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const { PK, SK, TTL, ...suspension } = response.Item;
    return suspension;
  }

  async removeSuspension(email) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.suspensionPK(email.toLowerCase()),
        SK: 'SUSPENSION',
      },
    }));
  }

  async incrementFailedAttempts(email, windowSeconds = 900) {
    await this.initialize();

    const now = new Date();
    const ttl = Math.floor(now.getTime() / 1000) + windowSeconds;
    const normalizedEmail = email.toLowerCase();

    try {
      const response = await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: this.failedAttemptsPK(normalizedEmail),
          SK: 'FAILED',
        },
        UpdateExpression: 'SET #count = if_not_exists(#count, :zero) + :inc, #ttl = :ttl',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#ttl': 'TTL',
        },
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':ttl': ttl,
        },
        ReturnValues: 'UPDATED_NEW',
      }));

      return response.Attributes?.count || 1;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        await this.docClient.send(new PutCommand({
          TableName: this.tableName,
          Item: {
            PK: this.failedAttemptsPK(normalizedEmail),
            SK: 'FAILED',
            TTL: ttl,
            count: 1,
          },
        }));
        return 1;
      }
      throw error;
    }
  }

  async resetFailedAttempts(email) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.failedAttemptsPK(email.toLowerCase()),
        SK: 'FAILED',
      },
    }));
  }

  // ==================== PIN SESSIONS ====================

  async createPINSession(sessionId, data, ttlSeconds = 14400) {
    await this.initialize();

    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.pinSessionPK(sessionId),
        SK: 'PINSESSION',
        GSI1PK: this.eventPK(data.eventId),
        GSI1SK: `PINSESSION#${sessionId}`,
        TTL: ttl,
        sessionId,
        ...data,
        createdAt: new Date().toISOString(),
      },
    }));
  }

  async getPINSession(sessionId) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.pinSessionPK(sessionId),
        SK: 'PINSESSION',
      },
    }));

    if (!response.Item) {
      return null;
    }

    // Check if expired
    if (response.Item.TTL && response.Item.TTL < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const { PK, SK, GSI1PK, GSI1SK, TTL, ...session } = response.Item;
    return session;
  }

  async deletePINSession(sessionId) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.pinSessionPK(sessionId),
        SK: 'PINSESSION',
      },
    }));
  }

  async deleteEventPINSessions(eventId) {
    await this.initialize();

    const items = await this._queryAll({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': this.eventPK(eventId),
        ':prefix': 'PINSESSION#',
      },
      ProjectionExpression: 'PK, SK',
    });

    if (items.length === 0) return;
    await this._batchWrite(items);
  }

  // ==================== SIMILAR USERS CACHE ====================

  async getSimilarUsersCache(eventId, email) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.similarUsersPK(eventId),
        SK: this.similarUsersSK(email),
      },
    }));

    if (!response.Item) {
      return null;
    }

    // Check if expired
    if (response.Item.TTL && response.Item.TTL < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const { PK, SK, TTL, ...data } = response.Item;
    return data;
  }

  async setSimilarUsersCache(eventId, email, data, ttlSeconds = 30) {
    await this.initialize();

    const ttl = Math.floor(Date.now() / 1000) + ttlSeconds;

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.similarUsersPK(eventId),
        SK: this.similarUsersSK(email),
        TTL: ttl,
        cachedAt: new Date().toISOString(),
        ...data,
      },
    }));
  }

  async deleteAllSimilarUsersCache(eventId) {
    await this.initialize();

    const items = await this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': this.similarUsersPK(eventId),
        ':prefix': 'SIMILAR#',
      },
      ProjectionExpression: 'PK, SK',
    });

    if (items.length === 0) return;
    await this._batchWrite(items);
  }

  // ==================== BOOKMARKS ====================

  async getBookmarks(eventId, email) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.bookmarkSK(email),
      },
    }));

    if (!response.Item) {
      return [];
    }

    return response.Item.bookmarks || [];
  }

  async saveBookmarks(eventId, email, bookmarks) {
    await this.initialize();

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: this.eventPK(eventId),
        SK: this.bookmarkSK(email),
        email: email.toLowerCase(),
        bookmarks: bookmarks,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  async deleteBookmarks(eventId, email) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: this.eventPK(eventId),
        SK: this.bookmarkSK(email),
      },
    }));
  }

  async deleteAllBookmarks(eventId) {
    await this.initialize();

    const items = await this._queryAll({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': this.eventPK(eventId),
        ':sk': 'BOOKMARK#',
      },
      ProjectionExpression: 'PK, SK',
    });

    if (items.length === 0) return;
    await this._batchWrite(items);
  }

  // ==================== REFRESH TOKENS ====================

  async storeRefreshToken(tokenHash, email, expiresAt) {
    await this.initialize();

    const ttl = Math.floor(expiresAt / 1000);

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `REFRESH#${tokenHash}`,
        SK: 'REFRESH',
        email,
        createdAt: new Date().toISOString(),
        expiresAt,
        TTL: ttl,
      },
    }));
  }

  async getRefreshToken(tokenHash) {
    await this.initialize();

    const response = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `REFRESH#${tokenHash}`,
        SK: 'REFRESH',
      },
    }));

    if (!response.Item) return null;

    if (response.Item.TTL && response.Item.TTL < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      email: response.Item.email,
      createdAt: response.Item.createdAt,
      expiresAt: response.Item.expiresAt,
    };
  }

  async deleteRefreshToken(tokenHash) {
    await this.initialize();

    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `REFRESH#${tokenHash}`,
        SK: 'REFRESH',
      },
    }));
  }

  async deleteRefreshTokensByEmail(email) {
    await this.initialize();

    // Paginated scan - rare operation (logout-all), TTL keeps table small
    const allItems = [];
    let lastKey = undefined;

    do {
      const response = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'begins_with(PK, :prefix) AND email = :email',
        ExpressionAttributeValues: {
          ':prefix': 'REFRESH#',
          ':email': email,
        },
        ProjectionExpression: 'PK, SK',
        ExclusiveStartKey: lastKey,
      }));
      allItems.push(...(response.Items || []));
      lastKey = response.LastEvaluatedKey;
    } while (lastKey);

    if (allItems.length === 0) return 0;
    await this._batchWrite(allItems);
    return allItems.length;
  }

}

// Export singleton instance
const dynamoDBRepository = new DynamoDBRepository();
export { dynamoDBRepository };
export default dynamoDBRepository;
