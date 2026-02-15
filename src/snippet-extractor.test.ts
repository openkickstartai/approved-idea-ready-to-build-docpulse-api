import { extractSnippets } from './snippet-extractor';
import { CodeSnippet } from './types';
import * as path from 'path';

const FIXTURE_DIR = path.resolve(__dirname, '..', 'fixtures', 'docs');

describe('extractSnippets', () => {
  // -----------------------------------------------------------------------
  // Scenario 1 – mixed code blocks (API + non-API)
  // -----------------------------------------------------------------------
  test('extracts snippets from a Markdown file with mixed code blocks', async () => {
    const snippets = await extractSnippets(path.join(FIXTURE_DIR, 'mixed-api.md'));

    // The fixture has 7 code blocks; only 5 contain API patterns.
    expect(snippets).toHaveLength(5);

    const endpoints = snippets.map((s) => s.detectedEndpoint);
    expect(endpoints).toContain('GET /users');
    expect(endpoints).toContain('GET /items');
    expect(endpoints).toContain('DELETE /users/42');
    expect(endpoints).toContain('GET /api/v1/health');
    expect(endpoints).toContain('POST /orders');

    // Every returned snippet must carry correct metadata
    for (const s of snippets) {
      expect(s.filePath).toContain('mixed-api.md');
      expect(s.lineStart).toBeGreaterThan(0);
      expect(s.lineEnd).toBeGreaterThanOrEqual(s.lineStart);
      expect(s.language).toBeTruthy();
      expect(s.code).toBeTruthy();
      expect(s.detectedEndpoint).toBeTruthy();
    }
  });

  // -----------------------------------------------------------------------
  // Scenario 2 – curl endpoint detection
  // -----------------------------------------------------------------------
  test('correctly detects endpoints from curl examples', async () => {
    const snippets = await extractSnippets(path.join(FIXTURE_DIR, 'curl-examples.md'));

    expect(snippets).toHaveLength(4);

    const endpoints = snippets.map((s) => s.detectedEndpoint);
    expect(endpoints).toContain('GET /users');
    expect(endpoints).toContain('POST /users');
    expect(endpoints).toContain('DELETE /users/42');
    expect(endpoints).toContain('PUT /users/7');

    // All blocks are bash
    for (const s of snippets) {
      expect(s.language).toBe('bash');
    }
  });

  // -----------------------------------------------------------------------
  // Scenario 3 – fetch / axios endpoint detection
  // -----------------------------------------------------------------------
  test('correctly detects endpoints from JS fetch/axios', async () => {
    const snippets = await extractSnippets(path.join(FIXTURE_DIR, 'js-examples.md'));

    expect(snippets).toHaveLength(4);

    const endpoints = snippets.map((s) => s.detectedEndpoint);
    expect(endpoints).toContain('GET /users/123');
    expect(endpoints).toContain('POST /items');
    expect(endpoints).toContain('PUT /users/456');
    expect(endpoints).toContain('PATCH /orders/99');

    // Languages should be javascript or typescript
    for (const s of snippets) {
      expect(['javascript', 'typescript']).toContain(s.language);
    }
  });

  // -----------------------------------------------------------------------
  // Scenario 4 – non-API code blocks are ignored
  // -----------------------------------------------------------------------
  test('ignores non-API code blocks (plain bash, HTML)', async () => {
    const snippets = await extractSnippets(path.join(FIXTURE_DIR, 'non-api.md'));
    expect(snippets).toHaveLength(0);
  });
});
