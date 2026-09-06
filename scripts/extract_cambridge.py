#!/usr/bin/env python3
"""Build the Cambridge IELTS test-structure index served by ielts-api at `/v1/cambridge`.

The upstream collection (https://github.com/wanli4473/yysd-testcenter) is the
content library of a Chinese online mock-exam centre. Among its 3,700 files
are 222 self-grading HTML pages that re-typeset the Cambridge IELTS 3-21
Academic tests - 76 reading tests, 72 listening tests and 74 writing tests -
each carrying a structured ``TEST`` object (passages, question groups, answer
keys, audio cue points, writing prompts) and two editorial taxonomies that
tag every question group with a question type, a topic scene and a
difficulty. All of it is third-party copyrighted material with no licence, so
this script publishes **derived, non-substitutive metadata and statistics
only**: no passage, question, answer key, prompt text, image or audio is
redistributed.

What the index adds over the upstream pages:

* a canonical test catalogue: one record per Cambridge test and skill,
  volumes 3-21, with stable identifiers (``cam-10-t1-reading``);
* the question-group structure of every reading and listening test - number
  range, canonical question type (mapped from the upstream ``kind`` plus the
  instruction wording onto the same 13-type taxonomy as the practice-test
  index), the word-limit rule, and the answer-form distribution (letter,
  word, number, ...);
* passage-level readability statistics computed with exactly the formulas of
  ``scripts/extract_practice_tests.py`` so that the three text families of the
  API stay comparable, plus paragraph counts and lettering;
* section-level listening audio durations recovered from the cue points;
* the writing tasks classified by Task 1 visual family and Task 2 question
  family, with prompt lengths;
* the upstream editorial scene and difficulty labels, translated onto English
  slugs, with the agreement rate between the upstream question-type labels
  and this derivation reported as a statistic rather than hidden.

Usage (a source checkout is required):

    curl -sL "https://api.github.com/repos/wanli4473/yysd-testcenter/git/trees/<sha>?recursive=1" \\
        -o tree.json
    python3 scripts/extract_cambridge.py tree.json ./upstream data/cambridge.json

Only ``library/mock/cambridge-*/*.html`` and ``library/*-taxonomy.json`` are
read from the checkout; CI downloads exactly those blobs by SHA and re-derives
the index byte-identically. Standard library only.
"""

from __future__ import annotations

import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import quote

# `readability` implements exactly the statistics published by the
# practice-test and archive indexes; importing it keeps the datasets comparable.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_practice_tests import readability, strip_markup  # noqa: E402

REPO = "https://github.com/wanli4473/yysd-testcenter"

#: Upstream directory -> skill.
SKILL_DIRS = {
    "library/mock/cambridge-reading": "reading",
    "library/mock/cambridge-listening": "listening",
    "library/mock/cambridge-writing": "writing",
}
TAXONOMY_FILES = {
    "reading": "library/reading-taxonomy.json",
    "listening": "library/listening-taxonomy.json",
}

FILE_RE = re.compile(r"^cambridge-(\d+)-test-(\d)(?:-reading|-writing)?\.html$")
TAG_RE = re.compile(r"<[^>]+>")
PARA_LABEL_RE = re.compile(
    r"^\s*(?:<(?:strong|b|span)[^>]*>\s*)?([A-N])(?:\s*</(?:strong|b|span)>)?(?=\s|$|&nbsp;|[A-Z][a-z])"
)
QUESTION_MARK_RE = re.compile(r"\?")
WORD_LIMIT_RE = re.compile(
    r"(NO MORE THAN (?:ONE|TWO|THREE) WORDS?(?: AND/OR A NUMBER)?(?: OR A NUMBER)?"
    r"|ONE WORD(?: AND/OR A NUMBER| ONLY)?"
    r"|(?:ONE|TWO|THREE|FOUR|FIVE) LETTERS?)"
)

