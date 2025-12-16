#!/usr/bin/env node

/**
 * Test ID Addition Guide
 * 
 * This script provides guidance on adding data-testid attributes to components
 * for E2E testing. It doesn't automatically modify files (to avoid breaking things),
 * but shows you exactly what to add and where.
 * 
 * Usage:
 *   node scripts/add-test-ids-guide.js <component-name>
 * 
 * Example:
 *   node scripts/add-test-ids-guide.js PINEntryPage
 *   node scripts/add-test-ids-guide.js CreateEventPage
 */

const fs = require('fs');
const path = require('path');

// Test ID mappings for each component
const TEST_ID_MAPPINGS = {
  PINEntryPage: [
    {
      element: '<InputOTP>',
      selector: 'maxLength={6}',
      testId: 'pin-input',
      usage: 'PIN entry input field',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'type="submit"',
      testId: 'pin-submit-button',
      usage: 'Submit PIN button',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'variant="outline"',
      testId: 'pin-back-button',
      usage: 'Back to email button',
      priority: 2
    },
    {
      element: '<div>',
      selector: 'className="text-destructive"',
      testId: 'pin-error-message',
      usage: 'Error message display',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'className="text-green-600"',
      testId: 'pin-success-message',
      usage: 'Success message display',
      priority: 1
    }
  ],
  
  CreateEventPage: [
    {
      element: '<Input>',
      selector: 'id="name"',
      testId: 'event-name-input',
      usage: 'Event name input',
      priority: 1
    },
    {
      element: '<select>',
      selector: 'value={typeOfItem}',
      testId: 'item-type-select',
      usage: 'Item type dropdown',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'type="submit"',
      testId: 'create-event-button',
      usage: 'Create event submit button',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'Dialog/Modal for success',
      testId: 'success-dialog',
      usage: 'Success popup',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'Event ID display',
      testId: 'event-id-display',
      usage: 'Shows generated event ID',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'className="text-destructive"',
      testId: 'create-event-error',
      usage: 'Error message display',
      priority: 2
    }
  ],
  
  EmailEntryPage: [
    {
      element: '<Input>',
      selector: 'id="email"',
      testId: 'email-input',
      usage: 'Email address input',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'type="submit"',
      testId: 'continue-button',
      usage: 'Continue button',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'className="text-destructive"',
      testId: 'email-error-message',
      usage: 'Error message display',
      priority: 1
    }
  ],
  
  DashboardPage: [
    {
      element: '<div>',
      selector: 'Total Users stat',
      testId: 'stat-total-users',
      usage: 'Total users statistic',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'Total Bottles stat',
      testId: 'stat-total-bottles',
      usage: 'Total bottles statistic',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'Total Ratings stat',
      testId: 'stat-total-ratings',
      usage: 'Total ratings statistic',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'Avg Ratings Per User stat',
      testId: 'stat-avg-ratings',
      usage: 'Average ratings statistic',
      priority: 1
    },
    {
      element: '<table>',
      selector: 'Main ratings table',
      testId: 'ratings-table',
      usage: 'Item ratings table',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Refresh button',
      testId: 'refresh-button',
      usage: 'Refresh dashboard data',
      priority: 2
    },
    {
      element: '<div>',
      selector: 'Progress bars',
      testId: 'rating-progress-{id}',
      usage: 'Rating distribution progress bar',
      priority: 2
    }
  ],
  
  EventAdminPage: [
    {
      element: '<div>',
      selector: 'PIN display section',
      testId: 'pin-display',
      usage: 'Current PIN display',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Regenerate PIN',
      testId: 'regenerate-pin-button',
      usage: 'Regenerate PIN button',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Copy PIN',
      testId: 'copy-pin-button',
      usage: 'Copy PIN to clipboard',
      priority: 2
    },
    {
      element: '<Input>',
      selector: 'Admin email input',
      testId: 'admin-email-input',
      usage: 'New administrator email',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Add administrator',
      testId: 'add-admin-button',
      usage: 'Add administrator button',
      priority: 1
    },
    {
      element: '<Badge>',
      selector: 'Owner badge',
      testId: 'owner-badge',
      usage: 'Owner indicator badge',
      priority: 2
    },
    {
      element: '<Input>',
      selector: 'numberOfItems input',
      testId: 'num-items-input',
      usage: 'Number of items input',
      priority: 1
    },
    {
      element: '<Input>',
      selector: 'excludedItemIds input',
      testId: 'excluded-items-input',
      usage: 'Excluded items input',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Save configuration',
      testId: 'save-config-button',
      usage: 'Save item configuration',
      priority: 1
    }
  ],
  
  ProfilePage: [
    {
      element: '<Input>',
      selector: 'id="email"',
      testId: 'profile-email',
      usage: 'Email display (read-only)',
      priority: 1
    },
    {
      element: '<Input>',
      selector: 'id="name"',
      testId: 'profile-name',
      usage: 'Name input',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Save Changes',
      testId: 'save-profile-button',
      usage: 'Save profile button',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Add item',
      testId: 'add-item-button',
      usage: 'Add new item button',
      priority: 2
    },
    {
      element: '<div>',
      selector: 'Success message',
      testId: 'profile-success-message',
      usage: 'Success feedback',
      priority: 2
    }
  ],
  
  EventPage: [
    {
      element: '<button>',
      selector: 'Item button',
      testId: 'item-button-{itemId}',
      usage: 'Individual item button (use template)',
      priority: 1
    },
    {
      element: '<div>',
      selector: 'Rating drawer',
      testId: 'rating-drawer',
      usage: 'Rating input drawer',
      priority: 1
    },
    {
      element: '<Button>',
      selector: 'Similar users',
      testId: 'similar-users-button',
      usage: 'Find similar users button',
      priority: 2
    },
    {
      element: '<Button>',
      selector: 'Dashboard',
      testId: 'dashboard-button',
      usage: 'Navigate to dashboard',
      priority: 2
    }
  ]
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function showGuide(componentName) {
  const mappings = TEST_ID_MAPPINGS[componentName];
  
  if (!mappings) {
    console.log(`${colors.red}Component "${componentName}" not found.${colors.reset}\n`);
    console.log('Available components:');
    Object.keys(TEST_ID_MAPPINGS).forEach(name => {
      console.log(`  - ${name}`);
    });
    return;
  }
  
  console.log(`\n${colors.bright}${colors.blue}=== Test ID Guide for ${componentName} ===${colors.reset}\n`);
  
  // Get component file path
  const componentPath = path.join(
    __dirname,
    '..',
    'frontend',
    'src',
    'pages',
    `${componentName}.jsx`
  );
  
  console.log(`${colors.cyan}File:${colors.reset} ${componentPath}\n`);
  
  // Check if file exists
  const fileExists = fs.existsSync(componentPath);
  if (!fileExists) {
    console.log(`${colors.yellow}⚠️  File not found at expected location${colors.reset}\n`);
  }
  
  // Show priority 1 items first
  const priority1 = mappings.filter(m => m.priority === 1);
  const priority2 = mappings.filter(m => m.priority === 2);
  
  if (priority1.length > 0) {
    console.log(`${colors.bright}🔴 Priority 1 - Critical for Testing:${colors.reset}\n`);
    showMappings(priority1);
  }
  
  if (priority2.length > 0) {
    console.log(`\n${colors.bright}🟡 Priority 2 - Nice to Have:${colors.reset}\n`);
    showMappings(priority2);
  }
  
  // Show example
  console.log(`\n${colors.bright}${colors.green}Example Implementation:${colors.reset}\n`);
  const example = priority1[0] || mappings[0];
  console.log('Before:');
  console.log(`  ${colors.yellow}${example.element}${colors.reset}`);
  console.log(`    ${example.selector}`);
  console.log('  />');
  console.log('\nAfter:');
  console.log(`  ${colors.green}${example.element}${colors.reset}`);
  console.log(`    ${example.selector}`);
  console.log(`    ${colors.bright}data-testid="${example.testId}"${colors.reset}`);
  console.log('  />');
  
  // Show how to use in tests
  console.log(`\n${colors.bright}${colors.blue}Usage in Tests:${colors.reset}\n`);
  console.log(`  // Find element`);
  console.log(`  ${colors.green}const element = page.locator('[data-testid="${example.testId}"]');${colors.reset}`);
  console.log(`  await element.click();`);
  console.log(`  await expect(element).toBeVisible();`);
  
  console.log('\n');
}

function showMappings(mappings) {
  mappings.forEach((mapping, index) => {
    console.log(`${index + 1}. ${colors.bright}${mapping.testId}${colors.reset}`);
    console.log(`   Element: ${mapping.element}`);
    console.log(`   Selector: ${mapping.selector}`);
    console.log(`   Usage: ${mapping.usage}`);
    console.log('');
  });
}

function showAllComponents() {
  console.log(`\n${colors.bright}${colors.blue}=== All Components with Test ID Mappings ===${colors.reset}\n`);
  
  const sortedComponents = Object.entries(TEST_ID_MAPPINGS)
    .map(([name, mappings]) => ({
      name,
      priority1Count: mappings.filter(m => m.priority === 1).length,
      priority2Count: mappings.filter(m => m.priority === 2).length,
      total: mappings.length
    }))
    .sort((a, b) => b.priority1Count - a.priority1Count);
  
  sortedComponents.forEach(comp => {
    const priority1Tag = comp.priority1Count > 0 
      ? `${colors.red}${comp.priority1Count} critical${colors.reset}` 
      : '';
    const priority2Tag = comp.priority2Count > 0 
      ? `${colors.yellow}${comp.priority2Count} nice-to-have${colors.reset}` 
      : '';
    
    console.log(`${colors.bright}${comp.name}${colors.reset} (${comp.total} test IDs)`);
    console.log(`  ${priority1Tag} ${priority2Tag}`);
    console.log(`  ${colors.cyan}Command:${colors.reset} node scripts/add-test-ids-guide.js ${comp.name}\n`);
  });
}

// Main execution
const componentName = process.argv[2];

if (!componentName) {
  showAllComponents();
  console.log(`\n${colors.cyan}Usage:${colors.reset} node scripts/add-test-ids-guide.js <component-name>\n`);
} else {
  showGuide(componentName);
}

// Export for testing
module.exports = { TEST_ID_MAPPINGS };

