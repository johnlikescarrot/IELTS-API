#!/usr/bin/env python3
"""Build the grey-literature archive index served by ielts-api at `/v1/archive`.

The upstream collection (https://github.com/msneloy/IELTS) is a 557-file,
3.1 GB personal archive of the material one candidate's study group actually
collected in 2022. It has no licence and consists almost entirely of
third-party copyrighted material - rips of the Cambridge IELTS 1-18 listening
audio, the audio of five companion courses, the twelve British Council
"Sample Academic Reading" task PDFs and a teacher's folder of marked student
writing. This script therefore publishes **derived, non-substitutive metadata
and statistics only**: nothing from the collection is redistributed.

What the index adds over a file listing:

* a canonical catalogue: the archive's chaotic naming (`CAMBRIDGE  4` vs
  `cambridge 14`, `CEMBRIDGE   garamar  i e l t s`) is normalised into
  collections, volumes, tracks, tests and sections;
* a media-archaeology table: one row per Cambridge volume with its naming
  scheme (`cassette-side` -> `cd-track` -> `test-section`), the number of
  listening tests recoverable from the file names, and whether the volume is
  complete (four tests x four sections of audio);
* passage-level readability statistics for the twelve official sample tasks,
  computed from the PDF text layer with the same formulas as the practice-test
  index, plus their mapping onto this API's canonical question-type taxonomy;
* a derived profile of the assignment folder - per essay: learner, date,
  Writing task type and lexical/readability statistics. The essays themselves
  are never published.

Usage (a source checkout is required for the text-derived statistics):

    curl -sL "https://api.github.com/repos/msneloy/IELTS/git/trees/HEAD?recursive=1" \\
        -o tree.json
    python3 scripts/extract_archive.py tree.json ./upstream data/archive.json

The tree-only mode (no source directory) builds the index without the
text-derived fields; it exists for quick structural checks. The committed
dataset is always built with the source directory, and CI regenerates it
byte-identically by downloading the ~4 MB of blobs the text statistics need.

Text extraction of the sample PDFs requires the pinned ``pypdf`` dependency
(see the CI workflow); everything else is standard library.
"""

from __future__ import annotations

import json
import re
import sys
import textwrap
from pathlib import Path
from urllib.parse import quote

# `readability` implements exactly the statistics published by the
# practice-test index; importing it keeps the two datasets comparable.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_practice_tests import readability  # noqa: E402

REPO = "https://github.com/msneloy/IELTS"

#: Files excluded from the index (repository scaffolding, never study data).
EXCLUDED_BASENAMES = ("readme.md", ".gitattributes")

#: Cambridge folder name -> canonical volume number (the folder says "1 TO 17"
#: but actually contains volumes 1-18; volume 18 is a cover image only).
CAMBRIDGE_ROOT = "CAMBRIDGE IELTS 1 TO 17"
CAMBRIDGE_VOLUME_RE = re.compile(r"cambridge\s+(\d{1,2})\s*$", re.IGNORECASE)

#: Top-level folder -> (collection id, human title, skill).
COLLECTIONS: dict[str, tuple[str, str, str]] = {
    CAMBRIDGE_ROOT: ("cambridge-audio", "Cambridge IELTS listening audio", "listening"),
    "combo/CEMBRIDGE   garamar  i e l t s": (
        "grammar-for-ielts",
        "Cambridge Grammar for IELTS audio",
        "listening",
    ),
    "combo/Trainer": ("ielts-trainer", "IELTS Trainer audio", "listening"),
    "combo/cambridge vocabulary": (
        "vocabulary-for-ielts",
        "Cambridge Vocabulary for IELTS audio",
        "listening",
    ),
    "combo/instant practice test": (
        "instant-practice",
        "Instant practice tests audio",
        "listening",
    ),
    "combo/official IELTS": (
        "official-materials",
        "Official IELTS practice materials audio",
        "listening",
    ),
    "ptp 123": ("practice-test-plus", "Practice Test Plus audio", "listening"),
    "Academic Reading Samples": ("reading-samples", "Academic Reading sample tasks", "reading"),
    "Assignments": ("assignments", "Marked student assignments", "writing"),
}

