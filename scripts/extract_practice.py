#!/usr/bin/env python3
"""Build a metadata-only index of the open IELTS practice corpus.

The upstream repository (https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS)
is a large, homogeneous pool of CEFR-levelled IELTS practice material: 1,232
levelled reading lessons, 314 full reading tests, 204 full listening tests, 102
basic listening lessons and their accompanying audio.  Unlike the corpus indexed
by ``scripts/extract_corpus.py``, this corpus is almost entirely IELTS-relevant,
which is itself a finding worth recording: it is a self-consistent, machine
readable practice bank rather than a noisy file dump.

This script reads the GitHub tree JSON and (optionally) the reading-lesson index
JSON and emits a curated, machine-readable index of the practice modules together
with corpus-level statistics.  Only metadata is published: the upstream files are
third-party material and are never redistributed.

Usage:

    curl -sL "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/trees/main?recursive=1" \\
        -o tree.json
    curl -sL -H "Accept: application/vnd.github.v3.raw" \\
        "https://api.github.com/repos/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS/git/blobs/<index-sha>" \\
        -o reading-index.json
    python3 scripts/extract_practice.py tree.json data/practice.json
    python3 scripts/extract_practice.py tree.json data/practice.json --reading-index reading-index.json
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REPO = "https://github.com/ngoclong1209/UPGRADE-YOUR-IELTS-SKILLS"

#: Named modules within the upstream practice corpus.
MODULE_READING_BAND = "reading-band"
MODULE_READING_FULL = "reading-full-test"
MODULE_LISTENING_FULL = "listening-full-test"
MODULE_LISTENING_BASIC = "listening-basic"

#: Recognised CEFR levels for the levelled reading lessons.
LEVELS = ("A1-A2", "B1-B2", "C1-C2")

#: Recognised difficulty levels for the basic listening lessons.
LISTENING_LEVELS = ("Basic", "Intermediate", "Advanced")


def _blob_by_path(blobs: list[dict], path: str) -> dict | None:
    """Return the blob metadata for ``path``, or ``None`` if absent."""
    for blob in blobs:
        if blob["path"] == path:
            return blob
    return None


def _size_of(blobs: list[dict], path: str) -> int | None:
    """Return the byte size of ``path``, or ``None`` when unknown."""
    blob = _blob_by_path(blobs, path)
    return blob.get("size") if blob is not None else None


def _sha_of(blobs: list[dict], path: str) -> str | None:
    """Return the git blob SHA-1 of ``path``, or ``None`` when unknown."""
    blob = _blob_by_path(blobs, path)
    return blob.get("sha") if blob is not None else None


def _source_url(path: str) -> str:
    """Build a public source URL for a file path."""
    return f"{REPO}/blob/main/{path.replace(' ', '%20')}"


def _reading_band_items(blobs: list[dict], index: dict | None) -> list[dict]:
    """Build metadata items for the CEFR-levelled reading lessons."""
    if index is None:
        return []
    items: list[dict] = []
    for level in LEVELS:
        for entry in index.get(level, []):
            lesson_id: str = entry["id"]
            title: str = entry["title"]
            rel: str = entry["file"]
            path = f"Reading_1232_Basic/frontend/{rel}"
            items.append(
                {
                    "id": f"rl_{lesson_id}",
                    "module": MODULE_READING_BAND,
                    "level": level,
                    "title": title,
                    "path": path,
                    "format": "json",
                    "sizeBytes": _size_of(blobs, path),
                    "sha1": _sha_of(blobs, path),
                    "sourceUrl": _source_url(path),
                    "lesson": lesson_id,
                }
            )
    return items


def _full_test_items(blobs: list[dict], prefix: str, module: str) -> list[dict]:
    """Build metadata items for the full listening or reading tests.

    One item is emitted per test directory.  The best available source file is
    used: the raw question JSON if present, otherwise the processed JSON, and
    otherwise the first JSON in the directory.
    """
    per_test: dict[str, dict] = {}
    for blob in blobs:
        path: str = blob["path"]
        if not path.startswith(prefix):
            continue
        match = re.match(rf"^{prefix}/Test_(\d+)/", path)
        if match is None or blob.get("type") != "blob":
            continue
        number = match.group(1)
        candidate = per_test.setdefault(
            number, {"path": f"{prefix}/Test_{number}", "size": None, "sha": None}
        )
        if path.endswith(".json") and (
            candidate["path"] == f"{prefix}/Test_{number}"
            or (
                candidate["path"].endswith("_processed.json")
                and not path.endswith("_processed.json")
            )
        ):
            candidate["path"] = path
            candidate["size"] = blob.get("size")
            candidate["sha"] = blob.get("sha")

    items: list[dict] = []
    for number in sorted(per_test, key=lambda value: int(value)):
        candidate = per_test[number]
        if module == MODULE_READING_FULL:
            title = f"Full Reading Test {int(number)}"
        else:
            title = f"Full Listening Test {int(number)}"
        items.append(
            {
                "id": f"pt_{module}-{int(number):03d}",
                "module": module,
                "level": None,
                "title": title,
                "path": candidate["path"],
                "format": "json",
                "sizeBytes": candidate["size"],
                "sha1": candidate["sha"],
                "sourceUrl": _source_url(candidate["path"]),
                "test": f"Test_{number}",
            }
        )
    return items


def _listening_basic_items(blobs: list[dict]) -> list[dict]:
    """Build metadata items for the basic listening lessons."""
    items: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for blob in blobs:
        path: str = blob["path"]
        match = re.match(
            r"^Listening_102_Basic/(Basic|Intermediate|Advanced)/Lesson_(\d+)/index\.html$",
            path,
        )
        if match is None:
            continue
        level, number = match.group(1), match.group(2)
        if (level, number) in seen:
            continue
        seen.add((level, number))
        items.append(
            {
                "id": f"pl_{level.lower()}-{int(number):03d}",
                "module": MODULE_LISTENING_BASIC,
                "level": level.title(),
                "title": f"Listening {level} - Lesson {int(number)}",
                "path": path,
                "format": "html",
                "sizeBytes": blob.get("size"),
                "sha1": blob.get("sha"),
                "sourceUrl": _source_url(path),
                "lesson": f"{level}_{number}",
            }
        )
    return items


def build(tree_path: Path, reading_index: dict | None) -> dict:
    """Build the practice-corpus index from a GitHub tree JSON document."""
    tree = json.loads(tree_path.read_text(encoding="utf-8"))
    blobs = [entry for entry in tree["tree"] if entry.get("type") == "blob"]

    items: list[dict] = []
    items.extend(_reading_band_items(blobs, reading_index))
    items.extend(_full_test_items(blobs, "Reading_315_FullTest", MODULE_READING_FULL))
    items.extend(
        _full_test_items(blobs, "Listening_204_FullTest", MODULE_LISTENING_FULL)
    )
    items.extend(_listening_basic_items(blobs))

    items.sort(key=lambda item: (item["module"], item["title"].lower()))

    by_module: dict[str, int] = {}
    by_level: dict[str, int] = {}
    for item in items:
        by_module[item["module"]] = by_module.get(item["module"], 0) + 1
        if item["level"] is not None:
            by_level[item["level"]] = by_level.get(item["level"], 0) + 1

    formats: dict[str, int] = {}
    for blob in blobs:
        extension = Path(blob["path"]).suffix.lower().lstrip(".") or "none"
        formats[extension] = formats.get(extension, 0) + 1

    practice_bytes = sum(item["sizeBytes"] or 0 for item in items)
    audio = sum(1 for blob in blobs if blob["path"].endswith(".mp3"))

    return {
        "meta": {
            "name": "Open IELTS practice corpus index",
            "repository": REPO,
            "commit": tree.get("sha"),
            "license": "Unspecified upstream; index published under CC BY 4.0",
            "attribution": f"Metadata index of the practice corpus {REPO}.",
            "note": (
                "Only metadata is published. The upstream files are third-party "
                "materials and are not redistributed by this API. Indexing a "
                "self-consistent, CEFR-levelled practice bank (rather than a "
                "mixed file dump) is the research contribution recorded here."
            ),
        },
        "stats": {
            "modulesInRepository": len(blobs),
            "practiceItems": len(items),
            "practiceBytes": practice_bytes,
            "byModule": dict(sorted(by_module.items())),
            "byLevel": dict(sorted(by_level.items())),
            "byFormat": dict(sorted(formats.items(), key=lambda kv: (-kv[1], kv[0]))),
            "audioFiles": audio,
        },
        "items": items,
    }


def main() -> int:
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Build the practice-corpus metadata index."
    )
    parser.add_argument(
        "tree", type=Path, help="GitHub tree JSON from the upstream repository."
    )
    parser.add_argument("output", type=Path, help="Output JSON path.")
    parser.add_argument(
        "--reading-index",
        type=Path,
        default=None,
        help="Optional reading-lesson index JSON (adds the 1,232 levelled lessons).",
    )
    args = parser.parse_args()

    reading_index = None
    if args.reading_index is not None and args.reading_index.exists():
        reading_index = json.loads(args.reading_index.read_text(encoding="utf-8"))

    index = build(args.tree, reading_index)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    stats = index["stats"]
    print(
        f"wrote {args.output} ({stats['practiceItems']} practice items "
        f"from {stats['modulesInRepository']} files)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
