/**
 * Cucumber configuration for Gherkin BDD testing
 * Integrates with Playwright for browser automation
 */
export default {
  features: ['./features/**/*.feature'],
  steps: ['./step-definitions/**/*.steps.js'],
  format: [
    'json:./reports/cucumber-report.json',
    'html:./reports/cucumber-report.html',
    'summary',
  ],
  formatOptions: {
    snippetInterface: 'async-await',
  },
  requireModule: ['@babel/register'],
  worldParameters: {
    baseURL: 'http://localhost:5173',
  },
};
