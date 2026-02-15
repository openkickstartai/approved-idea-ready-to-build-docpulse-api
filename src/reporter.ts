import { DriftResult } from './types';

function pad(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}

function formatJson(results: DriftResult[]): string {
  return JSON.stringify(results, null, 2);
}

function formatTable(results: DriftResult[]): string {
  const headers = ['File', 'Line', 'Endpoint', 'Issue', 'Severity'];

  const rows = results.map(r => [
    r.snippetFile,
    `${r.lineStart}-${r.lineEnd}`,
    r.endpoint,
    r.message,
    r.severity,
  ]);

  const widths = headers.map((h, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, row[i].length), 0);
    return Math.max(h.length, maxData);
  });

  const sep = widths.map(w => '-'.repeat(w)).join(' | ');
  const headerLine = headers.map((h, i) => pad(h, widths[i])).join(' | ');
  const dataLines = rows.map(row =>
    row.map((cell, i) => pad(cell, widths[i])).join(' | ')
  );

  return [headerLine, sep, ...dataLines].join('\n');
}

function formatGitHub(results: DriftResult[]): string {
  return results.map(r => {
    const level = r.severity === 'error' ? 'error' : 'warning';
    return `::${level} file=${r.snippetFile},line=${r.lineStart}::${r.message}`;
  }).join('\n');
}

export function formatReport(results: DriftResult[], format: 'json' | 'table' | 'github'): string {
  switch (format) {
    case 'json':
      return formatJson(results);
    case 'table':
      return formatTable(results);
    case 'github':
      return formatGitHub(results);
    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

export function exitCode(results: DriftResult[]): number {
  return results.some(r => r.severity === 'error') ? 1 : 0;
}
