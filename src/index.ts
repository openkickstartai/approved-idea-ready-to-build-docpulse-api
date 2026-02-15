#!/usr/bin/env node
import { Command } from 'commander';
import { globSync } from 'glob';
import { readFileSync } from 'fs';
import { extractCodeBlocks, parseHttpCall, loadSpec, validate, Issue } from './analyzer';

const program = new Command();
program
  .name('docpulse')
  .version('1.0.0')
  .description('Detect stale API code examples in your documentation')
  .requiredOption('-s, --spec <path>', 'Path to OpenAPI spec (JSON or YAML)')
  .requiredOption('-d, --docs <glob>', 'Glob pattern for documentation files')
  .option('-f, --format <fmt>', 'Output format: text | sarif', 'text')
  .action((opts) => {
    const spec = loadSpec(opts.spec);
    const files = globSync(opts.docs);
    if (files.length === 0) {
      console.error('No documentation files matched the pattern.');
      process.exit(1);
    }
    const calls = files.flatMap((f: string) => {
      const content = readFileSync(f, 'utf-8');
      return extractCodeBlocks(content, f)
        .map(parseHttpCall)
        .filter((c): c is NonNullable<typeof c> => c !== null);
    });
    const issues = validate(calls, spec);
    if (opts.format === 'sarif') {
      console.log(JSON.stringify(toSarif(issues), null, 2));
    } else {
      if (issues.length === 0) {
        console.log('✅ All code examples match the API spec!');
        process.exit(0);
      }
      for (const i of issues) {
        const icon = i.severity === 'error' ? '❌' : '⚠️';
        console.log(`${icon}  ${i.file}:${i.line} — ${i.message}`);
      }
      console.log(`\n${issues.length} issue(s) found`);
    }
    process.exit(issues.some(i => i.severity === 'error') ? 1 : 0);
  });

function toSarif(issues: Issue[]) {
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0' as const,
    runs: [{
      tool: { driver: { name: 'DocPulse', version: '1.0.0', rules: [] } },
      results: issues.map(i => ({
        ruleId: i.type,
        level: i.severity === 'error' ? 'error' as const : 'warning' as const,
        message: { text: i.message },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: i.file },
            region: { startLine: i.line }
          }
        }]
      }))
    }]
  };
}

program.parse();
