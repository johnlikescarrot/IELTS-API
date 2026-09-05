# Review of UPGRADE-YOUR-IELTS-SKILLS

Reviewed on **2026-09-05**. This is a structural and implementation review, not an endorsement of
answer accuracy, copyright ownership, learning outcomes or the availability of an upstream service.

- Repository: [ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS][source].
- Commit: [`ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c`][snapshot] (2026-07-03).
- Recursive Git tree: **6,309 entries, 5,545 blobs**, `truncated: false`.
- No project-level `LICENSE`, `LICENCE` or `COPYING` file was found outside `node_modules`.
  Dependency licences do not grant rights to the project's educational material.

## What was inspected

The complete tree and reading index were checked. The following documentation and implementation
files were read at the pinned commit:

- [`Docs/PROJECT_SUMMARY.md`][summary]: the four collections, account system and subscription model.
- [`Reading_1232_Basic/IELTS-Reading-1232-Plan.md`][plan]: six nominal CEFR levels, eleven planned
  question families, timed practice, feedback, vocabulary work and review.
- [`Listening_102_Basic/development_log.md`][listening-log]: static templates, audio processing,
  automatic marking, device binding and Google Sheets logging.
- [`Reading_1232_Basic/frontend/reading_app.js`][reader]: grouped and single-answer marking,
  answer normalization and submission handling.
- [`Reading_1232_Basic/verify_data.py`][verification]: validation of answer categories and missing
  grouped answers.
- [`Reading_1232_Basic/frontend/data/index.json`][index]: all 1,232 referenced lesson paths exist;
  the index has 1,232 unique identifiers and 1,232 unique file paths.

Five JSON records were inspected for **schema structure only**, without importing their content:

| File relative to the repository                          | Git blob SHA-1                             | Structural observation                                           |
| -------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| `Reading_1232_Basic/frontend/data/A1-A2/lesson_001.json` | `a4dc63ca6307c7231698e74fab7423669f13bafc` | 12 question objects; choice, true/false/not-given and completion |
| `Reading_1232_Basic/frontend/data/B1-B2/lesson_200.json` | `76701eff877244d6df22a28284ebd9cc7535d943` | 5 question objects across 5 families                             |
| `Reading_1232_Basic/frontend/data/C1-C2/lesson_001.json` | `305a047dd7875c688d9c1dab93155911ea146b9a` | 4 question objects across 4 families                             |
| `Listening_204_FullTest/Test_1/Test_1.json`              | `fdd70c59f3b2fbc67d738facb86087c94e531194` | Section-based, unlike the basic reading schema                   |
| `Reading_315_FullTest/Test_1/Test_1.json`                | `5659ce4aa55c75f5d5f661b1a2f5f52b891da9fc` | Section-based, unlike the basic reading schema                   |

These samples are **not** a statistical audit of all questions. A question object may contain several
subquestions, so object counts are not necessarily mark totals. Filenames and index labels alone do
not establish CEFR calibration or an IELTS-equivalent band.

## Observed inventory, not just directory names

| Collection      | Observed at the pinned commit                                                                              | Important qualification                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Basic listening | 102 `Lesson_N/index.html` pages: 34 each under Basic, Intermediate and Advanced                            | Additional templates and audio copies are not extra lessons                                         |
| Full listening  | 204 numbered test directories; 204 `Test_N.html` pages; 201 canonical `Test_N.json` files                  | Direct MP3 files are absent in tests 83, 85 and 88; canonical JSON files are absent in 3, 34 and 51 |
| Basic reading   | 1,232 indexed lessons: 198 A1–A2, 374 B1–B2, 660 C1–C2                                                     | JSON and JavaScript wrappers duplicate representations, not lessons                                 |
| Full reading    | 314 numbered test directories and pages, despite the name `Reading_315_FullTest`; 269 canonical JSON files | Test directory 105 is absent; processed JSON exists for only a subset                               |

“Absent” means absent at the expected path in this Git tree. It does **not** establish that a page
cannot load a remote asset or that a test is unusable. No upstream account was used, no login was
bypassed, and no protected service or credential file was accessed.

## Consequences for this API

