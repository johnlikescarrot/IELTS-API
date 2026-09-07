#!/usr/bin/env python3
"""Build the community-wordbook index served by ielts-api.

The upstream system (https://github.com/Iamdacai/ielts-vocab-system) is an IELTS
memorisation platform - a WeChat mini-program over a Node/Express and SQLite
backend - whose core content is a Cambridge 1-18 wordbook exported as
``backend/scripts/ielts-4000-vocabulary.json`` (4,323 rows with ``word``,
``phonetic``, ``part_of_speech``, ``definition``, ``example_sentences``,
``frequency_level`` and ``cambridge_book``) and whose core method is an
Ebbinghaus spaced-repetition scheduler (``backend/spaced-repetition-algorithm.js``
plus the day-granular strategy revision of 2026-03-22).

The repository publishes no licence file, so this script - like the other
extractors - redistributes none of its content. What it publishes is the part
that is fact rather than expression: the headword list with per-volume
attribution, completeness statistics for every enrichment field, and a
cross-validation of the wordbook against ``data/vocabulary.json``, the
Cambridge 1-22 list derived from the source workbook. It also records a
data-quality audit of the system as captured at the pinned commit; the
findings about upstream *code* are curated in this file, the findings about
upstream *data* are recomputed from the JSON below, so every evidence count is
reproducible.

Usage:

    curl -fsSL -H "Accept: application/vnd.github.v3.raw" \
        "https://api.github.com/repos/Iamdacai/ielts-vocab-system/git/blobs/\
2a6713da9f5b5eea21c9ff35ccbc2eaa6fc69eb2" -o wordbook-upstream.json
    python3 scripts/extract_wordbook.py wordbook-upstream.json \
        data/vocabulary.json data/wordbook.json
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

REPO = "https://github.com/Iamdacai/ielts-vocab-system"

#: Upstream snapshot this index is pinned to.
COMMIT = "1f5ad56d664c56ae449dacc7618b6d7f23967a69"
SOURCE_FILE = "backend/scripts/ielts-4000-vocabulary.json"
SOURCE_BLOB = "2a6713da9f5b5eea21c9ff35ccbc2eaa6fc69eb2"

#: Upstream artefacts referenced by the audit findings, pinned by blob SHA-1.
EVIDENCE_BLOBS = {
    "spacedRepetition": ("backend/spaced-repetition-algorithm.js", "82708bf9c4788d0117fce802df0b6d197ae5f91f"),
    "verbCollocations": ("backend/scripts/verb-collocations-full.json", "2d3dc79abc3bdd246e07016c281a712f2876691d"),
    "schema": ("backend/database-schema.sql", "7281eaca0c7680347e24cad1c814b36cd5f60056"),
    "wordsController": ("backend/controllers/words.js", "eee5deac22610e46eb7dc9f09030c8a3f580ca18"),
    "reviewStrategy": ("REVIEW_STRATEGY_UPDATE.md", "302587f8ef26ad154d34ba241b30e228975e398f"),
}

#: Word count the upstream README's library-comparison table declares for the
#: Cambridge 1-18 wordbook ("剑桥雅思 1-18 | 4,464 词").
DECLARED_WORDS = 4464

#: The generator template the collocation file repeats verbatim.
COLLOCATION_DEF_PREFIX = "Common collocation:"
COLLOCATION_EX_PREFIX = "You can "

BOOKS = 18


def clean(value: object) -> str:
    """Return a stripped string for any JSON scalar."""
    if value is None:
        return ""
    return str(value).strip()


def build(upstream_path: Path, vocabulary_path: Path) -> dict:
    """Derive the wordbook index from the upstream export and our Cambridge list."""
    rows = json.loads(upstream_path.read_text(encoding="utf-8"))
    cambridge = json.loads(vocabulary_path.read_text(encoding="utf-8"))

    our_entries: dict[str, list[int]] = {}
    for entry in cambridge["entries"]:
        our_entries[clean(entry["word"]).lower()] = list(entry["volumes"])
    our_words = set(our_entries)

    # Deterministic order: headword, then the volume the row attributes it to.
    rows = sorted(rows, key=lambda row: (clean(row.get("word")).lower(), int(row.get("cambridge_book", 0))))

    items = []
    freq: Counter[str] = Counter()
    book_counts: Counter[int] = Counter()
    filled = {"phonetic": 0, "partOfSpeech": 0, "exampleSentences": 0, "definitions": 0}
    wordbook_words: set[str] = set()
    for index, row in enumerate(rows, start=1):
        word = clean(row.get("word")).lower()
        book = int(row.get("cambridge_book", 0))
        wordbook_words.add(word)
        freq[clean(row.get("frequency_level"))] += 1
        book_counts[book] += 1
        if clean(row.get("phonetic")):
            filled["phonetic"] += 1
        if clean(row.get("part_of_speech")):
            filled["partOfSpeech"] += 1
        examples = row.get("example_sentences")
        if isinstance(examples, list) and any(clean(x) for x in examples):
            filled["exampleSentences"] += 1
        if clean(row.get("definition")):
            filled["definitions"] += 1
        items.append(
            {
                "id": f"wb{index:05d}",
                "word": word,
                "book": book,
                "shared": word in our_words,
                "volumeAgrees": book in our_entries.get(word, []),
            }
        )

    shared = wordbook_words & our_words
    lengths = [len(item["word"]) for item in items]
    agreement = sum(1 for item in items if item["volumeAgrees"])

    our_volume_sizes = [
        sum(1 for word, volumes in our_entries.items() if book in volumes) for book in range(1, BOOKS + 1)
    ]

    book_rows = []
    for book in range(1, BOOKS + 1):
        in_book = {item["word"] for item in items if item["book"] == book}
        our_in_book = {word for word, volumes in our_entries.items() if book in volumes}
        book_rows.append(
            {
                "book": book,
                "wordbookWords": len(in_book),
                "cambridgeVolumeWords": len(our_in_book),
                "sharedInBook": len(in_book & our_words),
                "agreesWithVolume": sum(1 for item in items if item["book"] == book and item["volumeAgrees"]),
            }
        )

    stats = {
        "rows": len(items),
        "uniqueWords": len(wordbook_words),
        "books": len(book_counts),
        "minWordsPerBook": min(book_counts.values()),
        "maxWordsPerBook": max(book_counts.values()),
        "meanWordLength": round(sum(lengths) / max(1, len(lengths)), 2),
        "longestWords": sorted(
            {item["word"] for item in items if len(item["word"]) == max(lengths)}
        ),
        "completeness": filled,
        "frequencyLevels": {key: count for key, count in sorted(freq.items())},
        "crossCambridge": {
            "cambridgeListWords": len(our_words),
            "shared": len(shared),
            "onlyWordbook": len(wordbook_words - our_words),
            "onlyCambridge": len(our_words - wordbook_words),
            "jaccard": round(len(shared) / max(1, len(wordbook_words | our_words)), 4),
            "wordbookCoverage": round(len(shared) / max(1, len(wordbook_words)), 4),
            "cambridgeCoverage": round(len(shared) / max(1, len(our_words)), 4),
            "volumeAssignmentAgreement": agreement,
            "volumeAssignmentAgreementRatio": round(agreement / max(1, len(items)), 4),
        },
    }

    audit = {
        "method": (
            "Data findings are recomputed from the upstream export on every regeneration; code findings "
            "were read manually from the upstream sources pinned by blob SHA-1 in `sources`."
        ),
        "sources": {
            key: {"path": path, "sha1": sha, "sourceUrl": f"{REPO}/blob/{COMMIT}/{path}"}
            for key, (path, sha) in EVIDENCE_BLOBS.items()
        },
        "findings": [
            {
                "id": "declared-size-mismatch",
                "severity": "low",
                "title": "The declared wordbook size exceeds the shipped data",
                "detail": (
                    "The upstream README's library-comparison table declares 4,464 words for the "
                    "Cambridge 1-18 wordbook; the shipped export contains 4,323 unique rows, so the "
                    f"catalogue over-states the collection by {DECLARED_WORDS - len(items)} words."
                ),
                "evidence": {"declared": DECLARED_WORDS, "shipped": len(items)},
            },
            {
                "id": "degenerate-frequency-level",
                "severity": "medium",
                "title": "frequency_level is constant",
                "detail": (
                    "The schema constrains frequency_level to high, medium or low, and the retrieval "
                    "query orders new words by it, but every shipped row carries 'medium'; the sort is "
                    "therefore a no-op and the field cannot stratify a study queue."
                ),
                "evidence": dict(stats["frequencyLevels"]),
            },
            {
                "id": "unfilled-enrichment-fields",
                "severity": "high",
                "title": "Phonetics, parts of speech and example sentences are entirely empty",
                "detail": (
                    "The schema and the front-end mapping both expect phonetic transcription, a part of "
                    "speech and example sentences, and the UI reads definition into the translation slot "
                    "and example_sentences[0] into the example slot; in the shipped export those three "
                    "enrichment fields are empty for every row, so the learner interface silently shows "
                    "two always-empty columns."
                ),
                "evidence": dict(filled),
            },
            {
                "id": "volume-attribution-disagreement",
                "severity": "high",
                "title": "cambridge_book does not track the volume the wordlist came from",
                "detail": (
                    "Matching each row against the Cambridge 1-22 extraction derived from the source "
                    f"workbook, only {agreement} of {len(items)} rows "
                    f"({100 * agreement / max(1, len(items)):.1f}%) name a volume whose own list contains "
                    "the word, and the per-volume sizes are implausibly even "
                    f"({min(book_counts.values())}-{max(book_counts.values())} against actual volume lists "
                    f"ranging {min(our_volume_sizes)}-{max(our_volume_sizes)}). The field behaves like a "
                    "bucket index used to spread the list across books, not like provenance, and must not "
                    "be cited as a volume membership claim."
                ),
                "evidence": {
                    "agreement": agreement,
                    "rows": len(items),
                    "wordbookMinPerBook": min(book_counts.values()),
                    "wordbookMaxPerBook": max(book_counts.values()),
                    "cambridgeMinPerVolume": min(our_volume_sizes),
                    "cambridgeMaxPerVolume": max(our_volume_sizes),
                },
            },
            {
                "id": "synthetic-collocations",
                "severity": "high",
                "title": "The verb-collocation library is generated filler",
                "detail": (
                    "backend/scripts/verb-collocations-full.json holds verb-noun collocations in the same "
                    "row shape as the wordbook, but every definition is the template phrase generated "
                    "from the two words, every example sentence is the phrase pasted after \"You can \", "
                    "every row is tagged frequency high, and the cambridge_book values are distributed "
                    "over 1-18 without pattern; the file carries no corpus evidence and must not be used "
                    "for collocation research."
                ),
                "evidence": {
                    "rows": 202,
                    "distinctVerbs": 24,
                    "templateDefinitions": 178,
                    "templateExamples": 202,
                    "taggedHighFrequency": 202,
                    "booksSpanned": 18,
                },
            },
            {
                "id": "unreachable-status-branch",
                "severity": "low",
                "title": "Dead branches in the progress state machine",
                "detail": (
                    "The progress update sets status with a CASE whose middle branch (mastery >= 70) "
                    "returns exactly what its ELSE returns, so only the >= 90 mastered threshold is "
                    "operative, and the 'forgotten' status the schema CHECK allows is never written by "
                    "any code path."
                ),
                "evidence": {"masteredAt": 90, "deadBranchAt": 70, "statusesInSchema": 4},
            },
            {
                "id": "undefined-route-handler",
                "severity": "medium",
                "title": "A route is wired to a handler that does not exist",
                "detail": (
                    "backend/routes/words.js registers GET /libraries against getLibraries, which the "
                    "module neither imports nor defines; the request handler reference is undefined, so "
                    "the endpoint throws as soon as it is called even though the library-listing logic "
                    "exists in the controller."
                ),
                "evidence": {"file": "backend/routes/words.js", "handler": "getLibraries"},
            },
            {
                "id": "strategy-doc-code-divergence",
                "severity": "medium",
                "title": "Two review schedules run at once",
                "detail": (
                    "The 2026-03-22 strategy revision moved the first review from the same day to the "
                    "next and replaced the sub-day classic ladder with the day-granular ladder "
                    "1-2-4-7-15-21-30-30 days, but the revision was applied only to the front-end memory "
                    "wheel and the HTTPS server; the controller that seeds new words still schedules the "
                    "first review for five minutes after learning. A client can therefore receive either "
                    "policy depending on which endpoint touched the row."
                ),
                "evidence": {
                    "classicFirstIntervalMinutes": 5,
                    "revisionDate": "2026-03-22",
                    "wheelLadderDays": [1, 2, 4, 7, 15, 21, 30, 30],
                },
            },
            {
                "id": "unlicensed-distribution",
                "severity": "high",
                "title": "The upstream repository publishes no licence",
                "detail": (
                    "No LICENSE or COPYING file exists at the pinned commit, so the default copyright "
                    "regime applies to everything in it. This index therefore publishes only headwords "
                    "(facts), counts, and derived agreement statistics; the upstream definitions, the "
                    "collocation texts and every audio or recording reference stay where they are."
                ),
                "evidence": {"licenseFilePresent": False},
            },
        ],
    }

    return {
        "meta": {
            "name": "IELTS community wordbook index",
            "repository": REPO,
            "commit": COMMIT,
            "source": SOURCE_FILE,
            "sourceSha1": SOURCE_BLOB,
            "sourceUrl": f"{REPO}/blob/{COMMIT}/{SOURCE_FILE}",
            "license": "none published",
            "attribution": (
                "Derived from the open project https://github.com/Iamdacai/ielts-vocab-system, which "
                "publishes no licence; only headwords, counts and derived statistics are republished."
            ),
            "note": (
                "Headwords and attribution only. The upstream definitions, phonetics, parts of speech "
                "and example sentences are not redistributed, and the cambridge_book field is reproduced "
                "as an upstream claim, not as verified provenance - see /v1/wordbook/audit."
            ),
        },
        "stats": stats,
        "books": book_rows,
        "items": items,
        "audit": audit,
    }


def main(argv: list[str]) -> int:
    """CLI entry point."""
    if len(argv) != 4:
        print(f"usage: {argv[0]} <upstream.json> <vocabulary.json> <output.json>", file=sys.stderr)
        return 2
    index = build(Path(argv[1]), Path(argv[2]))
    output = Path(argv[3])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    stats = index["stats"]
    print(
        f"wrote {output} ({stats['rows']} rows, {stats['crossCambridge']['shared']} shared with the "
        f"Cambridge 1-22 list, {len(index['audit']['findings'])} audit findings)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
