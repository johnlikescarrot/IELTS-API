#!/usr/bin/env python3
"""Build the speaking-bank structure index served by ielts-api at `/v1/speaking/bank`.

The upstream collection (https://github.com/Oxidaner/ielts) documents the
September-December 2025 speaking question season with two files:

* a deck that classifies every Part 2 cue card by the four canonical content
  categories (people, objects, events, places) and by rotation status
  (newly introduced vs. retained from the previous season),
* a crowd question bank with Part 1 topic sets and Part 3 follow-up questions.

The deck is compiled third-party study material, so **no cue-card prompt text,
"you should say" bullet or model answer is redistributed here**. The emitted
dataset keeps structure only: card identifiers (the Chinese short title and the
"Describe ..." first line act as keys), category, rotation status, question
counts, and the season window - the classification layer researchers need to
study how the high-stakes speaking test rotates its bank, without substituting
for the source documents.

Usage:

    python3 scripts/extract_speaking_bank.py <deck.docx> <bank.md> data/speaking-bank.json

Both inputs are plain text containers (a docx is a zip of XML; the bank is
Markdown), so the script reads them with the standard library alone.
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path

REPO = "https://github.com/Oxidaner/ielts"

DECK_PATH = "口语/2025年9-12月口语Part2按四大类分类新题+保留题.docx"
BANK_PATH = "口语/神奇题库.md"

#: Rotation-status section headers of the deck.
STATUS_HEADERS = {"新题": "new", "保留题": "retained"}

#: Category section headers of the deck.
CATEGORY_HEADERS = {"人物": "person", "事物": "object", "事件": "event", "地点": "place"}

_SEASON = {
    "start": "2025-09-01",
    "end": "2025-12-31",
    "label": "2025年9-12月 (September-December 2025)",
}


def _docx_paragraphs(path: Path) -> list[str]:
    """Return the text of every `<w:p>` paragraph of a .docx package."""
    with zipfile.ZipFile(path) as bundle:
        xml = bundle.read("word/document.xml").decode("utf-8")
    paragraphs: list[str] = []
    for block in re.findall(r"<w:p[ >].*?</w:p>", xml, re.S):
        paragraphs.append("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", block)).strip())
    return paragraphs


def parse_deck(path: Path) -> list[dict[str, object]]:
    """Walk the deck's flat section structure and emit one record per cue card."""
    cards: list[dict[str, object]] = []
    status: str | None = None
    category: str | None = None
    pending_title: str | None = None
    for paragraph in _docx_paragraphs(path):
        text = paragraph.strip()
        if not text:
            continue
        if text in STATUS_HEADERS:
            status = STATUS_HEADERS[text]
            category = None
            pending_title = None
            continue
        if text in CATEGORY_HEADERS:
            category = CATEGORY_HEADERS[text]
            pending_title = None
            continue
        if text.lower().startswith("describe"):
            if status is None or category is None or pending_title is None:
                raise SystemExit(f"cue card without a classified section: {text[:60]!r}")
            cards.append({
                "id": f"sb-{len(cards) + 1:03d}",
                "titleZh": pending_title,
                "promptLine": " ".join(text.split()),
                "category": category,
                "status": status,
            })
            pending_title = None
            continue
        if text.lower().startswith("you should say") or re.fullmatch(r"[A-Za-z].*", text):
            continue  # prompt scaffolding or an English continuation line
        pending_title = text  # the Chinese short title that names the card
    return cards


