#!/usr/bin/env python3
"""Extract the Cambridge IELTS vocabulary dataset used by ielts-api.

The upstream research corpus (https://github.com/zhengyishiming/IELTS) ships
``1-22yas.xlsx``: a 22-sheet workbook holding the vocabulary lists of Cambridge
IELTS volumes 1-22 (columns: Number, Words, Phonetic Symbol, Explanation,
Notes).  This script turns that workbook into the normalised JSON dataset
served by the API.

It is intentionally dependency-free (standard library only) so that the
extraction can be reproduced anywhere:

    python3 scripts/extract_vocabulary.py 1-22yas.xlsx data/vocabulary.json

The workbook is an Office Open XML package, i.e. a ZIP archive; shared strings
and sheet rows are read with ``zipfile`` + ``xml.etree`` rather than a
third-party spreadsheet library.
"""

from __future__ import annotations

import collections
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

#: Part-of-speech abbreviations used by the upstream workbook, normalised.
POS = {
    "n": "noun",
    "v": "verb",
    "vt": "verb",
    "vi": "verb",
    "adj": "adjective",
    "adv": "adverb",
    "pron": "pronoun",
    "prep": "preposition",
    "conj": "conjunction",
}

POS_SPLIT = re.compile(r"(?<!\w)(n|v|vt|vi|adj|adv|pron|prep|conj)\.\s")
COLUMN_RE = re.compile(r"([A-Z]+)")

SOURCE_REPO = "https://github.com/zhengyishiming/IELTS"
SOURCE_FILE = "1-22yas.xlsx"
VOLUMES = 22


def normalise(value: str | None) -> str | None:
    """Collapse whitespace and NFC-normalise a cell value."""
    if value is None:
        return None
    text = unicodedata.normalize("NFC", str(value)).replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    """Return the workbook's shared-string table."""
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(t.text or "" for t in item.iter(NS + "t")) for item in root]


def read_sheet(archive: zipfile.ZipFile, name: str, shared: list[str]) -> list[dict[str, str | None]]:
    """Return one worksheet as a list of ``{column: value}`` rows."""
    root = ET.fromstring(archive.read(name))
    rows: list[dict[str, str | None]] = []
    for row in root.iter(NS + "row"):
        cells: dict[str, str | None] = {}
        for cell in row:
            column = COLUMN_RE.match(cell.get("r", ""))
            if column is None:
                continue
            inline = cell.find(NS + "is")
            value_node = cell.find(NS + "v")
            if inline is not None:
                value: str | None = "".join(t.text or "" for t in inline.iter(NS + "t"))
            elif value_node is None:
                value = None
            elif cell.get("t") == "s":
                value = shared[int(value_node.text)]
            else:
                value = value_node.text
            cells[column.group(1)] = value
        rows.append(cells)
    return rows


def split_senses(definition: str | None) -> list[dict[str, str]]:
    """Split a WordNet-style definition into part-of-speech tagged senses."""
    if not definition:
        return []
    parts = [part.strip() for part in POS_SPLIT.split(definition)]
    senses: list[dict[str, str]] = []
    if len(parts) >= 3 and not parts[0]:
        iterator = iter(parts[1:])
        for tag, text in zip(iterator, iterator):
            clean = re.sub(r"\s+", " ", text).strip(" ;")
            if clean:
                senses.append({"pos": POS.get(tag, "other"), "text": clean + "."})
    if not senses:
        clean = re.sub(r"\s+", " ", definition).strip()
        senses = [{"pos": "other", "text": clean}] if clean else []
    return senses


def clean_phonetic(phonetic: str | None) -> str | None:
    """Wrap a phonetic transcription in slashes, normalising stray markers."""
    if not phonetic:
        return None
    value = phonetic.strip().strip("/").strip()
    return f"/{value}/" if value else None


def extract(workbook: Path) -> dict:
    """Parse the workbook and return the API dataset."""
    with zipfile.ZipFile(workbook) as archive:
        shared = read_shared_strings(archive)
        occurrences: list[dict] = []
        for volume in range(1, VOLUMES + 1):
            rows = read_sheet(archive, f"xl/worksheets/sheet{volume}.xml", shared)
            if not rows:
                continue
            header = {
                normalise(value).lower(): key
                for key, value in rows[0].items()
                if value and normalise(value)
            }
            columns = {
                "word": header.get("words"),
                "phonetic": header.get("phonetic symbol"),
                "definition": header.get("explanation"),
                "morphemes": header.get("notes"),
            }
            if not columns["word"]:
                continue
            for row in rows[1:]:
                word = normalise(row.get(columns["word"]))
                if not word:
                    continue
                occurrences.append(
                    {
                        "volume": volume,
                        "word": word,
                        "phonetic": normalise(row.get(columns["phonetic"])),
                        "definition": normalise(row.get(columns["definition"])),
                        "morphemes": normalise(row.get(columns["morphemes"])),
                    }
                )

    merged: "collections.OrderedDict[str, dict]" = collections.OrderedDict()
    for item in occurrences:
        key = item["word"].lower()
        current = merged.get(key)
        if current is None:
            merged[key] = {
                "word": item["word"],
                "phonetic": item["phonetic"],
                "definition": item["definition"],
                "morphemes": item["morphemes"],
                "volumes": [item["volume"]],
            }
            continue
        if item["volume"] not in current["volumes"]:
            current["volumes"].append(item["volume"])
        if len(item["definition"] or "") > len(current["definition"] or ""):
            current["definition"] = item["definition"]
            current["phonetic"] = item["phonetic"] or current["phonetic"]
            current["morphemes"] = item["morphemes"] or current["morphemes"]

    entries = []
    for position, entry in enumerate(sorted(merged.values(), key=lambda e: e["word"].lower()), start=1):
        senses = split_senses(entry["definition"])
        morphemes = entry["morphemes"]
        entries.append(
            {
                "id": f"w{position:05d}",
                "word": entry["word"],
                "phonetic": clean_phonetic(entry["phonetic"]),
                "partOfSpeech": senses[0]["pos"] if senses else "other",
                "definition": senses[0]["text"] if senses else None,
                "senses": senses,
                "morphemes": None if morphemes == "nothing" else morphemes,
                "volumes": sorted(set(entry["volumes"])),
            }
        )

    return {
        "meta": {
            "name": "Cambridge IELTS 1-22 vocabulary",
            "source": f"{SOURCE_REPO} ({SOURCE_FILE})",
            "sourceUrl": f"{SOURCE_REPO}/blob/main/{SOURCE_FILE}",
            "volumes": VOLUMES,
            "occurrences": len(occurrences),
            "words": len(entries),
            "license": "CC BY 4.0",
            "attribution": (
                "Compiled from the open research corpus "
                f"{SOURCE_REPO} (file {SOURCE_FILE})."
            ),
        },
        "entries": entries,
    }


def main(argv: list[str]) -> int:
    """CLI entry point."""
    if len(argv) != 3:
        print(f"usage: {argv[0]} <input.xlsx> <output.json>", file=sys.stderr)
        return 2
    dataset = extract(Path(argv[1]))
    output = Path(argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(dataset, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    meta = dataset["meta"]
    print(
        f"wrote {output} ({meta['words']} words from {meta['occurrences']} "
        f"occurrences across {meta['volumes']} volumes)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
