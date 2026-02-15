import { readFile } from 'fs/promises';
import { CodeSnippet } from './types';

/**
 * Scan a Markdown (.md / .mdx) file and extract every fenced code block
 * that contains a recognisable HTTP / API call pattern.
 *
 * Detection heuristics (tried in order):
 *  1. curl commands
 *  2. fetch() / axios calls
 *  3. HTTP literal lines  (e.g. `GET /api/v1/users`)
 */
export async function extractSnippets(filePath: string): Promise<CodeSnippet[]> {
  const content = await readFile(filePath, 'utf-8');
  const snippets: CodeSnippet[] = [];

  // Match fenced code blocks:  ```lang  ...  ```
  const fence = /^```(\w+)\s*\n([\s\S]*?)^```\s*$/gm;
  let m: RegExpExecArray | null;

  while ((m = fence.exec(content)) !== null) {
    const language = m[1].toLowerCase();
    const code = m[2].trim();
    const before = content.substring(0, m.index);
    const lineStart = before.split('\n').length;
    const lineEnd = lineStart + m[0].split('\n').length - 1;

    const detectedEndpoint = detectEndpoint(code);

    if (detectedEndpoint) {
      snippets.push({
        language,
        code,
        lineStart,
        lineEnd,
        filePath,
        detectedEndpoint,
      });
    }
  }

  return snippets;
}

// ---------------------------------------------------------------------------
// Internal detection helpers
// ---------------------------------------------------------------------------

function detectEndpoint(code: string): string | null {
  return detectCurl(code) ?? detectFetchAxios(code) ?? detectHttpLiteral(code) ?? null;
}

/** Detect `curl` commands and extract method + path. */
function detectCurl(code: string): string | null {
  if (!/curl\s/i.test(code)) return null;

  const urlMatch = code.match(/https?:\/\/[^\s'"}>\]]+/);
  if (!urlMatch) return null;

  let path: string;
  try {
    const parsed = new URL(urlMatch[0].replace(/['"]$/g, ''));
    path = parsed.pathname;
  } catch {
    const pm = urlMatch[0].match(/https?:\/\/[^\/]+(\/?[^\s?#'"]*)/)
    path = pm && pm[1] ? pm[1] : '/';
  }

  // Normalise trailing slash
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  const xm = code.match(/-X\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/i);
  let method: string;
  if (xm) {
    method = xm[1].toUpperCase();
  } else if (/-d\s|--data/.test(code)) {
    method = 'POST';
  } else {
    method = 'GET';
  }

  return `${method} ${path}`;
}

/** Detect `fetch()` and `axios.*()` calls. */
function detectFetchAxios(code: string): string | null {
  // --- fetch('url', { method: ... }) ---
  const fetchMatch = code.match(/fetch\(\s*['"`]([^'"`]+)['"`]/);
  if (fetchMatch) {
    let path = fetchMatch[1].replace(/https?:\/\/[^\/]+/, '');
    path = path.split('?')[0] || '/';
    const mm = code.match(/method\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)['"`]/i);
    const method = mm ? mm[1].toUpperCase() : 'GET';
    return `${method} ${path}`;
  }

  // --- axios.get / axios.post / ... ---
  const axiosShort = code.match(
    /axios\.(get|post|put|patch|delete|head|options)\(\s*['"`]([^'"`]+)['"`]/i,
  );
  if (axiosShort) {
    const method = axiosShort[1].toUpperCase();
    let path = axiosShort[2].replace(/https?:\/\/[^\/]+/, '');
    path = path.split('?')[0] || '/';
    return `${method} ${path}`;
  }

  // --- axios({ method, url }) ---
  if (/axios\s*\(/.test(code)) {
    const mm = code.match(/method\s*:\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/i);
    const um = code.match(/url\s*:\s*['"`]([^'"`]+)['"`]/);
    if (um) {
      let path = um[1].replace(/https?:\/\/[^\/]+/, '');
      path = path.split('?')[0] || '/';
      const method = mm ? mm[1].toUpperCase() : 'GET';
      return `${method} ${path}`;
    }
  }

  return null;
}

/** Detect raw HTTP literal lines such as `GET /api/v1/users HTTP/1.1`. */
function detectHttpLiteral(code: string): string | null {
  const match = code.match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\/\S+)/m);
  if (match) {
    const method = match[1].toUpperCase();
    const path = match[2].split('?')[0];
    return `${method} ${path}`;
  }
  return null;
}
