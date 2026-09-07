# Client-owned vocabulary review

The review toolkit is free, authentication-free and dependency-free at runtime. It provides a
**reproducible scheduling baseline**, not a memory-retention estimate, a mastery score, an IELTS
band predictor or an account service. Its design follows a source-level study of
[`Iamdacai/ielts-vocab-system`](https://github.com/Iamdacai/ielts-vocab-system/tree/1f5ad56d664c56ae449dacc7618b6d7f23967a69)
and an independent implementation of the published SM-2 equations. See
[RESEARCH.md, Part VIII](../RESEARCH.md#part-viii--client-owned-vocabulary-review) for provenance,
scientific context and limitations.

## Endpoints

| Method | Endpoint                  | Purpose                                                                                     |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/v1/vocabulary/deck`     | Pages of a seeded vocabulary permutation, with separate prompts, answers and initial states |
| GET    | `/v1/study/review/policy` | Exact algorithm version, six recall grades, bounds and conventions                          |
| POST   | `/v1/study/review`        | Compute one scheduled recall; return a new card state                                       |
| POST   | `/v1/study/review/queue`  | Select due reviews before new cards from client-supplied states                             |

All JSON responses use `{ "status": 200, "data": ..., "meta": ... }`. Errors use the same envelope
with `data: null` and `meta.error: { code, message, details }`. The [OpenAPI document](openapi.json)
includes request and response schemas. All other existing domain endpoints remain GET-only, with
HEAD and OPTIONS support.

## 1. Obtain a deck

```bash
curl -s 'http://localhost:3000/v1/vocabulary/deck?seed=class-a&on=2026-09-07&volume=1,2&pos=noun,verb&limit=10&offset=0'
```

- **Required:** `seed` (nonblank, at most 128 characters) and `on` (explicit `YYYY-MM-DD`). HTTP query
  values are trimmed. The echoed seed is the one used by the generator.
- **Optional:** `volume` (comma-separated 1–22), `pos` (comma-separated parts of speech), `limit`
  (1–50, default 10), `offset` (0–100000, default 0). Values within each filter are a union; the two
  filters intersect. Repeated query parameters are rejected, not silently truncated.
- The eligible entries are sorted by ASCII identifier, shuffled once using the existing FNV-1a /
  mulberry32 generator with Fisher–Yates, and **then** paginated. Keep the same seed and filters and
  advance `offset` by the number of cards received. Adjacent pages never repeat an entry, even if
  page sizes change. Empty/exhausted populations return empty pages, not unrelated fallback words.
- `on` sets the initial due date but does not alter the permutation. Archive the API version and
  filters too: dataset changes in a future release may change the eligible population and order.
- Each card has `prompt`, `answer` and `state`. Hide `answer` until the learner attempts recall.
  Glosses and senses retain the existing dataset's language; no translation is fabricated. `null`
  means unavailable. Deck retrieval is **not** a learning event.
- A public GET response may be cached. The generated states contain only initial defaults. Store
  modified states locally and do not regenerate the deck to restore progress: that would reset it.

## 2. Record one scheduled recall

Send the current card, a grade from the policy rubric, and the actual review date:

```bash
curl -s 'http://localhost:3000/v1/study/review' \
  -H 'Content-Type: application/json' \
  -d '{
    "card": {
      "id": "w00001",
      "algorithm": "sm2-v1",
      "repetitions": 0,
      "lapses": 0,
      "intervalDays": 0,
      "easeFactor": 2.5,
      "lastReviewedOn": null,
      "dueOn": "2026-09-07"
    },
    "grade": 5,
    "on": "2026-09-07"
  }'
```

`data` is:

```json
{
  "card": {
    "id": "w00001",
    "algorithm": "sm2-v1",
    "repetitions": 1,
    "lapses": 0,
    "intervalDays": 1,
    "easeFactor": 2.6,
    "lastReviewedOn": "2026-09-07",
    "dueOn": "2026-09-08"
  },
  "grade": 5,
  "on": "2026-09-07",
  "reason": "first-success",
  "repeatToday": false,
  "intervalCapped": false,
  "easeClamped": false
}
```

Save **`data.card`**, replacing the previous local state. The server has not saved it. Repeating the
identical original request returns an identical result; it does not increment a hidden counter.
Submitting the updated state before `dueOn`, including again on the same day, returns 400.

The `id` is an opaque item identifier, not a learner identifier: 1–64 ASCII characters, starting
with a letter or digit, followed by letters, digits, `.`, `_`, `:`, or `-`. Decks use existing
vocabulary IDs. Your own local flashcards can use other identifiers; the scheduler does not require
that an ID occur in the vocabulary dataset.

### Exact `sm2-v1` policy

This is a **bounded, day-level adaptation** of [Wozniak's SM-2 description](https://super-memory.com/english/ol/sm2.htm),
not Anki/FSRS compatibility and not a claim to reproduce the reference application's stage tables.

1. A new card has ease 2.5, no last-review date, and zero repetitions, lapses and interval.
2. For grades 3–5, increment consecutive successful repetitions. After the first success, use
   1 day; after the second, 6 days; subsequently use
   `ceil(previous intervalDays × previous easeFactor)`.
3. For grades 0–2, increment lapses, reset repetitions to zero, and schedule 1 day. The next
   successful scheduled recall restarts the 1-day, 6-day sequence.
4. For **every** grade `q`, update ease with
   `EF + 0.1 - (5 - q) × (0.08 + (5 - q) × 0.02)`. Round to two decimals and clamp to 1.3–10.
   On a lapse, retain this **updated** ease rather than restoring 2.5. This explicitly resolves
   the interaction between the source's ease-update and restart instructions.
5. Cap the interval at 36,500 days. The maximum ease and interval are operational guardrails, not
   empirically estimated parameters; responses expose `easeClamped` and `intervalCapped`.
6. Dates are Gregorian years 0001–9999, at UTC midnight. Add whole 86,400,000 ms days; never local
   `setDate()` or the process clock. Late reviews start the next interval on the **actual** `on`
   date; there is no overdue bonus. Dates beyond year 9999 are rejected, not silently clipped.
7. Grades below 4 return `repeatToday: true`: practise the item locally again today. These are
   drills, **not new scheduled reviews**; do not submit them to advance the day-level state. This
   separates the source's same-session repetition advice from the durable daily schedule.
8. Repetitions and lapses are integers in 0–1,000,000. Counter overflow is rejected, not wrapped or
   silently saturated. Reviewed states require positive intervals, review history and
   `dueOn = lastReviewedOn + intervalDays`; initial states must retain their initial defaults.
   These checks establish structural consistency, not proof that reviews really happened.

A hand-checkable trajectory, reviewing exactly when due:

| Review date | Grade | Interval days | Next due   | New ease |
| ----------- | ----: | ------------: | ---------- | -------: |
| 2026-09-07  |     5 |             1 | 2026-09-08 |     2.60 |
| 2026-09-08  |     5 |             6 | 2026-09-14 |     2.70 |
| 2026-09-14  |     5 |            17 | 2026-10-01 |     2.80 |
| 2026-10-01  |     4 |            48 | 2026-11-18 |     2.80 |
| 2026-11-18  |     3 |           135 | 2027-04-02 |     2.66 |

The third interval is `ceil(6 × 2.7) = 17`, **not** `round(6 × 2.8)` using the new ease.
This trajectory is asserted independently in the tests.

## 3. Build a due queue

```bash
curl -s 'http://localhost:3000/v1/study/review/queue' \
  -H 'Content-Type: application/json' \
  -d '{
    "on": "2026-09-08",
    "limit": 20,
    "newLimit": 5,
    "cards": [{
      "id": "w00001", "algorithm": "sm2-v1", "repetitions": 1, "lapses": 0,
      "intervalDays": 1, "easeFactor": 2.6,
      "lastReviewedOn": "2026-09-07", "dueOn": "2026-09-08"
    }]
  }'
