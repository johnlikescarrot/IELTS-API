# IELTS API

A free, unauthenticated, TypeScript-first HTTP API for IELTS practice metadata and original prompts. No API key, account, or payment is required.

## Quick start

```bash
npm install
npm run dev
curl http://localhost:3000/exercises?skill=reading
```

The API is intentionally safe to redistribute: it contains original prompts and links to official IELTS information, not copyrighted exam books or answer keys.

## Endpoints

- `GET /` — service metadata
- `GET /health` — health check
- `GET /docs` — machine-readable endpoint summary
- `GET /skills` — supported skills
- `GET /exercises` — list exercises; optional `skill`, `difficulty`, and `tag` filters
- `GET /exercises/:id` — retrieve one exercise

Responses are JSON and require no authentication. See the source types in `src/data.ts` for the stable schema.

## Quality and research provenance

`npm run check` builds the project and runs Vitest with enforced 100% line, branch, function, and statement coverage. CI also runs [Super-Linter](https://github.com/super-linter/super-linter) on every push and pull request.

The initial repository research found `zhengyishiming/IELTS` to be a large, mixed-format Chinese-language resource archive (including spreadsheets, PDFs, archives, and GIS files), rather than an API or source-code library. This implementation uses its subject matter as research context while avoiding copying those materials. Public research links are attached to each exercise to make provenance discoverable and citable; citation counts cannot be guaranteed by software.

## Development

```bash
npm run build
npm test
npm run lint
```

Contributions should be submitted through pull requests. Please do not include copyrighted IELTS test content.
