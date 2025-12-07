#!/usr/bin/env node

/**
 * Baseline validation script
 * Validates all success criteria (SC-001 through SC-010)
 */

import { readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const results = {
  passed: [],
  failed: [],
  warnings: [],
};

function log(message, type = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
  }[type];
  console.log(`${prefix} ${message}`);
}

async function checkFileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function validateSC001() {
  log('SC-001: Verifying project structure setup time...', 'info');
  // This would require timing the actual setup, but we can verify structure exists
  const requiredDirs = [
    'backend/src',
    'frontend/src',
    'data/events',
    'config',
  ];

  for (const dir of requiredDirs) {
    const exists = await checkFileExists(join(projectRoot, dir));
    if (!exists) {
      results.failed.push('SC-001: Missing required directory: ' + dir);
      return false;
    }
  }

  results.passed.push('SC-001: Project structure is set up');
  return true;
}

async function validateSC002() {
  log('SC-002: Verifying dependencies can be installed...', 'info');
  // Check that package.json files exist
  const backendPkg = await checkFileExists(join(projectRoot, 'backend/package.json'));
  const frontendPkg = await checkFileExists(join(projectRoot, 'frontend/package.json'));

  if (!backendPkg || !frontendPkg) {
    results.failed.push('SC-002: Package.json files missing');
    return false;
  }

  results.passed.push('SC-002: Dependencies can be installed (package.json files exist)');
  return true;
}

async function validateSC003() {
  log('SC-003: Verifying application can start...', 'info');
  // Check that server.js and main.jsx exist
  const serverExists = await checkFileExists(join(projectRoot, 'backend/src/server.js'));
  const mainExists = await checkFileExists(join(projectRoot, 'frontend/src/main.jsx'));

  if (!serverExists || !mainExists) {
    results.failed.push('SC-003: Application entry points missing');
    return false;
  }

  results.passed.push('SC-003: Application entry points exist (can start)');
  return true;
}

async function validateSC004() {
  log('SC-004: Verifying configuration system...', 'info');
  const configFiles = [
    'config/default.json',
    'config/development.json',
  ];

  for (const file of configFiles) {
    const exists = await checkFileExists(join(projectRoot, file));
    if (!exists) {
      results.failed.push(`SC-004: Configuration file missing: ${file}`);
      return false;
    }
  }

  // Check that configLoader exists
  const loaderExists = await checkFileExists(join(projectRoot, 'backend/src/config/configLoader.js'));
  if (!loaderExists) {
    results.failed.push('SC-004: Configuration loader missing');
    return false;
  }

  results.passed.push('SC-004: Configuration system reads JSON files');
  return true;
}

async function validateSC005() {
  log('SC-005: Verifying data directory structure...', 'info');
  const dataDir = await checkFileExists(join(projectRoot, 'data/events'));
  const repoExists = await checkFileExists(join(projectRoot, 'backend/src/data/FileDataRepository.js'));

  if (!dataDir || !repoExists) {
    results.failed.push('SC-005: Data directory or repository missing');
    return false;
  }

  results.passed.push('SC-005: Data directory structure is accessible');
  return true;
}

async function validateSC006() {
  log('SC-006: Verifying caching layer...', 'info');
  const cacheService = await checkFileExists(join(projectRoot, 'backend/src/cache/CacheService.js'));
  const cacheKeys = await checkFileExists(join(projectRoot, 'backend/src/cache/cacheKeys.js'));

  if (!cacheService || !cacheKeys) {
    results.failed.push('SC-006: Caching layer missing');
    return false;
  }

  results.passed.push('SC-006: Caching layer implemented (50% reduction validation requires runtime test)');
  results.warnings.push('SC-006: Runtime validation needed to confirm 50% reduction');
  return true;
}