#: Upstream scene labels -> English slugs. Listening and reading use separate
#: vocabularies upstream; the two mappings are kept apart so a label is never
#: silently reinterpreted across skills.
LISTENING_SCENES = {
    "求职": "job-seeking",
    "经营管理": "business-and-management",
    "地理": "geography",
    "旅游": "travel-and-tourism",
    "日常生活": "daily-life",
    "建筑环境": "built-environment",
    "健康医疗": "health-and-medicine",
    "住宿": "accommodation",
    "运动": "sport",
    "图书馆": "library-services",
    "保险": "insurance",
    "新生入学": "university-orientation",
    "作业讨论": "assignment-discussion",
    "人文社科": "humanities-and-social-science",
    "生物": "biology",
    "课题研究": "research-project",
}
READING_SCENES = {
    "历史发展": "history",
    "自然科技": "science-and-technology",
    "社会人文": "society-and-humanities",
    "生态环保": "ecology-and-environment",
    "语言教育": "language-and-education",
    "生物研究": "biology",
    "财经商业": "business-and-economics",
    "医疗健康": "health-and-medicine",
}
DIFFICULTIES = {"易": "easy", "中": "medium", "难": "hard"}

#: Upstream editorial question-type labels -> canonical ids (for the agreement
#: statistic; the published type is always this script's own derivation).
UPSTREAM_TYPES = {
    "填空题": "completion",
    "配对题": "matching",
    "单选题": "multiple-choice",
    "多选题": "multiple-choice-multiple-answer",
    "地图题": "diagram-label-completion",
    "流程题": "summary-completion",
    "简答题": "short-answer",
    "总结题": "summary-completion",
    "判断题": "true-false-not-given",
    "段落匹配题": "matching-information",
    "细节匹配题": "matching-features",
    "选段意题": "matching-headings",
}
#: Canonical ids that count as agreeing with a coarse upstream label.
UPSTREAM_TYPE_FAMILIES = {
    "completion": {"sentence-completion", "summary-completion", "diagram-label-completion", "short-answer"},
    "matching": {
        "matching", "matching-information", "matching-headings", "matching-features",
        "matching-sentence-endings",
    },
    "true-false-not-given": {"true-false-not-given", "yes-no-not-given"},
}

#: Task 1 visual families, tested in order against the prompt text.
TASK1_FAMILIES = [
    ("map", r"\b(maps?|plans?|site|layout)\b"),
    ("process-diagram", r"\b(diagrams?|process|stages?|life cycle|how .* (is|are) (made|produced|manufactured|recycled))\b"),
    ("table", r"\btables?\b"),
    ("pie-chart", r"\bpie charts?\b"),
    ("bar-chart", r"\bbar (charts?|graphs?)\b"),
    ("line-graph", r"\b(line graphs?|graphs?)\b"),
    ("chart", r"\bcharts?\b"),
]
ANSWER_LETTER_RE = re.compile(r"^[A-Za-z]$")
ANSWER_ROMAN_RE = re.compile(r"^(?=[ivx]+$)i{0,3}(?:v|x|iv|ix)?i{0,3}$", re.IGNORECASE)
ANSWER_TFNG_RE = re.compile(r"^(TRUE|FALSE|NOT GIVEN|YES|NO)$", re.IGNORECASE)
ANSWER_NUMBER_RE = re.compile(r"^[\d.,:%$£€/-]+$")


# --------------------------------------------------------------------------- #
# A tolerant reader for the upstream JavaScript object literals               #
# --------------------------------------------------------------------------- #


