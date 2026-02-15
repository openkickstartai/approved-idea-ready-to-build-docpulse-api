import { extractCodeBlocks, parseHttpCall, validate, HttpCall } from './analyzer';

const SPEC = {
  paths: {
    '/users': {
      get: { summary: 'List users' },
      post: {
        summary: 'Create user',
        requestBody: { content: { 'application/json': { schema: {
          properties: { name: { type: 'string' }, email: { type: 'string' } },
          required: ['name', 'email']
        } } } }
      }
    },
    '/users/{id}': {
      get: { summary: 'Get user' },
      delete: { summary: 'Delete user' }
    }
  }
};

const block = (code: string, lang = 'bash') => ({ lang, code, line: 1, file: 'test.md' });

describe('extractCodeBlocks', () => {
  test('extracts fenced code blocks with supported languages', () => {
    const md = '# API\n\n```bash\ncurl https://api.example.com/users\n```\n\nText\n\n```javascript\nfetch(\'/items\')\n```\n\n```python\nprint("ignored")\n```';
    const blocks = extractCodeBlocks(md, 'api.md');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].lang).toBe('bash');
    expect(blocks[0].line).toBe(3);
    expect(blocks[1].lang).toBe('javascript');
  });

  test('returns empty array when no code blocks exist', () => {
    expect(extractCodeBlocks('# No code here', 'empty.md')).toHaveLength(0);
  });
});

describe('parseHttpCall', () => {
  test('parses curl with -X method and body', () => {
    const call = parseHttpCall(block('curl -X POST https://api.example.com/users -d \'{"name":"Ada"}\''));
    expect(call).not.toBeNull();
    expect(call!.method).toBe('POST');
    expect(call!.path).toBe('/users');
    expect(call!.body).toEqual({ name: 'Ada' });
  });

  test('parses curl GET without -X flag', () => {
    const call = parseHttpCall(block('curl https://api.example.com/users'));
    expect(call!.method).toBe('GET');
    expect(call!.path).toBe('/users');
  });

  test('parses fetch with method option', () => {
    const call = parseHttpCall(block("fetch('/users', { method: 'POST' })", 'javascript'));
    expect(call!.method).toBe('POST');
    expect(call!.path).toBe('/users');
  });

  test('parses axios call', () => {
    const call = parseHttpCall(block("axios.delete('/users/42')", 'javascript'));
    expect(call!.method).toBe('DELETE');
    expect(call!.path).toBe('/users/42');
  });

  test('returns null for non-HTTP code', () => {
    expect(parseHttpCall(block('echo hello', 'bash'))).toBeNull();
  });
});

describe('validate', () => {
  const makeCall = (method: string, path: string, body?: Record<string, unknown>): HttpCall => ({
    method, path, body, block: block('')
  });

  test('detects missing endpoint', () => {
    const issues = validate([makeCall('GET', '/products')], SPEC);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('endpoint-missing');
    expect(issues[0].severity).toBe('error');
  });

  test('detects disallowed method', () => {
    const issues = validate([makeCall('PATCH', '/users')], SPEC);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('method-not-allowed');
  });

  test('passes valid call with path params', () => {
    const issues = validate([makeCall('DELETE', '/users/42')], SPEC);
    expect(issues).toHaveLength(0);
  });

  test('detects unknown body field', () => {
    const issues = validate([makeCall('POST', '/users', { name: 'Ada', email: 'a@b.c', age: 30 })], SPEC);
    const unknowns = issues.filter(i => i.type === 'unknown-field');
    expect(unknowns).toHaveLength(1);
    expect(unknowns[0].message).toContain('age');
  });

  test('detects missing required field', () => {
    const issues = validate([makeCall('POST', '/users', { name: 'Ada' })], SPEC);
    const missing = issues.filter(i => i.type === 'missing-required');
    expect(missing).toHaveLength(1);
    expect(missing[0].message).toContain('email');
  });
});
