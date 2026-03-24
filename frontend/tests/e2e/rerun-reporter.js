/**
 * Custom Playwright reporter:
 * - Compact list output (strips project name and test directory prefix)
 * - Prints full failure details (errors, screenshots, traces, error-context)
 * - Prints exact re-run command for each failed test
 */
import path from 'path';
import { formatFailure } from 'playwright/lib/reporters/base';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

/** Minimal screen object for formatFailure — matches Playwright's Screen interface. */
function makeScreen() {
  return {
    colors: {
      red: (s) => `\x1b[31m${s}\x1b[0m`,
      green: (s) => `\x1b[32m${s}\x1b[0m`,
      yellow: (s) => `\x1b[33m${s}\x1b[0m`,
      blue: (s) => `\x1b[34m${s}\x1b[0m`,
      cyan: (s) => `\x1b[36m${s}\x1b[0m`,
      dim: (s) => `\x1b[2m${s}\x1b[0m`,
      gray: (s) => `\x1b[90m${s}\x1b[0m`,
      bold: (s) => `\x1b[1m${s}\x1b[0m`,
      reset: (s) => `\x1b[0m${s}\x1b[0m`,
      enabled: true,
    },
    ttyWidth: process.stdout.columns || 120,
    resolveFiles: 'cwd',
  };
}

class RerunReporter {
  constructor() {
    this.failures = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.total = 0;
    this.config = null;
  }

  onBegin(config, suite) {
    this.config = config;
    this.total = suite.allTests().length;
    console.log(`\nRunning ${this.total} tests\n`);
  }

  onTestEnd(test, result) {
    const file = path.basename(test.location.file, '.spec.js');
    const line = test.location.line;
    const title = test.title;
    const duration = dim(`(${(result.duration / 1000).toFixed(1)}s)`);
    const count = this.passed + this.failed + this.skipped;

    if (result.status === 'passed') {
      this.passed++;
      console.log(`  ${green('✓')} ${dim(`${count}/${this.total}`)} ${file}:${line} › ${title} ${duration}`);
    } else if (result.status === 'failed' || result.status === 'timedOut') {
      this.failed++;
      console.log(`  ${red('✗')} ${dim(`${count}/${this.total}`)} ${file}:${line} › ${title} ${duration}`);
      const location = `${test.location.file}:${test.location.line}`;
      const project = test.parent?.project()?.name;
      const cmd = project
        ? `npx playwright test "${location}" --project="${project}"`
        : `npx playwright test "${location}"`;
      this.failures.push({ test, cmd });
    } else if (result.status === 'skipped') {
      this.skipped++;
      console.log(`  ${yellow('-')} ${dim(`${count}/${this.total}`)} ${file}:${line} › ${title} ${dim('(skipped)')}`);
    }
  }

  onEnd(result) {
    console.log('');
    const parts = [];
    if (this.passed) parts.push(green(`${this.passed} passed`));
    if (this.failed) parts.push(red(`${this.failed} failed`));
    if (this.skipped) parts.push(yellow(`${this.skipped} skipped`));
    console.log(`  ${parts.join(', ')} ${dim(`(${(result.duration / 1000).toFixed(1)}s)`)}`);

    if (this.failures.length > 0) {
      console.log(`\n${red('── Failed tests ──')}\n`);
      const screen = makeScreen();
      for (let i = 0; i < this.failures.length; i++) {
        const { test, cmd } = this.failures[i];
        console.log(formatFailure(screen, this.config, test, i + 1));
        console.log(`  ${dim('Re-run:')} ${cmd}\n`);
      }
    }
  }
}

export default RerunReporter;
