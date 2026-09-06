#!/usr/bin/env python3
"""Build the Cambridge test-blueprint index served by ielts-api.

The upstream platform (https://github.com/wanli4473/yysd-testcenter) is a
Chinese-language IELTS mock-exam centre.  Buried in its ``library/`` directory
are two hand-annotated taxonomy files -- ``reading-taxonomy.json`` and
``listening-taxonomy.json`` -- that label *every question group* of Cambridge
IELTS volumes 5 to 21 with a question type, a subject scene and, for most
groups, a difficulty rating.

That is the item-level structure of 136 real Cambridge papers: which task
family occupies questions 14-19 of Reading Test 2 in volume 16, what the
passage is about, and how hard the annotator judged it.  Nothing else in this
API is annotated at that granularity -- ``/v1/tests`` indexes practice items
from an unofficial corpus, and ``/v1/archive`` indexes file names.  This script
turns those annotations into a normalised, English-language, analysable index.

Usage:

    python3 scripts/extract_blueprints.py <yysd-checkout> data/blueprints.json

Only derived annotation metadata is published: question ranges, normalised task
families, translated scene labels and difficulty ratings.  No passage text, no
question wording, no answer key and no audio is redistributed -- the Cambridge
papers are copyright Cambridge University Press & Assessment, and the upstream
repository carries no licence at all.
"""

from __future__ import annotations

import collections
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

REPO = "https://github.com/wanli4473/yysd-testcenter"

#: Upstream files consumed, relative to the checkout root.
SOURCES = ("library/reading-taxonomy.json", "library/listening-taxonomy.json")

# --------------------------------------------------------------------------- #
# Normalisation tables                                                        #
# --------------------------------------------------------------------------- #

#: Canonical question types, mirroring ``scripts/extract_practice_tests.py``.
CANONICAL_TYPES: tuple[str, ...] = (
    "multiple-choice",
    "multiple-choice-multiple-answer",
    "true-false-not-given",
    "yes-no-not-given",
    "matching",
    "matching-information",
    "matching-headings",
    "matching-features",
    "matching-sentence-endings",
    "sentence-completion",
    "summary-completion",
    "diagram-label-completion",
    "short-answer",
)

#: Upstream Chinese label -> (canonical type, English gloss, exact?).
#:
#: ``exact`` is ``False`` where the upstream vocabulary is coarser than the
#: canonical taxonomy, so the mapping loses a distinction.  Those cases are
#: published as ``approximate`` on every affected group rather than being
#: silently flattened.
TYPE_MAP: dict[str, tuple[str, str, bool]] = {
    # Shared between both papers.
    "单选题": ("multiple-choice", "Single-answer multiple choice", True),
    "多选题": ("multiple-choice-multiple-answer", "Multiple-answer multiple choice", True),
    "简答题": ("short-answer", "Short answer", True),
    # Reading-only labels.
    "判断题": ("true-false-not-given", "Identification (true/false/not given)", False),
    "总结题": ("summary-completion", "Summary completion", True),
    "段落匹配题": ("matching-information", "Matching information to paragraphs", True),
    "细节匹配题": ("matching-features", "Matching features", True),
    "选段意题": ("matching-headings", "Matching headings", True),
    # Listening-only labels.
    "配对题": ("matching", "Matching", True),
    "地图题": ("diagram-label-completion", "Map or plan labelling", True),
    "流程题": ("diagram-label-completion", "Flow-chart completion", False),
    # Skill-dependent: completion tasks are not sub-classified upstream.
    "填空题": ("sentence-completion", "Gap fill / completion", False),
}

#: Why a mapping is approximate, keyed by upstream label.
APPROXIMATION_NOTES: dict[str, str] = {
    "判断题": (
        "The upstream vocabulary has one label for both identification tasks. "
        "Cambridge sets true/false/not given on factual passages and "
        "yes/no/not given on opinion passages; the annotation does not record "
        "which, so every group is reported as true-false-not-given."
    ),
    "填空题": (
        "One upstream label covers every gap-fill task. Cambridge distinguishes "
        "sentence, note, table, summary and form completion; the annotation "
        "does not, so every group is reported as sentence-completion."
    ),
    "流程题": (
        "Flow-chart completion has no separate canonical identifier and is "
        "reported as diagram-label-completion, the nearest visual-labelling "
        "family."
    ),
}

