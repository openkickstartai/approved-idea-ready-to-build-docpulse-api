export interface DocPulseConfig {
  /** Path to OpenAPI spec file (JSON or YAML) */
  specFile: string;
  /** Glob pattern(s) for documentation files */
  docsGlob: string | string[];
  /** Output format */
  format: 'json' | 'table' | 'github';
  /** Endpoint patterns to skip during validation */
  ignore: string[];
}
