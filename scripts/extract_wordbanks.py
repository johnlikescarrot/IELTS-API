#!/usr/bin/env python3
"""Build the word-bank concordance served by ielts-api.

The upstream (https://github.com/Iamdacai/ielts-vocab-system) is not a folder
of files but an operational WeChat mini-program IELTS vocabulary-learning
platform: an Express/SQLite backend, a spaced-repetition review engine, an
admin statistics panel and AI-assisted speaking and writing practice. Its live
database materialises seven Chinese-market exam word lists - IELTS, TOEFL,
GRE, CET-4, CET-6, the postgraduate-entrance examination and a general
compilation - as 47,044 word rows over 15,931 distinct lower-cased headwords.

That deployment is the research object. This script derives a **concordance**:
bank inventories, cross-bank membership per word, the pairwise overlap matrix
(intersection, Jaccard, containment), an original join against the Cambridge
IELTS 1-22 vocabulary dataset shipped by this API, per-headword collocation
counts, the parameters of the deployed Ebbinghaus review engine, and the
system's speaking and writing prompt banks with their difficulty and
test-frequency ratings.

The repository declares no licence, so - as with the test-centre family - only
derived, non-substitutive metadata is published: no definition, phonetic
transcription, example sentence, full collocation pair list or user record is
redistributed, and no row of the upstream's learner data is read.

Usage::

    python3 scripts/extract_wordbanks.py ielts_vocab.db \\
        spaced-repetition-algorithm.py data/wordbanks.json

The Cambridge join reads ``data/vocabulary.json`` from the repository, so the
derivation is reproducible inside a checkout. Every list is sorted and every
ratio rounded before emission, so identical inputs produce byte-identical
output.
"""

from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

REPO = "https://github.com/Iamdacai/ielts-vocab-system"
COMMIT = "1f5ad56d664c56ae449dacc7618b6d7f23967a69"

DATABASE_PATH = "backend/ielts_vocab.db"
ALGORITHM_PATH = "backend/spaced-repetition-algorithm.js"

#: Canonical bank order: the IELTS bank first, then the other exams in the
#: order a Chinese learner meets them, then the general compilation.
BANKS = [
    {
        "id": "ielts",
        "label": "IELTS word list",
        "labelZh": "雅思单词表",
        "context": "IELTS, the International English Language Testing System",
        "sourceWorkbook": "vocabulary/词汇总汇大纲/雅思词汇4500+词汇9400/【00】雅思必备词汇4541.xlsx",
    },
    {
        "id": "cet4",
        "label": "CET-4 word list",
        "labelZh": "大学英语四级",
        "context": "College English Test Band 4, the national CET-4 examination",
        "sourceWorkbook": "vocabulary/VOC/大学英语四级单词表4428.xls",
    },
    {
        "id": "cet6",
        "label": "CET-6 word list",
        "labelZh": "大学英语六级",
        "context": "College English Test Band 6, the national CET-6 examination",
        "sourceWorkbook": "vocabulary/VOC/大学英语六级单词表5523.xls",
    },
    {
        "id": "kaoyan",
        "label": "Postgraduate-entrance word list",
        "labelZh": "考研单词表",
        "context": "the national postgraduate-entrance English examination",
        "sourceWorkbook": "vocabulary/VOC/考研英语单词表5494.xls",
    },
    {
        "id": "toefl",
        "label": "TOEFL word list",
        "labelZh": "托福单词表",
        "context": "TOEFL, the Test of English as a Foreign Language",
        "sourceWorkbook": "vocabulary/VOC/托福单词表9782.xlsx",
    },
    {
        "id": "gre",
        "label": "GRE word list",
        "labelZh": "GRE 单词表",
        "context": "the GRE revised General Test",
        "sourceWorkbook": "vocabulary/VOC/GRE单词表7496.xlsx",
    },
    {
        "id": "compilation",
        "label": "General compilation word list",
        "labelZh": "英语单词表汇编",
        "context": "a general exam-vocabulary compilation, not tied to one examination",
        "sourceWorkbook": "vocabulary/VOC/英语单词表汇编9800.xlsx",
    },
]

