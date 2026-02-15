import { formatReport, exitCode } from './reporter';
import { DriftResult } from './types';

const errorResult: DriftResult = {
  snippetFile: 'docs/api.md',
  lineStart: 15,
  lineEnd: 20,
  endpoint: '/users/profile',
  driftType: 'removed-endpoint',
  severity: 'error',
  message: 'Endpoint /users/profile not found in spec',
};

const warningResult: DriftResult = {
  snippetFile: 'docs/guide.md',
  lineStart: 42,
  lineEnd: 50,
  endpoint: '/items',
  driftType: 'deprecated',
  severity: 'warning',
  message: 'Endpoint /items is deprecated',
};

const changedParamsResult: DriftResult = {
  snippetFile: 'docs/ref.md',
  lineStart: 8,
  lineEnd: 12,
  endpoint: '/orders',
  driftType: 'changed-params',
  severity: 'error',
  message: 'Parameter "status" removed from /orders',
};

const allResults: DriftResult[] = [errorResult, warningResult, changedParamsResult];

describe('formatReport', () => {
  test('JSON output is valid parseable JSON', () => {
    const output = formatReport(allResults, 'json');
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].snippetFile).toBe('docs/api.md');
    expect(parsed[0].driftType).toBe('removed-endpoint');
    expect(parsed[1].severity).toBe('warning');
    expect(parsed[2].endpoint).toBe('/orders');
  });

  test('table output contains all result rows', () => {
    const output = formatReport(allResults, 'table');
    const lines = output.split('\n');
    // header + separator + 3 data rows
    expect(lines.length).toBe(5);
    // Header contains column names
    expect(lines[0]).toContain('File');
    expect(lines[0]).toContain('Line');
    expect(lines[0]).toContain('Endpoint');
    expect(lines[0]).toContain('Issue');
    expect(lines[0]).toContain('Severity');
    // Separator line
    expect(lines[1]).toMatch(/^[-| ]+$/);
    // Each data row contains the snippet file and endpoint
    expect(lines[2]).toContain('docs/api.md');
    expect(lines[2]).toContain('/users/profile');
    expect(lines[2]).toContain('error');
    expect(lines[3]).toContain('docs/guide.md');
    expect(lines[3]).toContain('/items');
    expect(lines[3]).toContain('warning');
    expect(lines[4]).toContain('docs/ref.md');
    expect(lines[4]).toContain('/orders');
    expect(lines[4]).toContain('error');
  });

  test('GitHub annotation format matches ::error file={f},line={l}::{msg} pattern', () => {
    const output = formatReport(allResults, 'github');
    const lines = output.split('\n');
    expect(lines).toHaveLength(3);

    const annotationRegex = /^::(error|warning) file=(.+),line=(\d+)::(.+)$/;

    const m0 = lines[0].match(annotationRegex);
    expect(m0).not.toBeNull();
    expect(m0![1]).toBe('error');
    expect(m0![2]).toBe('docs/api.md');
    expect(m0![3]).toBe('15');
    expect(m0![4]).toBe('Endpoint /users/profile not found in spec');

    const m1 = lines[1].match(annotationRegex);
    expect(m1).not.toBeNull();
    expect(m1![1]).toBe('warning');
    expect(m1![2]).toBe('docs/guide.md');
    expect(m1![3]).toBe('42');
    expect(m1![4]).toBe('Endpoint /items is deprecated');

    const m2 = lines[2].match(annotationRegex);
    expect(m2).not.toBeNull();
    expect(m2![1]).toBe('error');
    expect(m2![2]).toBe('docs/ref.md');
    expect(m2![3]).toBe('8');
  });
});

describe('exitCode', () => {
  test('returns 1 for errors and 0 for warnings-only', () => {
    expect(exitCode(allResults)).toBe(1);
    expect(exitCode([errorResult])).toBe(1);
    expect(exitCode([warningResult])).toBe(0);
    expect(exitCode([warningResult, warningResult])).toBe(0);
    expect(exitCode([])).toBe(0);
    expect(exitCode([warningResult, errorResult])).toBe(1);
  });
});
