#!/usr/bin/env python3
"""Build the assignment index served by ielts-api at `/v1/assignments`.

The upstream collection (https://github.com/msneloy/IELTS) is the working
archive of an IELTS preparation cohort: a folder-per-day sequence of homework
assignments from August 2022, holding the candidates' submitted writing next
to the prompt images their teacher assigned. It is exactly the kind of
learner-production trace that assessment research struggles to obtain, and it
is published nowhere in machine-readable form.

**No essay, answer key or prompt text is redistributed here.** This script
reads the upstream tree listing and a local checkout and emits derived,
non-substitutive metadata only:

* the structure of each document (date, writing task, visual/essay genre),
* a pseudonymous learner label (the upstream file names contain first names;
  the mapping below is fixed and documented in RESEARCH.md),
* surface statistics computed from the text - word/sentence/paragraph counts,
  type-token ratio, Flesch Reading Ease, Flesch-Kincaid grade, discourse-marker
  density - summary numbers, never the text itself,
* provenance (upstream path, blob SHA-1, permalink).

The statistics mirror the heuristics of `src/lib/textstats.ts` so that dataset
columns and the analysis endpoints measure with the same rules; the
tokenisation, sentence segmentation and syllable estimation are restated here
in plain Python for reproducibility without a Node runtime.

Usage:

    curl -sL "https://api.github.com/repos/msneloy/IELTS/git/trees/main?recursive=1" \\
        -o tree.json
    git clone https://github.com/msneloy/IELTS upstream
    python3 scripts/extract_assignments.py tree.json ./upstream data/assignments.json
"""

from __future__ import annotations

import json
import math
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import quote

REPO = "https://github.com/msneloy/IELTS"

#: Only paths under this upstream directory are indexed.
ROOT = "Assignments"

#: Fixed, documented mapping from upstream first names to pseudonymous learners.
#: The mapping is alphabetical by upstream token, so it is stable even if more
#: submissions by the same candidates appear upstream.
LEARNER_ALIASES: dict[str, str] = {
    "emon": "learner-1",
    "mahmuda": "learner-2",
    "pranto": "learner-3",
    "riad": "learner-4",
    "riadul": "learner-4",
}

#: Documents authored by the teacher rather than a candidate.
INSTRUCTOR_FILES: dict[str, str] = {
    "solution.md": "grammar-exercise",
    "writing task 2.md": "prompt-list",
}

#: Filename keywords -> task genre, checked case-insensitively on word
#: boundaries. `np` is the cohort's shorthand for a natural-process diagram.
GENRE_KEYWORDS: list[tuple[str, str]] = [
    ("man made process", "man-made-process"),
    ("man-made-process", "man-made-process"),
    ("man made", "man-made-process"),
    ("mmp", "man-made-process"),
    ("natural process", "natural-process"),
    ("np", "natural-process"),
    ("pie chart", "pie-chart"),
    ("pie", "pie-chart"),
    ("barchart", "bar-chart"),
    ("bar chart", "bar-chart"),
    ("table", "table"),
    ("line chart", "line-chart"),
    ("line", "line-chart"),
    ("map", "map"),
    ("essay", "essay"),
]

#: Visual genre each assignment date practised, read off the prompt images the
#: folder holds (Line_Chart.jpg, Bar_Chart.jpg, Pie_Chart.jpg, Table.jpg,
#: MAP.jpeg, MAN-MADE PROCESS.jpg, NATURAL PROCESS.png). Used only when neither
#: the file name nor the text names the genre.
DATE_FALLBACK: dict[str, str] = {
    "2022-08-11": "line-chart",
    "2022-08-12": "bar-chart",
    "2022-08-15": "pie-chart",
    "2022-08-19": "map",
    "2022-08-21": "natural-process",
    "2022-08-27": "essay",
}

#: Text phrases -> Task 1 visual genre, for files whose name carries no hint.
TEXT_GENRE_PATTERNS: list[tuple[str, str]] = [
    (r"\bcircle diagram\b", "pie-chart"),
    (r"\bpie (?:chart|graph)\b", "pie-chart"),
    (r"\bline (?:chart|graph)\b", "line-chart"),
    (r"\bbar chart\b", "bar-chart"),
    (r"\btable\b", "table"),
    (r"\bmaps?\b", "map"),
    (r"\b(?:man[- ]made|natural) process\b", "process"),
]

#: Discourse markers counted for cohesion density; mirrors LINKERS in
#: `src/lib/analysis.ts`.
LINKERS: tuple[str, ...] = (
    "however",
    "moreover",
    "furthermore",
    "therefore",
    "consequently",
    "nevertheless",
    "in addition",
    "for example",
    "for instance",
    "on the other hand",
    "in contrast",
    "as a result",
    "firstly",
    "finally",
    "overall",
    "whereas",
    "although",
    "despite",
    "in conclusion",
)

WORD_RE = re.compile(r"[a-zA-Z][a-zA-Z'\u2019-]*")
SENTENCE_END_RE = re.compile(r"[.!?…]+(\s+|$)")
PARAGRAPH_SPLIT_RE = re.compile(r"\n[ \t]*\n+")
VOWEL_GROUP_RE = re.compile(r"[aeiouy]+")