#: The spaced-repetition ladder of the deployed review engine, in minutes:
#: 5 minutes, 30 minutes, 12 hours, 1 day, 2 days, 4 days, 7 days, 15 days.
REVIEW_INTERVALS = [5, 30, 720, 1440, 2880, 5760, 10080, 21600]
REVIEW_LABELS = [
    "5 minutes",
    "30 minutes",
    "12 hours",
    "1 day",
    "2 days",
    "4 days",
    "7 days",
    "15 days",
]

#: Difficulty vocabulary of the system's prompt banks.
DIFFICULTIES = {"easy", "medium", "hard"}

#: Writing task types, normalised to this API's slugs.
TASK_TYPES = {
    "task1_academic": "task1-academic",
    "task1_general": "task1-general",
    "task2": "task2",
}


def sha1_of(path: str) -> str:
    """Return the SHA-1 of a file, streamed."""
    digest = hashlib.sha1()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_algorithm(path: str) -> dict:
    """Verify the review-engine constants against the deployed source.

    The intervals, mastery steps, clamps and review window are parsed out of
    ``spaced-repetition-algorithm.js`` and compared with the values this
    dataset publishes, so the concordance can never silently drift from the
    upstream implementation.
    """
    source = Path(path).read_text(encoding="utf-8")
    intervals = re.search(r"baseIntervals\s*=\s*\[([^\]]+)\]", source)
    if intervals is None:
        raise SystemExit("cannot find baseIntervals in the algorithm source")
    parsed = [int(value.strip()) for value in intervals.group(1).split(",")]
    if parsed != REVIEW_INTERVALS:
        raise SystemExit(f"review intervals drifted from the documented ladder: {parsed}")
    for needle in (
        "confidence * 5",
        "confidence * 8",
        "Math.max(0, Math.min(100, currentMastery + change))",
        "2 * 60 * 60 * 1000",
    ):
        if needle not in source:
            raise SystemExit(f"mastery rule drifted from the documented model: {needle!r} missing")
    return {
        "model": "ebbinghaus-ladder",
        "intervals": [
            {"step": index + 1, "minutes": minutes, "label": label}
            for index, (minutes, label) in enumerate(zip(REVIEW_INTERVALS, REVIEW_LABELS))
        ],
        "postBaseRule": {
            "description": (
                "After the eighth review the ladder is exhausted and the interval becomes "
                "21600 minutes (15 days) scaled by the mastery score: "
                "21600 * (1 + mastery / 100)."
            ),
            "baseMinutes": 21600,
            "formula": "21600 * (1 + mastery / 100)",
        },
        "masteryRule": {
            "range": [0, 100],
            "correctStep": 5,
            "incorrectStep": -8,
            "confidenceRange": [1, 5],
            "rounding": 2,
            "description": (
                "A correct answer raises the mastery score by 5 x confidence; an incorrect "
                "answer lowers it by 8 x confidence; the score is clamped to 0-100 and "
                "rounded to two decimals."
            ),
        },
        "reviewWindow": {
            "hours": 2,
            "description": (
                "A day's reviews fall within plus or minus two hours of the learner's "
                "configured daily review time."
            ),
        },
    }


def round4(value: float) -> float:
    """Round a ratio to four decimals, deterministically."""
    return round(value, 4)