class LiteralParser:
    """Parse the JavaScript object literal assigned to ``const TEST``.

    The pages were typeset by hand over several months and the literal comes
    in every dialect a human writes: strict JSON, unquoted keys, single-quoted
    and template strings, block and line comments, trailing commas and
    ``'a' + 'b'`` concatenations. Only data forms are accepted - the first
    identifier or ``${`` expression raises, so nothing is ever evaluated.
    """

    NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?")
    IDENT_RE = re.compile(r"[A-Za-z_$][\w$]*")
    KEY_RE = re.compile(r"[A-Za-z_$][\w$]*|\d+")
    ESCAPES = {"n": "\n", "t": "\t", "r": "\r", "b": "\b", "f": "\f", "v": "\v", "0": "\0"}

    def __init__(self, text: str, position: int) -> None:
        self.text = text
        self.pos = position

    def skip(self) -> None:
        """Skip whitespace and comments."""
        text = self.text
        while self.pos < len(text):
            if text[self.pos] in " \t\r\n":
                self.pos += 1
            elif text.startswith("//", self.pos):
                end = text.find("\n", self.pos)
                self.pos = len(text) if end < 0 else end
            elif text.startswith("/*", self.pos):
                self.pos = text.index("*/", self.pos) + 2
            else:
                break

    def value(self) -> Any:
        """Parse one value."""
        self.skip()
        char = self.text[self.pos]
        if char == "{":
            return self.obj()
        if char == "[":
            return self.arr()
        if char in "\"'`":
            return self.string()
        match = self.NUMBER_RE.match(self.text, self.pos)
        if match:
            self.pos = match.end()
            raw = match.group(0)
            return float(raw) if re.search(r"[.eE]", raw) else int(raw)
        match = self.IDENT_RE.match(self.text, self.pos)
        if match:
            word = match.group(0)
            self.pos = match.end()
            if word in ("true", "false"):
                return word == "true"
            if word in ("null", "undefined"):
                return None
        raise ValueError(f"unsupported token at offset {self.pos}: {self.text[self.pos:self.pos + 40]!r}")

    def string(self) -> str:
        """Parse a quoted or template string, including ``+`` concatenations."""
        text = self.text
        quote_char = text[self.pos]
        self.pos += 1
        out: list[str] = []
        while True:
            char = text[self.pos]
            if char == "\\":
                nxt = text[self.pos + 1]
                self.pos += 2
                if nxt == "u":
                    out.append(chr(int(text[self.pos:self.pos + 4], 16)))
                    self.pos += 4
                elif nxt == "x":
                    out.append(chr(int(text[self.pos:self.pos + 2], 16)))
                    self.pos += 2
                elif nxt == "\n":
                    continue
                else:
                    out.append(self.ESCAPES.get(nxt, nxt))
            elif char == quote_char:
                self.pos += 1
                break
            elif quote_char == "`" and text.startswith("${", self.pos):
                raise ValueError(f"template expression at offset {self.pos}")
            else:
                out.append(char)
                self.pos += 1
        result = "".join(out)
        self.skip()
        if self.pos < len(text) and text[self.pos] == "+":
            self.pos += 1
            self.skip()
            return result + self.string()
        return result

    def obj(self) -> dict[str, Any]:
        """Parse an object literal."""
        self.pos += 1
        result: dict[str, Any] = {}
        while True:
            self.skip()
            if self.text[self.pos] == "}":
                self.pos += 1
                return result
            if self.text[self.pos] in "\"'":
                key = self.string()
            else:
                match = self.KEY_RE.match(self.text, self.pos)
                if match is None:
                    raise ValueError(f"bad key at offset {self.pos}")
                key = match.group(0)
                self.pos = match.end()
            self.skip()
            if self.text[self.pos] != ":":
                raise ValueError(f"expected ':' at offset {self.pos}")
            self.pos += 1
            result[key] = self.value()
            self.skip()
            if self.text[self.pos] == ",":
                self.pos += 1

    def arr(self) -> list[Any]:
        """Parse an array literal."""
        self.pos += 1
        result: list[Any] = []
        while True:
            self.skip()
            if self.text[self.pos] == "]":
                self.pos += 1
                return result
            result.append(self.value())
            self.skip()
            if self.text[self.pos] == ",":
                self.pos += 1


def read_test_object(html: str) -> dict[str, Any] | None:
    """Return the ``TEST`` literal of an upstream page, or ``None`` if absent."""
    match = re.search(r"\b(?:const|var|let)\s+TEST\s*=\s*", html)
    if match is None:
        return None
    parsed = LiteralParser(html, match.end()).value()
    return parsed if isinstance(parsed, dict) else None


# --------------------------------------------------------------------------- #
# Classification                                                              #
# --------------------------------------------------------------------------- #


def plain(text: object) -> str:
    """Strip markup from an instruction or prompt and collapse whitespace."""
    return strip_markup(str(text or ""))


def word_limit(instruction: str) -> str | None:
    """The answer-length rule stated in an instruction, upper-cased."""
    match = WORD_LIMIT_RE.search(instruction.upper())
    return match.group(1) if match else None