```

`cards` and `on` are required. At most 500 unique card IDs are accepted. The total selection limit
is 1–100 (default 20); the new-card allowance is 0–50 (default 10). Zero really means no new cards.

- Exclude future cards; never fill an empty queue with items that are not due.
- Select previously reviewed cards first: earliest due date, then more lapses when dates tie,
  then ascending ASCII ID. New cards follow, ordered by due date and ID. Input ordering does not
  affect the result. Previously successful cards remain eligible when due; there is no permanent
  "mastered" exclusion.
- `counts` partitions the entire validated input **before** budgets:
  `total = overdue + due + new + scheduled`. `due` means previously reviewed and due exactly on
  `on`; `new` means unreviewed and eligible now; `scheduled` includes all future cards.
- Each selected item contains the copied `card`, its `status`, and whole `overdueDays` (which may
  also be positive for an old, unreviewed card). `remaining` counts all eligible cards left out by
  either budget. No state is changed. Replace reviewed states locally before asking for another
  queue; repeatedly submitting unchanged input deliberately selects the same cards.
- Duplicate IDs, malformed cards (including future cards), unknown properties, numeric strings,
  non-finite/fractional counters and unsupported algorithm versions are rejected with 400.
- For a larger collection, use the same exported function locally over batches and merge by the
  documented ordering; per-batch limits alone are **not** a global study budget.

## Library usage

The Node.js package exports the same functions used by HTTP handlers; no server is necessary.

```ts
import { createVocabularyDeck, buildReviewQueue, scheduleReview } from 'ielts-api';