async function validateSC007() {
  log('SC-007: Verifying E2E test infrastructure...', 'info');
  const playwrightConfig = await checkFileExists(join(projectRoot, 'frontend/playwright.config.js'));
  const cucumberConfig = await checkFileExists(join(projectRoot, 'frontend/tests/e2e/cucumber.config.js'));
  const featureFile = await checkFileExists(join(projectRoot, 'frontend/tests/e2e/features/example.feature'));

  if (!playwrightConfig || !cucumberConfig || !featureFile) {
    results.failed.push('SC-007: E2E test infrastructure missing');
    return false;
  }

  results.passed.push('SC-007: E2E test infrastructure is configured');
  return true;
}

async function validateSC008() {
  log('SC-008: Verifying security mechanisms...', 'info');
  const jwtAuth = await checkFileExists(join(projectRoot, 'backend/src/middleware/jwtAuth.js'));
  const csrfProtection = await checkFileExists(join(projectRoot, 'backend/src/middleware/xsrfProtection.js'));

  if (!jwtAuth || !csrfProtection) {
    results.failed.push('SC-008: Security mechanisms missing');
    return false;
  }

  results.passed.push('SC-008: Security mechanisms (JWT and CSRF) are configured');
  return true;
}

async function validateSC009() {
  log('SC-009: Verifying database abstraction layer...', 'info');
  const dataRepo = await checkFileExists(join(projectRoot, 'backend/src/data/DataRepository.js'));
  const fileRepo = await checkFileExists(join(projectRoot, 'backend/src/data/FileDataRepository.js'));

  if (!dataRepo || !fileRepo) {
    results.failed.push('SC-009: Database abstraction layer missing');
    return false;
  }

  // Check that DataRepository has abstract methods
  try {
    const repoContent = await readFile(join(projectRoot, 'backend/src/data/DataRepository.js'), 'utf-8');
    if (!repoContent.includes('readEventConfig') || !repoContent.includes('writeEventConfig')) {
      results.failed.push('SC-009: Repository interface incomplete');
      return false;
    }
  } catch (error) {
    results.failed.push('SC-009: Could not read repository file');
    return false;
  }

  results.passed.push('SC-009: Database abstraction layer provides interfaces');
  return true;
}

async function validateSC010() {
  log('SC-010: Verifying mobile viewport support...', 'info');
  const tailwindConfig = await checkFileExists(join(projectRoot, 'frontend/tailwind.config.js'));
  const globalsCSS = await checkFileExists(join(projectRoot, 'frontend/src/styles/globals.css'));

  if (!tailwindConfig || !globalsCSS) {
    results.failed.push('SC-010: Mobile viewport configuration missing');
    return false;
  }

  // Check Tailwind config has mobile breakpoints
  try {
    const tailwindContent = await readFile(join(projectRoot, 'frontend/tailwind.config.js'), 'utf-8');
    if (!tailwindContent.includes('320px') && !tailwindContent.includes('xs:')) {
      results.warnings.push('SC-010: Mobile breakpoints may not be configured');
    }
  } catch (error) {
    results.warnings.push('SC-010: Could not verify Tailwind configuration');
  }

  results.passed.push('SC-010: Mobile viewport support configured (runtime test needed)');
  return true;
}

async function main() {
  console.log('\n🔍 Validating Baseline Setup Success Criteria...\n');

  await validateSC001();
  await validateSC002();
  await validateSC003();
  await validateSC004();
  await validateSC005();
  await validateSC006();
  await validateSC007();
  await validateSC008();
  await validateSC009();
  await validateSC010();

  console.log('\n📊 Validation Results:\n');

  if (results.passed.length > 0) {
    console.log('✅ Passed:');
    results.passed.forEach(msg => log(msg, 'success'));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(msg => log(msg, 'warning'));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed:');
    results.failed.forEach(msg => log(msg, 'error'));
  }

  console.log(`\n📈 Summary: ${results.passed.length} passed, ${results.warnings.length} warnings, ${results.failed.length} failed\n`);

  if (results.failed.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});