#: Ordered rules recognising a Cambridge track name. Each pattern captures the
#: test and section numbers where the naming scheme encodes them. The first
#: matching family also determines the volume's naming scheme and media era.
TRACK_PATTERNS: list[tuple[str, str, re.Pattern[str]]] = [
    ("cassette-side", "cassette", re.compile(r"^Casset-(\d+)/(\d+)$", re.IGNORECASE)),
    ("cassette-side", "cassette", re.compile(r"^(\d)/(\d+)$")),  # volume 2
    ("cd-track", "cd", re.compile(r"^CD (\d+)/(\d+)$", re.IGNORECASE)),
    ("test-folder", "cd", re.compile(r"^Test(\d+)/(?:Test\d+-s(\d+)|(\d+))$", re.IGNORECASE)),
    ("flat-track", "cd", re.compile(r"^CAMBRIDGE\s+(\d+)$", re.IGNORECASE)),
    ("test-section", "download", re.compile(r"^IELTS\d+_Test(\d+)_Section(\d+)$", re.IGNORECASE)),
    ("test-section", "download", re.compile(r"^Test (\d+) Section (\d+)$", re.IGNORECASE)),
    ("cd-track-range", "cd", re.compile(r"^IELTS\d+-Tests(\d+)-(\d+)CD\d+Track[_ ]?\d+$", re.I)),
    ("test-section", "download", re.compile(r"^C\d+T(\d+)S(\d+)$", re.IGNORECASE)),
    ("test-section", "download", re.compile(r"^IELTS\d+_test(\d+)_audio(\d+)$", re.IGNORECASE)),
    (
        "test-section",
        "download",
        re.compile(r"^Test (\d+) Part (\d+)(?:\s*\[@[^\]]+\])?$", re.IGNORECASE),
    ),
    ("test-section", "download", re.compile(r"^Camb \d+ (\d+)-(\d+)$", re.IGNORECASE)),
]

#: Sample PDF file stem -> canonical question-type id (same taxonomy, and the
#: same completion roll-up decisions, as scripts/extract_practice_tests.py).
SAMPLE_TYPE_BY_STEM: dict[str, str] = {
    "academic-reading-sample-task-flowchart-completion-selecting-words-from-the-text": (
        "summary-completion"
    ),
    "academic-reading-sample-task-identifying-information-true-false-not-given": (
        "true-false-not-given"
    ),
    "academic-reading-sample-task-matching-features": "matching-features",
    "academic-reading-sample-task-matching-headings": "matching-headings",
    "academic-reading-sample-task-matching-sentence-endings-and-key": (
        "matching-sentence-endings"
    ),
    "academic-reading-sample-task-multiple-choice-more-than-one-answer": (
        "multiple-choice-multiple-answer"
    ),
    "academic-reading-sample-task-multiple-choice-one-answer": "multiple-choice",
    "academic-reading-sample-task-note-completion-and-key": "summary-completion",
    "academic-reading-sample-task-sentence-completion-and-key": "sentence-completion",
    "academic-reading-sample-task-summary-completion-selecting-from-a-list-of-words-or-phrases": (
        "summary-completion"
    ),
    "academic-reading-sample-task-summary-completion-selecting-words-from-the-text": (
        "summary-completion"
    ),
    "academic-reading-sample-task-table-completion": "summary-completion",
}

#: Sample stem -> human task name (verbatim from the file names, cleaned).
SAMPLE_TASK_NAMES: dict[str, str] = {
    "academic-reading-sample-task-flowchart-completion-selecting-words-from-the-text": (
        "Flow-chart completion (selecting words from the text)"
    ),
    "academic-reading-sample-task-identifying-information-true-false-not-given": (
        "Identifying information (True/False/Not Given)"
    ),
    "academic-reading-sample-task-matching-features": "Matching features",
    "academic-reading-sample-task-matching-headings": "Matching headings",
    "academic-reading-sample-task-matching-sentence-endings-and-key": (
        "Matching sentence endings"
    ),
    "academic-reading-sample-task-multiple-choice-more-than-one-answer": (
        "Multiple choice (more than one answer)"
    ),
    "academic-reading-sample-task-multiple-choice-one-answer": (
        "Multiple choice (one answer)"
    ),
    "academic-reading-sample-task-note-completion-and-key": "Note completion",
    "academic-reading-sample-task-sentence-completion-and-key": "Sentence completion",
    "academic-reading-sample-task-summary-completion-selecting-from-a-list-of-words-or-phrases": (
        "Summary completion (selecting from a list of words or phrases)"
    ),
    "academic-reading-sample-task-summary-completion-selecting-words-from-the-text": (
        "Summary completion (selecting words from the text)"
    ),
    "academic-reading-sample-task-table-completion": "Table completion",
}

