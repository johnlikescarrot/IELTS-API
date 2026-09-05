#!/usr/bin/env python3
"""Build the self-study notes index served by ielts-api at `/v1/notes`.

The upstream collection (https://github.com/Oxidaner/ielts) is a personal
IELTS self-study archive ("自学笔记"): 2,385 blobs organised in five skill
folders (作文 writing, 口语 speaking, 听力 listening, 阅读 reading, 经验
exam experience) plus a handful of root files.  Most of it is third-party
material shared inside training-camp groups - question banks, predicted
high-frequency reading articles, scene-vocabulary recordings, crash-course
guides and Cambridge-style practice tests.

**No upstream file is redistributed here.**  As with the research corpus and
the practice-test collection, this script emits derived, non-substitutive
metadata only: the structure of the collection (skill, category, format,
size, blob SHA-1, permalink) and aggregate counts.  When a local checkout of
the repository is supplied, two original Markdown files are additionally
*counted* (never copied): the speaking question bank and the Part 3
methodology notes.

Usage:

    curl -sL "https://api.github.com/repos/Oxidaner/ielts/git/trees/main?recursive=1" \
        -o tree.json
    python3 scripts/extract_study_notes.py tree.json [checkout] data/study-notes.json

`checkout` is optional; when present, `口语/神奇题库.md` is parsed for
question-bank counts.  It may be a clone, a sparse checkout or a download of
just that one file at the same relative path.
"""

from __future__ import annotations

import collections
import json
import re
import sys
from pathlib import Path

REPO = "https://github.com/Oxidaner/ielts"
BRANCH = "main"
COMMIT = "738c60828118f8f9d720e548b73245dd0fe70a30"

#: Top-level folder (or root) -> skill.
SKILL_BY_FOLDER = {
    "作文": "writing",
    "口语": "speaking",
    "听力": "listening",
    "阅读": "reading",
    "经验": "general",
}

#: Ordered content rules: (category, keywords).  First match wins, so the
#: list runs from the most specific marker to the most generic.
CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("exam-recall", ("机经",)),  # recalled / predicted live-exam questions
    ("question-bank", ("题库", "题卡")),
    ("methodology", ("方法论",)),
    ("vocabulary", ("词汇", "语料库", "场景单词", "单词自测", "词伙", "必背词汇")),
    ("templates", ("模板", "模版", "句式")),
    ("exam-strategy", ("经验",)),
    ("high-frequency", ("高频", "文章合集")),  # teacher-predicted frequent passages
    ("practice-test", ("听力/听力/",)),  # numbered tests with keys and audio
    ("course-material", ("冲刺营", "8天团", "宝典", "速成", "秘籍", "情感模块")),
    ("practice-material", ("小黑屋", "套题", "课后练习")),
]

#: Extensions that carry no learning content of their own.
ASSET_EXTENSIONS = {
    "js": "web-asset",
    "cjs": "web-asset",
    "css": "web-asset",
    "ico": "web-asset",
    "svg": "web-asset",
    "bat": "web-asset",
    "lnk": "web-asset",
    "html": "web-asset",
    "mp3": "audio",
    "jpg": "image",
    "jpeg": "image",
    "png": "image",
    "gif": "image",
    "webp": "image",
}

#: Files that are neither IELTS material nor worth indexing.
JUNK_NAMES = {".DS_Store", "Thumbs.db"}

#: Root files that are not IELTS study material.
NON_IELTS = {"ai_dev_roadmap.md"}

#: The speaking question bank counted when a checkout is provided.
SPEAKING_BANK_PATH = "口语/神奇题库.md"


def is_junk(path: str) -> bool:
    """Return `True` for editor droppings and OS metadata."""
    name = path.rsplit("/", 1)[-1]
    return name in JUNK_NAMES or name.startswith("~$")


def skill_of(path: str) -> str:
    """Map a repository path to its skill folder."""
    top = path.split("/", 1)[0]
    return SKILL_BY_FOLDER.get(top, "general")


def category_of(path: str, skill: str) -> str:
    """Classify a path into the collection taxonomy."""
    for category, keywords in CATEGORY_RULES:
        if any(keyword in path for keyword in keywords):
            return category
    extension = path.rsplit(".", 1)[-1].lower() if "." in path.rsplit("/", 1)[-1] else ""
    if extension in ASSET_EXTENSIONS:
        return ASSET_EXTENSIONS[extension]
    return f"{skill}-material"


def title_of(path: str) -> str:
    """Derive a human-readable title from the file name."""
    name = path.rsplit("/", 1)[-1]
    return name.rsplit(".", 1)[0] if "." in name else name


def format_of(path: str) -> str:
    """Return the file extension without the dot (`none` when absent)."""
    name = path.rsplit("/", 1)[-1]
    return name.rsplit(".", 1)[-1].lower() if "." in name else "none"


def source_url(path: str) -> str:
    """Permanent link to the blob on the default branch (spaces encoded)."""
    return f"{REPO}/blob/{BRANCH}/{path.replace(' ', '%20')}"


