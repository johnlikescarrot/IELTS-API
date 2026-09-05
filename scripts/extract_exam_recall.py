#!/usr/bin/env python3
"""Build the exam-season recall index served by ielts-api.

The upstream collection (https://github.com/Oxidaner/ielts) is a self-study
archive of Chinese IELTS exam recall (机经) material: seasonal speaking banks,
recalled reading passages grouped by recurrence tier, recalled listening tests
with answer keys, and writing templates.  2,385 blobs, most of them PDFs and
audio.

This script reads four inputs and emits a curated, machine-readable index of
the collection's structure:

    python3 scripts/extract_exam_recall.py \\
        tree.json speaking-bank.md part2-categories.docx keys/ data/exam-recall.json

* ``tree.json`` — the GitHub tree listing of the upstream ``main`` branch.
* ``speaking-bank.md`` — the blob ``口语/神奇题库.md``: the seasonal Speaking
  Part 1 topics with their question counts.
* ``part2-categories.docx`` — the blob ``口语/2025年9-12月口语Part2按四大类分类
  新题+保留题.docx``: every Speaking Part 2 cue card of the season, classified
  (people / objects / events / places) and flagged new or retained.
* ``keys/`` — the six ``听力/听力/keys_*.txt`` answer-key blobs, one directory.

Only structure and metadata are published: item titles, counts, categories and
provenance.  No cue-card wording, question text, passage, transcript, audio or
answer value from the upstream collection is redistributed by this API.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
import zipfile
from pathlib import Path

REPO = "https://github.com/Oxidaner/ielts"

SPEAKING_BANK_PATH = "口语/神奇题库.md"
CUE_CARD_DOCX_PATH = "口语/2025年9-12月口语Part2按四大类分类新题+保留题.docx"
SPEAKING_SEASON = "2025-09/2025-12"

#: Recalled listening test sets that ship a machine-readable answer key.
LISTENING_SETS = (
    {"key": "keys_2.2.txt", "name": "TE2.2", "question": "听力/听力/2.2.pdf", "audio": "听力/听力/2.2音频/"},
    {"key": "keys_2.3.txt", "name": "TE2.3", "question": "听力/听力/2.3.pdf", "audio": "听力/听力/2.3音频/"},
    {"key": "keys_2.4.txt", "name": "TE2.4", "question": "听力/听力/2.4.pdf", "audio": "听力/听力/2.4音频/"},
    {"key": "keys_2.5.txt", "name": "TE2.5", "question": "听力/听力/2.5.pdf", "audio": "听力/听力/2.5音频/"},
    {"key": "keys_2.6.txt", "name": "TE2.6", "question": "听力/听力/2.6.pdf", "audio": "听力/听力/2.6音频/"},
    {
        "key": "keys_241123L.txt",
        "name": "241123L",
        "question": "听力/听力/241123L.pdf",
        "audio": "听力/听力/241123音频/",
    },
)

#: Reading collections: upstream directory name -> (index id, season label).
READING_COLLECTIONS = {
    "九月高频次": ("sept-2025", "2025-09"),
    "ZYZ老师文章合集（至10.1）[160篇]": ("zyz-oct-2025", "2025-10"),
    "ZYZ老师文章合集（至11.1）[182篇+32背景] [NOT FOR SALE]": ("zyz-nov-2025", "2025-11"),
    "ZYZ老师 高频+次高频文章(窦立盛+🕊️)": ("zyz-aug-2025", "2025-08"),
    "0.5.1 beta": ("beta-0-5-1", None),
}

#: Top-level upstream directory -> skill label for repository statistics.
DIRECTORY_SKILLS = {
    "作文": "writing",
    "口语": "speaking",
    "听力": "listening",
    "阅读": "reading",
    "经验": "experience",
}

CJK = r"㐀-䶿一-鿿豈-﫿＀-￯"
CJK_CHAR = re.compile(f"[{CJK}]")

#: Directory names that describe the collection's structure, not an article.
STRUCTURAL_DIR = re.compile(r"^(P\d|\d+\.|【)|高频|次高频|背景|文章|全部更新")

#: Noise markers stripped from article titles.
TITLE_NOISE = (
    re.compile(r"^【(高|次|高频|次高频)】"),
    re.compile(r"【(高|次|高频|次高频)】"),
    re.compile(r"[(（](躺|网页由[^)）]*制作|雅思哥下架)[)）]"),
    re.compile(r"\(?(SEVEN老师制作)\)?"),
    re.compile(r"[（(](\d{2}|\d{4})[.\-]\d{2}[)）]"),  # date markers like (0810) or （8.26）
    re.compile(r"[（(]\d+[)）]"),
    re.compile(r"^P\d\s*[-–]\s*"),
    re.compile(r"^\d+\.\s*"),
    re.compile(r"^\[Pretest\]\s*"),
    re.compile(r"\s*[✅✔]"),
    re.compile(r"_comprehensive_backup|_\w*_backup"),
)

CUE_STATUSES = {"新题": "new", "保留题": "retained"}
CUE_CATEGORIES = {"人物": "people", "事物": "objects", "事件": "events", "地点": "places"}


def slugify(value: str) -> str:
    """Turn a title into a short ASCII slug."""
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def source_url(path: str) -> str:
    """Public permalink of an upstream blob."""
    return f"{REPO}/blob/main/{urllib.parse.quote(path, safe='/')}"


def split_bilingual(title: str) -> tuple[str | None, str | None]:
    """Split a bilingual title into its English and Chinese parts."""
    title = title.strip(" -—–_")
    match = CJK_CHAR.search(title)
    if match is None:
        return (title or None, None)
    if match.start() == 0:
        return (None, title)
    english = title[: match.start()].strip(" -—–_()（）")
    chinese = title[match.start() :].strip(" -—–_")
    return (english or None, chinese or None)


def clean_article_title(raw: str) -> str:
    """Normalise an upstream article directory or file name into a title."""
    title = raw
    for pattern in TITLE_NOISE:
        title = pattern.sub("", title)
    title = title.replace("_", " ").replace("  ", " ")
    return re.sub(r"\s+", " ", title).strip(" -—–_")


def detect_part(path: str) -> int | None:
    """Detect the passage part (P1-P3) recorded in a reading path."""
    for segment in path.split("/"):
        match = re.search(r"P\s*([123])", segment)
        if match:
            return int(match.group(1))
    return None


def detect_tier(path: str, collection_dir: str) -> str | None:
    """Detect the recurrence tier (高频/次高频/背景) recorded in a reading path.

    Only the segments below the collection directory count: several collection
    names mention 高频 or 背景 themselves.
    """
    below = path.split(collection_dir, 1)[-1]
    if "次高频" in below:
        return "next"
    if "高频" in below:
        return "high"
    if "背景" in below:
        return "background"
    return None


def parse_speaking_bank(text: str) -> list[dict]:
    """Parse Part 1 topics and question counts out of the speaking bank."""
    topics = []
    current = None
    in_part1 = False
    for line in text.split("\n"):
        if line.startswith("### Part 1"):
            in_part1 = True
            continue
        if line.startswith("### Part 2"):
            in_part1 = False
        if not in_part1:
            continue
        heading = re.match(r"^\s*(\d+)\. \*\*(.+?)\*\*", line)
        if heading:
            if current is not None:
                topics.append(current)
            current = {"title": heading.group(2).strip(), "questions": 0}
        elif current is not None and re.match(r"^\s+- ", line):
            current["questions"] += 1
    if current is not None:
        topics.append(current)
    return topics


def docx_paragraphs(docx_path: Path) -> list[str]:
    """Extract non-empty paragraph texts from a .docx file (stdlib only)."""
    with zipfile.ZipFile(docx_path) as archive:
        xml = archive.read("word/document.xml").decode("utf-8")
    xml = re.sub(r"<w:p [^>]*>|<w:p>", "\n", xml)
    text = re.sub(r"<[^>]+>", "", xml)
    text = text.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    return [line.strip() for line in text.split("\n") if line.strip()]


def parse_cue_cards(docx_path: Path) -> list[dict]:
    """Parse the seasonal Part 2 cue cards: title, category and status."""
    cards = []
    status = None
    category = None
    for line in docx_paragraphs(docx_path):
        if line in CUE_STATUSES:
            status = CUE_STATUSES[line]
            continue
        if line in CUE_CATEGORIES:
            category = CUE_CATEGORIES[line]
            continue
        if line.startswith("Describe") or line.startswith("You should say"):
            continue
        if not CJK_CHAR.search(line):
            continue  # cue-card bullets ("Who he/she is", ...) are English lines
        if status is None or category is None:
            raise ValueError(f"cue card outside a section: {line!r}")
        cards.append({"title": line, "category": category, "status": status})
    return cards


def count_answers(key_text: str) -> int:
    """Count the numbered answers in a listening answer key."""
    return sum(1 for line in key_text.split("\n") if line.strip()[:1].isdigit())


def build_speaking_items(
    bank_text: str, bank_blob: dict, cue_cards: list[dict], docx_blob: dict
) -> tuple[list[dict], dict]:
    """Build the speaking items and their aggregate statistics."""
    items = []
    part1_topics = parse_speaking_bank(bank_text)
    for number, topic in enumerate(part1_topics, start=1):
        title = topic["title"]
        items.append(
            {
                "id": f"sp1-{number:02d}-{slugify(title)}",
                "kind": "speaking-topic",
                "skill": "speaking",
                "title": title,
                "titleEn": title,
                "titleZh": None,
                "part": 1,
                "tier": None,
                "category": None,
                "status": None,
                "collection": "speaking-bank",
                "season": SPEAKING_SEASON,
                "questions": topic["questions"],
                "sourcePath": SPEAKING_BANK_PATH,
                "sha1": bank_blob.get("sha"),
                "sizeBytes": bank_blob.get("size"),
                "sourceUrl": source_url(SPEAKING_BANK_PATH),
            }
        )
    for number, card in enumerate(cue_cards, start=1):
        english, chinese = split_bilingual(card["title"])
        items.append(
            {
                "id": f"sp2-{number:03d}",
                "kind": "speaking-cue-card",
                "skill": "speaking",
                "title": card["title"],
                "titleEn": english,
                "titleZh": chinese if chinese is not None else card["title"],
                "part": 2,
                "tier": None,
                "category": card["category"],
                "status": card["status"],
                "collection": "part2-categories",
                "season": SPEAKING_SEASON,
                "questions": None,
                "sourcePath": CUE_CARD_DOCX_PATH,
                "sha1": docx_blob.get("sha"),
                "sizeBytes": docx_blob.get("size"),
                "sourceUrl": source_url(CUE_CARD_DOCX_PATH),
            }
        )
    bank_cards, bank_part3 = count_bank_cards(bank_text)
    stats = {
        "part1Topics": len(part1_topics),
        "part1Questions": sum(topic["questions"] for topic in part1_topics),
        "cueCards": len(cue_cards),
        "cueCardsNew": sum(1 for card in cue_cards if card["status"] == "new"),
        "cueCardsRetained": sum(1 for card in cue_cards if card["status"] == "retained"),
        "cueCardsByCategory": {},
        "bankCueCards": bank_cards,
        "bankPart3Questions": bank_part3,
    }
    for card in cue_cards:
        category = card["category"]
        stats["cueCardsByCategory"][category] = stats["cueCardsByCategory"].get(category, 0) + 1
    stats["cueCardsByCategory"] = dict(sorted(stats["cueCardsByCategory"].items()))
    return items, stats


def count_bank_cards(bank_text: str) -> tuple[int, int]:
    """Count the cue cards and Part 3 follow-ups published in the speaking bank."""
    part2 = bank_text[bank_text.find("### Part 2") :]
    blocks = [block for block in re.split(r"\n(?=\d+\. \*\*)", part2) if re.match(r"\d+\. \*\*", block)]
    part3_questions = 0
    for block in blocks:
        marker = block.find("- Part 3")
        if marker < 0:
            continue
        part3_questions += len(re.findall(r"(?m)^\s+- ", block[marker:]))
    return len(blocks), part3_questions


def article_title(path: str, collection_dir: str) -> str:
    """Derive a readable article title from an upstream HTML path.

    Prefers the file stem unless the enclosing article directory carries a
    bilingual (English + Chinese) title, which the stem often drops.
    """
    stem = path.rsplit("/", 1)[-1][: -len(".html")]
    parent = path.rsplit("/", 2)[-2]
    stem_title = clean_article_title(stem)
    if CJK_CHAR.search(stem_title):
        return stem_title
    if parent != collection_dir:
        parent_title = clean_article_title(parent)
        if not STRUCTURAL_DIR.search(parent_title) and CJK_CHAR.search(parent_title):
            if re.search(r"[A-Za-z]{2}", parent_title):
                return parent_title
    return stem_title


def build_reading_items(tree: list[dict]) -> tuple[list[dict], dict]:
    """Index every recalled reading passage by structure (never by content)."""
    blobs_by_path = {blob["path"]: blob for blob in tree}
    counters: dict[tuple[str, int], int] = {}
    backups = 0
    non_articles = 0
    items = []
    for blob in sorted(tree, key=lambda entry: entry["path"]):
        path = blob["path"]
        if not path.startswith("阅读/") or not path.lower().endswith(".html"):
            continue
        directory = path.split("/")[1]
        if directory not in READING_COLLECTIONS:
            continue
        if "_backup" in path.lower():
            backups += 1
            continue
        part = detect_part(path)
        if part is None:
            non_articles += 1
            continue
        collection, season = READING_COLLECTIONS[directory]
        key = (collection, part)
        counters[key] = counters.get(key, 0) + 1
        title = article_title(path, directory)
        english, chinese = split_bilingual(title)
        items.append(
            {
                "id": f"rd-{collection.replace('-', '')}-p{part}-{counters[key]:03d}",
                "kind": "reading-article",
                "skill": "reading",
                "title": title,
                "titleEn": english,
                "titleZh": chinese,
                "part": part,
                "tier": detect_tier(path, directory),
                "category": None,
                "status": None,
                "collection": collection,
                "season": season,
                "questions": None,
                "sourcePath": path,
                "sha1": blob.get("sha"),
                "sizeBytes": blob.get("size"),
                "sourceUrl": source_url(path),
            }
        )

    by_part: dict[str, int] = {}
    by_tier: dict[str, int] = {}
    by_collection: dict[str, int] = {}
    for item in items:
        part_key = str(item["part"])
        by_part[part_key] = by_part.get(part_key, 0) + 1
        tier = item["tier"] or "unrated"
        by_tier[tier] = by_tier.get(tier, 0) + 1
        collection = item["collection"]
        by_collection[collection] = by_collection.get(collection, 0) + 1
    stats = {
        "articles": len(items),
        "backupFilesExcluded": backups,
        "nonArticleFilesExcluded": non_articles,
        "byPart": dict(sorted(by_part.items())),
        "byTier": dict(sorted(by_tier.items())),
        "byCollection": dict(sorted(by_collection.items())),
    }
    return items, stats


def build_listening_items(keys_dir: Path, tree: list[dict]) -> tuple[list[dict], dict]:
    """Index the recalled listening test sets that ship machine-readable keys."""
    blobs_by_path = {blob["path"]: blob for blob in tree}
    items = []
    answers_total = 0
    audio_total = 0
    for spec in LISTENING_SETS:
        key_path = keys_dir / spec["key"]
        answers = count_answers(key_path.read_text(encoding="utf-8"))
        answers_total += answers
        audio_files = [
            blob
            for blob in tree
            if blob["path"].startswith(spec["audio"]) and blob["path"].lower().endswith(".mp3")
        ]
        audio_total += len(audio_files)
        question = blobs_by_path.get(spec["question"])
        if question is None:
            raise ValueError(f"question paper not found upstream: {spec['question']}")
        slug = slugify(spec["name"])
        items.append(
            {
                "id": f"ls-{slug}",
                "kind": "listening-test",
                "skill": "listening",
                "title": f"Recalled listening test {spec['name']}",
                "titleEn": spec["name"],
                "titleZh": None,
                "part": None,
                "tier": None,
                "category": None,
                "status": None,
                "collection": "listening-recall-2025",
                "season": None,
                "questions": answers,
                "sourcePath": spec["question"],
                "sha1": question.get("sha"),
                "sizeBytes": question.get("size"),
                "sourceUrl": source_url(spec["question"]),
            }
        )
    stats = {"testSets": len(items), "answers": answers_total, "audioTracks": audio_total}
    return items, stats


def repository_stats(tree: list[dict]) -> dict:
    """Whole-repository structure: size, format mix and skill mix."""
    total_bytes = 0
    by_skill: dict[str, int] = {}
    by_format: dict[str, int] = {}
    for blob in tree:
        path = blob["path"]
        size = blob.get("size") or 0
        total_bytes += size
        top = path.split("/")[0]
        skill = DIRECTORY_SKILLS.get(top, "general") if "/" in path else "general"
        by_skill[skill] = by_skill.get(skill, 0) + 1
        extension = Path(path).suffix.lower().lstrip(".") or "none"
        by_format[extension] = by_format.get(extension, 0) + 1
    return {
        "filesInRepository": len(tree),
        "totalBytes": total_bytes,
        "bySkill": dict(sorted(by_skill.items())),
        "byFormat": dict(sorted(by_format.items(), key=lambda kv: (-kv[1], kv[0]))),
    }


def build(tree_path: Path, bank_path: Path, docx_path: Path, keys_dir: Path) -> dict:
    """Assemble the complete exam-recall index."""
    document = json.loads(tree_path.read_text(encoding="utf-8"))
    tree = [entry for entry in document["tree"] if entry.get("type") == "blob"]
    blobs_by_path = {blob["path"]: blob for blob in tree}
    bank_blob = blobs_by_path[SPEAKING_BANK_PATH]
    docx_blob = blobs_by_path[CUE_CARD_DOCX_PATH]

    bank_text = bank_path.read_text(encoding="utf-8")
    cue_cards = parse_cue_cards(docx_path)
    speaking_items, speaking_stats = build_speaking_items(bank_text, bank_blob, cue_cards, docx_blob)
    reading_items, reading_stats = build_reading_items(tree)
    listening_items, listening_stats = build_listening_items(keys_dir, tree)

    items = sorted(speaking_items + reading_items + listening_items, key=lambda item: item["id"])
    if len({item["id"] for item in items}) != len(items):
        raise ValueError("duplicate item identifiers generated")

    indexed = {
        "speaking": sum(1 for item in items if item["skill"] == "speaking"),
        "reading": sum(1 for item in items if item["skill"] == "reading"),
        "listening": sum(1 for item in items if item["skill"] == "listening"),
    }
    return {
        "meta": {
            "name": "IELTS exam-season recall index",
            "repository": REPO,
            "commit": document.get("sha"),
            "license": "CC BY 4.0",
            "attribution": f"Structure and metadata index of the self-study recall collection {REPO}.",
            "note": (
                "Only structure and metadata are published: titles, counts, categories and "
                "provenance. Cue-card wording, question text, passages, transcripts, audio and "
                "answer values from the upstream collection are not redistributed by this API."
            ),
        },
        "stats": {
            "indexedItems": len(items),
            "bySkill": indexed,
            "repository": repository_stats(tree),
            "speaking": speaking_stats,
            "reading": reading_stats,
            "listening": listening_stats,
        },
        "items": items,
    }


def main(argv: list[str]) -> int:
    """CLI entry point."""
    if len(argv) != 6:
        print(
            f"usage: {argv[0]} <tree.json> <speaking-bank.md> <part2.docx> <keys-dir> <output.json>",
            file=sys.stderr,
        )
        return 2
    index = build(Path(argv[1]), Path(argv[2]), Path(argv[3]), Path(argv[4]))
    output = Path(argv[5])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    stats = index["stats"]
    print(
        f"wrote {output} ({stats['indexedItems']} items indexed: "
        f"{stats['bySkill']['speaking']} speaking, {stats['bySkill']['reading']} reading, "
        f"{stats['bySkill']['listening']} listening)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
