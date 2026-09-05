#!/usr/bin/env python3
"""Build the mock-exam test-centre index served by ielts-api.

The upstream platform (https://github.com/wanli4473/yysd-testcenter) is the
repository behind the YYSD IELTS online mock-exam test center: a static exam
front end backed by an Express/SQLite API, whose self-marking HTML papers live
in ``library/`` and whose content index (``library/manifest.json``) is rebuilt
automatically on every upload. Two hand-curated taxonomy files annotate almost
every Cambridge IELTS 5-21 listening section and reading passage with question
types, teaching scenes and a three-level difficulty judgement, and a helper
script embeds the production raw-score-to-band calibration into every exam
page. The repository declares no licence, so - as with the archive family -
this script publishes derived, non-substitutive metadata only: no exam HTML,
question text, answer key, audio or vocabulary entry is redistributed.

Usage::

    # Fetch the four content blobs (pinned by SHA in CI) and the tree listing.
    python3 scripts/extract_testcenter.py manifest.json listening-taxonomy.json \\
        reading-taxonomy.json cambridge_scoring.py tree.json data/testcenter.json

Every input is machine-written by the platform itself (``build_manifest.py``,
``build_listening_taxonomy.py``, ``build_reading_taxonomy.py`` and
``cambridge_scoring.py``), so the derivation is deterministic: sorted items,
no timestamps of our own, stable slugs.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_practice_tests import CANONICAL_TYPES  # noqa: E402

REPO = "https://github.com/wanli4473/yysd-testcenter"
LIVE_SITE = "https://youyisida.com"

MANIFEST_PATH = "library/manifest.json"
LISTENING_TAXONOMY_PATH = "library/listening-taxonomy.json"
READING_TAXONOMY_PATH = "library/reading-taxonomy.json"
SCORING_SCRIPT_PATH = "scripts/cambridge_scoring.py"

#: The three Cambridge papers the platform hosts.
PAPER_NAMES = {
    "listening": "Listening",
    "reading": "Reading",
    "writing": "Writing",
}

#: Canonical paper facet for every catalog subject. Subjects absent here keep
#: the literal subject value as their paper facet.
PAPER_BY_SUBJECT = {
    "cambridge-listening": "listening",
    "cambridge-reading": "reading",
    "cambridge-writing": "writing",
    "ielts": "full-mock",
    "changnanju": "drill",
    "jingting": "drill",
    "shuzi-tingxie": "drill",
    "grammar": "drill",
    "vocab": "vocabulary",
    "vocab-cet4": "vocabulary",
    "vocab-cet4-lite": "vocabulary",
    "vocab-special-listening": "vocabulary",
    "vocab-special-reading": "vocabulary",
    "vocab-special-writing": "vocabulary",
}

#: The eleven theme groups of ``/v1/topics/themes`` (the crosswalk target).
THEME_GROUPS = (
    "education",
    "environment",
    "technology",
    "health",
    "society",
    "economy",
    "family",
    "science",
    "transport",
    "law",
    "other",
)

#: Teaching scene vocabulary: Chinese label -> (slug, English name, theme group).
LISTENING_SCENES = {
    "求职": ("job-hunting", "Job hunting and employment", "economy"),
    "经营管理": ("business-management", "Business and management", "economy"),
    "地理": ("geography", "Geography and places", "science"),
    "旅游": ("tourism", "Tourism and travel", "transport"),
    "日常生活": ("daily-life", "Daily life", "society"),
    "建筑环境": ("built-environment", "Buildings and the built environment", "society"),
    "健康医疗": ("health", "Health and medicine", "health"),
    "住宿": ("accommodation", "Accommodation and housing", "family"),
    "运动": ("sport", "Sport and leisure", "health"),
    "图书馆": ("library", "Library services", "education"),
    "保险": ("insurance", "Insurance", "economy"),
    "新生入学": ("orientation", "Student orientation", "education"),
    "作业讨论": ("assignment-discussion", "Assignment and coursework discussion", "education"),
    "人文社科": ("humanities", "Humanities and social sciences", "society"),
    "生物": ("biology", "Biology and nature", "science"),
    "课题研究": ("research-project", "Research project and tutorials", "education"),
}
READING_SCENES = {
    "历史发展": ("historical-development", "Historical development", "society"),
    "自然科技": ("nature-technology", "Nature and technology", "technology"),
    "社会人文": ("society-humanities", "Society and humanities", "society"),
    "生态环保": ("ecology", "Ecology and conservation", "environment"),
    "语言教育": ("language-education", "Language and education", "education"),
    "生物研究": ("biological-research", "Biological research", "science"),
    "财经商业": ("business-finance", "Business and finance", "economy"),
    "医疗健康": ("health-medicine", "Health and medicine", "health"),
}
SCENES = {"listening": LISTENING_SCENES, "reading": READING_SCENES}

#: Question-group label mapping onto the canonical taxonomy. The pairing is
#: deliberate (see RESEARCH.md Part VI): a generic completion label means
#: notes/forms in the listening paper, but a distinct summary label exists in
#: the reading paper, where the generic label therefore denotes sentence
#: completion.
TYPE_MAP = {
    ("listening", "填空题"): "summary-completion",
    ("listening", "配对题"): "matching",
    ("listening", "单选题"): "multiple-choice",
    ("listening", "多选题"): "multiple-choice-multiple-answer",
    ("listening", "地图题"): "diagram-label-completion",
    ("listening", "流程题"): "summary-completion",
    ("listening", "简答题"): "short-answer",
    ("reading", "判断题"): "true-false-not-given",
    ("reading", "总结题"): "summary-completion",
    ("reading", "填空题"): "sentence-completion",
    ("reading", "单选题"): "multiple-choice",
    ("reading", "多选题"): "multiple-choice-multiple-answer",
    ("reading", "段落匹配题"): "matching-information",
    ("reading", "细节匹配题"): "matching",
    ("reading", "选段意题"): "matching-headings",
}

#: Difficulty judgement vocabulary: Chinese label -> canonical level.
DIFFICULTY_MAP = {"易": "easy", "中": "medium", "难": "hard"}

CAMBRIDGE_ID_RE = re.compile(r"^cambridge-(\d+)-test-(\d+)(?:-(reading|writing))?$")
COMPACT_ID_RE = re.compile(r"^c(\d+)-t(\d+)p(\d+)$")
JINGTING_ID_RE = re.compile(r"^cam(\d+)-test(\d+)-section(\d+)$")
PLACEMENT_ID_RE = re.compile(r"^placement-test-(\d+)$")
JUNIOR_ID_RE = re.compile(r"^placement-junior-(\d+)$")
SAMPLE_READING_ID_RE = re.compile(r"^sample-academic-reading-(\d+)$")
NUMBERS_ID_RE = re.compile(r"^numbers-(\d+)$")

BAND_TABLE_RE = re.compile(
    r"BAND_TABLE\s*=\s*\[((?:\s*\[\s*\d+\s*,\s*\d+(?:\.\d+)?\s*\]\s*,)*\s*\[\s*\d+\s*,\s*\d+(?:\.\d+)?\s*\])\s*\]"
)
LEVEL_LABEL_RE = re.compile(
    r"LEVEL_LABEL\s*=\s*\[((?:\s*\[\s*\d+(?:\.\d+)?\s*,\s*'[^']*'\s*\]\s*,)*"
    r"\s*\[\s*\d+(?:\.\d+)?\s*,\s*'[^']*'\s*\])\s*\]"
)
PAIR_RE = re.compile(r"\[\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)\s*\]")
LEVEL_PAIR_RE = re.compile(r"\[\s*(\d+(?:\.\d+)?)\s*,\s*'([^']*)'\s*\]")


def paper_for(subject: str, identifier: str) -> str:
    """Canonical paper facet for a catalog entry."""
    if subject != "ielts":
        return PAPER_BY_SUBJECT.get(subject, subject)
    # The mock/ielts subject mixes full CDT mocks with smaller entry papers.
    if PLACEMENT_ID_RE.match(identifier) is not None:
        return "full-mock"
    return "drill"


def cambridge_refs(identifier: str) -> tuple[int | None, int | None]:
    """Extract the Cambridge volume and test number from a catalog id."""
    match = CAMBRIDGE_ID_RE.match(identifier)
    if match is not None:
        return int(match.group(1)), int(match.group(2))
    match = COMPACT_ID_RE.match(identifier)
    if match is not None:
        return int(match.group(1)), int(match.group(2))
    match = JINGTING_ID_RE.match(identifier)
    if match is not None:
        return int(match.group(1)), int(match.group(2))
    return None, None


def english_title(identifier: str, subject: str) -> str | None:
    """Deterministic English title for ids whose structure names the paper."""
    match = CAMBRIDGE_ID_RE.match(identifier)
    if match is not None:
        volume, test, suffix = int(match.group(1)), int(match.group(2)), match.group(3)
        paper = {"reading": "Reading", "writing": "Writing", None: "Listening"}.get(suffix)
        return f"Cambridge IELTS {volume} Test {test} - {paper} paper"
    match = COMPACT_ID_RE.match(identifier)
    if match is not None:
        volume, test, passage = (int(match.group(i)) for i in (1, 2, 3))
        return f"Cambridge IELTS {volume} Test {test} Passage {passage} - long-sentence drill"
    match = JINGTING_ID_RE.match(identifier)
    if match is not None:
        volume, test, section = (int(match.group(i)) for i in (1, 2, 3))
        return f"Cambridge IELTS {volume} Test {test} Section {section} - intensive listening"
    match = PLACEMENT_ID_RE.match(identifier)
    if match is not None:
        return f"YYSD full mock exam No. {int(match.group(1))}"
    match = JUNIOR_ID_RE.match(identifier)
    if match is not None:
        return f"YYSD junior placement paper No. {int(match.group(1))}"
    match = SAMPLE_READING_ID_RE.match(identifier)
    if match is not None:
        return f"Sample academic reading paper No. {int(match.group(1))}"
    match = NUMBERS_ID_RE.match(identifier)
    if match is not None:
        return f"Number dictation drill No. {int(match.group(1))}"
    if identifier == "sample-grammar-present-perfect":
        return "Grammar lesson: present perfect"
    if subject == "ielts":
        return "Placement paper"
    return None


def slugify(identifier: str) -> str:
    """URL-safe ASCII slug for a catalog id (occurrence-deduplicated later)."""
    ascii_part = re.sub(r"[^a-z0-9]+", "-", identifier.lower()).strip("-")[:80]
    return ascii_part or "paper"


def parse_band_table(source: str, marker: str) -> list[dict[str, float | int]]:
    """Parse one raw-score-to-band table out of the scoring helper source."""
    start = source.index(marker)
    chunk = source[start:]
    match = BAND_TABLE_RE.search(chunk)
    if match is None:
        raise ValueError(f"no BAND_TABLE found after {marker}")
    pairs = [(int(a), float(b)) for a, b in PAIR_RE.findall(match.group(1))]
    rows: list[dict[str, float | int]] = []
    for index, (raw_from, band) in enumerate(pairs):
        # The thresholds descend, so a row runs from its own minimum up to the
        # threshold above it minus one; the first row reaches the maximum of 40.
        raw_to = 40 if index == 0 else pairs[index - 1][0] - 1
        if raw_to < raw_from:
            raise ValueError(f"descending table after {marker}")
        rows.append({"rawFrom": raw_from, "rawTo": raw_to, "band": band})
    if rows[-1]["rawFrom"] != 0:
        raise ValueError(f"table after {marker} does not reach raw 0")
    return rows


def parse_level_labels(source: str, marker: str) -> list[dict[str, float | str]]:
    """Parse the band-level label table out of the scoring helper source."""
    start = source.index(marker)
    match = LEVEL_LABEL_RE.search(source[start:])
    if match is None:
        raise ValueError(f"no LEVEL_LABEL found after {marker}")
    return [
        {"minBand": float(band), "label": label}
        for band, label in LEVEL_PAIR_RE.findall(match.group(1))
    ]


def join_levels(
    rows: list[dict[str, float | int]],
    levels: list[dict[str, float | str]],
) -> None:
    """Attach each row's band-level label to the row, in place.

    The platform looks a label up with the same descending first-match rule as
    the band itself; the final level threshold is 0, so every band in the
    tables must match exactly one label.
    """
    for row in rows:
        band = float(row["band"])
        for level in levels:
            if band >= float(level["minBand"]):
                row["level"] = level["label"]
                break
        else:
            raise ValueError(f"no level label covers band {band}")


def modal_duration(items: list[dict], paper: str) -> int | None:
    """Most common catalogue duration for one paper facet."""
    counts = Counter(
        item["durationMinutes"]
        for item in items
        if item["paper"] == paper and item["durationMinutes"] > 0
    )
    if not counts:
        return None
    highest = max(counts.values())
    return min(value for value, count in counts.items() if count == highest)


def build(
    manifest_path: Path,
    listening_path: Path,
    reading_path: Path,
    scoring_path: Path,
    tree_path: Path,
) -> dict:
    """Build the whole test-centre index document."""
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    taxonomies = {
        "listening": json.loads(listening_path.read_text(encoding="utf-8")),
        "reading": json.loads(reading_path.read_text(encoding="utf-8")),
    }
    scoring_source = scoring_path.read_text(encoding="utf-8")
    tree = json.loads(tree_path.read_text(encoding="utf-8"))
    blobs = {entry["path"]: entry for entry in tree["tree"] if entry.get("type") == "blob"}

    sources = {
        "manifest": MANIFEST_PATH,
        "listeningTaxonomy": LISTENING_TAXONOMY_PATH,
        "readingTaxonomy": READING_TAXONOMY_PATH,
        "scoringScript": SCORING_SCRIPT_PATH,
    }
    source_provenance = {}
    for key, path in sources.items():
        entry = blobs.get(path)
        source_provenance[key] = {
            "path": path,
            "sha1": entry.get("sha") if entry else None,
            "sourceUrl": f"{REPO}/blob/main/{quote(path)}",
        }

    # --- question groups -------------------------------------------------- #
    path_by_id = {str(item["id"]): str(item["file"]) for item in manifest["items"]}
    groups: list[dict] = []
    for paper in ("listening", "reading"):
        document = taxonomies[paper]
        known_scenes = SCENES[paper]
        for group in sorted(
            document["groups"],
            key=lambda item: (
                int(item["volume"]),
                int(item["test"]),
                int(item["part"]),
                int(item["qFrom"]),
            ),
        ):
            raw_type = str(group["qType"])
            key = (paper, raw_type)
            if key not in TYPE_MAP:
                raise KeyError(f"unmapped {paper} question type: {raw_type!r}")
            canonical = TYPE_MAP[key]
            if canonical not in CANONICAL_TYPES:
                raise KeyError(f"{canonical!r} is not a canonical question type")
            raw_scene = str(group.get("scene") or "")
            scene = known_scenes.get(raw_scene)
            raw_diff = str(group.get("diff") or "")
            parent = group["parentId"]
            parent_file = path_by_id.get(parent)
            entry = blobs.get(f"library/{parent_file}") if parent_file else None
            groups.append(
                {
                    "id": group["id"],
                    "parentId": parent,
                    "paper": paper,
                    "volume": int(group["volume"]),
                    "test": int(group["test"]),
                    "part": int(group["part"]),
                    "qFrom": int(group["qFrom"]),
                    "qTo": int(group["qTo"]),
                    "questions": int(group["qTo"]) - int(group["qFrom"]) + 1,
                    "type": canonical,
                    "rawType": raw_type,
                    "scene": scene[0] if scene else None,
                    "sceneLabel": scene[1] if scene else None,
                    "sceneRaw": raw_scene or None,
                    "difficulty": DIFFICULTY_MAP.get(raw_diff),
                    "sourceUrl": (
                        f"{REPO}/blob/main/library/{quote(parent_file)}"
                        if parent_file
                        else None
                    ),
                    "sha1": entry.get("sha") if entry else None,
                }
            )

    tagged: dict[str, Counter] = {}
    overlap_counts: dict[str, int] = {}
    sections_scened: dict[str, dict] = {}
    for paper in ("listening", "reading"):
        paper_groups = [group for group in groups if group["paper"] == paper]
        by_parent: dict[str, list[dict]] = {}
        for group in paper_groups:
            by_parent.setdefault(group["parentId"], []).append(group)
            tagged.setdefault(paper, Counter())[group["parentId"]] += 1
        overlaps = 0
        for ranges in by_parent.values():
            by_part: dict[int, list[tuple[int, int]]] = {}
            for group in ranges:
                by_part.setdefault(group["part"], []).append((group["qFrom"], group["qTo"]))
            for part_ranges in by_part.values():
                part_ranges.sort()
                for first, second in zip(part_ranges, part_ranges[1:]):
                    if second[0] <= first[1]:
                        overlaps += 1
        overlap_counts[paper] = overlaps
        document = taxonomies[paper]
        parts = document["parts"]
        sections_scened[paper] = {
            "sections": len(parts),
            "withScene": sum(1 for part in parts if str(part.get("scene") or "")),
        }

    # --- catalog ---------------------------------------------------------- #
    catalog: list[dict] = []
    slug_counts: dict[str, int] = {}
    manifest_items = sorted(manifest["items"], key=lambda item: item["file"])
    for entry in manifest_items:
        path = f"library/{entry['file']}"
        blob = blobs.get(path)
        subject = str(entry["subject"])
        identifier = str(entry["id"])
        slug = slugify(identifier)
        occurrence = slug_counts.get(slug, 0) + 1
        slug_counts[slug] = occurrence
        if occurrence > 1:
            slug = f"{slug}-{occurrence}"
        volume, test = cambridge_refs(identifier)
        item = {
            "id": slug,
            "upstreamId": identifier,
            "title": str(entry["title"]),
            "titleEn": english_title(identifier, subject),
            "zone": str(entry["zone"]),
            "subject": subject,
            "paper": paper_for(subject, identifier),
            "durationMinutes": int(entry.get("duration") or 0),
            "volume": volume,
            "test": test,
            "added": str(entry["added"]),
            "taggedGroups": int(tagged.get("listening", {}).get(identifier, 0))
            + int(tagged.get("reading", {}).get(identifier, 0)),
            "sourcePath": path,
            "sha1": blob.get("sha") if blob else None,
            "sizeBytes": int(blob.get("size") or 0) if blob else 0,
            "sourceUrl": f"{REPO}/blob/main/{quote(path)}",
        }
        catalog.append(item)

    # --- Cambridge holdings matrix ---------------------------------------- #
    volumes: list[dict] = []
    hosted_volumes = sorted(
        {
            item["volume"]
            for item in catalog
            if item["volume"] is not None and item["paper"] in PAPER_NAMES
        }
    )
    for volume in hosted_volumes:
        row: dict = {"volume": volume}
        papers_total = 0
        for paper, label in PAPER_NAMES.items():
            papers = [
                item
                for item in catalog
                if item["volume"] == volume and item["paper"] == paper
            ]
            row[label.lower()] = {
                "papers": len(papers),
                "tests": sorted(item["test"] for item in papers if item["test"] is not None),
            }
            papers_total += len(papers)
        paper_groups = [g for g in groups if g["volume"] == volume]
        row["papersTotal"] = papers_total
        row["taggedGroups"] = len(paper_groups)
        row["taggedQuestions"] = sum(g["questions"] for g in paper_groups)
        row["complete"] = all(
            len(row[label.lower()]["tests"]) == 4
            and row[label.lower()]["tests"] == [1, 2, 3, 4]
            for label in PAPER_NAMES
        )
        volumes.append(row)

    # --- scene tables ------------------------------------------------------ #
    scene_tables: dict[str, list[dict]] = {}
    for paper in ("listening", "reading"):
        table = []
        for raw, (slug, english, theme_group) in SCENES[paper].items():
            scene_groups = [g for g in groups if g["paper"] == paper and g["scene"] == slug]
            table.append(
                {
                    "id": slug,
                    "zh": raw,
                    "en": english,
                    "themeGroup": theme_group,
                    "groups": len(scene_groups),
                    "questions": sum(g["questions"] for g in scene_groups),
                }
            )
        scene_tables[paper] = sorted(table, key=lambda row: -row["questions"])

    # --- production score calibration -------------------------------------- #
    scoring_tables = {
        paper: {
            "rows": parse_band_table(scoring_source, marker),
            "levels": parse_level_labels(scoring_source, marker),
        }
        for paper, marker in (("listening", "LISTENING_SCORING"), ("reading", "READING_SCORING"))
    }
    for paper in ("listening", "reading"):
        join_levels(scoring_tables[paper]["rows"], scoring_tables[paper]["levels"])
    scoring = {
        "source": source_provenance["scoringScript"],
        "provenance": "production-calibration",
        "note": (
            "Raw-score-to-band tables embedded by the platform's own scoring "
            "helper into every self-marking exam page; community-published "
            "conversion charts, indicative rather than official."
        ),
        "listening": {
            "name": "Listening raw score (0-40) to band",
            "max": 40,
            **scoring_tables["listening"],
        },
        "reading": {
            "name": "Academic Reading raw score (0-40) to band",
            "max": 40,
            **scoring_tables["reading"],
        },
    }

    # --- timing ------------------------------------------------------------ #
    timing = {
        "note": (
            "The platform's own exam-shell budgets, observed as the modal "
            "duration of the hosted papers per IELTS paper; official timing is "
            "approximately 30 minutes of audio plus transfer time for "
            "Listening and 60 minutes each for Reading and Writing."
        ),
        "papers": {
            "listening": modal_duration(catalog, "listening"),
            "reading": modal_duration(catalog, "reading"),
            "writing": modal_duration(catalog, "writing"),
            "fullMock": modal_duration(catalog, "full-mock"),
        },
        "minutesPerQuestion": {
            "listening": round(modal_duration(catalog, "listening") / 40, 3),
            "reading": round(modal_duration(catalog, "reading") / 40, 3),
        },
    }

    # --- statistics -------------------------------------------------------- #
    label_counts: Counter = Counter(
        (group["paper"], group["rawType"], group["type"]) for group in groups
    )
    raw_labels = [
        {"raw": raw, "paper": paper, "canonical": canonical, "occurrences": count}
        for (paper, raw, canonical), count in sorted(
            label_counts.items(), key=lambda kv: (-kv[1], kv[0][0], kv[0][1])
        )
    ]

    by_zone: Counter = Counter(item["zone"] for item in catalog)
    by_paper: Counter = Counter(item["paper"] for item in catalog)
    by_subject: Counter = Counter(item["subject"] for item in catalog)
    cambridge = [item for item in catalog if item["paper"] in PAPER_NAMES]
    added = sorted(item["added"] for item in catalog)

    taxonomy_stats: dict[str, dict] = {}
    for paper in ("listening", "reading"):
        paper_groups = [g for g in groups if g["paper"] == paper]
        taxonomy_stats[paper] = {
            "groups": len(paper_groups),
            "parentExams": len({g["parentId"] for g in paper_groups}),
            "sectionsTagged": sections_scened[paper]["sections"],
            "questions": sum(g["questions"] for g in paper_groups),
            "byType": dict(
                sorted(
                    Counter(
                        g["type"] for g in paper_groups for _ in range(g["questions"])
                    ).items()
                )
            ),
            "byScene": dict(
                sorted(
                    Counter(
                        g["scene"]
                        for g in paper_groups
                        if g["scene"] is not None
                        for _ in range(g["questions"])
                    ).items(),
                    key=lambda kv: -kv[1],
                )
            ),
            "byDifficulty": dict(
                sorted(
                    Counter(
                        g["difficulty"] for g in paper_groups if g["difficulty"] is not None
                    ).items()
                )
            ),
            "noDifficulty": sum(1 for g in paper_groups if g["difficulty"] is None),
            "noScene": sum(1 for g in paper_groups if g["scene"] is None),
            "overlappingRanges": overlap_counts[paper],
            "firstVolume": min(g["volume"] for g in paper_groups),
            "lastVolume": max(g["volume"] for g in paper_groups),
        }
    for paper, document in taxonomies.items():
        expected = len(document["groups"])
        taxonomy_stats[paper]["upstreamGroups"] = expected

    stats = {
        "catalog": {
            "items": len(catalog),
            "manifestCount": int(manifest.get("count") or 0),
            "byZone": dict(sorted(by_zone.items())),
            "byPaper": dict(sorted(by_paper.items())),
            "bySubject": dict(sorted(by_subject.items())),
            "cambridgePapers": len(cambridge),
            "cambridgeVolumes": {
                "listening": sorted(
                    {
                        item["volume"]
                        for item in cambridge
                        if item["paper"] == "listening" and item["volume"] is not None
                    }
                ),
                "reading": sorted(
                    {
                        item["volume"]
                        for item in cambridge
                        if item["paper"] == "reading" and item["volume"] is not None
                    }
                ),
                "writing": sorted(
                    {
                        item["volume"]
                        for item in cambridge
                        if item["paper"] == "writing" and item["volume"] is not None
                    }
                ),
            },
            "vocabBooks": sum(1 for item in catalog if item["paper"] == "vocabulary"),
            "addedRange": {"first": added[0], "last": added[-1]} if added else None,
        },
        "taxonomy": taxonomy_stats,
        "rawTypeLabels": raw_labels,
    }

    meta = {
        "name": "IELTS mock-exam test-centre index",
        "repository": REPO,
        "liveSite": LIVE_SITE,
        "commit": tree.get("sha"),
        "manifestGenerated": str(manifest.get("generated")),
        "sources": source_provenance,
        "license": "CC BY 4.0",
        "attribution": (
            "Derived metadata index of the YYSD IELTS online mock-exam test "
            f"center ({REPO}); the repository declares no upstream licence."
        ),
        "note": (
            "Only derived, non-substitutive metadata is published: the exam "
            "catalogue, the Cambridge holdings matrix, the hand-tagged "
            "question-group taxonomy, the scene vocabulary and the platform's "
            "score calibration. No exam HTML, question text, answer key, "
            "audio file or vocabulary entry is redistributed by this API."
        ),
    }

    return {
        "meta": meta,
        "stats": stats,
        "catalog": catalog,
        "volumes": volumes,
        "groups": groups,
        "scenes": scene_tables,
        "scoring": scoring,
        "timing": timing,
    }


def main(argv: list[str]) -> int:
    """Command-line entry point."""
    if len(argv) != 7:
        print(__doc__, file=sys.stderr)
        print(
            "usage: extract_testcenter.py <manifest.json> <listening-taxonomy.json> "
            "<reading-taxonomy.json> <cambridge_scoring.py> <tree.json> <out.json>",
            file=sys.stderr,
        )
        return 2
    document = build(
        Path(argv[1]), Path(argv[2]), Path(argv[3]), Path(argv[4]), Path(argv[5])
    )
    output = Path(argv[6])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(document, indent=1, ensure_ascii=False, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    catalog = document["stats"]["catalog"]
    taxonomy = document["stats"]["taxonomy"]
    print(
        f"wrote {output}: {catalog['items']} catalogue papers, "
        f"{len(document['groups'])} tagged question groups "
        f"({taxonomy['listening']['questions']} + {taxonomy['reading']['questions']} questions), "
        f"{len(document['volumes'])} Cambridge volumes hosted"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
