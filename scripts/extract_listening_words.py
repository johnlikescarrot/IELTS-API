#!/usr/bin/env python3
"""Build the listening vocabulary resource served by ielts-api.

Two upstream PDFs from https://github.com/Oxidaner/ielts (the "IELTS Listening
Words" sheets compiled by the preparer Sherry) are processed:

* ``Sherry雅思听力同意替换2025`` - the paraphrase ("same-meaning replacement")
  groups that recur between listening questions and recordings, organised by
  part of speech and by sense;
* ``Sherry听力场景词汇2025`` - the scenario vocabulary of the listening paper
  (housing, banking, travel, course work, Section 4 lectures, ...) together
  with the map-task strategy vocabulary and the discourse-relation markers.

Both PDFs are unlicensed third-party teaching material, so **the derivation
keeps only what copyright does not protect**: the word lists themselves, their
grouping and their scenario structure. The preparer's layout, introduction and
watermarks are dropped. Word lists, as lists of facts, carry the resource's
research value - paraphrase mining, listening-cloze generation and lexical
field analysis - without substituting for the documents.

The English sense glosses are original translations written for this project
and merged at extraction time, so the committed dataset stays reproducible
from the PDFs alone.

Usage:

    python3 scripts/extract_listening_words.py <paraphrase.pdf> <scenarios.pdf> data/listening-words.json

PDF decoding uses `scripts/_pdfmin.py`, a standard-library-only extractor for
the FlateDecode + Identity-H + RC4 subset of PDF that office software emits;
no external PDF tooling is required.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _pdfmin import PdfError, extract_pages  # noqa: E402

REPO = "https://github.com/Oxidaner/ielts"
PARAPHRASE_PATH = "听力/Sherry雅思听力同意替换2025(1).pdf"
SCENARIO_PATH = "听力/Sherry听力场景词汇2025(1).pdf"

#: Heading that opens a part-of-speech section of the paraphrase sheet.
POS_HEADINGS = {"v:": "verb", "n:": "noun", "adj/adv:": "adj/adv"}

#: The page header repeated on every sheet, and pure page numbers: not content.
_NOISE = (re.compile(r"^IELTS Listening Words\s*--?Sherry$"), re.compile(r"^\d+$"))

#: Entry line: "1.sense：terms" or "1.sense terms" (the colon is sometimes omitted).
_ENTRY = re.compile(r"^(\d{1,2})\.([^A-Za-z]*?)(?:：|\s)\s*([A-Za-z].*)$")

#: Entry line whose term list starts on the next line: "1.sense：" with nothing after.
_HEADLESS_ENTRY = re.compile(r"^(\d{1,2})\.([^A-Za-z]*[：:])$")

#: English gloss per (part of speech, source number): original translations.
GLOSSES: dict[tuple[str, int], str] = {
    ("verb", 1): "to book; to reserve",
    ("verb", 2): "to solve; to handle; to process",
    ("verb", 3): "to cause; to result in",
    ("verb", 4): "to demonstrate; to display; to illustrate",
    ("verb", 5): "to change; to adjust; to adapt",
    ("verb", 6): "to find; to discover; to identify",
    ("verb", 7): "to build; to establish; to found",
    ("verb", 8): "to buy; to purchase; to invest",
    ("verb", 9): "to organise; to run; to arrange",
    ("verb", 10): "to close; to shut down; to bar access",
    ("verb", 11): "to describe; to introduce; to present",
    ("verb", 12): "to renovate; to refurbish; to rebuild",
    ("verb", 13): "to consist of; to be made up of",
    ("verb", 14): "to allow; to permit; to approve",
    ("verb", 15): "to restrict; to prohibit; to ban",
    ("verb", 16): "to relocate; to move; to reorient",
    ("verb", 17): "to be called; to be named; to be titled",
    ("verb", 18): "to contact; to connect with; to reach",
    ("verb", 19): "to deliver; to send; to transmit",
    ("verb", 20): "to submit; to hand in; to distribute",
    ("verb", 21): "to start; to begin; to launch",
    ("verb", 22): "to give up; to quit; to withdraw",
    ("verb", 23): "to increase; to rise; to expand",
    ("verb", 24): "to decrease; to decline; to reduce",
    ("verb", 25): "to focus on; to specialise in",
    ("verb", 26): "to research; to investigate; to observe",
    ("verb", 27): "to assess; to evaluate; to measure",
    ("verb", 28): "to know; to be aware of; to realise",
    ("verb", 29): "to worry; to fear; to be concerned",
    ("verb", 39): "to encourage; to motivate; to inspire",
    ("adj/adv", 1): "rare; unusual; unique",
    ("adj/adv", 2): "various; a range of; all sorts of",
    ("adj/adv", 3): "the same; identical; similar",
    ("adj/adv", 4): "attractive; impressive; appealing",
    ("adj/adv", 5): "complex; comprehensive; thorough",
    ("adj/adv", 6): "happy; delighted; thrilled",
    ("adj/adv", 7): "unhappy; disappointed; let down",
    ("adj/adv", 8): "angry; irritated; reluctant",
    ("adj/adv", 9): "surprising; unexpected; astonishing",
    ("adj/adv", 10): "certainly; definitely; without doubt",
    ("adj/adv", 11): "sceptical; hesitant; uncertain",
    ("adj/adv", 12): "easy; simple; elementary",
    ("adj/adv", 13): "difficult; demanding; challenging",
    ("adj/adv", 14): "dangerous; unsafe; risky",
    ("adj/adv", 15): "big; huge; enormous; immense",
    ("adj/adv", 16): "small; tiny; miniature",
    ("adj/adv", 17): "at most; up to; at minimum",
    ("adj/adv", 18): "specific; detailed; particular",
    ("adj/adv", 19): "limited; restricted; scarce",
    ("adj/adv", 20): "to a high degree; mostly; mainly",
    ("adj/adv", 21): "often; regularly; frequently",
    ("adj/adv", 22): "sudden; rapid; abrupt",
    ("adj/adv", 23): "essential; necessary; required",
    ("adj/adv", 24): "better; superior; preferred",
    ("adj/adv", 25): "local; regional; native",
    ("adj/adv", 26): "related to; relevant to; concerning",
    ("adj/adv", 27): "cold; chilled; below zero",
    ("adj/adv", 28): "currently; at present; right now",
    ("adj/adv", 29): "previously; in the past; used to",
    ("adj/adv", 30): "in the future; planning to; about to",
    ("noun", 1): "wildlife; plants; vegetation",
    ("noun", 2): "manager; boss; employer",
    ("noun", 3): "staff; workers; employees",
    ("noun", 4): "company; organisation; corporation",
    ("noun", 5): "money; funding; expenditure; tax",
    ("noun", 6): "benefit; advantage; positive side",
    ("noun", 7): "problem; drawback; negative side",
    ("noun", 8): "space; room; capacity; volume",
    ("noun", 9): "leisure; entertainment; recreation",
    ("noun", 10): "entrance; gate; access",
    ("noun", 11): "footpath; pavement; crossing",
    ("noun", 12): "feature; characteristic",
    ("noun", 13): "place; location; site",
    ("noun", 14): "environment; conditions; surroundings",
    ("noun", 15): "pollution; contamination; toxin",
    ("noun", 16): "way; method; approach",
    ("noun", 17): "area; region; zone",
    ("noun", 18): "summit; top; peak",
    ("noun", 19): "sequence; order; ranking",
}

#: The five paraphrase mechanisms the sheet's introduction describes, in
#: original wording; the examples are the sheet's own short instances.
MECHANISMS = [
    {
        "id": "word-family",
        "name": "Word-family substitution",
        "description": (
            "A word is replaced by a derivative of the same root across parts of speech: "
            "confidence becomes confident or confidently; vary becomes various, variety "
            "or a variety of."
        ),
        "example": "confidence -> confident -> confidently",
    },
    {
        "id": "cross-pos",
        "name": "Cross-part-of speech equivalence",
        "description": (
            "Words of different parts of speech stand in for each other on the strength of "
            "meaning alone: an adjective such as essential can surface as the modal must or "
            "have to, the verb require or the noun necessity."
        ),
        "example": "essential -> must / require / necessity",
    },
    {
        "id": "polarity",
        "name": "Affirmation and negation",
        "description": (
            "A positive formulation is replaced by the negation of its opposite: surprising "
            "is heard as not realise or didn't expect that; lack as not enough."
        ),
        "example": "surprising -> not expect that",
    },
    {
        "id": "hyponymy",
        "name": "Hypernym and hyponym",
        "description": (
            "A general term is replaced by a specific instance of it, or the reverse: "
            "color becomes red; animal becomes tiger."
        ),
        "example": "animal -> tiger",
    },
    {
        "id": "abstract-concrete",
        "name": "Abstract and concrete",
        "description": (
            "An abstract notion is replaced by the concrete activity that instantiates it: "
            "recreation becomes singing and dancing."
        ),
        "example": "recreation -> singing & dancing",
    },
]

#: Scenario sheet: zh section header -> canonical id, English name and the
#: listening sections the scenario typically occurs in.
SCENARIO_SECTIONS: dict[str, tuple[str, str, tuple[int, ...]]] = {
    "个人信息": ("personal-details", "Personal details and form-filling", (1,)),
    "住房场景词汇": ("housing", "Housing and accommodation", (1, 2)),
    "汽车场景词汇": ("vehicles", "Cars and vehicle enquiries", (1, 2)),
    "银行场景词汇": ("banking", "Banking", (1,)),
    "旅游场景词汇": ("tourism", "Tourism and excursions", (1, 2)),
    "交通场景词汇": ("transport", "Transport and tickets", (1, 2)),
    "常考地点词": ("places", "Frequently examined places", (1, 2)),
    "找工作场景词": ("employment", "Employment and job applications", (1,)),
    "会员/运动/医疗场景词汇": ("membership-sports-medical", "Membership, sports and medical", (1, 2)),
    "地图题": ("map-tasks", "Map and plan tasks", (2,)),
    "S3 课程及作业场景词汇": ("course-assignment", "Course and assignment work (Section 3)", (3,)),
    "Section 4 词汇": ("academic-lecture", "Academic lecture content (Section 4)", (4,)),
}

#: zh category label -> English gloss (original translations).
CATEGORY_GLOSSES: dict[str, str] = {
    "住宿类型": "accommodation types",
    "地点": "location",
    "交通": "transport",
    "房源": "accommodation providers",
    "习惯": "habits and preferences",
    "兴趣爱好": "hobbies and household",
    "房屋设施": "fixtures and facilities",
    "房租及付款方式": "rent and payment",
    "租住时间": "length and start of stay",
    "地图题做题方法": "map-task method",
    "地点词汇": "layout and venue vocabulary",
    "特殊建筑物": "distinctive structures",
    "方位词": "position and direction words",
    "路线": "route instructions",
    "Course": "course vocabulary",
    "Assignment": "assignment vocabulary",
    "Verb.": "core verbs",
    "Adj.": "core adjectives",
    "Plant/vegetation": "plants and vegetation",
    "Animal &wildlife &creature & species& Environment": "animals, wildlife and environment",
    "Material &chemistry": "materials and chemistry",
    "Business &Marketing &Technology": "business, marketing and technology",
    "实验类文章结构": "structure of experiment talks",
    "General Level of English": "general english level",
    "Occupation": "occupations",
    "Emergency contact": "emergency contacts",
    "type of gears": "gear types",
    "Type of ticket": "ticket types",
    "Membership type": "membership types",
    "Facilities available": "facilities",
    "Health problem": "health problems",
    "Sports injury": "sports injuries",
    "Treatment": "treatments",
    "Qualities required": "qualities required",
    "Course feedback": "course feedback",
    "Course Consultant": "course consultant",
    "Course assessment": "course assessment",
    "Paper/ thesis/ essay/ dissertation": "long written work",
    "library": "library",
    "Presentation": "presentations",
    "Research": "research methods",
    "Materials & resources": "materials and resources",
    "Policy": "library policy",
    "Tree": "trees",
    "Mammal": "mammals",
    "Primate": "primates",
    "Reptile": "reptiles",
    "Amphibian": "amphibians",
    "Marine animals": "marine animals",
    "Fish": "fish anatomy",
    "Bird": "birds",
    "Insect": "insects",
    "Microbes": "microbes and disease",
    "behavior": "animal behaviour",
    "Communication/navigation": "communication and navigation",
    "Others": "other topics",
    "Metal": "metals",
    "Toxin/poison": "toxins and states of matter",
    "Textile": "textiles",
    "Building": "building materials",
    "Plastic/ glass/ paper/ wood/ rubber/timber": "everyday materials",
    "Fuel": "fuels",
    "Gas": "gases and agriculture",
    "Shape": "shapes",
}

#: Discourse-relation classes on the final page: zh prefix -> canonical entry.
DISCOURSE_CLASSES: tuple[dict[str, str], ...] = (
    {"match": "转折关系", "id": "adversative", "name": "Adversative (contrast)", "pattern": "A but B"},
    {"match": "让步关系", "id": "concessive", "name": "Concessive", "pattern": "A although B"},
    {"match": "因果关系", "id": "causal", "name": "Causal", "pattern": "A because B"},
    {"match": "并列关系", "id": "additive", "name": "Additive (coordination)", "pattern": "A and B"},
    {
        "match": "表顺序或序列关系的词",
        "id": "sequential",
        "name": "Sequential",
        "pattern": "first, second, and then",
    },
    {
        "match": "其他表示列举增补关系的",
        "id": "enumerative",
        "name": "Enumerative and supplementary",
        "pattern": "besides, moreover, in addition",
    },
    {
        "match": "表解释或强调关系的",
        "id": "explanatory",
        "name": "Explanatory and emphatic",
        "pattern": "refer to, I mean, that is to say",
    },
    {
        "match": "表归纳结论性的",
        "id": "conclusive",
        "name": "Conclusive (closing a passage)",
        "pattern": "in conclusion, to sum up",
    },
)


def _is_noise(line: str) -> bool:
    return any(pattern.match(line) for pattern in _NOISE)


def parse_paraphrases(pages: list[str]) -> list[dict[str, object]]:
    """Parse the paraphrase sheet into sense groups.

    Lines follow ``number.zh sense：term/term/...``; wrapped lines continue the
    previous group's term list. The source numbering skips from 29 to 39 among
    the verbs (an upstream typo); the source number is preserved and the gap is
    reported in the dataset metadata.
    """
    groups: list[dict[str, object]] = []
    pos: str | None = None
    for page in pages:
        for raw in page.splitlines():
            line = raw.strip()
            if not line or _is_noise(line):
                continue
            lowered = POS_HEADINGS.get(line.lower())
            if lowered is not None:
                pos = lowered
                continue
            if pos is None:
                continue  # introduction page
            entry = _ENTRY.match(line)
            if entry is not None:
                number, sense, rest = int(entry.group(1)), entry.group(2).strip(), entry.group(3).strip()
                gloss = GLOSSES.get((pos, number))
                if gloss is None:
                    raise SystemExit(f"missing English gloss for group {pos} #{number}")
                groups.append({
                    "id": f"{pos}-{number:02d}",
                    "pos": pos,
                    "sourceNumber": number,
                    "sense": sense,
                    "gloss": gloss,
                    "terms": _split_terms(rest),
                })
                continue
            headless = _HEADLESS_ENTRY.match(line)
            if headless is not None:
                number, sense = int(headless.group(1)), headless.group(2).rstrip("：:").strip()
                gloss = GLOSSES.get((pos, number))
                if gloss is None:
                    raise SystemExit(f"missing English gloss for group {pos} #{number}")
                groups.append({
                    "id": f"{pos}-{number:02d}",
                    "pos": pos,
                    "sourceNumber": number,
                    "sense": sense,
                    "gloss": gloss,
                    "terms": [],
                })
                continue
            if groups:
                # wrapped continuation of the previous entry's term list
                terms = groups[-1]["terms"]
                assert isinstance(terms, list)
                terms.extend(_split_terms(line))
    return groups


def _split_terms(text: str) -> list[str]:
    """Split a term list on slashes and tidy the pieces."""
    terms: list[str] = []
    for piece in text.split("/"):
        term = " ".join(piece.replace(",", " ,").split())
        if term and term not in (".", "…"):
            terms.append(term)
    return terms


def parse_scenarios(pages: list[str]) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    """Parse the scenario sheet into scenarios with lexical categories.

    Returns the scenario list and, separately, the discourse-marker classes
    parsed from the sheet's final page. Category headers come in three shapes
    in the source: a line ending in a colon (``住宿类型：``), a numbered field
    with an inline list (``1.Tree: pine/willow/...``) and a bare field label
    (``Verb.``). Every remaining line is a slash-separated term list of the
    current category, or of the scenario's default category when the section
    opens without one.
    """
    scenarios: list[dict[str, object]] = []
    discourse: list[dict[str, object]] = []
    current: dict[str, object] | None = None
    category: dict[str, object] | None = None
    seen_headers = set()
    for page in pages:
        for raw in page.splitlines():
            line = raw.strip()
            if not line or _is_noise(line):
                continue
            header = line.rstrip("：:").strip()
            if header in SCENARIO_SECTIONS and header not in seen_headers:
                seen_headers.add(header)
                identifier, name, sections = SCENARIO_SECTIONS[header]
                current = {
                    "id": identifier,
                    "nameZh": header,
                    "name": name,
                    "typicalSections": list(sections),
                    "categories": [],
                }
                scenarios.append(current)
                category = None
                continue
            if current is None:
                continue
            discourse_class = _match_discourse_class(line, discourse)
            if discourse_class is not None:
                category = None
                continue
            if _is_marker_line(line, discourse):
                continue
            inline = _INLINE_FIELD.match(line)
            if inline is not None:
                category = _open_category(current, inline.group(1))
                _add_terms(category, inline.group(2))
                continue
            numbered_label = _NUMBERED_LABEL.match(line)
            if numbered_label is not None:
                category = _open_category(current, numbered_label.group(1))
                continue
            if line.endswith("：") or line.endswith(":"):
                category = _open_category(current, line.rstrip("：:").strip())
                continue
            if line in CATEGORY_GLOSSES:
                category = _open_category(current, line)
                continue
            if category is None:
                category = _open_category(current, "通用")
            _add_terms(category, line)
    return scenarios, discourse


#: ``1.Tree: pine/willow/...`` - a numbered field header with an inline list.
_INLINE_FIELD = re.compile(r"^\d{1,2}\.\s*([^:：/]{1,40})[:：]\s*(\S.*)$")

#: ``2.Animal & wildlife ...`` - a numbered label with its list on later lines.
_NUMBERED_LABEL = re.compile(r"^\d{1,2}\.\s*([^:：/]*[A-Za-z][^:：/]*)$")


def _open_category(scenario: dict[str, object], label: str) -> dict[str, object]:
    """Append a fresh lexical category to the scenario and return it."""
    name = " ".join(re.sub(r"^\d{1,2}\.\s*", "", label).split())
    category = {"nameZh": name, "name": CATEGORY_GLOSSES.get(name, name), "terms": []}
    categories = assert_isinstance_list(scenario["categories"])
    categories.append(category)
    return category


def _add_terms(category: dict[str, object], text: str) -> None:
    """Append the terms of one source line to the category."""
    terms = assert_isinstance_list(category["terms"])
    if "/" in text:
        terms.extend(_split_terms(text))
    else:
        terms.append(_tidy(re.sub(r"^\d{1,2}\.\s*", "", text)))


def assert_isinstance_list(value: object) -> list[str]:
    assert isinstance(value, list)
    return value


def _tidy(line: str) -> str:
    return " ".join(line.split())


def _match_discourse_class(line: str, discourse: list[dict[str, object]]) -> dict[str, object] | None:
    for config in DISCOURSE_CLASSES:
        if any(entry["id"] == config["id"] for entry in discourse):
            continue
        if line.startswith(config["match"]):
            discourse.append({
                "id": config["id"],
                "name": config["name"],
                "nameZh": config["match"],
                "pattern": config["pattern"],
                "markers": [],
            })
            return discourse[-1]
    return None


def _is_marker_line(line: str, discourse: list[dict[str, object]]) -> bool:
    """File a raw marker line under the most recently opened discourse class.

    Lines are kept verbatim and split into markers only after parsing, because
    a single marker can wrap across lines (the adversative list splits
    "by contrast" between two lines).
    """
    if not discourse:
        return False
    if any(line.startswith(config["match"]) for config in DISCOURSE_CLASSES):
        return False
    last = discourse[-1]
    lines = assert_isinstance_list(last.setdefault("_lines", []))
    lines.append(line)
    return True


def _finalise_discourse(discourse: list[dict[str, object]]) -> None:
    """Split each class's accumulated lines into a de-duplicated marker list."""
    for entry in discourse:
        lines = entry.pop("_lines", [])
        assert isinstance(lines, list)
        markers: list[str] = []
        for piece in _split_terms(" ".join(str(line) for line in lines)):
            marker = piece.strip(" .")
            if marker and marker not in markers:
                markers.append(marker)
        entry["markers"] = markers