def parse_bank(path: Path) -> dict[str, object]:
    """Parse the Markdown question bank: Part 1 topic sets and Part 2 cards."""
    part1: list[dict[str, object]] = []
    part2: list[dict[str, object]] = []
    part: str | None = None
    current: dict[str, object] | None = None
    in_part3 = False
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^### Part ([123])", line)
        if heading:
            part = heading.group(1)
            current = None
            in_part3 = False
            continue
        if part not in ("1", "2"):
            continue
        numbered = re.match(r"^(\d+)\.\s+\*\*(.+?)\*\*\s*$", line)
        if numbered:
            title = numbered.group(2).strip()
            if part == "1":
                current = {"id": f"p1-{numbered.group(1).zfill(2)}", "name": title, "questions": 0}
                part1.append(current)
            else:
                zh, _, en = title.partition(" (")
                title_en = en.rstrip(")").strip()
                if not title_en:
                    raise SystemExit(f"bank card without an English title: {zh!r}")
                current = {
                    "id": f"p2-{numbered.group(1).zfill(2)}",
                    "titleZh": zh.strip(),
                    "titleEn": title_en,
                    "followUps": 0,
                }
                part2.append(current)
                in_part3 = False
            continue
        if current is None:
            continue
        if re.match(r"^\s*-\s*Part\s*3", line):
            in_part3 = True
            continue
        bullet = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if not bullet:
            continue
        text = bullet.group(1)
        if part == "1" and not text.startswith("Part"):
            assert isinstance(current["questions"], int)
            current["questions"] += 1
        elif part == "2" and in_part3 and text.startswith(("Who", "What", "When", "Where", "Why", "How", "Do", "Does", "Is", "Are", "Should", "Can", "Will", "Would")):
            assert isinstance(current["followUps"], int)
            current["followUps"] += 1
    return {
        "part1": part1,
        "part2": part2,
        "part1QuestionCount": sum(int(item["questions"]) for item in part1),
        "part3FollowUps": sum(int(item["followUps"]) for item in part2),
    }


def cross_reference(deck: list[dict[str, object]], bank_part2: list[dict[str, object]]) -> dict[str, int]:
    """Count how many deck cards the bank also lists, by Chinese short title."""
    bank_titles = {str(card["titleZh"]) for card in bank_part2}
    matched = sum(1 for card in deck if str(card["titleZh"]) in bank_titles)
    return {"deckCards": len(deck), "bankCards": len(bank_part2), "titleMatches": matched}


def build(deck_path: Path, bank_path: Path) -> dict[str, object]:
    deck = parse_deck(deck_path)
    bank = parse_bank(bank_path)
    by_category = {name: 0 for name in CATEGORY_HEADERS.values()}
    by_status = {"new": 0, "retained": 0}
    for card in deck:
        by_category[str(card["category"])] += 1
        by_status[str(card["status"])] += 1
    return {
        "meta": {
            "name": "Speaking question-season structure, September-December 2025",
            "repository": REPO,
            "upstreamFiles": {"deck": DECK_PATH, "bank": BANK_PATH},
            "license": "unlicensed third-party study material; derived structure only",
            "attribution": "Deck and question bank compiled by the upstream study group.",
            "note": (
                "Cue-card prompt texts, 'you should say' bullets and model answers are not "
                "redistributed: cards are represented by their short titles and classification "
                "only. Titles are kept in the source language as identifiers."
            ),
        },
        "season": {
            **_SEASON,
            "rotation": (
                "The IELTS speaking bank rotates worldwide every January, May and September; "
                "within a season some cards are newly introduced and others are retained from "
                "the previous season, which is the distinction the upstream deck records."
            ),
        },
        "stats": {
            **cross_reference(deck, bank["part2"]),
            "byCategory": by_category,
            "byStatus": by_status,
            "part1Topics": len(bank["part1"]),
            "part1Questions": bank["part1QuestionCount"],
            "part3FollowUps": bank["part3FollowUps"],
        },
        "part1Topics": bank["part1"],
        "part2Cards": deck,
        "part2BankIndex": bank["part2"],
    }


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(f"usage: {argv[0]} <deck.docx> <bank.md> <output.json>", file=sys.stderr)
        return 2
    dataset = build(Path(argv[1]), Path(argv[2]))
    Path(argv[3]).write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stats = dataset["stats"]
    assert isinstance(stats, dict)
    print(
        f"speaking-bank: {stats['deckCards']} classified cards "
        f"({stats['titleMatches']} matched with the bank), {stats['part1Topics']} Part 1 topics, "
        f"{stats['part3FollowUps']} Part 3 follow-ups"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