#: Upstream scene label -> English gloss.
SCENE_MAP: dict[str, str] = {
    # Reading scenes.
    "历史发展": "History and development",
    "自然科技": "Nature and technology",
    "社会人文": "Society and humanities",
    "生态环保": "Ecology and conservation",
    "语言教育": "Language and education",
    "生物研究": "Biological research",
    "财经商业": "Finance and business",
    "医疗健康": "Health and medicine",
    # Listening scenes.
    "健康医疗": "Health and medicine",
    "求职": "Job seeking",
    "经营管理": "Business management",
    "地理": "Geography",
    "旅游": "Travel and tourism",
    "日常生活": "Daily life",
    "建筑环境": "Buildings and environment",
    "住宿": "Accommodation",
    "运动": "Sport",
    "图书馆": "Library services",
    "保险": "Insurance",
    "新生入学": "Student enrolment",
    "作业讨论": "Assignment discussion",
    "人文社科": "Humanities and social science",
    "生物": "Biology",
    "课题研究": "Research project",
}

#: Upstream difficulty label -> English gloss.  The empty string means unrated.
DIFFICULTY_MAP: dict[str, str | None] = {
    "易": "easy",
    "中": "medium",
    "难": "hard",
    "": None,
}

#: Ordered difficulty labels used in every distribution.
DIFFICULTIES: tuple[str, ...] = ("easy", "medium", "hard")

#: Questions in a complete Academic Reading or Listening paper.
PAPER_QUESTIONS = 40


# --------------------------------------------------------------------------- #
# Helpers                                                                     #
# --------------------------------------------------------------------------- #


def slugify_scene(skill: str, gloss: str) -> str:
    """Turn an English scene gloss into a stable, skill-scoped slug.

    Reading and Listening carry separate scene vocabularies upstream, and two of
    their labels differ only in character order while meaning the same thing
    (``医疗健康`` in Reading, ``健康医疗`` in Listening).  Scoping the slug by
    skill keeps the two paper-specific vocabularies from being conflated.
    """
    body = gloss.lower().replace(" and ", "-").replace(" ", "-")
    return f"{skill}-{body}"


def blob_sha1(data: bytes) -> str:
    """Return the Git blob SHA-1 of raw file bytes, for provenance."""
    header = f"blob {len(data)}".encode()
    return hashlib.sha1(header + b"\0" + data).hexdigest()  # noqa: S324


def read_source(root: Path, relative: str) -> tuple[dict[str, Any], str]:
    """Read one upstream taxonomy file, returning its payload and blob SHA."""
    path = root / relative
    raw = path.read_bytes()
    return json.loads(raw.decode("utf-8")), blob_sha1(raw)


def distribution(counter: collections.Counter[str], order: tuple[str, ...]) -> dict[str, int]:
    """Project a counter onto a fixed key order, dropping empty buckets."""
    return {key: counter[key] for key in order if counter[key] > 0}


def sorted_counts(counter: collections.Counter[str]) -> dict[str, int]:
    """Sort a counter by descending count, then by key."""
    return dict(sorted(counter.items(), key=lambda kv: (-kv[1], kv[0])))


# --------------------------------------------------------------------------- #
# Group normalisation                                                         #
# --------------------------------------------------------------------------- #


def normalise_group(raw: dict[str, Any], skill: str) -> dict[str, Any]:
    """Normalise one upstream question group into a published record."""
    label = str(raw["qType"]).strip()
    if label not in TYPE_MAP:
        raise KeyError(f"unmapped question type: {label!r}")
    canonical, gloss, exact = TYPE_MAP[label]

    scene_label = str(raw["scene"]).strip()
    scene_gloss = SCENE_MAP.get(scene_label)
    if scene_label and scene_gloss is None:
        raise KeyError(f"unmapped scene: {scene_label!r}")

    difficulty_label = str(raw["diff"]).strip()
    if difficulty_label not in DIFFICULTY_MAP:
        raise KeyError(f"unmapped difficulty: {difficulty_label!r}")

    q_from = int(raw["qFrom"])
    q_to = int(raw["qTo"])
    volume = int(raw["volume"])
    test = int(raw["test"])

    return {
        "id": f"{skill}-cam{volume}-t{test}-q{q_from}-{q_to}",
        "testId": f"{skill}-cam{volume}-t{test}",
        "skill": skill,
        "volume": volume,
        "test": test,
        "part": int(raw["part"]),
        "firstQuestion": q_from,
        "lastQuestion": q_to,
        "questions": q_to - q_from + 1,
        "questionType": canonical,
        "questionTypeLabel": gloss,
        "approximate": not exact,
        "sourceLabel": label,
        "scene": slugify_scene(skill, scene_gloss) if scene_gloss else None,
        "sceneLabel": scene_gloss,
        "sourceScene": scene_label or None,
        "difficulty": DIFFICULTY_MAP[difficulty_label],
        "sourceId": str(raw["id"]),
    }


