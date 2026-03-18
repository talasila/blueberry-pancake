import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCSV, clearSuccessMessage } from '@/utils/helpers';

// Helper to read blob as raw bytes (jsdom Blob lacks .text() / .arrayBuffer())
async function readBlobAsBytes(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// Decode Uint8Array as UTF-8 string (preserving BOM if present)
function decodeBytes(bytes) {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

describe('downloadCSV', () => {
  let createElementSpy;
  let appendChildSpy;
  let removeChildSpy;
  let createObjectURLSpy;
  let revokeObjectURLSpy;
  let capturedBlob;
  let clickSpy;

  beforeEach(() => {
    clickSpy = vi.fn();
    capturedBlob = null;

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      setAttribute: vi.fn(),
      style: {},
      click: clickSpy,
    });
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    // jsdom doesn't provide URL.createObjectURL/revokeObjectURL, so define them
    if (!URL.createObjectURL) URL.createObjectURL = vi.fn();
    if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();

    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    });
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('includes UTF-8 BOM at the start of CSV content', async () => {
    const data = [{ name: 'Alice', score: '10' }];
    const columns = ['name', 'score'];

    downloadCSV(data, columns, 'test.csv');

    expect(capturedBlob).toBeInstanceOf(Blob);
    const bytes = await readBlobAsBytes(capturedBlob);
    // UTF-8 BOM is EF BB BF
    expect(bytes[0]).toBe(0xEF);
    expect(bytes[1]).toBe(0xBB);
    expect(bytes[2]).toBe(0xBF);
  });

  it('generates correct CSV content after BOM', async () => {
    const data = [
      { name: 'Alice', score: '10' },
      { name: 'Bob', score: '20' },
    ];
    const columns = ['name', 'score'];

    downloadCSV(data, columns, 'test.csv');

    const bytes = await readBlobAsBytes(capturedBlob);
    const text = decodeBytes(bytes);
    // TextDecoder strips BOM by default, so check content after BOM
    expect(text).toBe('name,score\nAlice,10\nBob,20\n');
  });

  it('escapes fields with commas and quotes', async () => {
    const data = [{ name: 'O"Brien, Jr.', score: '10' }];
    const columns = ['name', 'score'];

    downloadCSV(data, columns, 'test.csv');

    const bytes = await readBlobAsBytes(capturedBlob);
    const text = decodeBytes(bytes);
    expect(text).toContain('"O""Brien, Jr."');
  });

  it('throws for invalid input', () => {
    expect(() => downloadCSV(null, ['a'], 'f.csv')).toThrow();
    expect(() => downloadCSV([], [], 'f.csv')).toThrow();
    expect(() => downloadCSV('string', ['a'], 'f.csv')).toThrow();
  });

  it('handles null/undefined field values', async () => {
    const data = [{ a: null, b: undefined, c: '' }];
    const columns = ['a', 'b', 'c'];

    downloadCSV(data, columns, 'test.csv');

    const bytes = await readBlobAsBytes(capturedBlob);
    const text = decodeBytes(bytes);
    expect(text).toBe('a,b,c\n,,\n');
  });

  it('creates blob with correct MIME type', () => {
    const data = [{ a: '1' }];
    downloadCSV(data, ['a'], 'test.csv');

    expect(capturedBlob.type).toBe('text/csv;charset=utf-8;');
  });

  it('triggers download and cleans up', () => {
    const data = [{ a: '1' }];
    downloadCSV(data, ['a'], 'test.csv');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('clearSuccessMessage', () => {
  it('calls setter with empty string after delay', () => {
    vi.useFakeTimers();
    const setter = vi.fn();

    clearSuccessMessage(setter, 1000);

    expect(setter).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(setter).toHaveBeenCalledWith('');

    vi.useRealTimers();
  });

  it('returns timer ID', () => {
    vi.useFakeTimers();
    const timer = clearSuccessMessage(vi.fn(), 1000);
    expect(timer).toBeDefined();
    vi.useRealTimers();
  });
});