1. **Retain the useful learning workflow, not the access model.** The upstream summary describes
   login and an annual subscription, and the listening log describes device identifiers. This API
   instead offers original exercises and stateless feedback with no learner identity, cookie,
   account, device fingerprint or persistence. The upstream platform is therefore **not** added to
   `/v1/resources`, whose contract requires free, login-free access.
2. **Separate questions from solutions.** Normal list, detail and sample responses do not contain
   accepted answers. Grading returns explanations and paragraph evidence for review. This is an
   open practice resource, not a secure examination platform: answer keys are available in source
   and an empty submission deliberately returns the review feedback.
3. **Make matching rules explicit.** The reviewed client normalizes case, trims strings and replaces
   underscores. Our independently written checker uses NFC Unicode, lowercasing and collapsed
   whitespace, preserves punctuation and accents, enforces word limits, and accepts only declared
   answer variants. It does not guess synonyms or award a band score.
4. **Count what is shipped.** `/v1/reading/stats` computes counts from six original exercises and 36
   questions. The three difficulty labels are editorial, not inherited or validated CEFR levels.
5. **Pin reproducibility.** Stable exercise/question IDs, a dataset version and a SHA-256 over the
   complete authored records accompany every reading response. Seeded sampling is reproducible
   within that content identity; a changed collection can change a sample.
6. **Do not redistribute unlicensed material.** No upstream passage, prompt, answer key, audio,
   executable code, spreadsheet, tracking script or credential is shipped by this addition. The
   new fictional reading materials are AI-assisted original writing, released under CC BY 4.0 to
   the extent the project holds rights. They still need independent pedagogical review and learner
   validation; automated test coverage is not evidence of educational effectiveness.

## Reproducing the structural counts

The Git tree and index are public metadata; the following commands do not download test content.
Keep these temporary files outside the repository. GitHub's anonymous API limit may apply; `gh` can
use an existing GitHub connection, but the IELTS API itself never requires authentication.

```bash
SOURCE=ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
COMMIT=ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c
gh api "repos/$SOURCE/git/trees/$COMMIT?recursive=1" > /tmp/upgrade-tree.json
gh api -H 'Accept: application/vnd.github.raw+json' \
  "repos/$SOURCE/contents/Reading_1232_Basic/frontend/data/index.json?ref=$COMMIT" \
  > /tmp/upgrade-index.json
python3 - <<'PY'
import json
import re
from collections import Counter
from pathlib import Path

tree = json.loads(Path('/tmp/upgrade-tree.json').read_text())
assert tree['truncated'] is False
entries = tree['tree']
blobs = {e['path'] for e in entries if e['type'] == 'blob'}
print('tree entries:', len(entries), 'blobs:', len(blobs))
lessons = [p.split('/')[1] for p in blobs if re.fullmatch(
    r'Listening_102_Basic/(Basic|Intermediate|Advanced)/Lesson_\d+/index.html', p)]
print('basic listening:', dict(sorted(Counter(lessons).items())))
for root, expected in [('Listening_204_FullTest', 204), ('Reading_315_FullTest', 315)]:
    numbers = {int(m[1]) for e in entries if e['type'] == 'tree'
               and (m := re.fullmatch(root + r'/Test_(\d+)', e['path']))}
    canonical = [p for p in blobs if re.fullmatch(root + r'/Test_(\d+)/Test_\1\.json', p)]
    print(root, 'directories:', len(numbers), 'JSON:', len(canonical),
          'missing directories:', sorted(set(range(1, expected + 1)) - numbers))
index = json.loads(Path('/tmp/upgrade-index.json').read_text())
records = [r for group in index.values() for r in group]
assert len({r['id'] for r in records}) == len(records)
assert len({r['file'] for r in records}) == len(records)
assert all('Reading_1232_Basic/frontend/' + r['file'] in blobs for r in records)
print('basic reading:', {level: len(rows) for level, rows in index.items()})
PY
```

[source]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS
[snapshot]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/tree/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c
[summary]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Docs/PROJECT_SUMMARY.md
[plan]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Reading_1232_Basic/IELTS-Reading-1232-Plan.md
[listening-log]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Listening_102_Basic/development_log.md
[reader]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Reading_1232_Basic/frontend/reading_app.js
[verification]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Reading_1232_Basic/verify_data.py
[index]: https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/blob/ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c/Reading_1232_Basic/frontend/data/index.json
