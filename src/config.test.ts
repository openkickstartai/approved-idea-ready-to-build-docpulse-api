import { loadConfig, mergeCliFlags, CONFIG_DEFAULTS } from './config';
import { DocPulseConfig } from './types';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('loadConfig', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'docpulse-config-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test('loads from .docpulserc.json fixture', async () => {
    const rcConfig = {
      specFile: 'openapi.yaml',
      docsGlob: 'content/**/*.md',
      format: 'github',
      ignore: ['/health', '/ping'],
    };
    writeFileSync(
      join(tempDir, '.docpulserc.json'),
      JSON.stringify(rcConfig)
    );

    const config = await loadConfig(tempDir);
    expect(config.specFile).toBe('openapi.yaml');
    expect(config.docsGlob).toBe('content/**/*.md');
    expect(config.format).toBe('github');
    expect(config.ignore).toEqual(['/health', '/ping']);
  });

  test('falls back to defaults when no config found', async () => {
    const config = await loadConfig(tempDir);
    expect(config.specFile).toBe('');
    expect(config.docsGlob).toBe('docs/**/*.md');
    expect(config.format).toBe('table');
    expect(config.ignore).toEqual([]);
  });

  test('loads docpulse key from package.json', async () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-project',
        version: '1.0.0',
        docpulse: {
          specFile: 'swagger.json',
          format: 'json',
        },
      })
    );

    const config = await loadConfig(tempDir);
    expect(config.specFile).toBe('swagger.json');
    expect(config.format).toBe('json');
    // defaults still applied for unset fields
    expect(config.docsGlob).toBe('docs/**/*.md');
    expect(config.ignore).toEqual([]);
  });

  test('.docpulserc.json takes priority over package.json', async () => {
    writeFileSync(
      join(tempDir, '.docpulserc.json'),
      JSON.stringify({ specFile: 'from-rc.yaml' })
    );
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'test',
        docpulse: { specFile: 'from-pkg.yaml' },
      })
    );

    const config = await loadConfig(tempDir);
    expect(config.specFile).toBe('from-rc.yaml');
  });

  test('loads from explicit config path via --config', async () => {
    const customConfig = {
      specFile: 'custom-spec.yaml',
      format: 'json',
      ignore: ['/admin'],
    };
    writeFileSync(
      join(tempDir, 'my-config.json'),
      JSON.stringify(customConfig)
    );

    const config = await loadConfig(tempDir, 'my-config.json');
    expect(config.specFile).toBe('custom-spec.yaml');
    expect(config.format).toBe('json');
    expect(config.ignore).toEqual(['/admin']);
    // defaults for unset fields
    expect(config.docsGlob).toBe('docs/**/*.md');
  });

  test('partial .docpulserc.json merges with defaults', async () => {
    writeFileSync(
      join(tempDir, '.docpulserc.json'),
      JSON.stringify({ specFile: 'api.yaml' })
    );

    const config = await loadConfig(tempDir);
    expect(config.specFile).toBe('api.yaml');
    expect(config.docsGlob).toBe('docs/**/*.md');
    expect(config.format).toBe('table');
    expect(config.ignore).toEqual([]);
  });

  test('handles array docsGlob', async () => {
    writeFileSync(
      join(tempDir, '.docpulserc.json'),
      JSON.stringify({
        specFile: 'api.yaml',
        docsGlob: ['docs/**/*.md', 'guides/**/*.md'],
      })
    );

    const config = await loadConfig(tempDir);
    expect(config.docsGlob).toEqual(['docs/**/*.md', 'guides/**/*.md']);
  });
});

describe('mergeCliFlags', () => {
  test('CLI flags override config values', () => {
    const config: DocPulseConfig = {
      specFile: 'api.yaml',
      docsGlob: 'content/**/*.md',
      format: 'table',
      ignore: ['/internal'],
    };

    const merged = mergeCliFlags(config, {
      spec: 'override.yaml',
      format: 'json',
    });

    expect(merged.specFile).toBe('override.yaml');
    expect(merged.format).toBe('json');
    // Unset CLI flags preserve config
    expect(merged.docsGlob).toBe('content/**/*.md');
    expect(merged.ignore).toEqual(['/internal']);
  });

  test('undefined CLI flags preserve all config values', () => {
    const config: DocPulseConfig = {
      specFile: 'api.yaml',
      docsGlob: ['a/**/*.md', 'b/**/*.md'],
      format: 'github',
      ignore: ['/health'],
    };

    const merged = mergeCliFlags(config, {});
    expect(merged.specFile).toBe('api.yaml');
    expect(merged.docsGlob).toEqual(['a/**/*.md', 'b/**/*.md']);
    expect(merged.format).toBe('github');
    expect(merged.ignore).toEqual(['/health']);
  });

  test('CLI ignore patterns are appended to config ignore', () => {
    const config: DocPulseConfig = {
      specFile: 'api.yaml',
      docsGlob: 'docs/**/*.md',
      format: 'table',
      ignore: ['/health'],
    };

    const merged = mergeCliFlags(config, { ignore: ['/ping', '/status'] });
    expect(merged.ignore).toEqual(['/health', '/ping', '/status']);
  });

  test('all flags override simultaneously', () => {
    const config: DocPulseConfig = {
      specFile: 'old.yaml',
      docsGlob: 'old/**/*.md',
      format: 'table',
      ignore: [],
    };

    const merged = mergeCliFlags(config, {
      spec: 'new.yaml',
      docs: 'new/**/*.md',
      format: 'github',
      ignore: ['/skip'],
    });

    expect(merged.specFile).toBe('new.yaml');
    expect(merged.docsGlob).toBe('new/**/*.md');
    expect(merged.format).toBe('github');
    expect(merged.ignore).toEqual(['/skip']);
  });
});