#: "[Note: This is an extract from a Part 3 text about ...]" -> part + topic.
SAMPLE_NOTE_PART_RE = re.compile(
    r"extract from (?:a|an) Part (\d) text about (.+?)\]", re.IGNORECASE | re.DOTALL
)
SAMPLE_NOTE_TOPIC_RE = re.compile(
    r"extract from an? Academic Reading passage (?:on|about) (.+?)\]", re.IGNORECASE | re.DOTALL
)
#: The rubric that separates the passage from the numbered questions.
SAMPLE_RUBRIC_RE = re.compile(r"Questions?\s*\d+\s*[-\u2013]\s*\d+")

#: Assignment folder date (YY.MM.DD) -> default Writing task type when the
#: file name itself carries no task keyword (the prompt image names the task).
ASSIGNMENT_DATE_FALLBACK: dict[str, str] = {
    "22.08.05": "grammar",
    "22.08.11": "line-chart",
    "22.08.12": "bar-chart",
    "22.08.15": "pie-chart",
    "22.08.19": "map",
    "22.08.21": "natural-process",
    "22.08.27": "task-2-essay",
}

#: Ordered task-type keyword rules on the lower-cased file name.
ASSIGNMENT_TASK_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("pie-chart", ("pie",)),
    ("table", ("table",)),
    ("bar-chart", ("bar",)),
    ("line-chart", ("line",)),
    ("map", ("map",)),
    ("man-made-process", ("man-made", "man made", "mmp")),
    ("natural-process", ("natural", "np,")),
    ("task-2-essay", ("essay",)),
]

#: Learner markers in file names. `riadul` is checked before `riad` and both
#: normalise to `riad`: the archive uses the two spellings interchangeably.
LEARNER_RULES: list[tuple[str, str]] = [
    ("riadul", "riad"),
    ("riad", "riad"),
    ("mahmuda", "mahmuda"),
    ("pranto", "pranto"),
    ("emon", "emon"),
]

IMAGE_EXTENSIONS = ("jpg", "jpeg", "png")
AUDIO_EXTENSIONS = ("mp3", "wma", "wav")

MARKDOWN_JUNK_RE = re.compile(r"[*_`#>\[\]]")
MD_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")


def slugify(path: str) -> str:
    """Build a URL-safe identifier from a path (same rule as the other indexes)."""
    ascii_part = re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")[:80]
    return ascii_part or "item"


def permalink(path: str, commit: str | None) -> str:
    """Public URL of a file at the indexed commit."""
    ref = commit or "main"
    return f"{REPO}/blob/{ref}/{quote(path)}"


def media_of(extension: str) -> str:
    """Coarse media class of a file extension."""
    if extension in AUDIO_EXTENSIONS:
        return "audio"
    if extension in IMAGE_EXTENSIONS:
        return "image"
    if extension == "pdf":
        return "document"
    return "text"


# --------------------------------------------------------------------------- #
# Cambridge volumes                                                          #
# --------------------------------------------------------------------------- #


def parse_cambridge_track(track_ref: str) -> tuple[str | None, str | None, int | None, int | None]:
    """Parse a Cambridge audio reference of the form ``carrier/name``.

    ``track_ref`` is the path below the volume folder with the extension
    stripped (``Casset-1/1``, ``CD 1/3``, ``Test1/Test2-s1``,
    ``IELTS11_Test1_Section1``). Returns ``(naming_scheme, media, test,
    section)``; test and section are ``None`` unless the naming scheme encodes
    them.
    """
    for scheme, media, pattern in TRACK_PATTERNS:
        match = pattern.match(track_ref)
        if not match:
            continue
        groups = [group for group in match.groups() if group is not None]
        numbers = [int(group) for group in groups if group.isdigit()]
        if scheme in {"cassette-side", "cd-track", "flat-track", "cd-track-range"}:
            # Carrier and track numbers only: no test structure recoverable.
            return scheme, media, None, None
        if numbers:
            # Test-folder names carry the test in the folder and the section in
            # the file; test-section names carry test then section.
            return scheme, media, numbers[0], numbers[-1]
        return scheme, media, None, None
    return None, None, None, None