def question_type(kind: str, instruction: str, variant: object) -> str:
    """Map an upstream question-group ``kind`` onto the canonical taxonomy.

    The upstream ``kind`` is a rendering hint (a matching group and a heading
    group are both ``match``), so the instruction wording decides the finer
    distinctions the taxonomy makes.
    """
    lowered = instruction.lower()
    if kind == "tfng":
        return "yes-no-not-given" if variant == "yn" or "yes" in lowered else "true-false-not-given"
    if kind == "mcq":
        return "multiple-choice"
    if kind == "multi":
        return "multiple-choice-multiple-answer"
    if kind == "map":
        return "diagram-label-completion"
    if kind == "wbank":
        return "summary-completion"
    if kind == "table":
        return "summary-completion"
    if kind == "match":
        if "heading" in lowered:
            return "matching-headings"
        if "contains the following" in lowered or "which paragraph" in lowered or "which section" in lowered:
            return "matching-information"
        if "ending" in lowered:
            return "matching-sentence-endings"
        if "label" in lowered:
            return "diagram-label-completion"
        if re.search(r"list of|match each|classify|each of the following|which of the|who ", lowered):
            return "matching-features"
        return "matching"
    # ``note`` covers every free-text completion form.
    if "label" in lowered and ("diagram" in lowered or "map" in lowered or "plan" in lowered):
        return "diagram-label-completion"
    if "answer the" in lowered or "questions below" in lowered:
        return "short-answer"
    if "sentence" in lowered:
        return "sentence-completion"
    return "summary-completion"


def answer_form(answer: object, shared: object = None) -> str:
    """Classify an answer key entry by form (never by content).

    Multiple-answer groups key the whole group with a shared letter set
    (``answerSet``) instead of keying each question, so the shared set is
    consulted when a question carries no key of its own.
    """
    if not isinstance(answer, list) or not answer:
        answer = shared
    if not isinstance(answer, list) or not answer:
        return "unkeyed"
    first = str(answer[0]).strip()
    if ANSWER_LETTER_RE.match(first):
        return "letter"
    if ANSWER_ROMAN_RE.match(first):
        return "roman-numeral"
    if ANSWER_TFNG_RE.match(first):
        return "truth-value"
    if ANSWER_NUMBER_RE.match(first):
        return "number"
    if re.search(r"\d", first):
        return "alphanumeric"
    if " " in first:
        return "phrase"
    return "word"


def task1_family(prompt: str, task: dict[str, Any]) -> str:
    """Classify a Task 1 prompt by visual family."""
    lowered = prompt.lower()
    families = [name for name, pattern in TASK1_FAMILIES if re.search(pattern, lowered)]
    families = [name for name in families if name != "chart" or len(families) == 1]
    # "The diagrams below show the layout of ..." is a map task, not a process.
    if "map" in families and "process-diagram" in families:
        families.remove("process-diagram")
    if task.get("plans") and "map" not in families:
        families.append("map")
    if task.get("tables") and "table" not in families:
        families.append("table")
    if len(families) > 1:
        return "mixed"
    return families[0] if families else "unclassified"


def task2_family(prompt: str) -> str:
    """Classify a Task 2 prompt by question family (the API's five families)."""
    lowered = prompt.lower()
    body = lowered.split("give reasons for your answer")[0]
    if "discuss both" in body:
        return "discussion"
    if re.search(r"advantages|disadvantages|outweigh|benefits and (the )?(drawbacks|problems)", body):
        return "advantages-disadvantages"
    if re.search(r"problem|solution|measures|what can be done|how can|causes|tackle", body):
        return "problem-solution"
    if re.search(r"to what extent|agree or disagree|do you agree|your opinion|which (do you|view)", body):
        return "opinion"
    if len(QUESTION_MARK_RE.findall(body)) >= 2:
        return "two-part"
    return "opinion"


# --------------------------------------------------------------------------- #
# Taxonomy alignment                                                          #
# --------------------------------------------------------------------------- #