def build_tests(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aggregate groups into one row per paper, with annotation completeness.

    A paper is ``complete`` when its groups tile questions 1-40 exactly once.
    Where they do not, the missing and doubly-annotated question numbers are
    published rather than hidden: the annotation is a human artefact and its
    gaps are part of what the index documents.
    """
    by_test: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for group in groups:
        by_test[group["testId"]].append(group)

    tests: list[dict[str, Any]] = []
    for test_id, members in by_test.items():
        members.sort(key=lambda group: (group["firstQuestion"], group["lastQuestion"]))
        coverage: collections.Counter[int] = collections.Counter()
        for group in members:
            coverage.update(range(group["firstQuestion"], group["lastQuestion"] + 1))
        missing = sorted(set(range(1, PAPER_QUESTIONS + 1)) - set(coverage))
        duplicated = sorted(number for number, count in coverage.items() if count > 1)
        out_of_range = sorted(number for number in coverage if number > PAPER_QUESTIONS)

        first = members[0]
        types = collections.Counter(group["questionType"] for group in members)
        scenes = [group["scene"] for group in members if group["scene"] is not None]
        rated = [group["difficulty"] for group in members if group["difficulty"] is not None]

        tests.append(
            {
                "id": test_id,
                "skill": first["skill"],
                "volume": first["volume"],
                "test": first["test"],
                "groups": len(members),
                "annotatedQuestions": len(coverage),
                "parts": sorted({group["part"] for group in members}),
                "questionTypes": sorted(types),
                "typeCounts": dict(sorted(types.items())),
                "scenes": sorted(set(scenes)),
                "difficultyCounts": distribution(collections.Counter(rated), DIFFICULTIES),
                "unratedGroups": len(members) - len(rated),
                "complete": not missing and not duplicated and not out_of_range,
                "missingQuestions": missing,
                "duplicatedQuestions": duplicated,
                "outOfRangeQuestions": out_of_range,
            }
        )

    tests.sort(key=lambda row: (row["skill"], row["volume"], row["test"]))
    return tests


# --------------------------------------------------------------------------- #
# Statistics                                                                  #
# --------------------------------------------------------------------------- #


def build_type_table(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One row per canonical question type observed, with where it occurs."""
    rows: list[dict[str, Any]] = []
    for canonical in CANONICAL_TYPES:
        members = [group for group in groups if group["questionType"] == canonical]
        if not members:
            continue
        labels = sorted({group["sourceLabel"] for group in members})
        rated = collections.Counter(
            group["difficulty"] for group in members if group["difficulty"] is not None
        )
        rows.append(
            {
                "questionType": canonical,
                "groups": len(members),
                "questions": sum(group["questions"] for group in members),
                "bySkill": sorted_counts(collections.Counter(group["skill"] for group in members)),
                "byPart": dict(
                    sorted(collections.Counter(str(group["part"]) for group in members).items())
                ),
                "difficultyCounts": distribution(rated, DIFFICULTIES),
                "medianGroupSize": sorted(group["questions"] for group in members)[len(members) // 2],
                "sourceLabels": labels,
                "approximate": any(group["approximate"] for group in members),
                "note": next(
                    (APPROXIMATION_NOTES[label] for label in labels if label in APPROXIMATION_NOTES),
                    None,
                ),
            }
        )
    return rows


def build_scene_table(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One row per subject scene, with the task families it attracts."""
    by_scene: dict[str, list[dict[str, Any]]] = collections.defaultdict(list)
    for group in groups:
        if group["scene"] is not None:
            by_scene[group["scene"]].append(group)

    rows = []
    for scene, members in by_scene.items():
        rated = collections.Counter(
            group["difficulty"] for group in members if group["difficulty"] is not None
        )
        rows.append(
            {
                "scene": scene,
                "label": members[0]["sceneLabel"],
                "sourceLabel": members[0]["sourceScene"],
                "skill": members[0]["skill"],
                "groups": len(members),
                "questions": sum(group["questions"] for group in members),
                "tests": len({group["testId"] for group in members}),
                "volumes": sorted({group["volume"] for group in members}),
                "questionTypes": sorted_counts(
                    collections.Counter(group["questionType"] for group in members)
                ),
                "difficultyCounts": distribution(rated, DIFFICULTIES),
            }
        )
    rows.sort(key=lambda row: (row["skill"], -row["groups"], row["scene"]))
    return rows


def build_volume_table(groups: list[dict[str, Any]], tests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One row per Cambridge volume, for drift analysis across 5-21."""
    volumes = sorted({group["volume"] for group in groups})
    rows = []
    for volume in volumes:
        members = [group for group in groups if group["volume"] == volume]
        volume_tests = [row for row in tests if row["volume"] == volume]
        rated = collections.Counter(
            group["difficulty"] for group in members if group["difficulty"] is not None
        )
        rows.append(
            {
                "volume": volume,
                "tests": len(volume_tests),
                "completeTests": sum(1 for row in volume_tests if row["complete"]),
                "groups": len(members),
                "questionTypes": sorted_counts(
                    collections.Counter(group["questionType"] for group in members)
                ),
                "questionTypesBySkill": {
                    skill: sorted_counts(
                        collections.Counter(
                            group["questionType"] for group in members if group["skill"] == skill
                        )
                    )
                    for skill in ("listening", "reading")
                },
                "scenes": sorted_counts(
                    collections.Counter(
                        group["scene"] for group in members if group["scene"] is not None
                    )
                ),
                "difficultyCounts": distribution(rated, DIFFICULTIES),
                "meanGroupSize": round(
                    sum(group["questions"] for group in members) / len(members), 3
                ),
            }
        )
    return rows


def build_stats(groups: list[dict[str, Any]], tests: list[dict[str, Any]]) -> dict[str, Any]:
    """Index-level aggregate statistics."""
    rated = [group for group in groups if group["difficulty"] is not None]
    volumes = sorted({group["volume"] for group in groups})
    return {
        "annotatedGroups": len(groups),
        "annotatedQuestions": sum(group["questions"] for group in groups),
        "tests": len(tests),
        "completeTests": sum(1 for row in tests if row["complete"]),
        "volumes": volumes,
        "volumeRange": [volumes[0], volumes[-1]],
        "bySkill": sorted_counts(collections.Counter(group["skill"] for group in groups)),
        "byPart": dict(sorted(collections.Counter(str(group["part"]) for group in groups).items())),
        "byQuestionType": sorted_counts(
            collections.Counter(group["questionType"] for group in groups)
        ),
        "byQuestionTypeAndSkill": {
            skill: sorted_counts(
                collections.Counter(
                    group["questionType"] for group in groups if group["skill"] == skill
                )
            )
            for skill in ("listening", "reading")
        },
        "byScene": sorted_counts(
            collections.Counter(group["scene"] for group in groups if group["scene"] is not None)
        ),
        "byDifficulty": distribution(
            collections.Counter(group["difficulty"] for group in rated), DIFFICULTIES
        ),
        "unratedGroups": len(groups) - len(rated),
        "ratedRatio": round(len(rated) / len(groups), 4) if groups else 0,
        "approximateGroups": sum(1 for group in groups if group["approximate"]),
        "groupSize": {
            "min": min(group["questions"] for group in groups),
            "max": max(group["questions"] for group in groups),
            "mean": round(sum(group["questions"] for group in groups) / len(groups), 3),
        },
    }


# --------------------------------------------------------------------------- #
# Build                                                                       #
# --------------------------------------------------------------------------- #


def build(root: Path) -> dict[str, Any]:
    """Build the whole blueprint index from an upstream checkout."""
    groups: list[dict[str, Any]] = []
    provenance: list[dict[str, Any]] = []

    for relative in SOURCES:
        skill = "reading" if "reading" in relative else "listening"
        payload, sha = read_source(root, relative)
        raw_groups = payload["groups"]
        groups.extend(normalise_group(raw, skill) for raw in raw_groups)
        provenance.append(
            {
                "path": relative,
                "skill": skill,
                "sha1": sha,
                "groups": len(raw_groups),
                "url": f"{REPO}/blob/main/{relative}",
            }
        )

    groups.sort(key=lambda group: (group["skill"], group["volume"], group["test"], group["firstQuestion"]))
    tests = build_tests(groups)

    return {
        "meta": {
            "name": "Cambridge IELTS test blueprints",
            "repository": REPO,
            "license": "CC BY 4.0 (this derived index only)",
            "attribution": (
                "Derived from the question-group annotations published in the "
                f"library/ directory of {REPO}."
            ),
            "note": (
                "Annotation metadata only. No passage text, question wording, "
                "answer key or audio is redistributed: the Cambridge IELTS "
                "papers are copyright Cambridge University Press & Assessment, "
                "and the upstream repository publishes no licence. The "
                "difficulty ratings are one annotator's judgement, not an "
                "official or psychometric measure."
            ),
            "sources": provenance,
        },
        "stats": build_stats(groups, tests),
        "types": build_type_table(groups),
        "scenes": build_scene_table(groups),
        "volumes": build_volume_table(groups, tests),
        "tests": tests,
        "groups": groups,
    }


def main(argv: list[str]) -> int:
    """CLI entry point."""
    if len(argv) != 3:
        print(f"usage: {argv[0]} <yysd-checkout> <output.json>", file=sys.stderr)
        return 2
    index = build(Path(argv[1]))
    output = Path(argv[2])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    stats = index["stats"]
    print(
        f"wrote {output} ({stats['annotatedGroups']} groups, "
        f"{stats['annotatedQuestions']} questions, {stats['tests']} tests)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