def cambridge_title(volume: int, stem: str, test: int | None, section: int | None) -> str:
    """Human-readable title for a Cambridge audio track."""
    prefix = f"Cambridge IELTS {volume} audio"
    if test is not None and section is not None:
        return f"{prefix}, test {test}, section {section}"
    carrier = re.match(r"^(Casset-\d+|CD \d+|\d+)$", stem, re.IGNORECASE)
    if carrier:
        return f"{prefix}, {re.sub(r'^CD', 'CD ',carrier.group(1), flags=re.IGNORECASE)}"
    flat = re.match(r"^CAMBRIDGE\s+(\d+)$", stem, re.IGNORECASE)
    if flat:
        return f"{prefix}, track {flat.group(1)}"
    return f"{prefix}, {stem}"


# --------------------------------------------------------------------------- #
# Reading samples                                                            #
# --------------------------------------------------------------------------- #


def sample_analysis(path: Path) -> dict[str, object]:
    """Derive the published statistics of one sample-task PDF.

    The passage is the text before the first ``Questions n-m`` rubric, which
    makes the readability figures comparable with the passage-level figures of
    the practice-test index. Question counts are deliberately **not** derived:
    the PDF text layer scrambles the question numbers (kerned digits swap
    positions), so any count would be unreliable.
    """
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    part_match = SAMPLE_NOTE_PART_RE.search(text)
    topic_match = SAMPLE_NOTE_TOPIC_RE.search(text)
    rubric = SAMPLE_RUBRIC_RE.search(text)
    passage = text[: rubric.start()] if rubric else text
    topic = part_match.group(2) if part_match else (topic_match.group(1) if topic_match else None)
    return {
        "pages": len(reader.pages),
        "readingPart": int(part_match.group(1)) if part_match else None,
        "topic": _clean_topic(topic),
        "readability": readability(passage),
    }


def _clean_topic(raw: str | None) -> str | None:
    if raw is None:
        return None
    topic = re.sub(r"\s+", " ", raw).strip()
    return topic[:160] or None


# --------------------------------------------------------------------------- #
# Assignments                                                                #
# --------------------------------------------------------------------------- #


def assignment_learner(name: str) -> str | None:
    """Learner named in an assignment file name, if any."""
    lowered = name.lower()
    for marker, learner in LEARNER_RULES:
        if marker in lowered:
            return learner
    return None


def assignment_task(name: str, folder: str) -> str:
    """Writing task type of an assignment file (file name first, folder date second)."""
    lowered = name.lower()
    for task_type, keywords in ASSIGNMENT_TASK_RULES:
        if any(keyword in lowered for keyword in keywords):
            return task_type
    return ASSIGNMENT_DATE_FALLBACK.get(folder, "uncategorised")


def assignment_role(name: str, extension: str) -> str:
    """Role of an assignment file: essay, prompt, answer material or prompt image."""
    lowered = name.lower()
    if extension in IMAGE_EXTENSIONS:
        return "prompt-image"
    if "solution" in lowered:
        return "answer-material"
    if "writing task" in lowered:
        return "prompt-list"
    return "essay"


def assignment_text(path: Path) -> str:
    """Read an assignment file and strip light Markdown syntax."""
    raw = path.read_text(encoding="utf-8", errors="replace")
    plain = MD_LINK_RE.sub(r"\1", raw)
    plain = MARKDOWN_JUNK_RE.sub("", plain)
    return plain


def assignment_title(role: str, task_type: str, learner: str | None, date: str) -> str:
    """Human-readable title for an assignment file."""
    type_names = {
        "line-chart": "line-chart report",
        "bar-chart": "bar-chart report",
        "pie-chart": "pie-chart report",
        "table": "table report",
        "map": "map description",
        "man-made-process": "man-made process description",
        "natural-process": "natural process description",
        "task-2-essay": "Task 2 essay",
        "grammar": "grammar exercise",
    }
    if role == "prompt-image":
        return f"Task prompt image ({date})"
    if role == "prompt-list":
        return f"Task 2 prompt list ({date})"
    if role == "answer-material":
        return f"Answered grammar exercise ({date})"
    by = f" by {learner.title()}" if learner else ""
    return f"{type_names.get(task_type, 'assignment')}{by} ({date})"