const deck = createVocabularyDeck({ seed: 'class-a', on: '2026-09-07', limit: 10 });
const states = deck.cards.map((item) => item.state);
const queue = buildReviewQueue(states, '2026-09-07', 20, 5);
const item = queue.items[0];
if (item) {
  const result = scheduleReview(item.card, 4, '2026-09-07');
  // Persist result.card in your own local storage, replacing its previous state.
}
```

`createReviewCard`, `parseReviewCard`, `REVIEW_POLICY`, and the `ReviewCard`, `ReviewResult`,
`ReviewQueue`, `VocabularyFlashcard` and `VocabularyDeck` types are exported too. No function
mutates its input. The library functions validate runtime inputs as well as providing TypeScript
signatures. Optional library values must be omitted or `undefined`, not `null`.

## Privacy and transport limits

- No accounts, API keys, cookies, database writes or server-side sessions. IDs identify **items**,
  not people. Send no names, e-mail addresses, essays or sensitive notes in card states or seeds.
- Only the two computations accept POST. Bodies require uncompressed `application/json` in UTF-8
  (optional `charset=utf-8`); compressed/non-JSON bodies return 415.
- Maximum **actual bytes**: 262,144 (256 KiB), regardless of Content-Length or chunked transfer;
  oversized uploads return 413. Uploads have a 10-second elapsed deadline (408). Queue count and
  transport size limits both apply. Syntax/UTF-8 failures and malformed input return 400.
- POST responses, including errors, use `Cache-Control: no-store` and `X-Robots-Tag: noindex,
nofollow`. Conditional ETags do not suppress POST results. Public GET caching remains available.
- Request logs contain method, path, status and duration, **not query strings or JSON bodies**.
  Error details identify fields without echoing submitted JSON values. This applies to this
  application's logging, not independent reverse proxies or hosting-provider logs. Configure
  infrastructure not to record bodies and use HTTPS for transport confidentiality.
- Open CORS permits JSON preflight from any origin, without credentialed cookies. The OpenAPI
  server URL is relative, so HTTPS reverse proxies do not send browsers to localhost or HTTP.

## Reproducing the checks

```bash
npm ci
npm run validate
npm run docs:openapi  # deterministic regeneration of the archived contract
TZ=America/New_York npx vitest run test/lib/review.test.ts test/lib/deck.test.ts
TZ=Pacific/Auckland npx vitest run test/lib/review.test.ts test/lib/deck.test.ts
```

The full coverage gate is unchanged: every executable TypeScript file under `src/` must reach
100% statements, branches, functions and lines. Tests include hand-computed schedules, repeated
lapses, boundary dates, counter limits, replay/immutability, shuffled pagination, queue budgets,
streaming and timeout behaviour, and validation of actual HTTP responses against the OpenAPI 3.1
JSON Schemas. AJV and its format validators are **development-only** dependencies.

Coverage does not establish learning efficacy. No learner experiment, retention calibration,
peer-reviewed publication, DOI assignment, Google Scholar indexing or citation impact is claimed
for this addition.
