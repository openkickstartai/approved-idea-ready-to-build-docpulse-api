import { readFileSync } from 'fs';
import { load } from 'js-yaml';

export interface CodeBlock { lang: string; code: string; line: number; file: string; }
export interface HttpCall { method: string; path: string; body?: Record<string, unknown>; block: CodeBlock; }
export interface Issue { type: string; message: string; file: string; line: number; severity: 'error' | 'warning'; }

export function extractCodeBlocks(content: string, file: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const re = /```(bash|sh|curl|javascript|typescript|js|ts)\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const line = content.substring(0, m.index).split('\n').length;
    blocks.push({ lang: m[1].toLowerCase(), code: m[2].trim(), line, file });
  }
  return blocks;
}

export function parseHttpCall(block: CodeBlock): HttpCall | null {
  const { code } = block;
  if (/curl\s/i.test(code)) {
    const urlMatch = code.match(/https?:\/\/[^\/\s'"]+(\/[^\s'"?]*)/) || code.match(/curl\s+[^-].*?(\/[^\s'"?]+)/);
    if (!urlMatch) return null;
    const path = urlMatch[1];
    const methodMatch = code.match(/-X\s+(GET|POST|PUT|PATCH|DELETE)/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : (/-d\s/.test(code) ? 'POST' : 'GET');
    let body: Record<string, unknown> | undefined;
    const bm = code.match(/-d\s+['"]({[\s\S]*?})['"]/);
    if (bm) { try { body = JSON.parse(bm[1]); } catch { /* invalid JSON ignored */ } }
    return { method, path, body, block };
  }
  const fetchMatch = code.match(/fetch\(\s*['"`]([^'"`]+)['"`]/);
  if (fetchMatch) {
    const rawPath = fetchMatch[1].replace(/https?:\/\/[^\/]+/, '');
    const path = rawPath.split('?')[0] || '/';
    const mm = code.match(/method\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i);
    return { method: mm ? mm[1].toUpperCase() : 'GET', path, block };
  }
  const axiosMatch = code.match(/axios\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/i);
  if (axiosMatch) {
    const rawPath = axiosMatch[2].replace(/https?:\/\/[^\/]+/, '');
    return { method: axiosMatch[1].toUpperCase(), path: rawPath.split('?')[0], block };
  }
  return null;
}

export function loadSpec(specPath: string): any {
  const raw = readFileSync(specPath, 'utf-8');
  return specPath.endsWith('.json') ? JSON.parse(raw) : load(raw);
}

function matchPath(docPath: string, specPaths: string[]): string | null {
  if (specPaths.includes(docPath)) return docPath;
  const parts = docPath.split('/');
  for (const sp of specPaths) {
    const spParts = sp.split('/');
    if (spParts.length !== parts.length) continue;
    if (spParts.every((s, i) => s.startsWith('{') || s === parts[i])) return sp;
  }
  return null;
}

export function validate(calls: HttpCall[], spec: any): Issue[] {
  const issues: Issue[] = [];
  const paths = Object.keys(spec.paths || {});
  for (const call of calls) {
    const sp = matchPath(call.path, paths);
    if (!sp) {
      issues.push({ type: 'endpoint-missing', message: `Endpoint ${call.path} not found in spec`, file: call.block.file, line: call.block.line, severity: 'error' });
      continue;
    }
    if (!spec.paths[sp][call.method.toLowerCase()]) {
      issues.push({ type: 'method-not-allowed', message: `${call.method} not allowed on ${sp}`, file: call.block.file, line: call.block.line, severity: 'error' });
      continue;
    }
    const op = spec.paths[sp][call.method.toLowerCase()];
    const schema = op.requestBody?.content?.['application/json']?.schema;
    if (call.body && schema?.properties) {
      for (const f of Object.keys(call.body)) {
        if (!schema.properties[f]) issues.push({ type: 'unknown-field', message: `Unknown field "${f}" in body for ${call.method} ${sp}`, file: call.block.file, line: call.block.line, severity: 'warning' });
      }
    }
    if (call.body && schema?.required) {
      for (const r of schema.required) {
        if (!(r in call.body)) issues.push({ type: 'missing-required', message: `Missing required field "${r}" in ${call.method} ${sp}`, file: call.block.file, line: call.block.line, severity: 'warning' });
      }
    }
  }
  return issues;
}