def load_taxonomy(source_dir: Path, skill: str) -> tuple[dict, dict]:
    """Index the upstream taxonomy by (volume, test, part)."""
    path = source_dir / TAXONOMY_FILES[skill]
    groups: dict[tuple[int, int, int], list[dict]] = defaultdict(list)
    parts: dict[tuple[int, int, int], dict] = {}
    if not path.is_file():
        return groups, parts
    document = json.loads(path.read_text(encoding="utf-8"))
    for group in document.get("groups", []):
        groups[(int(group["volume"]), int(group["test"]), int(group["part"]))].append(group)
    for part in document.get("parts", []):
        parts[(int(part["volume"]), int(part["test"]), int(part["part"]))] = part
    return groups, parts


def aligned_group(candidates: list[dict], low: int, high: int) -> dict | None:
    """The upstream taxonomy group overlapping most with a question range."""
    best, best_overlap = None, 0
    for candidate in candidates:
        overlap = min(high, int(candidate["qTo"])) - max(low, int(candidate["qFrom"])) + 1
        if overlap > best_overlap:
            best, best_overlap = candidate, overlap
    return best


def scene_slug(skill: str, label: object) -> str | None:
    """Translate an upstream scene label."""
    table = READING_SCENES if skill == "reading" else LISTENING_SCENES
    return table.get(str(label or "")) or None


# --------------------------------------------------------------------------- #
# Builders                                                                    #
# --------------------------------------------------------------------------- #


def permalink(path: str, commit: str | None) -> str:
    """Public URL of an upstream file at the indexed commit."""
    ref = commit or "main"
    return f"{REPO}/blob/{ref}/{quote(path)}"


def build_groups(
    skill: str, units: list[dict], volume: int, test: int, taxonomy: dict
) -> list[dict[str, Any]]:
    """Flatten the question groups of a reading or listening test."""
    result = []
    for unit in units:
        part = int(unit["id"])
        candidates = taxonomy.get((volume, test, part), [])
        for group in unit.get("groups", []):
            questions = group.get("questions", [])
            numbers = [int(question["no"]) for question in questions]
            low, high = min(numbers), max(numbers)
            instruction = plain(group.get("instruction"))
            canonical = question_type(str(group.get("kind")), instruction, group.get("variant"))
            aligned = aligned_group(candidates, low, high)
            upstream_label = str(aligned["qType"]) if aligned else None
            upstream_type = UPSTREAM_TYPES.get(upstream_label or "")
            agrees = None
            if upstream_type is not None:
                agrees = canonical in UPSTREAM_TYPE_FAMILIES.get(upstream_type, {upstream_type})
            forms = Counter(
                answer_form(question.get("answer"), group.get("answerSet")) for question in questions
            )
            result.append(
                {
                    "part": part,
                    "from": low,
                    "to": high,
                    "count": len(questions),
                    "questionType": canonical,
                    "wordLimit": word_limit(instruction),
                    "answerForms": dict(sorted(forms.items())),
                    "difficulty": DIFFICULTIES.get(str(aligned["diff"])) if aligned else None,
                    "upstreamType": upstream_type,
                    "agreesWithUpstream": agrees,
                }
            )
    return result


def build_reading(test_object: dict, volume: int, test: int, groups_tax: dict, parts_tax: dict) -> dict:
    """Skill-specific fields of a reading test."""
    passages = []
    for passage in test_object["passages"]:
        part = int(passage["id"])
        paras = [str(p) for p in passage["passage"].get("paras", [])]
        text = " ".join(strip_markup(p) for p in paras)
        lettered = sum(1 for p in paras if PARA_LABEL_RE.match(p))
        aligned = parts_tax.get((volume, test, part))
        scene = scene_slug("reading", aligned["scene"]) if aligned else None
        passages.append(
            {
                "part": part,
                "title": plain(passage["passage"].get("title")) or None,
                "paragraphs": len(paras),
                "letteredParagraphs": lettered,
                "hasByline": bool(plain(passage["passage"].get("byline"))),
                "scene": scene,
                "readability": readability(text) if paras else None,
            }
        )
    return {
        "passages": passages,
        "groups": build_groups("reading", test_object["passages"], volume, test, groups_tax),
    }


