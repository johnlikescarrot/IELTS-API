#!/usr/bin/env python3
"""Build the operating-platform index served by ielts-api at `/v1/platform` and `/v1/listening`.

The upstream repository (https://github.com/wanli4473/yysd-testcenter) is an
operating IELTS preparation platform (优益思达). Unlike the previous four
collections, it is not a file dump or a single workbook but a live web product:
377 content pages organised by zone/subject, a 530-group listening taxonomy
(7 question types x 16 scenes x 3 difficulty tiers annotated per Cambridge
listening section), a 36-theme vocabulary browse library, a quarterly speaking
recall bank (ji-jing), an A-Level past-paper catalogue, and two Ebbinghaus
spaced-repetition schedules.

No HTML exam page, audio file, dictionary gloss or college mark is redistributed
here. The script reads the upstream JSON locally and emits derived,
non-substitutive metadata only:

* the manifest structure (zone, subject, duration, description, provenance),
* the listening annotation (volume / test / part / question range / type / scene
  / difficulty) normalised onto an English taxonomy,
* the vocabulary-theme catalogue (category, theme, counts, preview words),
* speaking-recall statistics (topic counts, bullet counts, provenance),
* the A-Level catalogue (boards, subjects, paper counts),
* aggregate statistics and provenance (commit SHA, blob SHAs).

Usage:

    curl -sL "https://api.github.com/repos/wanli4473/yysd-testcenter/git/trees/0956ea375405e30b31bd554822726e4245bf077a?recursive=1" \\
        -o tree.json
    # fetch the six JSON blobs needed (manifest, listening taxonomy, themes,
    # alevel catalog, speaking bank, two schedules) into ./upstream
    python3 scripts/extract_platform.py tree.json ./upstream data/platform.json

``./upstream`` holds the upstream files at their repository paths (a clone or
a sparse checkout). Missing files are tolerated for manifests that move.
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

REPO = "https://github.com/wanli4473/yysd-testcenter"
COMMIT = "0956ea375405e30b31bd554822726e4245bf077a"

# ---------------------------------------------------------------------------
# Listening taxonomy translation
# ---------------------------------------------------------------------------

TYPE_MAP: dict[str, dict[str, str]] = {
    "填空题": {
        "id": "gap-fill",
        "name": "Gap fill",
        "description": "Form, note, table, sentence or summary completion; the candidate writes a short answer that fits the gap.",
    },
    "配对题": {
        "id": "matching",
        "name": "Matching",
        "description": "Match items from two lists (e.g. speakers to opinions, headings to paragraphs, options to statements).",
    },
    "单选题": {
        "id": "multiple-choice-single",
        "name": "Multiple choice (single answer)",
        "description": "Choose one correct answer from three or four options.",
    },
    "多选题": {
        "id": "multiple-choice-multiple",
        "name": "Multiple choice (multiple answers)",
        "description": "Choose two or three correct answers from a longer option list.",
    },
    "地图题": {
        "id": "map-labelling",
        "name": "Map / plan labelling",
        "description": "Label a map or plan with letters or short phrases; tests spatial language and follow-up directions.",
    },
    "流程题": {
        "id": "diagram-labelling",
        "name": "Diagram / flowchart / process labelling",
        "description": "Label a diagram, flowchart or process; tests sequencing and technical description.",
    },
    "简答题": {
        "id": "short-answer",
        "name": "Short answer",
        "description": "Answer a question with a short phrase (usually no more than three words); tests precise extraction.",
    },
}

SCENE_MAP: dict[str, dict[str, str]] = {
    "求职": {"id": "job-application", "name": "Job application", "description": "Job adverts, interviews, recruitment and workplace roles."},
    "经营管理": {"id": "business-management", "name": "Business and management", "description": "Company organisation, marketing, management and business operations."},
    "地理": {"id": "geography", "name": "Geography", "description": "Landforms, climate, maps and physical geography."},
    "旅游": {"id": "travel", "name": "Travel and tourism", "description": "Travel planning, itineraries, accommodation and tourist services."},
    "日常生活": {"id": "daily-life", "name": "Daily life", "description": "Everyday conversation, shopping, appointments and daily routines."},
    "建筑环境": {"id": "built-environment", "name": "Built environment", "description": "Architecture, campus buildings, city planning and facilities."},
    "健康医疗": {"id": "health-medicine", "name": "Health and medicine", "description": "Health services, medicine, diet and exercise."},
    "住宿": {"id": "accommodation", "name": "Accommodation", "description": "Housing, rentals, dormitories and neighbourhood facilities."},
    "运动": {"id": "sports", "name": "Sports", "description": "Sports events, activities, exercise and recreation."},
    "图书馆": {"id": "library", "name": "Library", "description": "Library orientation, borrowing rules and study resources."},
    "保险": {"id": "insurance", "name": "Insurance", "description": "Insurance policies, claims and financial protection."},
    "新生入学": {"id": "orientation", "name": "Orientation", "description": "Freshman orientation, course registration and campus introduction."},
    "作业讨论": {"id": "assignment-discussion", "name": "Assignment discussion", "description": "Students discussing or tutoring an assignment or coursework."},
    "人文社科": {"id": "humanities-social-sciences", "name": "Humanities and social sciences", "description": "History, sociology, linguistics and other humanities topics."},
    "生物": {"id": "biology", "name": "Biology", "description": "Animals, ecosystems, biology lectures and natural science."},
    "课题研究": {"id": "research-project", "name": "Research project", "description": "Research methodology, fieldwork, data collection and project discussion."},
}

DIFF_MAP: dict[str, dict[str, str]] = {
    "易": {"id": "easy", "name": "Easy"},
    "中": {"id": "medium", "name": "Medium"},
    "难": {"id": "hard", "name": "Hard"},
    "": {"id": "unrated", "name": "Unrated"},
}


def read_json(path: Path) -> Any | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def build(tree_path: Path, source_dir: Path) -> dict[str, Any]:
    tree = json.loads(tree_path.read_text(encoding="utf-8"))
    entries = {node["path"]: node for node in tree["tree"] if node["type"] == "blob"}

    # ------------------------------------------------------------------ #
    # Manifest
    # ------------------------------------------------------------------ #
    manifest_doc = read_json(source_dir / "library/manifest.json") or {"count": 0, "items": [], "generated": ""}
    manifest_items: list[dict[str, Any]] = []
    for raw in manifest_doc.get("items", []):
        # keep only metadata, drop HTML content
        manifest_items.append(
            {
                "id": str(raw.get("id", "")),
                "file": str(raw.get("file", "")),
                "title": str(raw.get("title", "")),
                "zone": str(raw.get("zone", "")),
                "subject": str(raw.get("subject", "")),
                "duration": int(raw.get("duration", 0)) if isinstance(raw.get("duration"), int) else 0,
                "description": str(raw.get("description", "")),
                "added": str(raw.get("added", "")),
                "sourcePath": f"library/{raw.get('file','')}",
            }
        )
    manifest_items.sort(key=lambda x: x["id"])
    by_zone = Counter(i["zone"] for i in manifest_items)
    by_subject = Counter(f"{i['zone']}/{i['subject']}" for i in manifest_items)
    by_zone_subject = Counter((i["zone"], i["subject"]) for i in manifest_items)
    manifest_stats = {
        "totalItems": len(manifest_items),
        "generated": manifest_doc.get("generated", ""),
        "byZone": dict(sorted(by_zone.items())),
        "bySubject": dict(sorted(by_subject.items())),
        "avgDuration": round(sum(i["duration"] for i in manifest_items) / len(manifest_items), 2) if manifest_items else 0,
        "zones": sorted(by_zone.keys()),
        "subjects": sorted({i["subject"] for i in manifest_items}),
    }

    # ------------------------------------------------------------------ #
    # Listening taxonomy
    # ------------------------------------------------------------------ #
    listening_doc = read_json(source_dir / "library/listening-taxonomy.json") or {
        "types": [],
        "scenes": [],
        "diffs": [],
        "groups": [],
    }
    raw_types: list[str] = listening_doc.get("types", [])
    raw_scenes: list[str] = listening_doc.get("scenes", [])
    raw_diffs: list[str] = listening_doc.get("diffs", [])
    raw_groups: list[dict[str, Any]] = listening_doc.get("groups", [])

    listening_types: list[dict[str, Any]] = []
    type_counts = Counter(g.get("qType", "") for g in raw_groups)
    for zh in raw_types:
        mapped = TYPE_MAP.get(zh, {"id": zh, "name": zh, "description": ""})
        listening_types.append(
            {
                "id": mapped["id"],
                "chinese": zh,
                "name": mapped["name"],
                "description": mapped["description"],
                "occurrences": type_counts.get(zh, 0),
            }
        )
    listening_types.sort(key=lambda x: -x["occurrences"])

    listening_scenes: list[dict[str, Any]] = []
    scene_counts = Counter(g.get("scene", "") for g in raw_groups)
    for zh in raw_scenes:
        mapped = SCENE_MAP.get(zh, {"id": zh, "name": zh, "description": ""})
        listening_scenes.append(
            {
                "id": mapped["id"],
                "chinese": zh,
                "name": mapped["name"],
                "description": mapped["description"],
                "occurrences": scene_counts.get(zh, 0),
            }
        )
    listening_scenes.sort(key=lambda x: -x["occurrences"])

    listening_diffs: list[dict[str, Any]] = []
    diff_counts = Counter(g.get("diff", "") for g in raw_groups)
    for zh in raw_diffs:
        mapped = DIFF_MAP.get(zh, {"id": zh, "name": zh})
        listening_diffs.append(
            {
                "id": mapped["id"],
                "chinese": zh,
                "name": mapped["name"],
                "occurrences": diff_counts.get(zh, 0),
            }
        )
    # add unrated if present but not in list
    if "" in diff_counts and "" not in raw_diffs:
        listening_diffs.append({"id": "unrated", "chinese": "", "name": "Unrated", "occurrences": diff_counts[""]})

    listening_groups: list[dict[str, Any]] = []
    for g in raw_groups:
        zh_type = str(g.get("qType", ""))
        zh_scene = str(g.get("scene", ""))
        zh_diff = str(g.get("diff", ""))
        mapped_type = TYPE_MAP.get(zh_type, {"id": zh_type})["id"]
        mapped_scene = SCENE_MAP.get(zh_scene, {"id": zh_scene or "unassigned"})["id"] if zh_scene else "unassigned"
        mapped_diff = DIFF_MAP.get(zh_diff, {"id": "unrated"})["id"]
        q_from = int(g.get("qFrom", 0))
        q_to = int(g.get("qTo", 0))
        # questions in group
        q_count = q_to - q_from + 1 if q_to >= q_from else 1
        listening_groups.append(
            {
                "id": str(g.get("id", "")),
                "parentId": str(g.get("parentId", "")),
                "volume": str(g.get("volume", "")),
                "test": str(g.get("test", "")),
                "part": int(g.get("part", 0)),
                "qFrom": q_from,
                "qTo": q_to,
                "questions": q_count,
                "qType": mapped_type,
                "qTypeChinese": zh_type,
                "scene": mapped_scene,
                "sceneChinese": zh_scene,
                "diff": mapped_diff,
                "diffChinese": zh_diff,
            }
        )
    listening_groups.sort(key=lambda x: (int(x["volume"]) if x["volume"].isdigit() else x["volume"], int(x["test"]) if x["test"].isdigit() else x["test"], x["part"], x["qFrom"]))

    by_volume = Counter(g["volume"] for g in listening_groups)
    by_part = Counter(g["part"] for g in listening_groups)
    by_qtype = Counter(g["qType"] for g in listening_groups)
    by_scene = Counter(g["scene"] for g in listening_groups)
    by_diff = Counter(g["diff"] for g in listening_groups)
    total_listening_questions = sum(g["questions"] for g in listening_groups)
    listening_stats = {
        "groups": len(listening_groups),
        "questions": total_listening_questions,
        "volumes": sorted(by_volume.keys(), key=lambda v: int(v) if v.isdigit() else v),
        "byVolume": dict(sorted(by_volume.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else kv[0])),
        "byPart": {str(k): v for k, v in sorted(by_part.items())},
        "byType": dict(sorted(by_qtype.items())),
        "byScene": dict(sorted(by_scene.items())),
        "byDiff": dict(sorted(by_diff.items())),
        "types": len(listening_types),
        "scenes": len(listening_scenes),
        "diffs": len(listening_diffs),
        "avgQuestionsPerGroup": round(total_listening_questions / len(listening_groups), 2) if listening_groups else 0,
    }

    # ------------------------------------------------------------------ #
    # Vocab themes
    # ------------------------------------------------------------------ #
    themes_doc = read_json(source_dir / "library/study/vocab-themes/themes.json") or {
        "categories": [],
        "themes": [],
        "sourceNote": "",
    }
    categories = themes_doc.get("categories", [])
    themes = themes_doc.get("themes", [])
    # normalise
    theme_items: list[dict[str, Any]] = []
    for t in themes:
        theme_items.append(
            {
                "id": str(t.get("id", "")),
                "title": str(t.get("title", "")),
                "category": str(t.get("category", "")),
                "desc": str(t.get("desc", "")),
                "count": int(t.get("count", 0)),
                "defined": int(t.get("defined", 0)),
                "preview": list(t.get("preview", []))[:12],
                "dataFile": str(t.get("dataFile", "")),
            }
        )
    theme_items.sort(key=lambda x: x["id"])
    by_category = Counter(t["category"] for t in theme_items)
    vocab_themes_stats = {
        "categories": len(categories),
        "themes": len(theme_items),
        "totalWords": sum(t["count"] for t in theme_items),
        "totalDefined": sum(t["defined"] for t in theme_items),
        "byCategory": dict(sorted(by_category.items())),
        "avgWordsPerTheme": round(sum(t["count"] for t in theme_items) / len(theme_items), 2) if theme_items else 0,
    }

    # ------------------------------------------------------------------ #
    # Speaking ji-jing
    # ------------------------------------------------------------------ #
    jijing_doc = read_json(source_dir / "data/speaking/jiijing-banks/2026-q2.json") or {
        "id": "",
        "title": "",
        "source": "",
        "part1": [],
        "part2": [],
    }
    part1 = jijing_doc.get("part1", [])
    part2 = jijing_doc.get("part2", [])
    # part1: each topic has id, topic, questions list
    p1_topics = []
    p1_questions = 0
    for topic in part1:
        qs = topic.get("questions", [])
        p1_questions += len(qs)
        p1_topics.append(
            {
                "id": str(topic.get("id", "")),
                "topic": str(topic.get("topic", "")),
                "questions": len(qs),
            }
        )
    p2_topics = []
    p2_bullets = 0
    p2_part3 = 0
    for cue in part2:
        bullets = cue.get("bullets", [])
        p3 = cue.get("part3", [])
        p2_bullets += len(bullets)
        p2_part3 += len(p3)
        p2_topics.append(
            {
                "id": str(cue.get("id", "")),
                "title": str(cue.get("title", "")),
                "bullets": len(bullets),
                "part3Questions": len(p3),
            }
        )
    speaking_stats = {
        "bankId": str(jijing_doc.get("id", "")),
        "bankTitle": str(jijing_doc.get("title", "")),
        "source": str(jijing_doc.get("source", "")),
        "part1Topics": len(p1_topics),
        "part1Questions": p1_questions,
        "part2Cues": len(p2_topics),
        "part2Bullets": p2_bullets,
        "part3Questions": p2_part3,
        "totalQuestions": p1_questions + p2_part3 + len(p2_topics),  # cues themselves
        "totalTopics": len(p1_topics) + len(p2_topics),
        "avgQuestionsPerP1Topic": round(p1_questions / len(p1_topics), 2) if p1_topics else 0,
        "avgBulletsPerCue": round(p2_bullets / len(p2_topics), 2) if p2_topics else 0,
    }

    # ------------------------------------------------------------------ #
    # A-Level catalog
    # ------------------------------------------------------------------ #
    alevel_doc = read_json(source_dir / "library/alevel-catalog.json") or {"boards": []}
    boards = alevel_doc.get("boards", [])
    alevel_boards: list[dict[str, Any]] = []
    total_subjects = 0
    total_papers = 0
    for board in boards:
        subjects = board.get("subjects", [])
        paper_count = sum(int(s.get("paperCount", 0) or 0) for s in subjects)
        total_subjects += len(subjects)
        total_papers += paper_count
        alevel_boards.append(
            {
                "id": str(board.get("id", "")),
                "label": str(board.get("label", "")),
                "labelZh": str(board.get("labelZh", "")),
                "subjects": len(subjects),
                "paperCount": paper_count,
            }
        )
    alevel_stats = {
        "boards": len(alevel_boards),
        "subjects": total_subjects,
        "papers": total_papers,
        "byBoard": {b["id"]: b["paperCount"] for b in alevel_boards},
    }

    # ------------------------------------------------------------------ #
    # Schedules
    # ------------------------------------------------------------------ #
    cet4_sched = read_json(source_dir / "server/schedules/cet4-lite-ebbinghaus-schedule.json") or {}
    gaozhong_sched = read_json(source_dir / "server/schedules/gaozhong-ebbinghaus-schedule.json") or {}
    schedules = []
    for doc, key in [(cet4_sched, "cet4-lite"), (gaozhong_sched, "gaozhong")]:
        if not doc:
            continue
        days = doc.get("days", {})
        schedules.append(
            {
                "bookId": str(doc.get("bookId", key)),
                "totalDays": int(doc.get("totalDays", len(days))),
                "totalLists": int(doc.get("totalLists", 0) or len([v for v in days.values() if v.get("new") is not None])),
                "days": len(days),
            }
        )

    # ------------------------------------------------------------------ #
    # Upstream file counts
    # ------------------------------------------------------------------ #
    files_in_repo = len([n for n in entries.values() if n["type"] == "blob"])
    # indexed files: manifest items + listening groups etc. For provenance we report counts above.
    stats = {
        "filesInRepository": files_in_repo,
        "manifestItems": len(manifest_items),
        "listeningGroups": len(listening_groups),
        "listeningQuestions": total_listening_questions,
        "vocabThemes": len(theme_items),
        "vocabCategories": len(categories),
        "speakingTopics": speaking_stats["totalTopics"],
        "speakingQuestions": speaking_stats["totalQuestions"],
        "alevelBoards": len(alevel_boards),
        "alevelSubjects": total_subjects,
        "alevelPapers": total_papers,
        "schedules": len(schedules),
        "listening": listening_stats,
        "manifest": manifest_stats,
        "vocabThemesStats": vocab_themes_stats,
        "speaking": speaking_stats,
        "alevel": alevel_stats,
    }

    # blob SHAs for the key files
    key_files = [
        "library/manifest.json",
        "library/listening-taxonomy.json",
        "library/study/vocab-themes/themes.json",
        "library/alevel-catalog.json",
        "data/speaking/jiijing-banks/2026-q2.json",
        "server/schedules/cet4-lite-ebbinghaus-schedule.json",
        "server/schedules/gaozhong-ebbinghaus-schedule.json",
    ]
    blobs = {path: entries[path].get("sha") if path in entries else None for path in key_files}

    return {
        "meta": {
            "name": "Operating IELTS platform index: manifest, listening taxonomy, vocab themes, speaking recall and A-Level catalogue",
            "repository": REPO,
            "commit": COMMIT,
            "license": "CC BY 4.0",
            "attribution": f"Derived metadata index of the collections published at {REPO} (commit {COMMIT}).",
            "note": "Derived metadata only: manifest structure, listening annotation (volume/test/part/question range/type/scene/difficulty), vocabulary-theme catalogue, speaking-recall statistics and A-Level catalogue. No HTML exam page, audio file, dictionary gloss or college essay is redistributed by this API.",
            "generated": "2026-09-03",
            "upstreamFiles": files_in_repo,
            "blobs": blobs,
            "collections": {
                "manifest": "Content pages organised by zone/subject (library/manifest.json).",
                "listening-taxonomy": "Per-section listening annotation: question type, scene and difficulty (library/listening-taxonomy.json).",
                "vocab-themes": "Thematic vocabulary browse library (library/study/vocab-themes/themes.json).",
                "speaking-jiijing": "Quarterly speaking recall bank (data/speaking/jiijing-banks/2026-q2.json).",
                "alevel-catalog": "A-Level past-paper catalogue (library/alevel-catalog.json).",
                "schedules": "Ebbinghaus spaced-repetition schedules (server/schedules/*.json).",
            },
        },
        "stats": stats,
        "manifest": {"items": manifest_items, "stats": manifest_stats},
        "listening": {
            "types": listening_types,
            "scenes": listening_scenes,
            "diffs": listening_diffs,
            "groups": listening_groups,
            "stats": listening_stats,
        },
        "vocabThemes": {"categories": categories, "themes": theme_items, "stats": vocab_themes_stats},
        "speaking": {
            "bank": {
                "id": jijing_doc.get("id", ""),
                "title": jijing_doc.get("title", ""),
                "source": jijing_doc.get("source", ""),
                "part1": p1_topics,
                "part2": p2_topics,
                "stats": speaking_stats,
            }
        },
        "alevel": {"boards": alevel_boards, "stats": alevel_stats},
        "schedules": schedules,
    }


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(__doc__, file=sys.stderr)
        print("usage: extract_platform.py <tree.json> <source-dir> <out.json>", file=sys.stderr)
        return 2
    document = build(Path(argv[1]), Path(argv[2]))
    output = Path(argv[3])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(document, indent=1, ensure_ascii=False, sort_keys=False) + "\n", encoding="utf-8")
    s = document["stats"]
    print(
        f"wrote {output}: {s['manifestItems']} manifest items, "
        f"{s['listeningGroups']} listening groups ({s['listeningQuestions']} questions), "
        f"{s['vocabThemes']} themes, {s['speakingTopics']} speaking topics, "
        f"{s['alevelPapers']} A-Level papers"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
