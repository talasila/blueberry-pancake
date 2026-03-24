/**
 * Custom Playwright reporter:
 * - Compact list output (strips project name and test directory prefix)
 * - Prints exact re-run command for each failed test
 */
import path from 'path';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

class RerunReporter {
  constructor() {
    this.failures = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.total = 0;
  }

  onBegin(config, suite) {
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
      this.failures.push({ title, cmd });
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
      console.log(`\n${red('── Re-run failed tests ──')}\n`);
      for (const { title, cmd } of this.failures) {
        console.log(`  ${dim(`# ${title}`)}`);
        console.log(`  ${cmd}\n`);
      }
    }
  }
}

export default RerunReporter;