def count_speaking_bank(text: str) -> dict[str, object]:
    """Count topics and questions in the speaking question bank.

    The bank is organised as `### Part 1` (numbered topics with question
    bullets), `### Part 2` (numbered cue cards, each with a `Part 2` prompt
    list and a `Part 3` follow-up list).  Only counts are extracted - no
    question text is published.  The season is taken from the sibling export
    file names (`2025年9-12月...神奇题库.pdf`), because the note itself does
    not carry a date.
    """
    section = ""
    subpart = ""
    part1_topics = 0
    part1_questions = 0
    cue_cards = 0
    part3_questions = 0
    season = None

    season_match = re.search(r"(\d{4})\s*年\s*(\d+)\s*[-–]\s*(\d+)\s*月", text[:400])
    if season_match is not None:
        year = season_match.group(1)
        season = f"{year}-{int(season_match.group(2)):02d}..{int(season_match.group(3)):02d}"

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("### "):
            section = line.lstrip("# ").strip().lower()
            subpart = ""
            continue
        if section.startswith("part 1"):
            if re.match(r"^\d+\.\s+\*\*.+\*\*", line):
                part1_topics += 1
            elif line.startswith("- ") and line.endswith("?"):
                part1_questions += 1
        elif section.startswith("part 2"):
            if re.match(r"^\d+\.\s+\*\*.+\*\*", line):
                cue_cards += 1
                subpart = ""
            elif re.match(r"^- ?Part ?[23]", line, re.IGNORECASE):
                subpart = line.lower()
            elif line.startswith("- ") and line.endswith("?") and subpart.startswith("- part 3"):
                part3_questions += 1

    return {
        "sourcePath": SPEAKING_BANK_PATH,
        "season": season,
        "part1Topics": part1_topics,
        "part1Questions": part1_questions,
        "part2CueCards": cue_cards,
        "part3FollowUpQuestions": part3_questions,
        "questions": part1_questions + part3_questions,
    }


def season_of(paths: list[str]) -> str | None:
    """Read the bank season from a sibling export file name, when present."""
    for path in paths:
        match = re.search(r"(\d{4})\s*年\s*(\d+)\s*[-–]\s*(\d+)\s*月[^/]*题库", path)
        if match is not None:
            year = match.group(1)
            return f"{year}-{int(match.group(2)):02d}..{int(match.group(3)):02d}"
    return None


def build_index(tree: dict, checkout: Path | None) -> dict:
    """Turn a GitHub tree listing into the study-notes dataset."""
    blobs = sorted(
        (entry for entry in tree["tree"] if entry.get("type") == "blob"),
        key=lambda entry: entry["path"],
    )
    items: list[dict] = []
    by_skill: collections.Counter[str] = collections.Counter()
    by_category: collections.Counter[str] = collections.Counter()
    by_format: collections.Counter[str] = collections.Counter()
    junk = 0
    non_ielts = 0
    indexed_bytes = 0

    for entry in blobs:
        path = entry["path"]
        if is_junk(path):
            junk += 1
            continue
        if path in NON_IELTS:
            non_ielts += 1
            continue
        skill = skill_of(path)
        category = category_of(path, skill)
        size = entry.get("size", 0)
        # Identifiers depend on the position among indexed items only, so
        # they are stable regardless of which files are excluded.
        items.append(
            {
                "id": f"n{len(items) + 1:05d}",
                "path": path,
                "title": title_of(path),
                "skill": skill,
                "category": category,
                "format": format_of(path),
                "sizeBytes": size,
                "sha1": entry.get("sha"),
                "sourceUrl": source_url(path),
            }
        )
        by_skill[skill] += 1
        by_category[category] += 1
        by_format[format_of(path)] += 1
        indexed_bytes += size

    speaking_bank = None
    if checkout is not None:
        bank_file = checkout / SPEAKING_BANK_PATH
        if bank_file.is_file():
            speaking_bank = count_speaking_bank(bank_file.read_text(encoding="utf-8"))
            season = season_of([entry["path"] for entry in blobs])
            if season is not None:
                speaking_bank["season"] = season

    stats: dict[str, object] = {
        "filesInRepository": len(blobs),
        "indexedFiles": len(items),
        "indexedBytes": indexed_bytes,
        "excludedJunkFiles": junk,
        "excludedNonIeltsFiles": non_ielts,
        "coverageRatio": round(len(items) / len(blobs), 4) if blobs else 0.0,
        "bySkill": dict(sorted(by_skill.items())),
        "byCategory": dict(sorted(by_category.items())),
        "byFormat": dict(sorted(by_format.items())),
    }
    if speaking_bank is not None:
        stats["speakingBank"] = speaking_bank

    return {
        "meta": {
            "name": "Self-study notes collection index",
            "repository": REPO,
            "commit": COMMIT,
            "license": "none declared upstream (personal study archive)",
            "attribution": f"Metadata index of the self-study collection {REPO}.",
            "note": "Only metadata is published. The upstream files are third-party materials and are not redistributed by this API.",
        },
        "stats": stats,
        "items": items,
    }


def main(argv: list[str]) -> int:
    if len(argv) not in (2, 3):
        print(
            "usage: extract_study_notes.py tree.json [checkout] data/study-notes.json",
            file=sys.stderr,
        )
        return 2
    tree = json.loads(Path(argv[0]).read_text(encoding="utf-8"))
    checkout = Path(argv[1]) if len(argv) == 3 else None
    out_path = Path(argv[-1])
    index = build_index(tree, checkout)
    out_path.write_text(
        json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    stats = index["stats"]
    print(
        f"indexed {stats['indexedFiles']} of {stats['filesInRepository']} files "
        f"({stats['coverageRatio']:.1%}) into {out_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