# --------------------------------------------------------------------------- #
# Index construction                                                         #
# --------------------------------------------------------------------------- #


def collection_of(path: str) -> tuple[str, str, str]:
    """Map a repository path to its ``(collection id, title, skill)``."""
    for folder, value in COLLECTIONS.items():
        if path == folder or path.startswith(folder + "/"):
            return value
    raise AssertionError(f"unclassified path: {path}")


def combo_title(collection: str, path: str) -> str:
    """Human-readable title for a companion-course or practice-test audio track."""
    relative = path.split("/", 1)[1] if "/" in path else path
    stem = Path(relative).stem
    numbers = re.findall(r"\d+", stem)
    track = f", track {int(numbers[-1])}" if numbers else ""
    disc = ""
    disc_match = re.search(r"(?:DISC\s*-?|Cd?|Casset(?:te)?)[- ]?(\d+)", relative, re.IGNORECASE)
    subfolder = Path(relative).parent.as_posix()
    folder_match = re.fullmatch(r"(?:DISC\s*-?(\d+)|[Cc]d\s?(\d+)|(\d+))", subfolder)
    if folder_match:
        disc_no = next(group for group in folder_match.groups() if group)
        disc = f", disc {disc_no}"
    elif disc_match:
        disc = f", disc {disc_match.group(1)}"
    return f"{collection}{disc}{track}"


