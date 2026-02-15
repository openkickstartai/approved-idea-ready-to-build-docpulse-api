export type DriftType = 'removed-endpoint' | 'changed-params' | 'changed-schema' | 'deprecated';

export interface DriftResult {
  snippetFile: string;
  lineStart: number;
  lineEnd: number;
  endpoint: string;
  driftType: DriftType;
  severity: 'error' | 'warning';
  message: string;
}