def build_listening(test_object: dict, volume: int, test: int, groups_tax: dict, parts_tax: dict) -> dict:
    """Skill-specific fields of a listening test."""
    sections = []
    for section in test_object["sections"]:
        part = int(section["id"])
        clips = section.get("audioClips") or []
        end = max((float(clip.get("audioEnd", 0)) for clip in clips), default=0.0)
        aligned = parts_tax.get((volume, test, part))
        sections.append(
            {
                "part": part,
                "audioSeconds": round(end, 1) if end > 0 else None,
                "cuePoints": len(clips),
                "scene": scene_slug("listening", aligned["scene"]) if aligned else None,
            }
        )
    return {
        "sections": sections,
        "groups": build_groups("listening", test_object["sections"], volume, test, groups_tax),
    }


def build_writing(test_object: dict) -> dict:
    """Skill-specific fields of a writing test."""
    task1, task2 = test_object["task1"], test_object["task2"]
    prompt1, prompt2 = plain(task1.get("prompt")), plain(task2.get("prompt"))
    visuals = len(task1.get("charts") or []) + len(task1.get("tables") or []) + len(task1.get("plans") or [])
    return {
        "task1": {
            "family": task1_family(prompt1, task1),
            "visuals": visuals,
            "promptWords": len(re.findall(r"[A-Za-z][A-Za-z'’-]*", prompt1)),
        },
        "task2": {
            "family": task2_family(prompt2),
            "promptWords": len(re.findall(r"[A-Za-z][A-Za-z'’-]*", prompt2)),
            "questions": len(QUESTION_MARK_RE.findall(prompt2.split("Give reasons")[0])),
        },
    }


def build_item(
    path: str, entry: dict, commit: str | None, html: str, taxonomies: dict
) -> dict[str, Any] | None:
    """One index record for an upstream test page."""
    directory, name = path.rsplit("/", 1)
    skill = SKILL_DIRS[directory]
    match = FILE_RE.match(name)
    if match is None:
        return None
    volume, test = int(match.group(1)), int(match.group(2))
    test_object = read_test_object(html)
    if test_object is None:
        return None
    item: dict[str, Any] = {
        "id": f"cam-{volume}-t{test}-{skill}",
        "volume": volume,
        "test": test,
        "skill": skill,
        "module": "academic",
        "durationMinutes": int(test_object.get("durationMin") or 0) or None,
        "questions": None,
    }
    groups_tax, parts_tax = taxonomies.get(skill, ({}, {}))
    if skill == "reading":
        item.update(build_reading(test_object, volume, test, groups_tax, parts_tax))
    elif skill == "listening":
        item.update(build_listening(test_object, volume, test, groups_tax, parts_tax))
    else:
        item.update(build_writing(test_object))
    if "groups" in item:
        item["questions"] = sum(group["count"] for group in item["groups"])
        item["questionTypes"] = sorted({group["questionType"] for group in item["groups"]})
        counts: Counter[str] = Counter()
        for group in item["groups"]:
            counts[group["questionType"]] += group["count"]
        item["typeCounts"] = dict(sorted(counts.items()))
    item.update(
        {
            "sourcePath": path,
            "sha1": entry.get("sha"),
            "sizeBytes": entry.get("size", 0),
            "sourceUrl": permalink(path, commit),
        }
    )
    return item


def distribution(values: list[float]) -> dict[str, float] | None:
    """Mean, median, min and max of a list."""
    if not values:
        return None
    ordered = sorted(values)
    middle = len(ordered) // 2
    median = ordered[middle] if len(ordered) % 2 else (ordered[middle - 1] + ordered[middle]) / 2
    return {
        "count": len(ordered),
        "mean": round(math.fsum(ordered) / len(ordered), 2),
        "median": round(median, 2),
        "min": round(ordered[0], 2),
        "max": round(ordered[-1], 2),
    }