def build(tree_path: Path, source_dir: Path | None) -> dict[str, object]:
    """Build the archive index from a GitHub tree JSON document."""
    document = json.loads(tree_path.read_text(encoding="utf-8"))
    commit = document.get("sha")
    blobs = sorted(
        (entry for entry in document["tree"] if entry.get("type") == "blob"),
        key=lambda entry: entry["path"],
    )

    items: list[dict[str, object]] = []
    volumes: dict[int, dict[str, object]] = {}
    used_ids: dict[str, int] = {}
    excluded = 0

    for entry in blobs:
        path = entry["path"]
        if Path(path).name.lower() in EXCLUDED_BASENAMES:
            excluded += 1
            continue

        # All-digit suffixes are not file types: names like
        # "pranto.md 22.08.11" end in a date, not an extension.
        suffix = Path(path).suffix.lower().lstrip(".")
        extension = "" if suffix.isdigit() else suffix
        collection, collection_title, skill = collection_of(path)
        base_id = slugify(path)
        item: dict[str, object] = {
            "id": base_id,
            "path": path,
            "collection": collection,
            "title": "",
            "skill": skill,
            "format": extension or "none",
            "media": media_of(extension),
            "sizeBytes": entry.get("size", 0),
            "sha1": entry.get("sha"),
            "sourceUrl": permalink(path, commit),
            "volume": None,
            "test": None,
            "section": None,
            "questionType": None,
            "hasAnswerKey": False,
            "readingPart": None,
            "topic": None,
            "pages": None,
            "readability": None,
            "learner": None,
            "role": None,
            "taskType": None,
            "date": None,
        }

        relative = path.split("/", 1)[1] if "/" in path else path
        stem = Path(relative).stem

        if collection == "cambridge-audio":
            folder, _, below = relative.partition("/")
            volume_match = CAMBRIDGE_VOLUME_RE.search(folder)
            volume = int(volume_match.group(1)) if volume_match else None
            item["volume"] = volume
            record = volumes.setdefault(
                volume,
                {
                    "volume": volume,
                    "folder": f"{CAMBRIDGE_ROOT}/{folder}",
                    "audioTracks": 0,
                    "bytes": 0,
                    "schemes": {},
                    "tests": set(),
                    "watermark": False,
                },
            )
            record["bytes"] += item["sizeBytes"]
            if extension in AUDIO_EXTENSIONS:
                track_ref = below[: -len(extension) - 1] if extension else below
                scheme, media, test, section = parse_cambridge_track(track_ref)
                item["test"], item["section"] = test, section
                item["title"] = cambridge_title(volume, stem, test, section)
                record["audioTracks"] += 1
                if scheme:
                    record["schemes"][scheme] = record["schemes"].get(scheme, 0) + 1
                if test:
                    record["tests"].add(test)
                if "[@" in stem or "sakib" in stem.lower():
                    record["watermark"] = True
            else:
                item["skill"] = "general"
                item["title"] = f"Cambridge IELTS {volume} cover image"
        elif collection == "reading-samples":
            if stem not in SAMPLE_TYPE_BY_STEM or stem not in SAMPLE_TASK_NAMES:
                raise SystemExit(f"unknown reading sample: {path}")
            item["questionType"] = SAMPLE_TYPE_BY_STEM[stem]
            item["hasAnswerKey"] = stem.endswith("-and-key")
            item["title"] = f"Academic Reading sample: {SAMPLE_TASK_NAMES[stem]}"
            if source_dir is not None:
                analysis = sample_analysis(source_dir / path)
                item["readability"] = analysis["readability"]
                item["pages"] = analysis["pages"]
                item["readingPart"] = analysis["readingPart"]
                item["topic"] = analysis["topic"]
        elif collection == "assignments":
            folder = relative.split("/", 1)[0]
            date_match = re.fullmatch(r"(\d{2})\.(\d{2})\.(\d{2})", folder)
            date = (
                f"20{date_match.group(1)}-{date_match.group(2)}-{date_match.group(3)}"
                if date_match
                else None
            )
            role = assignment_role(stem, extension)
            learner = assignment_learner(stem)
            task_type = assignment_task(stem, folder)
            item.update(
                {
                    "date": date,
                    "role": role,
                    "learner": learner,
                    "taskType": task_type if role != "prompt-image" else None,
                    "title": assignment_title(role, task_type, learner, date or folder),
                }
            )
            if source_dir is not None and role == "essay":
                stats = readability(assignment_text(source_dir / path))
                item["readability"] = stats
        else:
            item["title"] = combo_title(collection_title, relative)

        # Two sample stems share their first 80 characters, so slugs can
        # collide; disambiguate deterministically (paths are sorted).
        if item["id"] in used_ids:
            item["id"] = f"{base_id}-{used_ids[base_id] + 1}"
        used_ids[base_id] = used_ids.get(base_id, 0) + 1

        items.append(item)

    volume_rows = []
    for volume in sorted(key for key in volumes if key is not None):
        record = volumes[volume]
        schemes = record["schemes"]
        scheme = max(schemes, key=lambda name: (schemes[name], name)) if schemes else "none"
        media = next(
            (medium for name, medium, _ in TRACK_PATTERNS if name == scheme),
            "none",
        )
        tests = sorted(record["tests"])
        volume_rows.append(
            {
                "volume": volume,
                "folder": record["folder"],
                "namingScheme": scheme,
                "media": media,
                "audioTracks": record["audioTracks"],
                "bytes": record["bytes"],
                "testsInferred": len(tests) if tests else None,
                "testNumbers": tests if tests else None,
                "complete": record["audioTracks"] >= 16,
                "watermarked": record["watermark"],
            }
        )
    # Volume 18 holds no audio at all: index it as the archive's empty slot.
    if 18 not in volumes:
        volume_rows.append(
            {
                "volume": 18,
                "folder": f"{CAMBRIDGE_ROOT}/Cambridge 18",
                "namingScheme": "none",
                "media": "none",
                "audioTracks": 0,
                "bytes": 0,
                "testsInferred": None,
                "testNumbers": None,
                "complete": False,
                "watermarked": False,
            }
        )

    stats = build_stats(items, volume_rows, len(blobs), excluded)
    return {
        "meta": {
            "name": "IELTS grey-literature archive index",
            "repository": REPO,
            "commit": commit,
            "license": "None declared (upstream); this index re-publishes descriptive metadata only",
            "attribution": (
                "Metadata index of https://github.com/msneloy/IELTS, an unlicensed personal "
                "archive of third-party Cambridge IELTS and British Council material."
            ),
            "note": (
                "Only derived, non-substitutive metadata and statistics are published: no audio, "
                "PDF content, essay text or image is served by this API. Statistics over essay or "
                "passage text summarise the material; they cannot be inverted to reconstruct it."
            ),
        },
        "stats": stats,
        "volumes": volume_rows,
        "items": items,
    }


