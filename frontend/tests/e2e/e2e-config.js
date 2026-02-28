/**
 * Shared configuration for E2E tests.
 * Single source of truth for URLs, credentials, and other shared constants.
 */

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
export const API_URL = process.env.API_URL || 'http://localhost:3001';
export const TEST_OTP = process.env.TEST_OTP || '123456';
export const DEFAULT_TEST_PIN = process.env.DEFAULT_TEST_PIN || '654321';
