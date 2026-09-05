#!/usr/bin/env python3
"""Build the study-materials index served by ielts-api.

The upstream collection (https://github.com/Oxidaner/ielts) is a personal
IELTS self-study repository organised by skill (writing, speaking, listening,
reading) that aggregates preparation material: past-paper recall banks
("jijing"), question banks, scenario vocabulary, essay templates, idea banks,
methodology notes, mock-practice packages and saved reading-passage websites.
Most of it is third-party copyrighted material shared without a licence, so
this script - like scripts/extract_corpus.py - publishes descriptive metadata
only: nothing from the collection is redistributed.

Usage:

    curl -sL "https://api.github.com/repos/Oxidaner/ielts/git/trees/main?recursive=1" \\
        -o tree.json
    python3 scripts/extract_materials.py tree.json data/materials.json

Classification is rule-based: the first matching keyword wins, and the skill
facet comes from the top-level folder.  Deterministic ordering (sorted paths)
keeps identifiers stable across regenerations.
"""

from __future__ import annotations

import json
import re
import sys
import textwrap
from pathlib import Path
from urllib.parse import quote

REPO = "https://github.com/Oxidaner/ielts"

#: Top-level folder -> IELTS skill the material supports.
SKILL_BY_FOLDER = {
    "作文": "writing",
    "口语": "speaking",
    "听力": "listening",
    "阅读": "reading",
    "经验": "general",
}

#: Ordered category rules on the lower-cased full path: first match wins.
CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("answer-key", ("答案", "keys_", "answer key", "answers")),
    ("past-paper-recall", ("机经",)),
    ("question-bank", ("题库", "题卡", "题目", "真题", "新题", "保留题", "question")),
    ("vocabulary", ("词汇", "替换", "词伙", "场景词", "vocabulary")),
    ("idea-bank", ("观点库",)),
    ("sentence-patterns", ("句式",)),
    (
        "template",
        ("模板", "模版", "速成", "宝典", "静态图", "动态图", "流程图", "地图", "结构", "template"),
    ),
    ("methodology", ("方法论", "秘籍", "笔记", "经验", "情感模块", "roadmap")),
    ("link-list", ("网站链接", "链接")),
    ("repository-meta", ("readme.md",)),
]

#: Extensions treated as saved-website scaffolding rather than study material.
SITE_ASSET_EXTENSIONS = ("js", "cjs", "css", "ico")

#: Files excluded from the index entirely (editor/OS noise, never study data).
EXCLUDED_BASENAMES = (".ds_store",)


def classify(path: str) -> str:
    """Return the category for a repository path."""
    lowered = path.lower()
    for category, keywords in CATEGORY_RULES:
        if any(keyword in lowered for keyword in keywords):
            return category
    extension = Path(path).suffix.lower().lstrip(".")
    if extension in SITE_ASSET_EXTENSIONS:
        return "site-asset"
    if extension == "mp3" or "音频" in lowered:
        return "audio"
    return "practice-material"


def skill_for(path: str) -> str:
    """Map a repository path to its skill facet via the top-level folder."""
    top = path.split("/", 1)[0]
    return SKILL_BY_FOLDER.get(top, "general")


def is_excluded(path: str) -> bool:
    """True for OS/editor noise that must never enter the index."""
    basename = path.rsplit("/", 1)[-1].lower()
    return basename.startswith("~$") or basename.startswith(EXCLUDED_BASENAMES)


def clean_title(path: str) -> str:
    """Turn a repository path into a readable title."""
    name = path.rsplit("/", 1)[-1]
    name = re.sub(r"\.[a-z0-9]{2,5}$", "", name, flags=re.IGNORECASE)
    name = re.sub(r"~\$", "", name)
    name = re.sub(r"\s+", " ", name).strip(" _-—()[]")
    return textwrap.shorten(name, width=120, placeholder=" …") or path


def slugify(path: str) -> str:
    """Build a URL-safe identifier from a path."""
    ascii_part = re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")[:80]
    return ascii_part or "item"


def build(tree_path: Path) -> dict:
    """Build the materials index from a GitHub tree JSON document."""
    document = json.loads(tree_path.read_text(encoding="utf-8"))
    blobs = sorted(
        (entry for entry in document["tree"] if entry.get("type") == "blob"),
        key=lambda entry: entry["path"],
    )

    items: list[dict] = []
    excluded = 0
    slug_counts: dict[str, int] = {}
    for blob in blobs:
        path: str = blob["path"]
        if is_excluded(path):
            excluded += 1
            continue
        slug = slugify(path)
        occurrence = slug_counts.get(slug, 0) + 1
        slug_counts[slug] = occurrence
        if occurrence > 1:
            slug = f"{slug}-{occurrence}"
        extension = Path(path).suffix.lower().lstrip(".")
        items.append(
            {
                "id": slug,
                "path": path,
                "title": clean_title(path),
                "category": classify(path),
                "skill": skill_for(path),
                "format": extension or "unknown",
                "sizeBytes": blob.get("size") or 0,
                "sha1": blob.get("sha"),
                "sourceUrl": f"{REPO}/blob/main/{quote(path)}",
            }
        )

    categories: dict[str, int] = {}
    skills: dict[str, int] = {}
    formats: dict[str, int] = {}
    total_bytes = 0
    for item in items:
        categories[item["category"]] = categories.get(item["category"], 0) + 1
        skills[item["skill"]] = skills.get(item["skill"], 0) + 1
        formats[item["format"]] = formats.get(item["format"], 0) + 1
        total_bytes += item["sizeBytes"]

    return {
        "meta": {
            "name": "IELTS study-materials index",
            "repository": REPO,
            "commit": document.get("sha"),
            "license": "CC BY 4.0",
            "attribution": (
                "Metadata index of the open study-notes collection "
                f"{REPO}; the collection declares no upstream licence."
            ),
            "note": (
                "Only descriptive metadata is published. The upstream files are "
                "third-party study materials and are not redistributed by this API."
            ),
        },
        "stats": {
            "filesInRepository": len(blobs),
            "excludedFiles": excluded,
            "indexedFiles": len(items),
            "indexedBytes": total_bytes,
            "byCategory": dict(sorted(categories.items())),
            "bySkill": dict(sorted(skills.items())),
            "byFormat": dict(sorted(formats.items(), key=lambda kv: (-kv[1], kv[0]))),
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
    print(
        f"wrote {output} ({stats['indexedFiles']} of {stats['filesInRepository']} files "
        f"indexed, {stats['excludedFiles']} excluded as editor or OS noise)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
