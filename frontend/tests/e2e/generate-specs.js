#!/usr/bin/env node

/**
 * Build script to generate .spec files from .feature files
 * Converts Gherkin features to Playwright test specs
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const featuresDir = join(__dirname, 'features');
const specsDir = join(__dirname, 'specs');

async function generateSpecs() {
  try {
    // Ensure specs directory exists
    await mkdir(specsDir, { recursive: true });

    // Read all .feature files
    const files = await readdir(featuresDir);
    const featureFiles = files.filter(f => f.endsWith('.feature'));

    console.log(`Found ${featureFiles.length} feature file(s)`);

    for (const featureFile of featureFiles) {
      const featurePath = join(featuresDir, featureFile);
      const featureContent = await readFile(featurePath, 'utf-8');
      
      // Generate spec file name
      const specFileName = featureFile.replace('.feature', '.spec.js');
      const specPath = join(specsDir, specFileName);

      // Generate basic spec file structure
      const specContent = `/**
 * Generated spec file from ${featureFile}
 * DO NOT EDIT - This file is auto-generated from .feature file
 * Edit the .feature file instead and regenerate
 */

import { test, expect } from '@playwright/test';

// Note: This is a placeholder spec file
// For full Gherkin support, use Cucumber step definitions
// Run: npm run test:e2e to execute Cucumber tests

test('${featureFile} - Placeholder', async ({ page }) => {
  // This spec is generated from ${featureFile}
  // Use Cucumber for full BDD testing: npm run test:e2e
  test.skip();
});
`;

      await writeFile(specPath, specContent);
      console.log(`Generated: ${specFileName}`);
    }

    console.log('Spec generation complete');
  } catch (error) {
    console.error('Error generating specs:', error);
    process.exit(1);
  }
}

generateSpecs();
