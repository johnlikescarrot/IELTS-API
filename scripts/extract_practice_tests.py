#!/usr/bin/env python3
"""Build the practice-test index served by ielts-api at `/v1/tests`.

The upstream collection (https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
bundles three practice corpora behind a paid login:

* ``Reading_315_FullTest``  - 315 full academic reading tests,
* ``Listening_204_FullTest`` - 204 full listening tests,
* ``Reading_1232_Basic``     - 1,232 CEFR-graded reading lessons (A1-A2, B1-B2, C1-C2).

Part of that material is scraped third-party content, so **no passage, question,
answer or audio file is redistributed here**. This script reads the upstream
JSON locally and emits derived, non-substitutive metadata only:

* the structure of each item (sections, question counts, question types),
* a normalisation of the 60+ free-text question-type labels used upstream onto a
  canonical IELTS question-type taxonomy,
* passage-level readability statistics computed from the passage text
  (word/sentence counts, Flesch Reading Ease, Flesch-Kincaid grade,
  type-token ratio) - summary numbers, never the text itself,
* provenance (upstream path, blob SHA-1, permalink).

Usage:

    curl -sL "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/main?recursive=1" \
        -o tree.json
    python3 scripts/extract_practice_tests.py tree.json ./upstream data/practice-tests.json

``./upstream`` is a directory holding the upstream files at their repository
paths (a clone, a sparse checkout, or a download of just the ``*.json`` files).
Files that are absent are reported as unindexed rather than failing the run, so
the script also works against a partial checkout.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable

REPO = "https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS"

#: Upstream free-text question-type label -> canonical taxonomy identifier.
#:
#: The upstream corpora were annotated by several generations of extraction
#: scripts, so the same task appears under many spellings (``diagram_labelling``
#: / ``diagram_labeling`` / ``diagram_label_completion``). The canonical
#: identifiers follow the eleven Cambridge reading task families plus the two
#: listening-only families (generic matching, plan/map/diagram labelling).
TYPE_ALIASES: dict[str, str] = {
    # Multiple choice
    "multiple_choice": "multiple-choice",
    "multiple choice": "multiple-choice",
    "multiple_choice_question": "multiple-choice",
    "multiple_choice_multiple_answer": "multiple-choice-multiple-answer",
    "multiple_choice_multiple_answers": "multiple-choice-multiple-answer",
    "multiple_selection": "multiple-choice-multiple-answer",
    "multiple_answer": "multiple-choice-multiple-answer",
    "multiple_answers": "multiple-choice-multiple-answer",
    # Identifying information / views
    "true_false_not_given": "true-false-not-given",
    "true/false/not given": "true-false-not-given",
    "true_false": "true-false-not-given",
    "yes_no_not_given": "yes-no-not-given",
    "yes/no/not given": "yes-no-not-given",
    # Matching
    "matching": "matching",
    "matching_information": "matching-information",
    "matching information": "matching-information",
    "matching_paragraph_information": "matching-information",
    "matching_paragraphs": "matching-information",
    "matching_paragraph": "matching-information",
    "paragraph_matching": "matching-information",
    "paragraph_location": "matching-information",
    "matching_headings": "matching-headings",
    "matching_features": "matching-features",
    "classification": "matching-features",
    "matching_people": "matching-features",
    "matching_people_opinions": "matching-features",
    "matching_people_statements": "matching-features",
    "matching_opinions": "matching-features",
    "matching_sentence_endings": "matching-sentence-endings",
    "sentence_completion_matching": "matching-sentence-endings",
    "sentence_completion_matching_endings": "matching-sentence-endings",
    # Completion
    "sentence_completion": "sentence-completion",
    "sentence completion": "sentence-completion",
    "sentence_completion_with_options": "sentence-completion",
    "summary_completion": "summary-completion",
    "summary completion": "summary-completion",
    "summary_completion_with_options": "summary-completion",
    "summary_completion_with_word_list": "summary-completion",
    "summary_note_completion": "summary-completion",
    "summary_note_table_flow-chart_completion": "summary-completion",
    "summary_note_table_flow_chart_completion": "summary-completion",
    "fill_in_blank": "summary-completion",
    "fill_in_blank_with_options": "summary-completion",
    "note_completion": "summary-completion",
    "note_completion_matching": "summary-completion",
    "notes_completion": "summary-completion",
    "table_completion": "summary-completion",
    "form_completion": "summary-completion",
    "list_completion": "summary-completion",
    "flow_chart": "summary-completion",
    "flow_chart_completion": "summary-completion",
    "flowchart_completion": "summary-completion",
    "chart_completion": "summary-completion",
    "question_completion": "summary-completion",
    # Labelling
    "diagram_labelling": "diagram-label-completion",
    "diagram_labeling": "diagram-label-completion",
    "diagram_label_completion": "diagram-label-completion",
    "diagram_completion": "diagram-label-completion",
    "matching_diagram": "diagram-label-completion",
    "labeling": "diagram-label-completion",
    "labelling": "diagram-label-completion",
    "map_labeling": "diagram-label-completion",
    "map_labelling": "diagram-label-completion",
    "map_matching": "diagram-label-completion",
    "plan_labeling": "diagram-label-completion",
    "plan_labelling": "diagram-label-completion",
    # Short answer
    "short_answer": "short-answer",
    "short-answer": "short-answer",
    "short_answer_questions": "short-answer",
    "short-answer_questions": "short-answer",
}

#: Canonical identifiers, in report order.
CANONICAL_TYPES: tuple[str, ...] = (
    "multiple-choice",
    "multiple-choice-multiple-answer",
    "true-false-not-given",
    "yes-no-not-given",
    "matching",
    "matching-information",
    "matching-headings",
    "matching-features",
    "matching-sentence-endings",
    "sentence-completion",
    "summary-completion",
    "diagram-label-completion",
    "short-answer",
)

LEVEL_SLUGS = {"A1-A2": "a1a2", "B1-B2": "b1b2", "C1-C2": "c1c2"}

TAG_RE = re.compile(r"<[^>]+>")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z'\u2019-]*")
SENTENCE_RE = re.compile(r"[.!?]+(?:\s|$)")
VOWEL_GROUP_RE = re.compile(r"[aeiouy]+")


# --------------------------------------------------------------------------- #
# Text statistics                                                             #
# --------------------------------------------------------------------------- #


def strip_markup(text: str) -> str:
    """Remove HTML tags and entities from a passage."""
    plain = TAG_RE.sub(" ", text)
    plain = plain.replace("&nbsp;", " ").replace("&amp;", "&").replace("&quot;", '"')
    plain = plain.replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">")
    return re.sub(r"\s+", " ", plain).strip()


def count_syllables(word: str) -> int:
    """Estimate the syllable count of an English word.

    Uses the standard vowel-group heuristic with a silent-final-``e`` correction,
    which is what readability formulae were calibrated on.
    """
    lowered = word.lower()
    groups = VOWEL_GROUP_RE.findall(lowered)
    total = len(groups)
    if lowered.endswith("e") and not lowered.endswith(("le", "ee", "ye")) and total > 1:
        total -= 1
    return max(total, 1)


def readability(text: str) -> dict[str, float | int] | None:
    """Compute passage-level readability statistics.

    Returns ``None`` for passages too short for the formulae to mean anything
    (fewer than 20 words or no sentence terminator).
    """
    plain = strip_markup(text)
    words = WORD_RE.findall(plain)
    sentences = max(len(SENTENCE_RE.findall(plain)), 1)
    if len(words) < 20:
        return None
    syllables = sum(count_syllables(word) for word in words)
    words_per_sentence = len(words) / sentences
    syllables_per_word = syllables / len(words)
    characters = sum(len(word) for word in words)
    distinct = len({word.lower() for word in words})
    return {
        "words": len(words),
        "sentences": sentences,
        "distinctWords": distinct,
        "avgSentenceLength": round(words_per_sentence, 3),
        "avgSyllablesPerWord": round(syllables_per_word, 3),
        "avgWordLength": round(characters / len(words), 3),
        "typeTokenRatio": round(distinct / len(words), 4),
        "fleschReadingEase": round(
            206.835 - 1.015 * words_per_sentence - 84.6 * syllables_per_word, 2
        ),
        "fleschKincaidGrade": round(
            0.39 * words_per_sentence + 11.8 * syllables_per_word - 15.59, 2
        ),
    }


# --------------------------------------------------------------------------- #
# Question counting                                                           #
# --------------------------------------------------------------------------- #


def count_question_numbers(raw: object) -> int:
    """Count the questions covered by an upstream ``q_numbers`` label.

    Upstream labels are free text: ``"7"``, ``"1-5"``, ``"14 - 18"``,
    ``"1,2,3"``, ``"Questions 27-30"``. Ranges are expanded, lists are counted,
    and an unparseable label counts as a single question.
    """
    text = str(raw)
    numbers = [int(match) for match in re.findall(r"\d+", text)]
    if not numbers:
        return 1
    range_match = re.fullmatch(r"\D*(\d+)\s*[-\u2013]\s*(\d+)\D*", text)
    if range_match:
        start, end = int(range_match.group(1)), int(range_match.group(2))
        if end >= start:
            return end - start + 1
    return len(numbers)


def normalise_type(raw: object) -> str:
    """Map an upstream question-type label onto the canonical taxonomy."""
    key = str(raw).strip().lower().replace(" ", "_")
    if key in TYPE_ALIASES:
        return TYPE_ALIASES[key]
    spaced = str(raw).strip().lower()
    if spaced in TYPE_ALIASES:
        return TYPE_ALIASES[spaced]
    raise KeyError(f"unmapped question type: {raw!r}")


# --------------------------------------------------------------------------- #
# Upstream readers                                                            #
# --------------------------------------------------------------------------- #


def read_json(path: Path) -> Any | None:
    """Parse a JSON file, returning ``None`` when it is missing or malformed."""
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def full_test_item(
    document: dict[str, Any],
    *,
    identifier: str,
    collection: str,
    skill: str,
    number: int,
    path: str,
    entry: dict[str, Any],
    assets: dict[str, Any],
    raw_labels: Counter[str],
) -> dict[str, Any]:
    """Build one index entry for a full practice test."""
    sections = document.get("sections") or []
    counts: Counter[str] = Counter()
    questions = 0
    passages: list[str] = []
    for section in sections:
        if not isinstance(section, dict):
            continue
        context = section.get("passage_or_context")
        if isinstance(context, str) and context.strip():
            passages.append(context)
        for question in section.get("questions") or []:
            if not isinstance(question, dict):
                continue
            raw = question.get("type", "unknown")
            raw_labels[str(raw)] += 1
            canonical = normalise_type(raw)
            size = count_question_numbers(question.get("q_numbers", "1"))
            counts[canonical] += size
            questions += size
    return {
        "id": identifier,
        "collection": collection,
        "skill": skill,
        "number": number,
        "title": str(document.get("test_title") or f"Test {number}").strip(),
        "level": None,
        "sections": len(sections),
        "passages": len(passages),
        "questions": questions,
        "questionTypes": sorted(counts),
        "typeCounts": dict(sorted(counts.items())),
        "vocabularyCount": 0,
        "timeLimitSeconds": None,
        # Readability is only meaningful for written passages: the listening
        # `passage_or_context` fields hold timestamped transcript fragments and
        # rubric text, which the formulae were never calibrated on.
        "readability": (
            readability("\n".join(passages)) if passages and skill == "reading" else None
        ),
        "assets": assets,
        "sourcePath": path,
        "sha1": entry.get("sha"),
        "sizeBytes": entry.get("size", 0),
        "sourceUrl": f"{REPO}/blob/main/{path}",
    }


def graded_item(
    document: dict[str, Any],
    *,
    identifier: str,
    number: int,
    path: str,
    entry: dict[str, Any],
    raw_labels: Counter[str],
) -> dict[str, Any]:
    """Build one index entry for a CEFR-graded reading lesson."""
    counts: Counter[str] = Counter()
    questions = 0
    for question in document.get("questions") or []:
        if not isinstance(question, dict):
            continue
        raw = question.get("type", "unknown")
        raw_labels[str(raw)] += 1
        canonical = normalise_type(raw)
        counts[canonical] += 1
        questions += 1
    vocabulary = document.get("vocabulary")
    passage = document.get("passage")
    time_limit = document.get("time_limit")
    return {
        "id": identifier,
        "collection": "graded-reading",
        "skill": "reading",
        "number": number,
        "title": str(document.get("title") or f"Lesson {number}").strip(),
        "level": str(document.get("level")),
        "sections": 1,
        "passages": 1 if isinstance(passage, str) and passage.strip() else 0,
        "questions": questions,
        "questionTypes": sorted(counts),
        "typeCounts": dict(sorted(counts.items())),
        "vocabularyCount": len(vocabulary) if isinstance(vocabulary, list) else 0,
        "timeLimitSeconds": time_limit if isinstance(time_limit, int) else None,
        "readability": readability(passage) if isinstance(passage, str) else None,
        "assets": {
            "audio": False,
            "images": 0,
            "strategies": bool(document.get("tactics")),
            "documents": False,
        },
        "sourcePath": path,
        "sha1": entry.get("sha"),
        "sizeBytes": entry.get("size", 0),
        "sourceUrl": f"{REPO}/blob/main/{path}",
    }


# --------------------------------------------------------------------------- #
# Statistics                                                                  #
# --------------------------------------------------------------------------- #


def distribution(values: Iterable[float]) -> dict[str, float] | None:
    """Summarise a numeric sample (count, mean, median, min, max)."""
    sample = sorted(values)
    if not sample:
        return None
    middle = len(sample) // 2
    median = (
        sample[middle]
        if len(sample) % 2 == 1
        else (sample[middle - 1] + sample[middle]) / 2
    )
    return {
        "count": len(sample),
        "mean": round(sum(sample) / len(sample), 2),
        "median": round(median, 2),
        "min": round(sample[0], 2),
        "max": round(sample[-1], 2),
    }


def build_stats(
    items: list[dict[str, Any]],
    *,
    directories: dict[str, int],
    raw_labels: Counter[str],
    unreadable: int,
) -> dict[str, Any]:
    """Aggregate corpus-level statistics over the index."""
    by_collection: Counter[str] = Counter()
    by_skill: Counter[str] = Counter()
    by_level: Counter[str] = Counter()
    types: Counter[str] = Counter()
    types_by_skill: dict[str, Counter[str]] = defaultdict(Counter)
    ease_by_level: dict[str, list[float]] = defaultdict(list)
    words_by_level: dict[str, list[float]] = defaultdict(list)
    grade_by_level: dict[str, list[float]] = defaultdict(list)
    questions = 0
    for item in items:
        by_collection[item["collection"]] += 1
        by_skill[item["skill"]] += 1
        by_level[item["level"] or "unrated"] += 1
        questions += item["questions"]
        for name, count in item["typeCounts"].items():
            types[name] += count
            types_by_skill[item["skill"]][name] += count
        stats = item["readability"]
        if stats is not None:
            bucket = item["level"] or item["collection"]
            ease_by_level[bucket].append(float(stats["fleschReadingEase"]))
            grade_by_level[bucket].append(float(stats["fleschKincaidGrade"]))
            words_by_level[bucket].append(float(stats["words"]))
    indexed = len(items)
    published = sum(directories.values())
    return {
        "upstreamItems": published,
        "indexedItems": indexed,
        "coverageRatio": round(indexed / published, 4) if published else 0.0,
        "unreadableSources": unreadable,
        "questions": questions,
        "questionsPerItem": distribution(float(item["questions"]) for item in items),
        "byCollection": dict(sorted(by_collection.items())),
        "bySkill": dict(sorted(by_skill.items())),
        "byLevel": dict(sorted(by_level.items())),
        "questionTypes": {
            name: types[name] for name in CANONICAL_TYPES if types[name] > 0
        },
        "questionTypesBySkill": {
            skill: {name: counter[name] for name in CANONICAL_TYPES if counter[name] > 0}
            for skill, counter in sorted(types_by_skill.items())
        },
        "readabilityByGroup": {
            group: {
                "fleschReadingEase": distribution(ease_by_level[group]),
                "fleschKincaidGrade": distribution(grade_by_level[group]),
                "words": distribution(words_by_level[group]),
            }
            for group in sorted(ease_by_level)
        },
        "rawLabels": {
            label: {"canonical": normalise_type(label), "occurrences": count}
            for label, count in sorted(raw_labels.items())
        },
    }


# --------------------------------------------------------------------------- #
# Entry point                                                                 #
# --------------------------------------------------------------------------- #


def build(tree_path: Path, source_dir: Path) -> dict[str, Any]:
    """Build the whole index document."""
    tree = json.loads(tree_path.read_text(encoding="utf-8"))
    entries = {node["path"]: node for node in tree["tree"] if node["type"] == "blob"}
    paths = set(entries)

    raw_labels: Counter[str] = Counter()
    items: list[dict[str, Any]] = []
    unreadable = 0

    directories = {
        "reading-full-test": len(
            {p.split("/")[1] for p in paths if re.match(r"Reading_315_FullTest/Test_\d+/", p)}
        ),
        "listening-full-test": len(
            {p.split("/")[1] for p in paths if re.match(r"Listening_204_FullTest/Test_\d+/", p)}
        ),
        "graded-reading": len(
            [p for p in paths if re.match(r"Reading_1232_Basic/frontend/data/[^/]+/lesson_\d+\.json$", p)]
        ),
    }

    full_test_sources = [
        ("reading-full-test", "reading", "rft", r"Reading_315_FullTest/Test_(\d+)/Test_\1\.json$"),
        ("listening-full-test", "listening", "lft", r"Listening_204_FullTest/Test_(\d+)/Test_\1\.json$"),
    ]
    for collection, skill, prefix, pattern in full_test_sources:
        matched = sorted(
            ((int(m.group(1)), m.group(0)) for m in (re.match(pattern, p) for p in paths) if m),
        )
        for number, path in matched:
            document = read_json(source_dir / path)
            if not isinstance(document, dict):
                unreadable += 1
                continue
            directory = path.rsplit("/", 1)[0]
            images = len([p for p in paths if p.startswith(f"{directory}/images/")])
            assets = {
                "audio": any(
                    p.startswith(f"{directory}/") and p.endswith(".mp3") for p in paths
                ),
                "images": images,
                "strategies": f"{directory}/strategies.json" in paths,
                "documents": any(
                    p.startswith(f"{directory}/") and p.endswith(".docx") for p in paths
                ),
            }
            items.append(
                full_test_item(
                    document,
                    identifier=f"{prefix}-{number:03d}",
                    collection=collection,
                    skill=skill,
                    number=number,
                    path=path,
                    entry=entries[path],
                    assets=assets,
                    raw_labels=raw_labels,
                )
            )

    graded_pattern = re.compile(
        r"Reading_1232_Basic/frontend/data/([^/]+)/lesson_(\d+)\.json$"
    )
    graded = sorted(
        (
            (match.group(1), int(match.group(2)), match.group(0))
            for match in (graded_pattern.match(path) for path in paths)
            if match
        )
    )
    for level, number, path in graded:
        document = read_json(source_dir / path)
        if not isinstance(document, dict):
            unreadable += 1
            continue
        slug = LEVEL_SLUGS.get(level, level.lower())
        items.append(
            graded_item(
                document,
                identifier=f"grd-{slug}-{number:03d}",
                number=number,
                path=path,
                entry=entries[path],
                raw_labels=raw_labels,
            )
        )

    items.sort(key=lambda item: item["id"])
    stats = build_stats(
        items, directories=directories, raw_labels=raw_labels, unreadable=unreadable
    )
    return {
        "meta": {
            "name": "IELTS practice-test structure and readability index",
            "repository": REPO,
            "commit": tree.get("sha"),
            "license": "CC BY 4.0",
            "attribution": (
                "Derived metadata index of the practice collections published at "
                f"{REPO}."
            ),
            "note": (
                "Derived metadata only: structure, question-type normalisation, "
                "provenance and aggregate readability statistics. No passage, "
                "question, answer key or audio file from the upstream collection "
                "is redistributed by this API."
            ),
            "collections": {
                "reading-full-test": "Full academic reading tests (3 passages, 40 questions).",
                "listening-full-test": "Full listening tests (4 parts, 40 questions).",
                "graded-reading": "CEFR-graded reading lessons (A1-A2, B1-B2, C1-C2).",
            },
            "upstreamDirectories": directories,
        },
        "stats": stats,
        "items": items,
    }


def main(argv: list[str]) -> int:
    """Command-line entry point."""
    if len(argv) != 4:
        print(__doc__, file=sys.stderr)
        print(
            "usage: extract_practice_tests.py <tree.json> <source-dir> <out.json>",
            file=sys.stderr,
        )
        return 2
    document = build(Path(argv[1]), Path(argv[2]))
    output = Path(argv[3])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(document, indent=1, ensure_ascii=False, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    stats = document["stats"]
    print(
        f"wrote {output}: {stats['indexedItems']} items, "
        f"{stats['questions']} questions, "
        f"{len(stats['rawLabels'])} raw labels normalised onto "
        f"{len(stats['questionTypes'])} canonical types"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
