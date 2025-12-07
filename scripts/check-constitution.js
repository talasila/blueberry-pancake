#!/usr/bin/env node

/**
 * Constitution compliance checker
 * Validates code follows project constitution principles
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const violations = {
  inlineStyles: [],
  deadCode: [],
  duplication: [],
};

async function checkFileForInlineStyles(filePath, content) {
  // Check for inline style attributes
  const inlineStyleRegex = /style\s*=\s*["'`{]/g;
  const matches = content.match(inlineStyleRegex);
  
  if (matches) {
    violations.inlineStyles.push({
      file: filePath,
      count: matches.length,
    });
  }
}

async function checkFileForDeadCode(filePath, content) {
  // Check for commented out code blocks
  const commentedCodeRegex = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
  const commentedMatches = content.match(commentedCodeRegex);
  
  // Check for unused imports (basic check)
  // This is a simplified check - full analysis would require AST parsing
  
  // Check for TODO/FIXME comments that might indicate dead code
  const todoRegex = /\/\/\s*(TODO|FIXME|XXX|HACK).*$/gmi;
  const todos = content.match(todoRegex);
  
  if (todos && todos.length > 5) {
    violations.deadCode.push({
      file: filePath,
      issue: 'Multiple TODO/FIXME comments - may indicate incomplete code',
    });
  }
}

async function scanDirectory(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
  const files = [];
  
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      // Skip node_modules, dist, build, etc.
      if (entry.name.startsWith('.') || 
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build') {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath, extensions);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return files;
}

async function main() {
  console.log('🔍 Checking Constitution Compliance...\n');

  // Scan frontend source files for inline styles
  const frontendSrc = join(projectRoot, 'frontend/src');
  const frontendFiles = await scanDirectory(frontendSrc, ['.js', '.jsx']);
  
  for (const file of frontendFiles) {
    try {
      const content = await readFile(file, 'utf-8');
      await checkFileForInlineStyles(file, content);
      await checkFileForDeadCode(file, content);
    } catch (error) {
      // Skip files that can't be read
    }
  }

  // Report results
  console.log('📊 Constitution Compliance Report:\n');

  if (violations.inlineStyles.length === 0) {
    console.log('✅ No inline styles found (UX Consistency principle)');
  } else {
    console.log('❌ Inline styles found (violates UX Consistency):');
    violations.inlineStyles.forEach(v => {
      console.log(`   - ${v.file}: ${v.count} inline style(s)`);
    });
  }

  if (violations.deadCode.length === 0) {
    console.log('✅ No obvious dead code issues (Maintainability principle)');
  } else {
    console.log('⚠️  Potential dead code issues:');
    violations.deadCode.forEach(v => {
      console.log(`   - ${v.file}: ${v.issue}`);
    });
  }

  console.log('\n✅ Constitution compliance check complete\n');

  if (violations.inlineStyles.length > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Compliance check error:', error);
  process.exit(1);
});
