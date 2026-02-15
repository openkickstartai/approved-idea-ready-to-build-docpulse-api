# DocPulse 🫀

**Detect stale API code examples before your users do.**

DocPulse scans your Markdown documentation, extracts every `curl`, `fetch`, and `axios` code snippet, and validates them against your OpenAPI spec. Catch broken examples in CI — not in production support tickets.

## 🚀 Quick Start

```bash
npm install -g docpulse

# Validate docs against your OpenAPI spec
docpulse --spec openapi.yaml --docs "docs/**/*.md"

# Output SARIF for GitHub Code Scanning
docpulse --spec openapi.yaml --docs "docs/**/*.md" --format sarif
```

## How It Works

1. **Extract** — Parses Markdown files and finds fenced code blocks (`bash`, `javascript`, `typescript`)
2. **Parse** — Recognizes `curl`, `fetch()`, and `axios.*()` patterns to extract HTTP method, path, and body
3. **Validate** — Checks each call against your OpenAPI spec for endpoint existence, allowed methods, body schema
4. **Report** — Outputs human-readable issues or SARIF for CI integration

## Example Output

```
❌  docs/api.md:15 — Endpoint /users/profile not found in spec
❌  docs/api.md:32 — PATCH not allowed on /users
⚠️  docs/api.md:48 — Unknown field "username" in body for POST /users
⚠️  docs/api.md:48 — Missing required field "email" in POST /users

4 issue(s) found
```

## 📊 Why Pay for DocPulse?

| Pain Point | Cost Without DocPulse |
|---|---|
| Users copy stale curl examples | Support tickets, churn |
| API changes break 20 doc pages | Manual audit = hours |
| No CI check for docs | Docs rot silently |

DocPulse runs in **< 2 seconds** and catches what code review misses.

## 💰 Pricing

| Feature | Free | Pro ($29/mo) | Enterprise ($149/mo) |
|---|:---:|:---:|:---:|
| Doc files scanned | 3 | Unlimited | Unlimited |
| Endpoint + method validation | ✅ | ✅ | ✅ |
| Request body schema check | — | ✅ | ✅ |
| SARIF output for CI | — | ✅ | ✅ |
| GitHub Action included | — | ✅ | ✅ |
| Custom validation rules | — | — | ✅ |
| Response example validation | — | — | ✅ |
| SSO + audit log | — | — | ✅ |
| Priority support + SLA | — | — | ✅ |

## CI Integration

```yaml
# .github/workflows/docpulse.yml
name: DocPulse
on: [push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g docpulse
      - run: docpulse -s openapi.yaml -d "docs/**/*.md" -f sarif > results.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

## Supported Patterns

- `curl -X POST https://api.example.com/users -d '{"name":"test"}'`
- `fetch('/users', { method: 'POST' })`
- `axios.post('/users', { name: 'test' })`

## License

MIT — Free core, paid advanced features via license key.