def round2(value: float) -> float:
    """Round half away from zero to two decimals, matching `round2` in
    src/lib/textstats.ts (`Math.round` semantics)."""
    scaled = value * 100
    return math.floor(scaled + 0.5) / 100 if scaled >= 0 else -math.floor(-scaled + 0.5) / 100


def words_of(text: str) -> list[str]:
    """Lower-cased word tokens; mirrors `wordsOf` in src/lib/textstats.ts."""
    return [word.lower() for word in WORD_RE.findall(text)]


def sentences_of(text: str) -> list[str]:
    """Non-empty sentences; mirrors `sentencesOf` in src/lib/textstats.ts."""
    sentences: list[str] = []
    rest = text.strip()
    while rest:
        match = SENTENCE_END_RE.search(rest)
        if match is None:
            sentences.append(rest)
            break
        sentence = rest[: match.start()].strip()
        if sentence:
            sentences.append(sentence)
        rest = rest[match.end():]
    return sentences


def syllables_of(word: str) -> int:
    """Vowel-group syllable estimate; mirrors `syllablesOf`."""
    lower = word.lower()
    groups = VOWEL_GROUP_RE.findall(lower)
    count = len(groups)
    if count > 1 and lower.endswith("e") and not lower.endswith("le"):
        count -= 1
    return max(1, count)


def stdev(values: list[float]) -> float:
    """Population standard deviation."""
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    return (sum((value - mean) ** 2 for value in values) / len(values)) ** 0.5


def count_linkers(lower_text: str) -> tuple[int, int]:
    """Total and distinct discourse-marker occurrences in lower-cased text."""
    total = 0
    distinct = 0
    for linker in LINKERS:
        pattern = re.compile(r"\b" + linker.replace(" ", r"\s+") + r"\b")
        hits = len(pattern.findall(lower_text))
        if hits:
            total += hits
            distinct += 1
    return total, distinct


def parse_date(folder: str) -> str | None:
    """`22.08.05` -> `2022-08-05`; `None` when the folder is not a date."""
    match = re.fullmatch(r"(\d{2})\.(\d{2})\.(\d{2})", folder)
    if match is None:
        return None
    year, month, day = (int(part) for part in match.groups())
    return f"20{year:02d}-{month:02d}-{day:02d}"


def genre_from_text(text: str) -> str | None:
    """Visual genre named in the text, for files whose name carries no hint."""
    lower = text.lower()
    for pattern, genre in TEXT_GENRE_PATTERNS:
        if re.search(pattern, lower):
            return genre
    return None


def classify(path: Path, text: str) -> dict[str, Any]:
    """Derive kind, task, genre and learner label for one document."""
    name = path.name.lower()
    date = parse_date(path.parent.name)
    instructor_genre = INSTRUCTOR_FILES.get(name)
    if instructor_genre is not None:
        return {
            "kind": "instructor",
            "task": "task2" if instructor_genre == "prompt-list" else None,
            "genre": instructor_genre,
            "learner": "instructor",
        }
    learner = "unattributed"
    for token, label in LEARNER_ALIASES.items():
        if re.search(rf"\b{re.escape(token)}\b", name):
            learner = label
            break
    for needle, genre in GENRE_KEYWORDS:
        if re.search(rf"\b{re.escape(needle)}\b", name):
            return {
                "kind": "submission",
                "task": "task2" if genre == "essay" else "task1",
                "genre": genre,
                "learner": learner,
            }
    textual = genre_from_text(text)
    if textual is not None:
        if textual == "process":
            textual = "man-made-process" if date == "2022-08-19" else "natural-process"
        return {"kind": "submission", "task": "task1", "genre": textual, "learner": learner}
    fallback = DATE_FALLBACK.get(date or "")
    if fallback is not None:
        return {
            "kind": "submission",
            "task": "task2" if fallback == "essay" else "task1",
            "genre": fallback,
            "learner": learner,
        }
    return {"kind": "submission", "task": None, "genre": "unclassified", "learner": learner}


def document_id(date: str, path: Path, seen: Counter[str]) -> str:
    """Stable readable identifier: `a-2022-08-11-mahmuda-12-08-22`."""
    slug = re.sub(r"[^a-z0-9]+", "-", path.stem.lower()).strip("-")
    base = f"a-{date}-{slug}"
    seen[base] += 1
    return base if seen[base] == 1 else f"{base}-{seen[base]}"