def build_stats(
    items: list[dict[str, object]], volumes: list[dict[str, object]], total: int, excluded: int
) -> dict[str, object]:
    """Aggregate the collection-level statistics."""

    def count_by(key: str) -> dict[str, int]:
        counts: dict[str, int] = {}
        for item in items:
            value = item[key]
            if isinstance(value, str):
                counts[value] = counts.get(value, 0) + 1
        return dict(sorted(counts.items()))

    audio = [item for item in items if item["media"] == "audio"]
    samples = [item for item in items if item["collection"] == "reading-samples"]
    essays = [item for item in items if item["collection"] == "assignments" and item["role"] == "essay"]
    assignments = [item for item in items if item["collection"] == "assignments"]

    essays_by_learner: dict[str, int] = {}
    essays_by_task: dict[str, int] = {}
    essay_words = 0
    for essay in essays:
        learner = essay["learner"] if isinstance(essay["learner"], str) else "unnamed"
        essays_by_learner[learner] = essays_by_learner.get(learner, 0) + 1
        task = essay["taskType"]
        assert isinstance(task, str)
        essays_by_task[task] = essays_by_task.get(task, 0) + 1
        stats = essay["readability"]
        if isinstance(stats, dict):
            essay_words += int(stats["words"])

    cambridge_rows = [row for row in volumes if row["audioTracks"] > 0 or row["volume"] == 18]
    naming_schemes: dict[str, int] = {}
    for row in cambridge_rows:
        naming_schemes[str(row["namingScheme"])] = naming_schemes.get(str(row["namingScheme"]), 0) + 1

    dates = sorted(
        str(item["date"]) for item in assignments if isinstance(item["date"], str)
    )

    return {
        "filesInRepository": total,
        "excludedFiles": excluded,
        "indexedFiles": len(items),
        "indexedBytes": sum(int(item["sizeBytes"]) for item in items),
        "audioTracks": len(audio),
        "audioBytes": sum(int(item["sizeBytes"]) for item in audio),
        "byCollection": count_by("collection"),
        "byFormat": count_by("format"),
        "byMedia": count_by("media"),
        "bySkill": count_by("skill"),
        "cambridge": {
            "volumesIndexed": len(cambridge_rows),
            "volumesWithAudio": sum(1 for row in cambridge_rows if row["audioTracks"] > 0),
            "completeVolumes": sum(1 for row in cambridge_rows if row["complete"]),
            "volumesWithTestStructure": sum(1 for row in cambridge_rows if row["testsInferred"]),
            "audioTracks": sum(int(row["audioTracks"]) for row in cambridge_rows),
            "namingSchemes": dict(sorted(naming_schemes.items())),
            "watermarkedVolumes": [row["volume"] for row in cambridge_rows if row["watermarked"]],
        },
        "readingSamples": {
            "files": len(samples),
            "distinctQuestionTypes": len({item["questionType"] for item in samples}),
            "withAnswerKey": sum(1 for item in samples if item["hasAnswerKey"]),
        },
        "assignments": {
            "files": len(assignments),
            "essays": len(essays),
            "learners": len(essays_by_learner),
            "essaysByLearner": dict(sorted(essays_by_learner.items())),
            "essaysByTaskType": dict(sorted(essays_by_task.items())),
            "essayWords": essay_words,
            "promptImages": sum(1 for item in assignments if item["role"] == "prompt-image"),
            "firstDate": dates[0] if dates else None,
            "lastDate": dates[-1] if dates else None,
        },
    }


def main(argv: list[str]) -> int:
    """Run the extractor: ``extract_archive.py TREE.json [SOURCE_DIR] OUTPUT.json``."""
    if len(argv) not in (3, 4):
        print(
            "usage: extract_archive.py TREE.json [SOURCE_DIR] OUTPUT.json",
            file=sys.stderr,
        )
        return 2

    tree_path = Path(argv[1])
    source_dir = Path(argv[2]) if len(argv) == 4 else None
    output_path = Path(argv[-1])

    index = build(tree_path, source_dir)
    payload = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(payload, encoding="utf-8")

    stats = index["stats"]
    assert isinstance(stats, dict)
    summary = textwrap.shorten(
        json.dumps(stats["byCollection"], ensure_ascii=False), width=110, placeholder=" ..."
    )
    print(f"archive index: {stats['indexedFiles']} files, {stats['audioTracks']} audio tracks")
    print(f"collections: {summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
