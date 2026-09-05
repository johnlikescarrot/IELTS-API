#!/usr/bin/env python3
"""Build the Oxidaner/ielts collection index.

The upstream collection <https://github.com/Oxidaner/ielts> is a personal
dump of IELTS self-study material (roughly 5 GB of PDFs, listening audio,
scanned workbooks and web archives). Like the other collections this project
indexes, it is third-party copyrighted material: this script extracts
*metadata only* (paths, sizes, formats, blob SHAs) and never touches the file
contents, so nothing is redistributed.

Usage:
    python3 scripts/extract_oxidaner.py TREE_JSON OUTPUT_JSON

TREE_JSON is the response of the GitHub git-trees API fetched with
``?recursive=1`` for the pinned commit; OUTPUT_JSON is the dataset written to
``data/oxidaner.json``. The script is standard-library only and deterministic:
the same tree always produces byte-identical output.
"""

from __future__ import annotations

import json
import sys
import urllib.parse

COMMIT = "738c60828118f8f9d720e548b73245dd0fe70a30"
REPOSITORY = "https://github.com/Oxidaner/ielts"
RETRIEVED = "2026-09-05"

# Top-level folders are the collection's own organisation by skill.
SKILL_BY_FOLDER = {
    "作文": "writing",
    "口语": "speaking",
    "听力": "listening",
    "阅读": "reading",
    "经验": "experience",
}

DOCUMENT_FORMATS = {"pdf", "docx", "doc", "epub", "mobi", "xlsx", "xls", "pptx", "ppt", "md", "txt", "rtf"}
AUDIO_FORMATS = {"mp3", "m4a", "wav", "aac", "flac", "ogg"}
IMAGE_FORMATS = {"jpg", "jpeg", "png", "gif", "bmp", "ico", "webp", "svg"}
WEB_FORMATS = {"html", "htm", "js", "cjs", "mjs", "css", "json", "xml"}
ARCHIVE_FORMATS = {"zip", "rar", "7z", "tar", "gz"}
DATA_FORMATS = {"xlsx", "xls", "csv", "json", "md", "txt"}


def folder_skill(path: str) -> str:
    top = path.split("/", 1)[0]
    return SKILL_BY_FOLDER.get(top, "meta")


def extension(path: str) -> str:
    name = path.rsplit("/", 1)[-1].lower()
    if "." not in name:
        return "none"
    return name.rsplit(".", 1)[1]


def category_of(fmt: str) -> str:
    if fmt in AUDIO_FORMATS:
        return "audio"
    if fmt in IMAGE_FORMATS:
        return "image"
    if fmt in ARCHIVE_FORMATS:
        return "archive"
    if fmt in WEB_FORMATS:
        return "web"
    if fmt in DOCUMENT_FORMATS:
        return "document"
    return "other"


def title_of(path: str) -> str:
    name = path.rsplit("/", 1)[-1]
    stem = name.rsplit(".", 1)[0] if "." in name else name
    return stem.strip() or name


def build(tree: list) -> dict:
    blobs = [node for node in tree if node["type"] == "blob"]
    blobs.sort(key=lambda node: node["path"])

    items = []
    by_skill: dict[str, int] = {}
    bytes_by_skill: dict[str, int] = {}
    by_format: dict[str, int] = {}
    by_category: dict[str, int] = {}
    total_bytes = 0
    machine_readable = 0
    audio_files = 0

    for ordinal, node in enumerate(blobs, start=1):
        path = node["path"]
        fmt = extension(path)
        skill = folder_skill(path)
        category = category_of(fmt)
        size = int(node.get("size", 0))
        total_bytes += size
        by_skill[skill] = by_skill.get(skill, 0) + 1
        bytes_by_skill[skill] = bytes_by_skill.get(skill, 0) + size
        by_format[fmt] = by_format.get(fmt, 0) + 1
        by_category[category] = by_category.get(category, 0) + 1
        if fmt in DATA_FORMATS:
            machine_readable += 1
        if fmt in AUDIO_FORMATS:
            audio_files += 1
        items.append(
            {
                "id": f"ox-{ordinal:05d}",
                "path": path,
                "title": title_of(path),
                "skill": skill,
                "category": category,
                "format": fmt,
                "sizeBytes": size,
                "sha1": node.get("sha"),
                "sourceUrl": f"{REPOSITORY}/blob/{COMMIT}/{urllib.parse.quote(path)}",
            }
        )

    stats = {
        "filesInRepository": len(blobs),
        "totalBytes": total_bytes,
        "machineReadableFiles": machine_readable,
        "audioFiles": audio_files,
        "bySkill": dict(sorted(by_skill.items())),
        "bytesBySkill": dict(sorted(bytes_by_skill.items())),
        "byFormat": dict(sorted(by_format.items(), key=lambda kv: (-kv[1], kv[0]))),
        "byCategory": dict(sorted(by_category.items(), key=lambda kv: (-kv[1], kv[0]))),
    }

    meta = {
        "name": "Oxidaner/ielts",
        "repository": REPOSITORY,
        "commit": COMMIT,
        "retrieved": RETRIEVED,
        "license": "not specified (third-party study material)",
        "attribution": "Metadata derived from the public file tree of Oxidaner/ielts.",
        "note": (
            "Metadata only: paths, sizes, formats and blob identifiers. The upstream "
            "files are third-party copyrighted study material and are never "
            "redistributed by this API."
        ),
    }

    return {"meta": meta, "stats": stats, "items": items}


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__)
        return 2
    with open(argv[1], encoding="utf-8") as handle:
        tree = json.load(handle)["tree"]
    index = build(tree)
    with open(argv[2], "w", encoding="utf-8") as handle:
        json.dump(index, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(
        f"wrote {argv[2]}: {index['stats']['filesInRepository']} files, "
        f"{index['stats']['totalBytes']} bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