def build_volumes(items: list[dict]) -> list[dict]:
    """One row per Cambridge volume: which skills are indexed and how completely."""
    rows = []
    for volume in sorted({item["volume"] for item in items}):
        mine = [item for item in items if item["volume"] == volume]
        by_skill = {skill: sorted(item["test"] for item in mine if item["skill"] == skill)
                    for skill in ("listening", "reading", "writing")}
        reading = [item for item in mine if item["skill"] == "reading"]
        listening = [item for item in mine if item["skill"] == "listening"]
        ease = [p["readability"]["fleschReadingEase"] for item in reading for p in item["passages"]
                if p["readability"]]
        audio = [s["audioSeconds"] for item in listening for s in item["sections"] if s["audioSeconds"]]
        rows.append(
            {
                "volume": volume,
                "tests": {skill: tests for skill, tests in by_skill.items()},
                "complete": all(tests == [1, 2, 3, 4] for tests in by_skill.values()),
                "items": len(mine),
                "questions": sum(item["questions"] or 0 for item in mine),
                "meanReadingEase": round(math.fsum(ease) / len(ease), 2) if ease else None,
                "listeningAudioSeconds": round(math.fsum(audio), 1) if audio else None,
            }
        )
    return rows


def build_stats(items: list[dict], volumes: list[dict], upstream_pages: int) -> dict:
    """Aggregate statistics over the index."""
    by_skill = Counter(item["skill"] for item in items)
    groups = [(item["skill"], group) for item in items for group in item.get("groups", [])]
    types: Counter[str] = Counter()
    types_by_skill: dict[str, Counter[str]] = defaultdict(Counter)
    forms: Counter[str] = Counter()
    limits: Counter[str] = Counter()
    difficulty: dict[str, Counter[str]] = defaultdict(Counter)
    agreement: Counter[str] = Counter()
    for skill, group in groups:
        types[group["questionType"]] += group["count"]
        types_by_skill[skill][group["questionType"]] += group["count"]
        forms.update(group["answerForms"])
        limits[group["wordLimit"] or "none"] += group["count"]
        if group["difficulty"]:
            difficulty[skill][group["difficulty"]] += group["count"]
        if group["agreesWithUpstream"] is not None:
            agreement["agree" if group["agreesWithUpstream"] else "disagree"] += 1
        else:
            agreement["unlabelled"] += 1
    reading_passages = [p for item in items if item["skill"] == "reading" for p in item["passages"]]
    ease = [p["readability"]["fleschReadingEase"] for p in reading_passages if p["readability"]]
    grade = [p["readability"]["fleschKincaidGrade"] for p in reading_passages if p["readability"]]
    words = [p["readability"]["words"] for p in reading_passages if p["readability"]]
    by_part: dict[int, list[float]] = defaultdict(list)
    for passage in reading_passages:
        if passage["readability"]:
            by_part[passage["part"]].append(passage["readability"]["fleschReadingEase"])
    scenes: dict[str, Counter[str]] = defaultdict(Counter)
    for item in items:
        for unit in item.get("passages", []) + item.get("sections", []):
            if unit["scene"]:
                scenes[item["skill"]][unit["scene"]] += 1
    sections = [s for item in items if item["skill"] == "listening" for s in item["sections"]]
    audio_by_part: dict[int, list[float]] = defaultdict(list)
    for section in sections:
        if section["audioSeconds"]:
            audio_by_part[section["part"]].append(section["audioSeconds"])
    writing = [item for item in items if item["skill"] == "writing"]
    labelled = agreement["agree"] + agreement["disagree"]
    return {
        "upstreamPages": upstream_pages,
        "indexedItems": len(items),
        "volumes": len(volumes),
        "completeVolumes": sum(1 for row in volumes if row["complete"]),
        "bySkill": dict(sorted(by_skill.items())),
        "questions": sum(item["questions"] or 0 for item in items),
        "questionGroups": len(groups),
        "questionTypes": dict(types.most_common()),
        "questionTypesBySkill": {skill: dict(counter.most_common()) for skill, counter in sorted(types_by_skill.items())},
        "answerForms": dict(forms.most_common()),
        "wordLimits": dict(limits.most_common()),
        "difficultyBySkill": {skill: dict(sorted(counter.items())) for skill, counter in sorted(difficulty.items())},
        "scenesBySkill": {skill: dict(counter.most_common()) for skill, counter in sorted(scenes.items())},
        "upstreamTypeAgreement": {
            "labelledGroups": labelled,
            "agreeing": agreement["agree"],
            "unlabelledGroups": agreement["unlabelled"],
            "rate": round(agreement["agree"] / labelled, 4) if labelled else None,
        },
        "reading": {
            "passages": len(reading_passages),
            "measuredPassages": len(ease),
            "fleschReadingEase": distribution(ease),
            "fleschKincaidGrade": distribution(grade),
            "words": distribution(words),
            "readingEaseByPassage": {str(part): distribution(vals) for part, vals in sorted(by_part.items())},
            "letteredPassages": sum(1 for p in reading_passages if p["letteredParagraphs"] >= 4),
        },
        "listening": {
            "sections": len(sections),
            "timedSections": len([s for s in sections if s["audioSeconds"]]),
            "audioSecondsBySection": {str(part): distribution(vals) for part, vals in sorted(audio_by_part.items())},
            "testAudioSeconds": distribution(
                [
                    math.fsum(s["audioSeconds"] for s in item["sections"] if s["audioSeconds"])
                    for item in items
                    if item["skill"] == "listening" and all(s["audioSeconds"] for s in item["sections"])
                ]
            ),
        },
        "writing": {
            "tests": len(writing),
            "task1Families": dict(Counter(item["task1"]["family"] for item in writing).most_common()),
            "task2Families": dict(Counter(item["task2"]["family"] for item in writing).most_common()),
            "task1PromptWords": distribution([item["task1"]["promptWords"] for item in writing]),
            "task2PromptWords": distribution([item["task2"]["promptWords"] for item in writing]),
        },
    }


