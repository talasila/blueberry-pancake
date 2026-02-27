export function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod';
}

export function isTest() {
  return process.env.NODE_ENV === 'test';
}

export function isDevelopment() {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
}

export function assertNodeEnvSet() {
  if (!process.env.NODE_ENV) {
    throw new Error('NODE_ENV must be set explicitly (production, development, or test)');
  }
}
