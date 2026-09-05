#!/usr/bin/env python3
"""Build the recalled writing-task index served by ielts-api at `/v1/writing/recall`.

The upstream collection (https://github.com/Oxidaner/ielts) bundles
crowd-recalled ("jiJing") Writing Task 2 prompts from computer-delivered IELTS
sessions between 2024-12-01 and 2025-01-31, annotated by a preparer with a
question type, a thematic classification and a difficulty rating.

Prompts recalled from a live, high-stakes examination are not an official
release, so this script treats the upstream sheet as *oral history about the
test*, not as test content: **no model answer, prepared essay, examiner
annotation or scoring column is redistributed here**. The emitted dataset keeps
the short factual record only:

* the recalled prompt text (a few sentences, widely circulated),
* the preparer's question-type label, normalised onto the canonical essay
  families used by `/v1/topics/writing`,
* the thematic classification, kept verbatim together with an English gloss
  and a cross-reference to the theme groups of `/v1/topics/themes`,
* the difficulty stars where the preparer recorded them.

Usage:

    python3 scripts/extract_writing_recall.py <upstream.xlsx> data/writing-recall.json

``<upstream.xlsx>`` is the workbook
``2024.12.1-2025.1.31 BC机考大作文机经整理by橙.xlsx`` from the upstream
repository. The workbook is a plain Office Open XML package, so it is read
with the standard library alone (zipfile + ElementTree).

Data-quality note: the upstream sheet's header row promises columns for date,
score and the four writing criteria, but every annotated row stops after the
difficulty column, and the difficulty stars appear either in the "Secondary
Theme" or in the "Difficulty" column depending on the row. The parser therefore
classifies trailing cells by content (a run of stars vs. a thematic label)
instead of trusting the header positions, and the emitted metadata records how
often each annotation kind occurred.
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree

REPO = "https://github.com/Oxidaner/ielts"

#: Upstream question-type label -> (canonical recall type, canonical essay family).
#:
#: The essay families match `ESSAY_QUESTION_TYPES` in `src/data/topics.ts`, so
#: every recalled prompt cross-references the original task bank.
TYPE_ALIASES: dict[str, tuple[str, str]] = {
    "agree": ("agree-disagree", "opinion"),
    "positive": ("positive-negative", "opinion"),
    "advantage": ("advantage-disadvantage", "advantages-disadvantages"),
    "Discuss Both Sides": ("discuss-both-views", "discussion"),
    "Double Question": ("two-part", "two-part"),
}

#: Upstream thematic label -> (English gloss, theme group of /v1/topics/themes).
#:
#: The gloss is an original translation written for this project. The group
#: cross-reference is `None` where the theme bank has no counterpart, so the
#: mapping never invents an equivalence the theme bank does not make.
THEME_ALIASES: dict[str, tuple[str, str | None]] = {
    "教育类": ("education", "education"),
    "环境类": ("environment", "environment"),
    "科技类": ("technology", "technology"),
    "生活类": ("daily life and society", "society"),
    "经济类": ("economy and work", "economy"),
    "政府类": ("government and public policy", None),
    "媒体类": ("media and advertising", None),
    "语言类": ("language and linguistics", None),
}

_STAR = re.compile(r"^★+$")
_MAIN_SHEET = "xl/worksheets/sheet1.xml"


def _column_cells(row: ElementTree.Element) -> list[str]:
    """Return the string value of every populated `<c>` cell of a row."""
    values: list[str] = []
    for cell in row.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c"):
        value = cell.find("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v")
        text = value.text if value is not None else ""
        if cell.get("t") == "s" and text:
            text = _SHARED[int(text)]
        values.append(text)
    return values


_SHARED: list[str] = []


def read_rows(path: Path) -> tuple[list[str], list[list[str]]]:
    """Return (header, data rows) of the workbook's first worksheet."""
    global _SHARED
    with zipfile.ZipFile(path) as bundle:
        shared = bundle.read("xl/sharedStrings.xml")
        root = ElementTree.fromstring(shared)
        _SHARED = [
            "".join(node.text or "" for node in item.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
            for item in root.findall("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si")
        ]
        sheet = ElementTree.fromstring(bundle.read(_MAIN_SHEET))
    rows = sheet.findall(".//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row")
    parsed = [_column_cells(row) for row in rows]
    return parsed[0], parsed[1:]


def parse_row(cells: list[str]) -> dict[str, object] | None:
    """Classify one data row of the upstream sheet.

    The header promises ``Essay Question / Question Type / Theme / Secondary
    Theme / Difficulty / DATE / Score / ...``, but rows stop early and the
    difficulty stars land either in the "Secondary Theme" or the "Difficulty"
    column. Cells are therefore classified by content: the question type is the
    known label, a trailing run of stars is the difficulty, and a remaining
    thematic label is a secondary theme.
    """
    if not cells or not cells[0].strip():
        return None
    prompt = " ".join(cells[0].split())
    if len(cells) < 2 or cells[1].strip() not in TYPE_ALIASES:
        return None
    raw_type = cells[1].strip()
    canonical, family = TYPE_ALIASES[raw_type]
    theme = cells[2].strip() if len(cells) > 2 else ""
    secondary: str | None = None
    difficulty: int | None = None
    for cell in cells[3:]:
        text = cell.strip()
        if not text:
            continue
        if _STAR.match(text):
            difficulty = len(text)
        elif text in THEME_ALIASES:
            secondary = text
    if theme not in THEME_ALIASES:
        return None
    if difficulty is None:
        return None  # rows without a difficulty rating are excluded and audited
    gloss, group = THEME_ALIASES[theme]
    return {
        "prompt": prompt,
        "rawType": raw_type,
        "type": canonical,
        "family": family,
        "theme": theme,
        "themeGloss": gloss,
        "themeGroup": group,
        "secondaryTheme": secondary,
        "difficulty": difficulty,
    }


def build(upstream: Path) -> dict[str, object]:
    header, rows = read_rows(upstream)
    candidate_rows = sum(1 for cells in rows if cells and cells[0].strip())
    parsed = [row for row in (parse_row(cells) for cells in rows) if row is not None]
    occurrences: Counter[str] = Counter(str(row["prompt"]) for row in parsed)
    seen: set[str] = set()
    prompts: list[dict[str, object]] = []
    for row in parsed:
        prompt = str(row["prompt"])
        if prompt in seen:
            continue
        seen.add(prompt)
        prompts.append({
            "id": f"wr-{len(prompts) + 1:03d}",
            **row,
            "occurrences": occurrences[prompt],
        })

    def tally(key: str) -> dict[str, int]:
        counter = Counter[str](str(row[key]) for row in parsed)
        return dict(counter.most_common())

    return {
        "meta": {
            "name": "Recalled computer-based Writing Task 2 prompts, 2024-12-01 to 2025-01-31",
            "repository": REPO,
            "upstreamPath": "作文/2024.12.1-2025.1.31 BC机考大作文机经整理by橙.xlsx",
            "columns": header,
            "license": "unlicensed third-party study material; derived factual record only",
            "attribution": "Crowd-recalled prompts as compiled by the upstream preparer (橙).",
            "note": (
                "Prompts are recall reports about computer-delivered IELTS sessions, not an "
                "official release. No prepared essay, scoring annotation or model answer is "
                "redistributed; scores and criteria columns exist upstream but were empty."
            ),
            "cleaning": (
                "Difficulty stars are classified by content rather than column position; "
                "secondary themes keep the upstream labels verbatim."
            ),
        },
        "stats": {
            "rows": len(parsed),
            "prompts": len(prompts),
            "repeatedPrompts": sum(1 for count in occurrences.values() if count > 1),
            "withDifficulty": sum(1 for row in parsed if row["difficulty"] is not None),
            "skippedRows": candidate_rows - len(parsed),
            "withSecondaryTheme": sum(1 for row in parsed if row["secondaryTheme"] is not None),
            "byType": tally("type"),
            "byRawType": tally("rawType"),
            "byFamily": tally("family"),
            "byTheme": tally("theme"),
            "byDifficulty": dict(sorted(
                Counter[int](row["difficulty"] for row in parsed if row["difficulty"] is not None).items(),
            )),
        },
        "prompts": prompts,
    }


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(f"usage: {argv[0]} <upstream.xlsx> <output.json>", file=sys.stderr)
        return 2
    dataset = build(Path(argv[1]))
    Path(argv[2]).write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stats = dataset["stats"]
    assert isinstance(stats, dict)
    print(
        f"writing-recall: {stats['prompts']} unique prompts from {stats['rows']} rows; "
        f"{stats['withDifficulty']} difficulty ratings, {stats['withSecondaryTheme']} secondary themes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
