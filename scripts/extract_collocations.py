#!/usr/bin/env python3
"""Extract the Speaking argumentative collocation bank for ielts-api.

The upstream self-study collection (https://github.com/Oxidaner/ielts) ships
``口语/口语part 3方法论.md``: personal notes on how to argue an IELTS
Speaking Part 3 answer.  Part I of the note ("分维度讨论思路") organises
several hundred English collocations and sentence frames by argumentative
dimension - personality types, emotional value, money, time, past-versus-
present comparisons, either-or questions, specific groups, transferable
skills, traditional items, nature and nurture, culture.  Part II is a set of
model Part 2 answers; it is prose and is **not** extracted.

This script parses Part I only and emits:

* the English collocations and frames, each tagged with its argumentative
  dimension, sub-group, polarity (positive / negative / neutral) and the
  Chinese gloss published in the note,
* a dimension catalogue recording the source heading each dimension comes
  from,
* aggregate statistics.

The extraction is deterministic: the same note always yields the same
dataset.  The phrases are short common English collocations; their selection,
grouping and glossing are the upstream author's work and are credited as
such.  No sentence of the upstream model answers is redistributed.

Usage:

    python3 scripts/extract_collocations.py 口语part\\ 3方法论.md \\
        data/collocations.json
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = "https://github.com/Oxidaner/ielts"
COMMIT = "738c60828118f8f9d720e548b73245dd0fe70a30"
SOURCE_PATH = "口语/口语part 3方法论.md"
SOURCE_URL = f"{REPO}/blob/{COMMIT}/{SOURCE_PATH.replace(' ', '%20')}"

#: Heading rules: (heading pattern, dimension id, default group).  `###`
#: sections and `####` subsections both introduce dimensions.
DIMENSION_RULES: list[tuple[str, str, str]] = [
    (r"按性格划分", "personality", "opener"),
    (r"情绪价值", "emotional-value", "keywords"),
    (r"金钱相关", "money", "extension"),
    (r"时间相关", "time", "extension"),
    (r"金钱与时间维度", "money-time", "extension"),
    (r"经济发展角度", "economy-then-now", "advantages"),
    (r"技术创新角度", "technology-then-now", "progress"),
    (r"古今对比", "then-now", "comparison"),
    (r"二选一问题", "either-or", "frames"),
    (r"孩子", "children", "needs"),
    (r"父母", "parents", "roles"),
    (r"老师", "teachers", "traits"),
    (r"特定群体分析", "groups", "general"),
    (r"万能技能法", "skills", "overview"),
    (r"传统物品", "traditional-items", "keywords"),
    (r"先天与后天", "nature-and-nurture", "nature"),
    (r"文化\s*/\s*节日\s*/\s*传统", "culture", "keywords"),
    (r"重要性题目", "importance", "ideas"),
    (r"其他核心角度", "other-angles", "general"),
]

#: Dimensions that only introduce subsections and never hold phrases.
HEADING_ONLY = {"money-time", "then-now", "groups", "other-angles", "importance"}

#: Bold labels used inside bullets, mapped to (group, polarity).  The labels
#: 特征/行为/感受 are shared by both personality types and are resolved
#: against the current personality context at parse time.
LABELS: dict[str, tuple[str, str]] = {
    "内向型人": ("introverted", "neutral"),
    "外向型人": ("extroverted", "neutral"),
    "特征": ("traits", "neutral"),
    "行为": ("behaviour", "neutral"),
    "感受": ("feelings", "neutral"),
    "核心关键词": ("keywords", "neutral"),
    "正面情绪": ("positive-emotions", "positive"),
    "负面情绪": ("negative-emotions", "negative"),
    "常用表达": ("frames", "neutral"),
    "负面": ("negative", "negative"),
    "正面": ("positive", "positive"),
    "延伸": ("extension", "neutral"),
    "优势": ("advantages", "positive"),
    "问题": ("problems", "negative"),
    "进步": ("progress", "positive"),
    "思路": ("frames", "neutral"),
    "缺点": ("drawbacks", "negative"),
    "优点": ("strengths", "positive"),
    "需求": ("needs", "neutral"),
    "角色": ("roles", "neutral"),
    "特点": ("traits", "neutral"),
    "作用": ("contribution", "neutral"),
    "关键词": ("keywords", "neutral"),
    "先天": ("nature", "neutral"),
    "后天": ("nurture", "neutral"),
}

#: Groups whose entries are sentence frames rather than collocations.
FRAME_GROUPS = {"opener", "frames"}

#: A phrase token: English text with an optional Chinese gloss in full- or
#: half-width parentheses.  Half-width punctuation appears inside sentence
#: frames (`Well, it really depends on ...`), never as a list separator.
TOKEN = re.compile(
    r"^(?P<phrase>[A-Za-z][A-Za-z0-9'’\-… \t/().,?!]*?)"
    r"(?:[（(](?P<gloss>[^（）()]*)[）)])?[，。:：\s]*$"
)

#: Numbered skill family: `1. **Time-management skills**（时间管理能力）：phrases`.
SKILL_ITEM = re.compile(
    r"^\d+\.\s+\*\*(?P<name>[^*]+)\*\*\s*[（(][^（）()]*[）)]\s*[：:]\s*(?P<rest>.+)$"
)

#: Human-readable labels for the dimension catalogue.
DIMENSION_LABELS = {
    "personality": "Personality types",
    "emotional-value": "Emotional value",
    "money": "Money",
    "time": "Time",
    "economy-then-now": "Economy, past and present",
    "technology-then-now": "Technology, past and present",
    "either-or": "Either-or questions",
    "children": "Children",
    "parents": "Parents",
    "teachers": "Teachers",
    "skills": "Transferable skills",
    "traditional-items": "Traditional items",
    "nature-and-nurture": "Nature and nurture",
    "culture": "Culture, festivals and traditions",
}

#: One-line description of what each dimension argues about.
DIMENSION_DESCRIPTIONS = {
    "personality": "Arguing by personality type: what introverted and extroverted people are like, do and feel.",
    "emotional-value": "Emotional value and support, positive and negative emotions, and the frames that express them.",
    "money": "Cost and value: negative, positive and extended money collocations.",
    "time": "Time budgeting: negative, positive and extended time collocations.",
    "economy-then-now": "Comparing past and present through economic development.",
    "technology-then-now": "Comparing past and present through technological change.",
    "either-or": "Frames for questions that offer two alternatives.",
    "children": "Discussing children: drawbacks, strengths and needs.",
    "parents": "The roles parents play in an argument.",
    "teachers": "The traits and the contribution of teachers.",
    "skills": "Transferable skills invoked as a universal angle, one group per skill family.",
    "traditional-items": "Traditional objects and the meanings attached to them.",
    "nature-and-nurture": "Innate traits versus upbringing.",
    "culture": "Culture, festivals and traditions.",
}


def split_phrases(text: str) -> list[tuple[str, str | None]]:
    """Split a labelled list into ``(phrase, gloss)`` pairs."""
    pairs: list[tuple[str, str | None]] = []
    for token in re.split(r"[、；;]", text):
        token = token.strip()
        if token == "":
            continue
        # Trailing `-- ...` annotations belong to the note, not the phrase.
        token = re.split(r"\s+--\s+", token, maxsplit=1)[0].strip()
        match = TOKEN.match(token)
        if match is None:
            continue
        phrase = match.group("phrase").strip()
        gloss = match.group("gloss")
        if len(phrase) < 2 or not re.search(r"[A-Za-z]{2}", phrase.replace(" ", "")):
            continue
        pairs.append((phrase, gloss.strip() if gloss else None))
    return pairs


def normalise_label(text: str) -> str:
    """Reduce a bold label to its bare Chinese keyword."""
    label = text.replace("*", "").strip()
    label = re.sub(r"[（(][^（）()]*[）)]\s*$", "", label).strip()
    return label


def parse(note: str) -> tuple[list[dict], list[dict]]:
    """Parse the methodology note into a dimension catalogue and entries."""
    # Part I of the note only, bounded by the two top-level part headings.
    start = note.find("## 一、")
    end = note.find("# 二、")
    body = note[start : end if end > start else len(note)]

    dimension = "personality"
    group = "opener"
    polarity = "neutral"
    context = ""
    kind = "frame"
    dimensions: dict[str, dict] = {}
    items: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    def apply_label(label: str) -> bool:
        """Apply a bold label to the parser state; returns whether it matched."""
        nonlocal group, polarity, context, kind
        if label not in LABELS:
            return False
        mapped, mark = LABELS[label]
        if dimension == "personality" and label in {"内向型人", "外向型人"}:
            context = mapped
        if dimension == "personality" and label in {"特征", "行为", "感受"} and context:
            group = f"{context}-{mapped}"
        else:
            group = mapped
        polarity = mark
        kind = "frame" if group in FRAME_GROUPS else "collocation"
        return True

    def add(phrase: str, gloss: str | None, *, force_kind: str | None = None) -> None:
        """Record one phrase unless its dimension is heading-only or a repeat."""
        if dimension in HEADING_ONLY:
            return
        key = (dimension, group, phrase.lower())
        if key in seen:
            return
        seen.add(key)
        items.append(
            {
                "id": f"c{len(items) + 1:04d}",
                "phrase": phrase,
                "gloss": gloss,
                "dimension": dimension,
                "group": group if group else "general",
                "polarity": polarity,
                "kind": force_kind if force_kind is not None else kind,
            }
        )

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if line == "":
            continue

        if line.startswith("#"):
            for pattern, dim, default_group in DIMENSION_RULES:
                if re.search(pattern, line):
                    dimension = dim
                    group = default_group
                    polarity = "neutral"
                    kind = "frame" if default_group in FRAME_GROUPS else "collocation"
                    if dim not in HEADING_ONLY and dim not in dimensions:
                        dimensions[dim] = {"id": dim, "source": line.lstrip("# ").strip()}
                    break
            continue

        # Numbered skill families name their group and list phrases inline.
        skill = SKILL_ITEM.match(line)
        if skill is not None and dimension == "skills":
            name = skill.group("name").strip()
            group = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
            polarity = "neutral"
            kind = "collocation"
            for phrase, gloss in split_phrases(skill.group("rest")):
                add(phrase, gloss)
            continue

        content = re.sub(r"^\d+\.\s+", "", line).lstrip("- ").strip()
        label_part, separator, rest = content.partition("：")
        if not separator:
            label_part, separator, rest = content.partition(":")

        label = normalise_label(label_part)
        if separator and apply_label(label):
            for phrase, gloss in split_phrases(rest):
                add(phrase, gloss)
            continue

        # Standalone bold lines: either a bare group header or a full frame.
        text = content.replace("**", "").strip()
        if separator and normalise_label(text) in LABELS and normalise_label(text) != label:
            apply_label(normalise_label(text))
            continue
        if not separator and label in LABELS:
            apply_label(label)
            continue
        for phrase, gloss in split_phrases(text):
            add(phrase, gloss, force_kind="frame" if not separator else None)

    catalogue = [
        {
            "id": entry["id"],
            "label": DIMENSION_LABELS.get(entry["id"], entry["id"]),
            "description": DIMENSION_DESCRIPTIONS.get(entry["id"], ""),
            "source": entry["source"],
        }
        for entry in dimensions.values()
    ]
    return catalogue, items


def build_stats(items: list[dict]) -> dict[str, object]:
    """Aggregate the phrase bank into dataset statistics."""

    def count(field: str) -> dict[str, int]:
        totals: dict[str, int] = {}
        for item in items:
            key = str(item[field])
            totals[key] = totals.get(key, 0) + 1
        return dict(sorted(totals.items()))

    return {
        "phrases": len(items),
        "distinctPhrases": len({item["phrase"].lower() for item in items}),
        "glossedPhrases": sum(1 for item in items if item["gloss"] is not None),
        "dimensions": len({item["dimension"] for item in items}),
        "byDimension": count("dimension"),
        "byPolarity": count("polarity"),
        "byKind": count("kind"),
    }


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(f"usage: extract_collocations.py {SOURCE_PATH} data/collocations.json", file=sys.stderr)
        return 2
    note = Path(argv[0]).read_text(encoding="utf-8")
    dimensions, items = parse(note)
    dataset = {
        "meta": {
            "name": "IELTS Speaking argumentative collocation bank",
            "source": SOURCE_PATH,
            "sourceUrl": SOURCE_URL,
            "repository": REPO,
            "commit": COMMIT,
            "license": "CC BY 4.0",
            "attribution": f"Collocations and glosses selected and organised in the self-study notes at {SOURCE_URL}; re-published with attribution.",
            "note": "Short common English collocations and sentence frames only, extracted from Part I of the upstream note. The upstream model answers are not redistributed.",
            "extraction": "Deterministic parse of Part I (分维度讨论思路) of the upstream note; every phrase keeps its upstream Chinese gloss, argumentative dimension, sub-group, polarity and kind.",
        },
        "dimensions": dimensions,
        "stats": build_stats(items),
        "items": items,
    }
    Path(argv[1]).write_text(
        json.dumps(dataset, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(f"extracted {len(items)} phrases across {len(dimensions)} dimensions into {argv[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