def measure(text: str) -> dict[str, Any]:
    """Surface statistics; mirrors src/lib/textstats.ts and analysis LINKERS."""
    tokens = words_of(text)
    sentences = sentences_of(text)
    if not tokens or not sentences:
        return {}
    lengths = [len(words_of(sentence)) for sentence in sentences]
    syllables = sum(syllables_of(word) for word in tokens)
    paragraphs = [
        paragraph
        for paragraph in PARAGRAPH_SPLIT_RE.split(text)
        if paragraph.strip()
    ]
    linkers, _distinct = count_linkers(text.lower())
    words = len(tokens)
    types = len(set(tokens))
    wps = words / len(sentences)
    spw = syllables / words
    return {
        "words": words,
        "sentences": len(sentences),
        "paragraphs": len(paragraphs),
        "avgWordsPerSentence": round2(wps),
        "sentenceLengthStdDev": round2(stdev([float(length) for length in lengths])),
        "typeTokenRatio": round2(types / words),
        "longWordShare": round2(
            sum(1 for word in tokens if syllables_of(word) >= 3) / words
        ),
        "fleschReadingEase": round2(206.835 - 1.015 * wps - 84.6 * spw),
        "fleschKincaidGrade": round2(0.39 * wps + 11.8 * spw - 15.59),
        "linkersPer100Words": round2(linkers / words * 100),
    }


def build(tree_path: Path, checkout: Path) -> dict[str, Any]:
    """Build the full index document from a tree listing and a checkout."""
    tree = json.loads(tree_path.read_text(encoding="utf-8"))
    blobs = {
        entry["path"]: entry
        for entry in tree.get("tree", [])
        if entry.get("type") == "blob"
    }
    # The trees API reports the commit the snapshot was taken at; recorded so
    # that the index pins an exact upstream state.
    commit = tree.get("sha")
    commit = commit if isinstance(commit, str) and re.fullmatch(r"[0-9a-f]{40}", commit) else None
    documents: list[dict[str, Any]] = []
    seen: Counter[str] = Counter()
    for path in sorted(blobs):
        if not path.startswith(f"{ROOT}/"):
            continue
        name = path.rsplit("/", 1)[-1].lower()
        # Only text documents are indexed: markdown files (whatever a later
        # date suffix does to the extension) and extensionless uploads.
        # Prompt images and media are excluded; the genres they prompt are
        # recorded per date.
        if ".md" not in name and "." in name:
            continue
        local = checkout / path
        if not local.is_file():
            continue
        text = local.read_text(encoding="utf-8", errors="replace")
        if not words_of(text):
            continue
        # Every indexed document belongs to a dated assignment folder; files
        # outside that structure are skipped rather than indexed undated.
        date = parse_date(Path(path).parent.name)
        if date is None:
            continue
        classification = classify(Path(path), text)
        stats = measure(text)
        if not stats:
            continue
        documents.append(
            {
                "id": document_id(date, Path(path), seen),
                "date": date,
                "kind": classification["kind"],
                "task": classification["task"],
                "genre": classification["genre"],
                "learner": classification["learner"],
                "title": Path(path).name,
                "stats": stats,
                "upstream": {
                    "path": path,
                    "sha": blobs[path]["sha"],
                    "url": f"{REPO}/blob/main/{quote(path)}",
                },
            }
        )
    documents.sort(key=lambda item: (item["date"], item["upstream"]["path"]))
    submissions = [item for item in documents if item["kind"] == "submission"]
    dates = sorted(item["date"] for item in submissions)
    reading_ease = [item["stats"]["fleschReadingEase"] for item in submissions]
    by_task: Counter[str] = Counter(
        item["task"] for item in submissions if item["task"] is not None
    )
    by_genre: Counter[str] = Counter(item["genre"] for item in documents)
    by_learner: Counter[str] = Counter(item["learner"] for item in submissions)
    by_date: Counter[str] = Counter(item["date"] for item in submissions)
    return {
        "meta": {
            "name": "IELTS cohort assignment archive",
            "repository": REPO,
            "commit": commit,
            "license": "See upstream repository; unpublished learner work by private individuals",
            "attribution": "Assignment archive of the msneloy/IELTS repository",
            "note": (
                "Derived, non-substitutive metadata only: no essay, answer key or "
                "prompt is redistributed. Learner names in upstream file names are "
                "pseudonymised (see LEARNER_ALIASES in scripts/extract_assignments.py "
                "and RESEARCH.md Part V)."
            ),
        },
        "stats": {
            "documents": len(documents),
            "submissions": len(submissions),
            "instructorDocuments": len(documents) - len(submissions),
            "byTask": dict(sorted(by_task.items())),
            "byGenre": dict(sorted(by_genre.items())),
            "byLearner": dict(sorted(by_learner.items())),
            "byDate": dict(sorted(by_date.items())),
            "totalWords": sum(item["stats"]["words"] for item in documents),
            "meanReadingEase": round2(sum(reading_ease) / len(reading_ease)),
            "firstDate": dates[0],
            "lastDate": dates[-1],
        },
        "items": documents,
    }


def main(argv: list[str]) -> int:
    """CLI entry point."""
    if len(argv) != 4:
        print(
            "usage: extract_assignments.py TREE_JSON CHECKOUT OUTPUT_JSON",
            file=sys.stderr,
        )
        return 2
    document = build(Path(argv[1]), Path(argv[2]))
    output = Path(argv[3])
    output.write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    stats = document["stats"]
    print(
        f"assignments index written: {stats['documents']} documents "
        f"({stats['submissions']} submissions, {stats['totalWords']} words) -> {output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
