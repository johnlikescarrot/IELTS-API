#!/usr/bin/env python3
"""Build the open practice-corpus index served by ielts-api.

The upstream practice corpus (https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
ships four families of IELTS practice material as machine-readable files:

* ``Listening_102_Basic``    – 102 graded listening lessons in three levels;
* ``Listening_204_FullTest`` – up to 204 listening full tests as JSON;
* ``Reading_1232_Basic``     – 1,232 CEFR-graded reading lessons as JSON;
* ``Reading_315_FullTest``   – up to 315 reading full tests as JSON.

This script turns those files into a metadata-only index: stable identifiers,
level tags, passage lengths, question counts, item-type frequencies and
file-availability flags.  No upstream text is redistributed — the passages,
questions and audio are third-party copyrighted material, and the upstream
workbook contains learner data (names, device identifiers) which is
deliberately never read by this pipeline.

Usage::

    curl -sL "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/{COMMIT}?recursive=1" \\
        -o tree.json
    git clone --filter=blob:none --no-checkout https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS.git checkout
    git -C checkout sparse-checkout init --no-cone
    git -C checkout sparse-checkout set 'Reading_1232_Basic/frontend/data/**/*.json' \\
        'Listening_204_FullTest/Test_*/Test_*.json' 'Reading_315_FullTest/Test_*/Test_*.json'
    git -C checkout checkout {COMMIT}
    python3 scripts/extract_practice.py tree.json checkout data/practice.json

Only the Python standard library is used, so the pipeline is reproducible in a
bare CI container.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = "https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS"

#: Upstream commit the index is pinned to (main, 2026-07-03).
COMMIT = "ba7a0f2bf13be89c601bab2f9e72d1007f49bb2c"

#: Series identifiers in publication order.
SERIES_ORDER = ("listening-102", "listening-204", "reading-1232", "reading-315")

#: How many items the upstream project advertises per series.
ADVERTISED = {"listening-102": 102, "listening-204": 204, "reading-1232": 1232, "reading-315": 315}

#: Level lanes of the series that number lessons per level.
LEVELS = {
    "listening-102": ("Basic", "Intermediate", "Advanced"),
    "reading-1232": ("A1-A2", "B1-B2", "C1-C2"),
}

#: Directory of each series in the upstream repository.
SERIES_PATHS = {
    "listening-102": "Listening_102_Basic",
    "listening-204": "Listening_204_FullTest",
    "reading-1232": "Reading_1232_Basic",
    "reading-315": "Reading_315_FullTest",
}

#: Canonicalisation of item-type labels: spelling is normalised first (case,
#: separators, British ``labelling`` -> American ``labeling``), then obvious
#: duplicates are folded with this alias table.
TYPE_ALIASES = {
    "short_answer_questions": "short_answer",
    "flowchart_completion": "flow_chart_completion",
    "notes_completion": "note_completion",
    "multiple_choice_multiple_answers": "multiple_choice_multiple_answer",
    "sentence_completion_matching": "sentence_completion",
    "diagram_label_completion": "diagram_labeling",
}

#: Item-type taxonomy.  Every normalised label observed upstream must map to
#: exactly one family; the script fails loudly otherwise, so the API taxonomy
#: cannot silently drift from the data.
TAXONOMY: dict[str, tuple[str, ...]] = {
    "multiple-choice": (
        "multiple_choice",
        "multiple_choice_multiple_answer",
        "multiple_selection",
        "multiple_answer",
    ),
    "true-false-notgiven": ("true_false_not_given", "true_false"),
    "yes-no-notgiven": ("yes_no_not_given",),
    "matching-headings": ("matching_headings", "matching_paragraph", "matching_paragraphs"),
    "matching-information": ("matching_information", "matching_paragraph_information", "matching"),
    "matching-features": (
        "matching_features",
        "matching_people",
        "matching_opinions",
        "matching_people_opinions",
        "matching_people_statements",
    ),
    "matching-sentence-endings": ("matching_sentence_endings", "sentence_completion_matching_endings"),
    "locating-information": ("paragraph_location", "paragraph_matching"),
    "sentence-completion": ("sentence_completion", "sentence_completion_with_options"),
    "summary-completion": (
        "summary_completion",
        "summary_completion_with_options",
        "summary_completion_with_word_list",
        "summary_note_completion",
        "summary_note_table_flow_chart_completion",
    ),
    "form-note-completion": (
        "form_completion",
        "note_completion",
        "note_completion_matching",
        "fill_in_blank",
        "fill_in_blank_with_options",
        "table_completion",
        "chart_completion",
        "list_completion",
        "flow_chart_completion",
        "flow_chart",
    ),
    "diagram-label-completion": (
        "diagram_labeling",
        "diagram_completion",
        "map_labeling",
        "map_matching",
        "matching_diagram",
        "plan_labeling",
        "labeling",
    ),
    "short-answer-questions": ("short_answer", "question_completion"),
    "classification": ("classification",),
}


def normalise_type(raw: object) -> str:
    """Return the canonical ``snake_case`` form of an upstream item-type label."""
    key = re.sub(r"[\s/\-]+", "_", str(raw or "untyped").strip().lower())
    key = re.sub(r"_+", "_", key).strip("_")
    key = key.replace("labelling", "labeling")
    return TYPE_ALIASES.get(key, key)


def taxonomy_for(label: str) -> str:
    """Return the taxonomy family id owning a normalised item-type label."""
    for family, members in TAXONOMY.items():
        if label in members:
            return family
    raise SystemExit(f"item type {label!r} is not covered by TAXONOMY; extend the table or the alias map")


def count_words(html: object) -> int:
    """Count word tokens in an HTML-ish text field."""
    return len(re.findall(r"\w+", re.sub(r"<[^>]+>", " ", str(html or ""))))


def mean_median(values: list[int]) -> tuple[float, float] | None:
    """Return ``(mean, median)`` rounded to two decimals, or ``None`` when empty."""
    if not values:
        return None
    mean = round(sum(values) / len(values), 2)
    ordered = sorted(values)
    mid = len(ordered) // 2
    median = float(ordered[mid]) if len(ordered) % 2 else round((ordered[mid - 1] + ordered[mid]) / 2, 2)
    return (mean, median)


def summarise(values: list[int]) -> dict[str, object]:
    """Return count/mean/median/min/max for a list of integers."""
    pair = mean_median(values) or (0.0, 0.0)
    return {
        "count": len(values),
        "mean": pair[0],
        "median": pair[1],
        "min": min(values) if values else 0,
        "max": max(values) if values else 0,
    }


def gaps_in(members: list[dict]) -> list[int]:
    """Numbers missing between 1 and the highest number, per level lane."""
    gaps: list[int] = []
    lanes: dict[str | None, list[int]] = {}
    for item in members:
        lane = item["level"] if LEVELS.get(item["series"]) else None
        lanes.setdefault(lane, []).append(item["number"])
    for numbers in lanes.values():
        top = max(numbers)
        gaps.extend(sorted(set(range(1, top + 1)) - set(numbers)))
    return gaps


def build(tree_path: Path, checkout: Path) -> dict:
    """Build the practice-corpus index from a tree JSON and a sparse checkout."""
    tree = json.loads(tree_path.read_text(encoding="utf-8"))["tree"]
    paths = sorted(entry["path"] for entry in tree if entry.get("type") == "blob")
    path_set = set(paths)

    def has(directory: str, name: str) -> bool:
        return f"{directory}/{name}" in path_set

    items: list[dict] = []
    type_frequency: dict[str, int] = {}

    def bump(label: str) -> None:
        taxonomy_for(label)
        type_frequency[label] = type_frequency.get(label, 0) + 1

    def flags_for(test_dir: str, number: int, *, audio_default: bool = False) -> dict:
        return {
            "audio": has(test_dir, "audio.mp3") or has(test_dir, f"audio_{number}.mp3") or audio_default,
            "processed": has(test_dir, f"Test_{number}_processed.json"),
            "strategies": has(test_dir, "strategies.json"),
        }

    # --- listening-102: graded lessons, metadata from the file tree only ----
    lesson_re = re.compile(r"^Listening_102_Basic/(Basic|Intermediate|Advanced)/Lesson_(\d+)/index\.html$")
    for path in paths:
        match = lesson_re.match(path)
        if match is None:
            continue
        level, number = match.group(1), int(match.group(2))
        directory = str(Path(path).parent)
        items.append(
            {
                "id": f"listening-102-{level.lower()}-{number}",
                "series": "listening-102",
                "skill": "listening",
                "kind": "lesson",
                "level": level,
                "number": number,
                "words": None,
                "questions": None,
                "types": [],
                "flags": flags_for(directory, number),
                "upstreamPath": path,
                "sourceUrl": f"{REPO}/blob/main/{path}",
            }
        )

    # --- full-test series: section/question counts from the test JSON ------
    for series, directory, skill in (
        ("listening-204", "Listening_204_FullTest", "listening"),
        ("reading-315", "Reading_315_FullTest", "reading"),
    ):
        test_re = re.compile(rf"^{directory}/Test_(\d+)/Test_\1\.json$")
        for path in paths:
            match = test_re.match(path)
            if match is None:
                continue
            number = int(match.group(1))
            test = json.loads((checkout / path).read_text(encoding="utf-8"))
            sections = test.get("sections") or []
            types: set[str] = set()
            questions = 0
            words = 0
            for section in sections:
                if skill == "reading":
                    words += count_words(section.get("passage_or_context"))
                for question in section.get("questions") or []:
                    if not isinstance(question, dict):
                        continue
                    questions += 1
                    label = normalise_type(question.get("type"))
                    types.add(label)
                    bump(label)
            items.append(
                {
                    "id": f"{series}-test-{number}",
                    "series": series,
                    "skill": skill,
                    "kind": "full-test",
                    "level": None,
                    "number": number,
                    "words": words if skill == "reading" else None,
                    "questions": questions,
                    "types": sorted(types),
                    "flags": flags_for(str(Path(path).parent), number),
                    "upstreamPath": path,
                    "sourceUrl": f"{REPO}/blob/main/{path}",
                }
            )

    # --- reading-1232: CEFR-graded lessons from the lesson JSON ------------
    lesson_json_re = re.compile(r"^Reading_1232_Basic/frontend/data/(A1-A2|B1-B2|C1-C2)/lesson_(\d+)\.json$")
    for path in paths:
        match = lesson_json_re.match(path)
        if match is None:
            continue
        number = int(match.group(2))
        lesson = json.loads((checkout / path).read_text(encoding="utf-8"))
        types = set()
        for question in lesson.get("questions") or []:
            if not isinstance(question, dict):
                continue
            label = normalise_type(question.get("type"))
            types.add(label)
            bump(label)
        items.append(
            {
                "id": str(lesson.get("test_id") or f"reading_{match.group(1).lower().replace('-', '_')}_{number:03d}"),
                "series": "reading-1232",
                "skill": "reading",
                "kind": "lesson",
                "level": str(lesson.get("level") or match.group(1)),
                "number": number,
                "words": count_words(lesson.get("passage")),
                "questions": len(lesson.get("questions") or []),
                "types": sorted(types),
                "flags": flags_for(str(Path(path).parent), number),
                "upstreamPath": path,
                "sourceUrl": f"{REPO}/blob/main/{path}",
            }
        )

    order = {series: index for index, series in enumerate(SERIES_ORDER)}
    items.sort(key=lambda item: (order[item["series"]], item["level"] or "", item["number"], item["id"]))

    # --- series rows --------------------------------------------------------
    series_rows = []
    for series in SERIES_ORDER:
        members = [item for item in items if item["series"] == series]
        questions = [item["questions"] for item in members if item["questions"] is not None]
        words = [item["words"] for item in members if item["words"] is not None]
        series_rows.append(
            {
                "id": series,
                "skill": members[0]["skill"],
                "kind": members[0]["kind"],
                "upstreamPath": SERIES_PATHS[series],
                "advertised": ADVERTISED[series],
                "published": len(members),
                "gaps": gaps_in(members),
                "coverageRatio": round(len(members) / ADVERTISED[series], 4),
                "levels": list(LEVELS.get(series, ())),
                "meanQuestions": mean_median(questions)[0] if questions else None,
                "meanWords": mean_median(words)[0] if words else None,
                "withAudio": sum(1 for item in members if item["flags"]["audio"]),
                "withProcessed": sum(1 for item in members if item["flags"]["processed"]),
                "withStrategies": sum(1 for item in members if item["flags"]["strategies"]),
            }
        )

    # --- statistics ---------------------------------------------------------
    by_series: dict[str, int] = {}
    by_skill: dict[str, int] = {}
    by_kind: dict[str, int] = {}
    levels: dict[str, int] = {}
    questions_by_series: dict[str, int] = {}
    for item in items:
        by_series[item["series"]] = by_series.get(item["series"], 0) + 1
        by_skill[item["skill"]] = by_skill.get(item["skill"], 0) + 1
        by_kind[item["kind"]] = by_kind.get(item["kind"], 0) + 1
        if item["level"] is not None:
            levels[item["level"]] = levels.get(item["level"], 0) + 1
        if item["questions"] is not None:
            questions_by_series[item["series"]] = questions_by_series.get(item["series"], 0) + item["questions"]
    for series in SERIES_ORDER:
        questions_by_series.setdefault(series, 0)

    word_values = [item["words"] for item in items if item["words"] is not None]
    graded = [item for item in items if item["words"] is not None and item["series"] == "reading-1232"]
    words_by_level: dict[str, object] = {}
    for level in sorted({str(item["level"]) for item in graded}):
        values = [item["words"] for item in graded if item["level"] == level]
        words_by_level[level] = summarise(values)

    histogram: dict[str, int] = {}
    if word_values:
        low = min(word_values) // 50 * 50
        high = max(word_values) // 50 * 50
        for start in range(low, high + 50, 50):
            histogram[str(start)] = sum(1 for value in word_values if start <= value < start + 50)

    item_type_facts: dict[str, object] = {}
    for family in sorted(TAXONOMY):
        labels = sorted(label for label in TAXONOMY[family] if label in type_frequency)
        item_type_facts[family] = {
            "aliases": labels,
            "occurrences": sum(type_frequency[label] for label in labels),
        }

    stats = {
        "items": len(items),
        "bySeries": by_series,
        "bySkill": by_skill,
        "byKind": by_kind,
        "levels": levels,
        "words": summarise(word_values),
        "wordsByLevel": words_by_level,
        "wordsHistogram": histogram,
        "questions": {"total": sum(questions_by_series.values()), "bySeries": questions_by_series},
        "typeFrequency": dict(sorted(type_frequency.items(), key=lambda entry: (-entry[1], entry[0]))),
        "normalisedTypeLabels": len(type_frequency),
    }

    return {
        "meta": {
            "name": "Open IELTS practice corpus index",
            "repository": REPO,
            "commit": COMMIT,
            "license": "CC BY 4.0",
            "attribution": "Derived metadata index of https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS.",
            "note": (
                "Only derived metadata is published: identifiers, levels, counts and item-type "
                "frequencies. Upstream passages, questions and audio are third-party material and "
                "are not redistributed, and the learner workbook (which contains personal data) is "
                "excluded by design. The words field counts word tokens in the reading prompt of "
                "each item."
            ),
            "tool": "scripts/extract_practice.py",
        },
        "series": series_rows,
        "items": items,
        "stats": stats,
        "itemTypeFacts": item_type_facts,
    }


def main(argv: list[str]) -> int:
    """Entry point: ``extract_practice.py TREE_JSON CHECKOUT_DIR [OUT]``."""
    if len(argv) not in (3, 4):
        print(__doc__)
        return 2
    tree_path = Path(argv[1])
    checkout = Path(argv[2])
    out_path = Path(argv[3] if len(argv) == 4 else "data/practice.json")
    payload = build(tree_path, checkout)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    stats = payload["stats"]
    print(
        f"indexed {stats['items']} practice items "
        f"({stats['questions']['total']} questions, "
        f"{stats['normalisedTypeLabels']} item-type labels)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