def build(paraphrase_pdf: Path, scenario_pdf: Path) -> dict[str, object]:
    paraphrase_pages = extract_pages(paraphrase_pdf)
    scenario_pages = extract_pages(scenario_pdf)
    groups = parse_paraphrases(paraphrase_pages)
    scenarios, discourse = parse_scenarios(scenario_pages)
    _finalise_discourse(discourse)

    glossed = sum(1 for group in groups if group["gloss"] is not None)
    if glossed != len(groups):
        raise SystemExit("every paraphrase group must carry an English gloss")
    verbs = [group for group in groups if group["pos"] == "verb"]
    source_numbers = sorted(int(group["sourceNumber"]) for group in verbs)
    gaps = [
        number
        for previous, number in zip(source_numbers, source_numbers[1:])
        if number - previous > 1
    ]
    term_total = sum(len(assert_isinstance_list(group["terms"])) for group in groups)
    scenario_terms = sum(
        len(assert_isinstance_list(category["terms"]))
        for scenario in scenarios
        for category in assert_isinstance_list(scenario["categories"])
    )
    marker_total = sum(len(assert_isinstance_list(entry["markers"])) for entry in discourse)
    return {
        "meta": {
            "name": "IELTS listening scenario vocabulary and paraphrase groups (derived)",
            "repository": REPO,
            "upstreamFiles": {"paraphrases": PARAPHRASE_PATH, "scenarios": SCENARIO_PATH},
            "license": "unlicensed third-party teaching material; word lists only, no layout or prose",
            "attribution": "Word lists compiled by the preparer 'Sherry' (英语老师Sherry); English glosses are original to this project.",
            "note": (
                "The source PDFs are teaching handouts distributed through the upstream study "
                "collection. Only the word lists and their grouping are retained: the sheet "
                "layout, introduction prose and per-page watermarks are dropped, and term "
                "strings are kept verbatim (including the source's spacing quirks and its "
                "verb numbering gap from 29 to 39)."
            ),
            "glossCoverage": {"groups": len(groups), "glossed": glossed},
            "sourceIrregularities": {
                "verbNumberSequenceGaps": gaps,
                "note": "The paraphrase sheet numbers the verb groups 1-29 then jumps to 39.",
            },
        },
        "paraphrases": {
            "mechanisms": MECHANISMS,
            "groups": groups,
            "stats": {
                "groups": len(groups),
                "terms": term_total,
                "byPos": {
                    pos: sum(1 for group in groups if group["pos"] == pos)
                    for pos in ("verb", "adj/adv", "noun")
                },
            },
        },
        "scenarios": scenarios,
        "discourseMarkers": discourse,
        "stats": {
            "scenarios": len(scenarios),
            "scenarioTerms": scenario_terms,
            "discourseClasses": len(discourse),
            "discourseMarkers": marker_total,
        },
    }


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(f"usage: {argv[0]} <paraphrase.pdf> <scenarios.pdf> <output.json>", file=sys.stderr)
        return 2
    try:
        dataset = build(Path(argv[1]), Path(argv[2]))
    except PdfError as error:
        print(f"extraction failed: {error}", file=sys.stderr)
        return 1
    Path(argv[3]).write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stats = dataset["stats"]
    assert isinstance(stats, dict)
    paraphrase_stats = dataset["paraphrases"]
    assert isinstance(paraphrase_stats, dict)
    paraphrase_stats_stats = paraphrase_stats["stats"]
    assert isinstance(paraphrase_stats_stats, dict)
    print(
        f"listening-words: {paraphrase_stats_stats['groups']} paraphrase groups "
        f"({paraphrase_stats_stats['terms']} terms), {stats['scenarios']} scenarios "
        f"({stats['scenarioTerms']} terms), {stats['discourseClasses']} discourse classes "
        f"({stats['discourseMarkers']} markers)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