def build(tree_path: Path, source_dir: Path) -> dict[str, Any]:
    """Build the whole index document."""
    document = json.loads(tree_path.read_text(encoding="utf-8"))
    commit = document.get("sha")
    taxonomies = {skill: load_taxonomy(source_dir, skill) for skill in TAXONOMY_FILES}
    items: list[dict] = []
    upstream_pages = 0
    for entry in sorted(document["tree"], key=lambda e: e["path"]):
        path = entry["path"]
        if entry.get("type") != "blob" or "/" not in path:
            continue
        directory, name = path.rsplit("/", 1)
        if directory not in SKILL_DIRS or not name.endswith(".html"):
            continue
        upstream_pages += 1
        source = source_dir / path
        if not source.is_file():
            continue
        item = build_item(path, entry, commit, source.read_text(encoding="utf-8", errors="replace"), taxonomies)
        if item is not None:
            items.append(item)
    items.sort(key=lambda item: (item["volume"], item["test"], ("listening", "reading", "writing").index(item["skill"])))
    volumes = build_volumes(items)
    return {
        "meta": {
            "name": "Cambridge IELTS test-structure index",
            "repository": REPO,
            "commit": commit,
            "license": "None declared (upstream); this index re-publishes derived metadata only",
            "attribution": (
                "Derived structure index of the Cambridge IELTS 3-21 Academic test pages typeset at "
                f"{REPO}. Cambridge IELTS is published by Cambridge University Press & Assessment; "
                "nothing from the tests is reproduced."
            ),
            "note": (
                "Only derived, non-substitutive metadata and statistics are published: no passage, "
                "question, answer key, prompt text, image or audio is served by this API. Scene and "
                "difficulty labels are editorial judgements of the upstream site, translated verbatim."
            ),
            "scenes": {
                "listening": sorted(LISTENING_SCENES.values()),
                "reading": sorted(READING_SCENES.values()),
            },
            "difficulties": sorted(DIFFICULTIES.values()),
        },
        "stats": build_stats(items, volumes, upstream_pages),
        "volumes": volumes,
        "items": items,
    }


def main(argv: list[str]) -> int:
    """Command-line entry point."""
    if len(argv) != 4:
        print(__doc__, file=sys.stderr)
        print("usage: extract_cambridge.py <tree.json> <source-dir> <out.json>", file=sys.stderr)
        return 2
    index = build(Path(argv[1]), Path(argv[2]))
    output = Path(argv[3])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    stats = index["stats"]
    print(
        f"wrote {output}: {stats['indexedItems']} items over {stats['volumes']} volumes, "
        f"{stats['questions']} questions in {stats['questionGroups']} groups, "
        f"upstream type agreement {stats['upstreamTypeAgreement']['rate']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