def main(argv: list[str]) -> None:
    if len(argv) != 4:
        raise SystemExit(
            "usage: extract_wordbanks.py IELTS_VOCAB.DB SPACED-REPETITION-ALGORITHM.JS OUTPUT.json"
        )
    database, algorithm, output = argv[1], argv[2], argv[3]

    by_zh = {bank["labelZh"]: bank["id"] for bank in BANKS}
    connection = sqlite3.connect(f"file:{Path(database).resolve()}?mode=ro&immutable=1", uri=True)
    cursor = connection.cursor()

    # ---------------------------------------------------------------- banks
    bank_rows: dict[str, dict] = {}
    membership: dict[str, set] = {}
    for zh, bank_id in by_zh.items():
        cursor.execute(
            "SELECT word, phonetic, part_of_speech, definition FROM ielts_words WHERE category = ?",
            (zh,),
        )
        rows = cursor.fetchall()
        words: set = set()
        with_phonetic = with_pos = with_definition = 0
        for word, phonetic, pos, definition in rows:
            key = (word or "").strip().lower()
            if not key:
                continue
            words.add(key)
            if phonetic and phonetic.strip():
                with_phonetic += 1
            if pos and pos.strip():
                with_pos += 1
            if definition and definition.strip():
                with_definition += 1
        membership[bank_id] = words
        bank_rows[bank_id] = {
            "rows": len(rows),
            "distinctWords": len(words),
            "withPhonetic": with_phonetic,
            "withPartOfSpeech": with_pos,
            "withDefinition": with_definition,
        }
    connection.close()

    if len(bank_rows) != len(BANKS):
        raise SystemExit(f"expected {len(BANKS)} banks, found {sorted(bank_rows)}")

    banks = [
        {
            "id": bank["id"],
            "label": bank["label"],
            "labelZh": bank["labelZh"],
            "context": bank["context"],
            **bank_rows[bank["id"]],
            "caseCollisions": bank_rows[bank["id"]]["rows"] - bank_rows[bank["id"]]["distinctWords"],
            "sourceWorkbook": bank["sourceWorkbook"],
            "sourceUrl": f"{REPO}/blob/master/{bank['sourceWorkbook']}",
        }
        for bank in BANKS
    ]

    # -------------------------------------------------------------- overlaps
    overlaps = []
    for index, left in enumerate(BANKS):
        for right in BANKS[index + 1 :]:
            a, b = left["id"], right["id"]
            intersection = len(membership[a] & membership[b])
            union = len(membership[a] | membership[b])
            overlaps.append(
                {
                    "a": a,
                    "b": b,
                    "intersection": intersection,
                    "union": union,
                    "jaccard": round4(intersection / union),
                    "shareOfA": round4(intersection / len(membership[a])),
                    "shareOfB": round4(intersection / len(membership[b])),
                }
            )

    identical = [
        {"a": row["a"], "b": row["b"], "distinctWords": row["intersection"]}
        for row in overlaps
        if row["a"] != row["b"] and membership[row["a"]] == membership[row["b"]]
    ]

    # ----------------------------------------------------------- collocations
    connection = sqlite3.connect(f"file:{Path(database).resolve()}?mode=ro&immutable=1", uri=True)
    cursor = connection.cursor()
    partners: dict[str, set] = {}
    partner_category: dict[str, str] = {}
    pair_count = verb_pairs = noun_pairs = 0
    distinct_partners: set = set()
    for word, pos, partner in cursor.execute(
        "SELECT word, part_of_speech, collocation FROM word_collocations"
    ):
        head = (word or "").strip().lower()
        tail = (partner or "").strip().lower()
        if not head or not tail:
            continue
        pair_count += 1
        category = "verb" if (pos or "").strip().lower().startswith("verb") else "noun"
        verb_pairs += category == "verb"
        noun_pairs += category == "noun"
        partners.setdefault(head, set()).add(tail)
        partner_category[head] = category
        distinct_partners.add(tail)

    # ------------------------------------------------- speaking/writing banks
    speaking, writing = [], []
    for part, topic, question, cue_card, difficulty, frequency in cursor.execute(
        "SELECT part, topic, question, cue_card, difficulty, frequency "
        "FROM ielts_speaking_topics ORDER BY part, topic, question"
    ):
        if difficulty not in DIFFICULTIES:
            raise SystemExit(f"unknown speaking difficulty {difficulty!r}")
        lines = [line.strip() for line in (cue_card or "").splitlines() if line.strip()]
        speaking.append(
            {
                "part": int(part),
                "topic": (topic or "").strip(),
                "question": (question or "").strip(),
                "cueCard": lines or None,
                "difficulty": difficulty,
                "frequency": int(frequency),
            }
        )
    for task_type, topic, question, chart_type, difficulty, frequency in cursor.execute(
        "SELECT task_type, topic, question, chart_type, difficulty, frequency "
        "FROM writing_topics ORDER BY task_type, topic, question"
    ):
        if difficulty not in DIFFICULTIES:
            raise SystemExit(f"unknown writing difficulty {difficulty!r}")
        writing.append(
            {
                "taskType": TASK_TYPES.get(task_type, task_type),
                "topic": (topic or "").strip(),
                "question": (question or "").strip(),
                "chartType": (chart_type or "").strip() or None,
                "difficulty": difficulty,
                "frequency": int(frequency),
            }
        )
    connection.close()

    for index, item in enumerate(speaking, start=1):
        item["id"] = f"sp{index:02d}"
    for index, item in enumerate(writing, start=1):
        item["id"] = f"wr{index:02d}"
    speaking = [{**row, "id": row["id"]} for row in speaking]
    writing = [{**row, "id": row["id"]} for row in writing]

    # ------------------------------------------------- the Cambridge coverage
    vocabulary_path = Path(__file__).resolve().parent.parent / "data" / "vocabulary.json"
    cambridge_words = {
        entry["word"].strip().lower() for entry in json.loads(vocabulary_path.read_text("utf-8"))["entries"]
    }
    per_bank = [
        {
            "bank": bank["id"],
            "words": len(membership[bank["id"]] & cambridge_words),
            "shareOfBank": round4(len(membership[bank["id"]] & cambridge_words) / len(membership[bank["id"]])),
            "shareOfCambridge": round4(
                len(membership[bank["id"]] & cambridge_words) / len(cambridge_words)
            ),
        }
        for bank in BANKS
    ]
    ielts_words = membership["ielts"]
    ielts_cambridge = ielts_words & cambridge_words
    others = set().union(*(membership[bank["id"]] for bank in BANKS if bank["id"] != "ielts"))
    cambridge_membership = Counter(
        sum(1 for bank in BANKS if word in membership[bank["id"]]) for word in cambridge_words
    )

    cambridge = {
        "note": (
            "Original cross-dataset join of this API: each bank is intersected with the "
            "4,174 Cambridge IELTS 1-22 headwords published by /v1/vocabulary."
        ),
        "cambridgeWords": len(cambridge_words),
        "banks": per_bank,
        "ielts": {
            "words": len(ielts_words),
            "inCambridge": len(ielts_cambridge),
            "exclusiveToBank": len(ielts_words - others),
            "shareInCambridge": round4(len(ielts_cambridge) / len(ielts_words)),
            "shareOfCambridge": round4(len(ielts_cambridge) / len(cambridge_words)),
        },
        "membershipOfCambridgeWords": {
            str(banks_): cambridge_membership[banks_] for banks_ in sorted(cambridge_membership)
        },
    }

    # ----------------------------------------------------------- the words
    every_word = sorted(set().union(*membership.values()))
    collocation_banks = {
        head: [bank["id"] for bank in BANKS if head in membership[bank["id"]]] for head in partners
    }
    words = [
        {
            "id": f"wb{index:05d}",
            "word": word,
            "banks": [bank["id"] for bank in BANKS if word in membership[bank["id"]]],
            "bankCount": sum(1 for bank in BANKS if word in membership[bank["id"]]),
            "collocations": len(partners[word]) if word in partners else None,
            "cambridge": word in cambridge_words,
        }
        for index, word in enumerate(every_word, start=1)
    ]

    distribution = Counter(word["bankCount"] for word in words)

    # ------------------------------------------------- collocation headwords
    headwords = [
        {
            "word": head,
            "category": partner_category[head],
            "partners": len(partners[head]),
            "banks": collocation_banks[head],
            "cambridge": head in cambridge_words,
        }
        for head in sorted(partners)
    ]
    collocations = {
        "stats": {
            "note": (
                "Per-headword aggregates only: the deployed system stores 3,099 verb-object and "
                "noun-adjective pairs extracted from a commercial workbook, and the full pair "
                "list is not redistributed."
            ),
            "pairs": pair_count,
            "headwords": len(partners),
            "partners": len(distinct_partners),
            "verbPairs": verb_pairs,
            "nounPairs": noun_pairs,
            "verbHeadwords": sum(1 for row in headwords if row["category"] == "verb"),
            "nounHeadwords": sum(1 for row in headwords if row["category"] == "noun"),
            "headwordsInIelts": sum(1 for row in headwords if "ielts" in row["banks"]),
            "headwordsInCambridge": sum(1 for row in headwords if row["cambridge"]),
            "headwordsOutsideBanks": sum(1 for row in headwords if not row["banks"]),
        },
        "headwords": headwords,
    }

    # ------------------------------------------------------------- assembly
    review = {
        "source": {
            "path": ALGORITHM_PATH,
            "sha1": sha1_of(algorithm),
            "sourceUrl": f"{REPO}/blob/master/{ALGORITHM_PATH}",
        },
        **read_algorithm(algorithm),
    }

    document = {
        "meta": {
            "name": "Deployed word-bank concordance",
            "repository": REPO,
            "system": (
                "An operational WeChat mini-program IELTS vocabulary-learning platform: an "
                "Express/SQLite backend, a spaced-repetition review engine, an admin statistics "
                "panel and AI-assisted speaking and writing practice, deployed over HTTPS."
            ),
            "commit": COMMIT,
            "snapshot": "2026-04-02",
            "sources": {
                "database": {
                    "path": DATABASE_PATH,
                    "sha1": sha1_of(database),
                    "sourceUrl": f"{REPO}/blob/master/{DATABASE_PATH}",
                },
                "algorithm": review["source"],
            },
            "license": "CC BY 4.0",
            "attribution": (
                "Derived concordance of the word banks of the deployed vocabulary-learning "
                f"system {REPO}; the repository declares no upstream licence."
            ),
            "note": (
                "Only derived, non-substitutive metadata is published: bank inventories, "
                "cross-bank membership, overlap statistics, per-headword collocation counts, "
                "the review-engine parameters and the prompt-bank metadata. No definition, "
                "phonetic transcription, example sentence, full collocation pair list or user "
                "record is redistributed by this API."
            ),
            "provenanceNote": (
                "The live database assigns no source to individual rows; bank attribution "
                "follows the platform's own category reorganisation (restructure-vocab-v2.js), "
                "whose categories match the vocabulary/VOC workbook set and the 4,541-word "
                "IELTS outline workbook of the 词汇总汇大纲 collection."
            ),
        },
        "banks": banks,
        "overlaps": overlaps,
        "cambridge": cambridge,
        "collocations": collocations,
        "review": review,
        "topics": {"speaking": speaking, "writing": writing},
        "words": words,
        "stats": {
            "rows": sum(bank["rows"] for bank in banks),
            "banks": len(banks),
            "distinctWords": len(words),
            "membershipDistribution": [
                {"banks": count, "words": distribution[count]} for count in sorted(distribution)
            ],
            "wordsInAllBanks": distribution.get(len(BANKS), 0),
            "identicalBankPairs": identical,
            "ielts": {
                "words": len(ielts_words),
                "exclusive": len(ielts_words - others),
                "inCambridge": len(ielts_cambridge),
            },
            "collocations": {
                "pairs": pair_count,
                "headwords": len(partners),
                "partners": len(distinct_partners),
            },
            "topics": {"speaking": len(speaking), "writing": len(writing)},
            "reviewIntervals": len(REVIEW_INTERVALS),
        },
    }

    Path(output).write_text(json.dumps(document, ensure_ascii=False, indent=1) + "\n", "utf-8")
    print(
        f"word-bank concordance: {len(banks)} banks, {sum(bank['rows'] for bank in banks)} rows, "
        f"{len(words)} distinct words, {len(overlaps)} bank pairs, "
        f"{len(ielts_cambridge)} IELTS-bank words also Cambridge headwords"
    )


if __name__ == "__main__":
    main(sys.argv)
