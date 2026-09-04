#!/usr/bin/env python3
"""Build the research-corpus index served by ielts-api.

The upstream corpus (https://github.com/zhengyishiming/IELTS) is a flat dump of
404 files.  Only a subset of them is IELTS / English-learning material; the rest
is unrelated (semiconductor textbooks, music, cryptocurrency books, ...).  This
script reads the GitHub tree JSON and emits a curated, machine-readable index of
the IELTS-relevant subset together with corpus-level statistics.

Usage:

    curl -sL "https://api.github.com/repos/zhengyishiming/IELTS/git/trees/main?recursive=1" \
        -o tree.json
    python3 scripts/extract_corpus.py tree.json data/corpus.json

Only metadata (path, title, size, sha1, category) is published: no upstream
binary is redistributed, because most of the corpus is third-party copyrighted
material.
"""

from __future__ import annotations

import json
import re
import sys
import textwrap
from pathlib import Path

REPO = "https://github.com/zhengyishiming/IELTS"

#: Ordered classification rules: the first matching keyword wins.
RULES: list[tuple[str, str, tuple[str, ...]]] = [
    (
        "writing",
        "ielts-writing",
        (
            "ielts writing",
            "雅思写作",
            "writing task",
            "顾家北",
            "ielts model essays",
            "110-common-mistakes",
            "collins get ready for ielts writing",
        ),
    ),
    (
        "speaking",
        "ielts-speaking",
        (
            "ielts speaking",
            "雅思口语",
            "speak like a native",
            "get rid of you accent",
            "practice makes perfect english conversation",
            "english conversation",
            "ielts examiner",
        ),
    ),
    (
        "reading",
        "ielts-reading",
        ("ielts reading", "雅思阅读", "阅读胜典", "剑桥雅思最新真题题源详解"),
    ),
    ("listening", "ielts-listening", ("雅思听力", "listening")),
    (
        "vocabulary",
        "ielts-vocabulary",
        (
            "雅思听力1000词",
            "雅思真词汇",
            "雅思词组",
            "超核心词汇",
            "雅思词汇",
            "1368个单词",
            "word power made easy",
            "vocabulary builder",
            "super 10000",
            "词以类记",
            "英语词汇的奥秘",
            "巧攻雅思",
        ),
    ),
    (
        "grammar",
        "ielts-grammar",
        (
            "ielts grammar",
            "雅思语法",
            "english grammar",
            "grammar  usage",
            "grammar masterclass",
            "超图解",
            "长难句",
        ),
    ),
    (
        "general",
        "ielts-prep",
        ("ielts success formula", "ielts"),
    ),
    (
        "writing",
        "english-writing",
        ("on writing well", "thinking for yourself", "写作365", "writing"),
    ),
    (
        "reference",
        "english-reference",
        (
            "thesaurus",
            "collocations",
            "dictionary",
            "quotations",
            "phrasal verbs",
            "英语词组全书",
            "俚语",
            "idiomatic",
            "fluent english",
        ),
    ),
    ("pronunciation", "english-pronunciation", ("pronunciation",)),
    (
        "reading",
        "english-reading",
        ("书虫", "丽声指南针", "新概念英语单词", "老外最想和你聊", "英语，阅读是金"),
    ),
    ("speaking", "english-ielts-adjacent", ("english",)),
]

#: Noise stripped from raw file names when building a human-readable title.
NOISE = (
    re.compile(r"\(z-lib\.org\)", re.IGNORECASE),
    re.compile(r"\(Z-Library\)", re.IGNORECASE),
    re.compile(r"\.\w+_?\w*\.(rar|part\d+\.rar)$", re.IGNORECASE),
    re.compile(r"\.part\d+$", re.IGNORECASE),
    re.compile(r"\.[a-z0-9]{2,5}$", re.IGNORECASE),
    re.compile(r"_[A-Z0-9]{16,}$"),
    re.compile(r"\(\d+\)$"),
)


def classify(name: str) -> tuple[str, str] | None:
    """Return ``(skill, category)`` for a file name, or ``None`` if irrelevant."""
    lowered = name.lower()
    for skill, category, keywords in RULES:
        if any(keyword in lowered for keyword in keywords):
            return skill, category
    return None


def clean_title(name: str) -> str:
    """Turn a file name into a readable title."""
    title = name
    for pattern in NOISE:
        title = pattern.sub("", title)
    title = re.sub(r"\.(epub|mobi|azw3?|pdf|txt|docx|xlsx|rar|zip|mp3|mp4)$", "", title, flags=re.I)
    title = re.sub(r"\s+", " ", title).strip(" _-—()[]")
    return textwrap.shorten(title, width=120, placeholder=" …")


def build(tree_path: Path) -> dict:
    """Build the corpus index from a GitHub tree JSON document."""
    tree = json.loads(tree_path.read_text(encoding="utf-8"))["tree"]
    blobs = [entry for entry in tree if entry.get("type") == "blob"]

    items = []
    for blob in blobs:
        path: str = blob["path"]
        match = classify(path)
        if match is None:
            continue
        skill, category = match
        extension = Path(path).suffix.lower().lstrip(".")
        items.append(
            {
                "id": re.sub(r"[^a-z0-9]+", "-", path.lower()).strip("-")[:80],
                "path": path,
                "title": clean_title(path),
                "category": category,
                "skill": skill,
                "format": extension or "unknown",
                "sizeBytes": blob.get("size"),
                "sha1": blob.get("sha"),
                "sourceUrl": f"{REPO}/blob/main/{path.replace(' ', '%20')}",
            }
        )

    items.sort(key=lambda item: (item["category"], item["title"].lower()))

    categories: dict[str, int] = {}
    skills: dict[str, int] = {}
    total_bytes = 0
    for item in items:
        categories[item["category"]] = categories.get(item["category"], 0) + 1
        skills[item["skill"]] = skills.get(item["skill"], 0) + 1
        total_bytes += item["sizeBytes"] or 0

    formats: dict[str, int] = {}
    for blob in blobs:
        extension = Path(blob["path"]).suffix.lower().lstrip(".") or "none"
        formats[extension] = formats.get(extension, 0) + 1

    return {
        "meta": {
            "name": "Open IELTS research corpus index",
            "repository": REPO,
            "commit": json.loads(tree_path.read_text(encoding="utf-8")).get("sha"),
            "license": "CC BY 4.0",
            "attribution": f"Metadata index of the open corpus {REPO}.",
            "note": (
                "Only metadata is published. The upstream files are third-party "
                "materials and are not redistributed by this API."
            ),
        },
        "stats": {
            "filesInRepository": len(blobs),
            "ieltsRelevantFiles": len(items),
            "ieltsRelevantBytes": total_bytes,
            "coverageRatio": round(len(items) / len(blobs), 4) if blobs else 0,
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
        f"wrote {output} ({stats['ieltsRelevantFiles']} of "
        f"{stats['filesInRepository']} files indexed)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
