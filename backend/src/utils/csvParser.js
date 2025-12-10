/**
 * CSV parsing and writing utilities with RFC 4180 escaping support
 * Handles proper escaping of fields containing commas, quotes, and newlines
 */

/**
 * Parse CSV string into array of objects
 * Handles RFC 4180 escaping: fields with special characters are quoted,
 * and quotes within fields are doubled
 * @param {string} csvString - CSV string with header row
 * @returns {Array<object>} Array of rating objects
 */
export function parseCSV(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    return [];
  }

  // Normalize line endings (handle both LF and CRLF)
  const normalized = csvString.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.trim().split('\n');
  if (lines.length < 2) {
    // Only header or empty
    return [];
  }

  // Parse header
  const header = parseCSVLine(lines[0]).map(field => field.trim());
  if (header.length === 0) {
    return [];
  }

  // Expected columns: email, timestamp, itemId, rating, note
  const expectedColumns = ['email', 'timestamp', 'itemId', 'rating', 'note'];
  if (!arraysEqual(header, expectedColumns)) {
    throw new Error(`Invalid CSV header. Expected: ${expectedColumns.join(',')}, got: ${header.join(',')}`);
  }

  // Parse data rows
  const ratings = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line).map(field => field.trim());
    if (values.length !== header.length) {
      // Skip malformed rows (log warning in production)
      continue;
    }

    const rating = {
      email: values[0] || '',
      timestamp: values[1] || '',
      itemId: parseInt(values[2], 10),
      rating: parseInt(values[3], 10),
      note: values[4] || ''
    };

    // Validate parsed values
    if (isNaN(rating.itemId) || isNaN(rating.rating)) {
      continue; // Skip invalid rows
    }

    ratings.push(rating);
  }

  return ratings;
}

/**
 * Parse a single CSV line handling RFC 4180 escaping
 * @param {string} line - CSV line
 * @returns {Array<string>} Array of field values
 */
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : null;

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote (doubled quote)
        currentField += '"';
        i += 2;
      } else if (inQuotes && (nextChar === ',' || nextChar === null || nextChar === '\n' || nextChar === '\r')) {
        // End of quoted field
        inQuotes = false;
        i++;
      } else if (!inQuotes) {
        // Start of quoted field
        inQuotes = true;
        i++;
      } else {
        // Single quote in quoted field (shouldn't happen in valid CSV, but handle gracefully)
        currentField += char;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(currentField);
      currentField = '';
      i++;
    } else {
      currentField += char;
      i++;
    }
  }

  // Add last field
  fields.push(currentField);

  return fields;
}

/**
 * Convert array of rating objects to CSV string
 * Handles RFC 4180 escaping: fields with commas, quotes, or newlines are quoted,
 * and quotes within fields are doubled
 * @param {Array<object>} ratings - Array of rating objects
 * @returns {string} CSV string with header row
 */
export function toCSV(ratings) {
  if (!Array.isArray(ratings)) {
    throw new Error('Ratings must be an array');
  }

  const header = ['email', 'timestamp', 'itemId', 'rating', 'note'];
  const lines = [header.map(escapeCSVField).join(',')];

  for (const rating of ratings) {
    const row = [
      rating.email || '',
      rating.timestamp || '',
      String(rating.itemId || ''),
      String(rating.rating || ''),
      rating.note || ''
    ];
    lines.push(row.map(escapeCSVField).join(','));
  }

  return lines.join('\n') + '\n';
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
 * Check if two arrays are equal
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {boolean} True if arrays are equal
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, i) => val === b[i]);
}
