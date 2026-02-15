import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { DocPulseConfig } from './types';

export const CONFIG_DEFAULTS: DocPulseConfig = {
  specFile: '',
  docsGlob: 'docs/**/*.md',
  format: 'table',
  ignore: [],
};

/**
 * Load DocPulse configuration from (in priority order):
 * 1. Explicit configPath (--config flag)
 * 2. .docpulserc.json in cwd
 * 3. "docpulse" key in package.json
 * 4. Built-in defaults
 */
export async function loadConfig(
  cwd?: string,
  configPath?: string
): Promise<DocPulseConfig> {
  const dir = cwd ? resolve(cwd) : process.cwd();

  // 1. Explicit config path
  if (configPath) {
    const fullPath = resolve(dir, configPath);
    if (existsSync(fullPath)) {
      const raw = JSON.parse(readFileSync(fullPath, 'utf-8'));
      return { ...CONFIG_DEFAULTS, ...raw };
    }
  }

  // 2. .docpulserc.json
  const rcPath = join(dir, '.docpulserc.json');
  if (existsSync(rcPath)) {
    const raw = JSON.parse(readFileSync(rcPath, 'utf-8'));
    return { ...CONFIG_DEFAULTS, ...raw };
  }

  // 3. package.json "docpulse" key
  const pkgPath = join(dir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (pkg.docpulse && typeof pkg.docpulse === 'object') {
        return { ...CONFIG_DEFAULTS, ...pkg.docpulse };
      }
    } catch {
      /* ignore malformed package.json */
    }
  }

  // 4. Defaults
  return { ...CONFIG_DEFAULTS };
}

/**
 * Merge CLI flags on top of loaded config.
 * Undefined flags are skipped (config value preserved).
 */
export function mergeCliFlags(
  config: DocPulseConfig,
  flags: {
    spec?: string;
    docs?: string | string[];
    format?: string;
    ignore?: string[];
  }
): DocPulseConfig {
  return {
    specFile: flags.spec ?? config.specFile,
    docsGlob: flags.docs ?? config.docsGlob,
    format: (flags.format as DocPulseConfig['format']) ?? config.format,
    ignore: flags.ignore ? [...config.ignore, ...flags.ignore] : [...config.ignore],
  };
}
