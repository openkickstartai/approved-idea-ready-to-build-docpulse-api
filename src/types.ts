export interface CodeSnippet {
  /** Language tag from the fenced code block */
  language: string;
  /** Raw code content (trimmed) */
  code: string;
  /** 1-based line number of the opening fence */
  lineStart: number;
  /** 1-based line number of the closing fence */
  lineEnd: number;
  /** Path to the source Markdown file */
  filePath: string;
  /** Detected HTTP method + path, e.g. "GET /users/{id}", or null */
  detectedEndpoint: string | null;
}
