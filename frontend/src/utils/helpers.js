/**
 * Validates email format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
export function isValidEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Clear success message after a delay
 * @param {function} setter - State setter function
 * @param {number} delay - Delay in milliseconds (default: 3000)
 */
export function clearSuccessMessage(setter, delay = 3000) {
  setTimeout(() => setter(''), delay);
}

/**
 * Escape a CSV field according to RFC 4180
 * Fields containing commas, quotes, or newlines must be enclosed in double quotes
 * Double quotes within fields must be escaped by doubling them
 * @param {string} field - Field value
 * @returns {string} Escaped field
 */
function escapeCSVField(field) {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);

  // Check if field contains special characters
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    // Escape quotes by doubling them, then wrap entire field in quotes
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string and download as file
 * @param {Array<object>} data - Array of data objects
 * @param {Array<string>} columns - Array of column names (keys in data objects)
 * @param {string} filename - Filename for download
 */
export function downloadCSV(data, columns, filename) {
  if (!Array.isArray(data) || !Array.isArray(columns) || columns.length === 0) {
    throw new Error('Invalid data or columns for CSV export');
  }

  // Create header row
  const header = columns.map(escapeCSVField).join(',');
  const lines = [header];

  // Create data rows
  for (const row of data) {
    const values = columns.map(col => escapeCSVField(row[col] || ''));
    lines.push(values.join(','));
  }

  // Create CSV content
  const csvContent = lines.join('\n') + '\n';

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up URL object
  URL.revokeObjectURL(url);
}
