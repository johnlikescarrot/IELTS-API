# Contributing to IELTS-API

Thank you for improving the free, no-auth IELTS API. This project has a few
non-negotiable quality gates; every contribution goes through them.

## Ground rules

1. **All changes land via pull request.** Direct commits to `main` are not
   accepted, however small the change.
2. **100% test coverage is enforced, not aspirational.** The coverage
   thresholds (lines, branches, functions, statements) are pinned at 100 and
   CI fails below them. If you add code, add tests that exercise every
   branch.
3. **super-linter runs on every push and pull request.** Run it locally or
   expect CI to run it for you: `npm run lint` covers ESLint, Prettier, and
   markdownlint. Fix all findings before requesting review.
4. **Content changes must respect licensing.** All datasets in this
   repository are original works released under MIT. Never paste text from
   commercial prep books, Cambridge materials, or other copyrighted sources.
   Write original passages, questions, and answers, and cite the public
   IELTS framework (band descriptors, question formats) rather than quoting
   it at length.

## Development workflow

```bash
git clone https://github.com/johnlikescarrot/IELTS-API.git
cd IELTS-API
npm install

npm run dev             # run the API locally with watch mode
npm test                # run the test suite
npm run test:coverage   # enforce 100% coverage
npm run lint            # eslint + prettier + markdownlint
npm run build           # type-check and emit dist/
npm start               # run the built server (PORT env, default 3000)
```

Node 22 or newer is required.

## Adding dataset content

- Keep ids stable and namespaced (`w0xx` words, `rt-xxx`/`lt-xxx` tests,
  `wt-xxx` writing, `wm-xxx` mistakes, `sp-xxx` speaking, `tip-xxx` tips).
- The dataset integrity tests in `tests/data.test.ts` are the contract:
  unique ids, valid enums, word limits on completion answers, headings
  present for heading questions, model answers above the minimum word
  count. New content must satisfy them.
- Update `/v1/meta` expectations if you add a new collection.

## Pull request checklist

- [ ] Tests added or updated; `npm run test:coverage` passes at 100%.
- [ ] `npm run lint` passes.
- [ ] `npm run build` succeeds.
- [ ] OpenAPI document and `/docs` reflect any endpoint changes (they are
      generated from the route table, so this is usually automatic).
- [ ] `CHANGELOG.md` updated for user-facing changes.
- [ ] Content is original and MIT-compatible.

## Reporting issues

Use the issue templates. For data errors (a wrong answer key, a typo in a
passage), include the item id from the API response.
