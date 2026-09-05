#!/usr/bin/env python3
"""Build the learner-writing and sample-task index served by ielts-api.

The upstream collection (https://github.com/msneloy/IELTS) is the public
archive of an IELTS preparation group. Two parts of it are unique among the
collections this API indexes:

* ``Academic Reading Samples/`` — twelve official-style Academic Reading
  sample-task sheets, one per task family, which map onto the canonical
  question-type taxonomy served at ``/v1/question-types``.
* ``Assignments/`` — seven dated classroom sessions (August 2022) of
  authentic learner writing: Task 1 reports and Task 2 essays in Markdown,
  the chart images they describe, one grammar exercise and one prompt set.

The rest of the repository — Cambridge IELTS books and cassettes, grammar
audio and third-party practice-test audio — is third-party copyrighted
material; it is counted for the repository composition but deliberately not
indexed item-by-item.

Usage:

    curl -sL "https://api.github.com/repos/msneloy/IELTS/git/trees/main?recursive=1" \\
        -o tree.json
    python3 scripts/extract_samples.py tree.json data/samples.json

Only metadata (path, title, kind, task family, session, author as published
upstream, size and blob SHA-1) is published: no upstream file is
redistributed by this API. Task families and question types cross-link to
``/v1/tasks/writing`` and ``/v1/question-types``.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = "https://github.com/msneloy/IELTS"

# Number of canonical question types in the API taxonomy; kept in sync with
# CANONICAL_TYPES in scripts/extract_practice_tests.py.
TAXONOMY_TYPES = 13

# The twelve reading sample sheets, keyed by the file-name stem after
# "academic-reading-sample-task-": title as published, and the canonical
# question type the family maps onto (scripts/extract_practice_tests.py
# TYPE_ALIASES maps notes, tables and flow-charts onto summary-completion).
READING_SAMPLES: dict[str, tuple[str, str]] = {
    "flowchart-completion-selecting-words-from-the-text": (
        "Flow-chart completion (selecting words from the text)",
        "summary-completion",
    ),
    "identifying-information-true-false-not-given": (
        "Identifying information (True/False/Not given)",
        "true-false-not-given",
    ),
    "matching-features": ("Matching features", "matching-features"),
    "matching-headings": ("Matching headings", "matching-headings"),
    "matching-sentence-endings-and-key": (
        "Matching sentence endings (with key)",
        "matching-sentence-endings",
    ),
    "multiple-choice-more-than-one-answer": (
        "Multiple choice (more than one answer)",
        "multiple-choice-multiple-answer",
    ),
    "multiple-choice-one-answer": ("Multiple choice (one answer)", "multiple-choice"),
    "note-completion-and-key": ("Note completion (with key)", "summary-completion"),
    "sentence-completion-and-key": ("Sentence completion (with key)", "sentence-completion"),
    "summary-completion-selecting-from-a-list-of-words-or-phrases": (
        "Summary completion (selecting from a list of words or phrases)",
        "summary-completion",
    ),
    "summary-completion-selecting-words-from-the-text": (
        "Summary completion (selecting words from the text)",
        "summary-completion",
    ),
    "table-completion": ("Table completion", "summary-completion"),
}

# Image formats: chart images accompanying the assignment prompts.
IMAGE_FORMATS = ("jpg", "jpeg", "png", "gif")

# Extensions recognised at the end of a path. One upstream file carries a
# date behind its extension ("pranto.md 22.08.11") and one has no extension
# at all ("emon"); both are handled by file_format() below.
KNOWN_EXTENSION = re.compile(r"\.(pdf|md|markdown|txt|jpe?g|png|gif|mp3|mp4|docx?|xlsx)$", re.I)

# Assignment sessions (folder names, yy.mm.dd) and the task family set that
# day, verified against the accompanying chart images. Sessions with more
# than one visual set a None default: the file name decides.
SESSION_DEFAULT_TASK: dict[str, str | None] = {
    "22.08.11": "academic-line-graph",  # visual: Line_Chart.jpg
    "22.08.12": "academic-bar-chart",  # visual: Bar_Chart.jpg
    "22.08.15": None,  # Pie_Chart.jpg and Table.jpg: file name decides
    "22.08.19": None,  # MAP.jpeg and MAN-MADE PROCESS.jpg: file name decides
    "22.08.21": "academic-process-diagram",  # visual: NATURAL PROCESS.png
    "22.08.27": "task-2",  # prompt set: WRITING TASK 2.md
}

# Ordered file-name keywords to task-family identifiers. Task identifiers
# match the ids published by /v1/tasks/writing; "task-2" links to
# /v1/topics/writing. The first matching rule wins.
TASK_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("academic-line-graph", ("line",)),
    ("academic-bar-chart", ("bar",)),
    ("academic-pie-chart", ("pie",)),
    ("academic-table", ("table",)),
    ("academic-map", ("map",)),
    ("academic-process-diagram", ("process", "mmp", "np")),
    ("task-2", ("essay", "task 2")),
]

# Hand-verified overrides for file names that do not name their chart type.
# "household expenditures by riadul.md" reports two pie charts of household
# expenditure (Japan and Malaysia, 2010).
TASK_OVERRIDES: dict[str, str] = {
    "Assignments/22.08.15/household expenditures by riadul.md": "academic-pie-chart",
}

# Titles of the two non-essay Markdown files, verified upstream.
TITLE_OVERRIDES: dict[str, str] = {
    "Assignments/22.08.05/Solution.md": "Grammar exercise — articles and countability (solution)",
    "Assignments/22.08.27/WRITING TASK 2.md": "Writing Task 2 prompt set — eight prompts",
}

# Learner first names exactly as published in the upstream file names,
# longest first so that "riadul" wins over "riad".
AUTHORS = ("mahmuda", "riadul", "riad", "emon", "pranto")

# Display labels for task families.
TASK_LABELS: dict[str, str] = {
    "academic-line-graph": "Line graph report",
    "academic-bar-chart": "Bar chart report",
    "academic-pie-chart": "Pie chart report",
    "academic-table": "Table report",
    "academic-mixed-charts": "Mixed charts report",
    "academic-map": "Map report",
    "academic-process-diagram": "Process diagram report",
    "task-2": "Task 2 essay",
}

# Ordered classification of the repository top level, for the composition
# statistics: the first prefix match wins.
COMPOSITION: list[tuple[str, str]] = [
    ("Academic Reading Samples/", "academic-reading-samples"),
    ("Assignments/", "assignments"),
    ("CAMBRIDGE IELTS 1 TO 17/", "cambridge-ielts-1-17"),
    ("combo/", "combo"),
    ("ptp 123/", "practice-tests-plus"),
]


def file_format(path: str) -> str:
    """Return the lower-case file extension, tolerating damaged names."""
    match = KNOWN_EXTENSION.search(path)
    if match is not None:
        return match.group(1).lower()
    if ".md" in path.lower():
        # "pranto.md 22.08.11": the extension is present but not last.
        return "md"
    return "unknown"


def session_date(folder: str) -> str:
    """Turn a ``yy.mm.dd`` assignment folder into an ISO date."""
    year, month, day = folder.split(".")
    return f"20{year}-{month}-{day}"


def author_of(name: str) -> str | None:
    """Return the learner first name published in a file name, if any."""
    lowered = name.lower()
    for author in AUTHORS:
        if author in lowered:
            return author
    return None


def task_of(path: str, session: str) -> str | None:
    """Resolve the task family of an essay: override, keyword, session."""
    if path in TASK_OVERRIDES:
        return TASK_OVERRIDES[path]
    lowered = path.lower()
    for task, keywords in TASK_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return task
    return SESSION_DEFAULT_TASK.get(session)


def visual_label(name: str) -> str:
    """Return a short description of a chart image from its file name."""
    lowered = name.lower()
    for label, keywords in (
        ("line chart", ("line",)),
        ("bar chart", ("bar",)),
        ("pie chart", ("pie",)),
        ("table", ("table",)),
        ("man-made process diagram", ("man-made",)),
        ("natural process diagram", ("natural",)),
        ("map", ("map",)),
    ):
        if any(keyword in lowered for keyword in keywords):
            return label
    return "chart"


def slugify(path: str, sha1: str | None) -> str:
    """Return a stable, URL-safe identifier for an upstream path."""
    slug = re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")
    if len(slug) <= 80:
        return slug
    # Overlong paths (the summary-completion sample sheets) are truncated
    # and disambiguated with the blob SHA-1, which is part of the contract.
    return f"{slug[:64].rstrip('-')}-{(sha1 or 'unknown')[:8]}"


def build_reading_sample(blob: dict) -> dict:
    """Build one index entry for an Academic Reading sample task sheet."""
    path: str = blob["path"]
    stem = Path(path).stem.removeprefix("academic-reading-sample-task-")
    title, question_type = READING_SAMPLES[stem]
    return {
        "id": slugify(path, blob.get("sha")),
        "collection": "reading-sample",
        "kind": "sample-task",
        "title": f"Academic Reading sample task — {title}",
        "path": path,
        "skill": "reading",
        "format": file_format(path),
        "sizeBytes": blob.get("size"),
        "sha1": blob.get("sha"),
        "sourceUrl": f"{REPO}/blob/main/{path.replace(' ', '%20')}",
        "questionType": question_type,
        "taskFamily": None,
        "session": None,
        "author": None,
    }


def build_assignment(blob: dict) -> dict:
    """Build one index entry for a classroom assignment file."""
    path: str = blob["path"]
    session_folder = path.split("/")[1]
    session = session_date(session_folder)
    name = path.rsplit("/", 1)[-1]
    fmt = file_format(path)
    if fmt in IMAGE_FORMATS:
        kind = "task-visual"
    elif name.lower() == "writing task 2.md":
        kind = "prompt"
    elif name.lower() == "solution.md":
        kind = "exercise"
    else:
        kind = "essay"
    task: str | None = None
    if kind == "essay":
        task = task_of(path, session_folder)
    elif kind == "prompt":
        task = "task-2"
    elif kind == "task-visual":
        # A chart image belongs to the task family its file name announces.
        lowered = name.lower()
        for candidate, keywords in TASK_KEYWORDS:
            if any(keyword in lowered for keyword in keywords):
                task = candidate
                break
    title = TITLE_OVERRIDES.get(path)
    if title is None:
        if kind == "essay":
            label = TASK_LABELS.get(task or "", "Writing sample")
            author = author_of(name) or "author unstated"
            title = f"{label} — {author} ({session})"
        elif kind == "task-visual":
            title = f"Task visual — {visual_label(name)} ({session})"
        else:
            title = name.rsplit(".", 1)[0]
    return {
        "id": slugify(path, blob.get("sha")),
        "collection": "learner-writing",
        "kind": kind,
        "title": title,
        "path": path,
        "skill": "grammar" if kind == "exercise" else "writing",
        "format": fmt,
        "sizeBytes": blob.get("size"),
        "sha1": blob.get("sha"),
        "sourceUrl": f"{REPO}/blob/main/{path.replace(' ', '%20')}",
        "questionType": None,
        "taskFamily": task,
        "session": session,
        "author": author_of(name) if kind == "essay" else None,
    }


def build(tree_path: Path) -> dict:
    """Build the samples index from a GitHub tree JSON document."""
    document = json.loads(tree_path.read_text(encoding="utf-8"))
    blobs = [entry for entry in document["tree"] if entry.get("type") == "blob"]

    composition: dict[str, int] = {}
    for blob in blobs:
        path: str = blob["path"]
        section = next((label for prefix, label in COMPOSITION if path.startswith(prefix)), "repository-root")
        composition[section] = composition.get(section, 0) + 1

    items = []
    for blob in blobs:
        path = blob["path"]
        if path.startswith("Academic Reading Samples/"):
            items.append(build_reading_sample(blob))
        elif path.startswith("Assignments/"):
            items.append(build_assignment(blob))

    items.sort(key=lambda item: (item["collection"], item["session"] or "", item["title"].lower(), item["id"]))
    ids = [item["id"] for item in items]
    assert len(ids) == len(set(ids)), f"duplicate identifiers: {sorted(i for i in ids if ids.count(i) > 1)}"

    def tally(field: str, rows: list[dict]) -> dict[str, int]:
        counts: dict[str, int] = {}
        for row in rows:
            counts[row[field]] = counts.get(row[field], 0) + 1
        return dict(sorted(counts.items()))

    essays = [item for item in items if item["kind"] == "essay"]
    essay_authors: dict[str, int] = {}
    essays_by_task: dict[str, int] = {}
    for essay in essays:
        author = essay["author"] or "unstated"
        essay_authors[author] = essay_authors.get(author, 0) + 1
        task = essay["taskFamily"] or "unclassified"
        essays_by_task[task] = essays_by_task.get(task, 0) + 1

    sessions = sorted({item["session"] for item in items if item["session"] is not None})
    reading_types = sorted({item["questionType"] for item in items if item["questionType"] is not None})

    return {
        "meta": {
            "name": "Learner-writing and sample-task collection index",
            "repository": REPO,
            "commit": document.get("sha"),
            "license": "CC BY 4.0",
            "attribution": f"Metadata index of the open collection {REPO}.",
            "note": (
                "Only metadata is published. The upstream files are third-party "
                "materials and are not redistributed by this API."
            ),
        },
        "stats": {
            "filesInRepository": len(blobs),
            "indexedFiles": len(items),
            "indexedBytes": sum(item["sizeBytes"] or 0 for item in items),
            "coverageRatio": round(len(items) / len(blobs), 4) if blobs else 0,
            "repositoryComposition": dict(sorted(composition.items())),
            "byCollection": tally("collection", items),
            "byKind": tally("kind", items),
            "bySkill": tally("skill", items),
            "byFormat": dict(sorted(tally("format", items).items(), key=lambda kv: (-kv[1], kv[0]))),
            "learnerWriting": {
                "files": sum(1 for item in items if item["collection"] == "learner-writing"),
                "sessions": len(sessions),
                "firstSession": sessions[0] if sessions else None,
                "lastSession": sessions[-1] if sessions else None,
                "essays": len(essays),
                "task1Reports": sum(1 for essay in essays if essay["taskFamily"] != "task-2"),
                "task2Essays": sum(1 for essay in essays if essay["taskFamily"] == "task-2"),
                "unstatedAuthors": sum(1 for essay in essays if essay["author"] is None),
                "essaysByAuthor": dict(sorted(essay_authors.items())),
                "essaysByTask": dict(sorted(essays_by_task.items())),
                "essayBytes": sum(essay["sizeBytes"] or 0 for essay in essays),
            },
            "readingSamples": {
                "files": sum(1 for item in items if item["collection"] == "reading-sample"),
                "distinctQuestionTypes": len(reading_types),
                "questionTypes": reading_types,
                "taxonomyTypes": TAXONOMY_TYPES,
                "taxonomyCoverage": round(len(reading_types) / TAXONOMY_TYPES, 4),
            },
        },
        "items": items,
    }


def main(argv: list[str]) -> int:
    """CLI entry point."""
    if len(argv) != 3:
        print(f"usage: {argv[0]} <tree.json> <output.json>", file=sys.stderr)
        return 2
    index = build(Path(argv[1]))
    output = Path(argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    stats = index["stats"]
    print(f"wrote {output} ({stats['indexedFiles']} of {stats['filesInRepository']} files indexed)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
