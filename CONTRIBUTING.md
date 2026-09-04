# Contributing

Thanks for your interest in improving the IELTS API. Contributions are welcome.

## Getting started

1. Fork and clone the repository.
2. Install dependencies with `npm install`.
3. Make your change on a feature branch.
4. Run the full quality gate before opening a pull request.

## Quality gate

Every pull request must pass all checks:

```bash
npm run lint            # eslint
npm run format:check    # prettier
npm run typecheck       # strict TypeScript
npm run test:coverage   # Vitest with 100% coverage threshold
npm run build           # tsup bundle
```

Coverage is enforced at 100% for statements, branches, functions, and lines.
New or changed code must be fully covered by tests.

## Guidelines

- Keep the API free and authentication-free.
- Add data as typed, read-only module constants in `src/data`.
- Put pure domain logic in `src/services` so it is easy to test.
- Keep route handlers thin; delegate logic to the services.
- Follow the existing Prettier and ESLint conventions.

## Pull requests

Always open a pull request; changes are never merged silently. The continuous
integration workflow runs Super-Linter, ESLint, Prettier, TypeScript, and the
coverage-enforced test suite on every change.
