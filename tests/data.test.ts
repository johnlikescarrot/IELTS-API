/**
 * Dataset integrity: these tests guard the scholarly quality of the corpus.
 * They assert uniqueness, referential consistency, enum validity, and the
 * completeness of every answer/explanation pair.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODULES,
  MISTAKE_CATEGORIES,
  PARTS_OF_SPEECH,
  QUESTION_TYPES,
  RAW_SCORE_SKILLS,
  SKILLS,
  TIP_SKILLS,
  type Question,
  type SpeakingItem,
} from "../src/types.js";
import { RAW_SCORE_TABLES, rawToBand } from "../src/lib/band.js";
import {
  allQuestions,
  datasetCounts,
  listeningTests,
  practiceTests,
  readingTests,
  sectionsById,
  speakingItems,
  speakingTopics,
  tips,
  wordTopics,
  words,
  writingMistakes,
  writingTasks,
} from "../src/data/index.js";

function assertUniqueIds(items: readonly { id: string }[]): void {
  const ids = new Set(items.map((item) => item.id));
  assert.equal(ids.size, items.length, "ids must be unique");
}

test("vocabulary dataset integrity", () => {
  assertUniqueIds(words);
  assert.ok(words.length >= 40, "a substantial vocabulary corpus");
  for (const word of words) {
    assert.ok(PARTS_OF_SPEECH.includes(word.partOfSpeech), word.id);
    assert.ok(word.band >= 5 && word.band <= 9, word.id);
    assert.ok(word.ipa.startsWith("/") && word.ipa.endsWith("/"), word.id);
    assert.ok(word.meaning.length >= 10, word.id);
    assert.ok(word.example.length >= 20, word.id);
    assert.ok(word.synonyms.length >= 1, word.id);
    assert.ok(word.collocations.length >= 1, word.id);
    assert.ok(wordTopics.includes(word.topic), word.id);
  }
});

test("word topics derive exactly from the data", () => {
  const expected = [...new Set(words.map((w) => w.topic))].sort((a, b) =>
    a.localeCompare(b),
  );
  assert.deepEqual([...wordTopics], expected);
});

test("practice tests and sections are consistent", () => {
  assertUniqueIds(practiceTests);
  const allSections = practiceTests.flatMap((t) => t.sections);
  assertUniqueIds(allSections);
  assert.equal(sectionsById.size, allSections.length);

  for (const test of practiceTests) {
    assert.ok(test.minutes > 0, test.id);
    assert.ok(test.sections.length >= 2, test.id);
    assert.ok(MODULES.includes(test.module) || test.module === "both", test.id);
  }

  for (const test of readingTests) {
    assert.equal(test.skill, "reading");
    for (const section of test.sections) {
      assert.ok(section.passage.length >= 400, section.id);
      assert.ok(section.questions.length >= 5, section.id);
      const headingQuestions = section.questions.filter(
        (q) => q.type === "matching_headings",
      );
      if (headingQuestions.length > 0) {
        assert.ok(
          section.headings.length >= headingQuestions.length + 2,
          section.id,
        );
      }
    }
  }

  for (const test of listeningTests) {
    assert.equal(test.module, "both");
    for (const section of test.sections) {
      assert.ok(section.transcript.length >= 200, section.id);
      assert.ok(section.scenario.length >= 10, section.id);
    }
  }
});

test("every question is answerable and explained", () => {
  assertUniqueIds(allQuestions);
  for (const question of allQuestions) {
    assert.ok(QUESTION_TYPES.includes(question.type), question.id);
    assert.ok(question.explanation.length >= 20, question.id);
    assert.ok(question.band >= 5 && question.band <= 9, question.id);
    const q = question as Question;
    if (q.type === "multiple_choice") {
      assert.ok(q.options.includes(q.answer), question.id);
      assert.ok(q.options.length >= 3, question.id);
    } else if (q.type === "true_false_not_given") {
      assert.ok(["true", "false", "not_given"].includes(q.answer), question.id);
    } else if (q.type === "matching_headings") {
      const section = sectionsById.get(question.sectionId);
      assert.ok(section !== undefined, question.id);
      assert.ok(section!.section.headings.includes(q.answer), question.id);
    } else {
      assert.ok(q.answer.length >= 1, question.id);
      const answerWords = q.answer.trim().split(/\s+/).length;
      assert.ok(answerWords <= q.wordLimit, question.id);
    }
    assert.ok(question.prompt.length >= 10, question.id);
  }
  const expectedCount = practiceTests.reduce(
    (sum, t) =>
      sum + t.sections.reduce((s, sec) => s + sec.questions.length, 0),
    0,
  );
  assert.equal(allQuestions.length, expectedCount);
});

test("writing tasks meet length and format requirements", () => {
  assertUniqueIds(writingTasks);
  for (const task of writingTasks) {
    assert.ok(task.task === 1 || task.task === 2, task.id);
    const minimum = task.task === 1 ? 150 : 250;
    const wordCount = task.modelAnswer.split(/\s+/).length;
    assert.ok(wordCount >= minimum, `${task.id} has ${wordCount} words`);
    assert.ok(task.prompt.length >= 50, task.id);
    assert.ok(task.keyPoints.length >= 3, task.id);
    assert.ok(task.usefulVocabulary.length >= 4, task.id);
    assert.ok(task.modelBand >= 7 && task.modelBand <= 9, task.id);
    if (task.task === 1) {
      assert.ok(task.format === "report" || task.format === "letter", task.id);
      assert.equal(task.minutes, 20);
    } else {
      assert.equal(task.format, "essay");
      assert.equal(task.minutes, 40);
    }
  }
});

test("writing mistakes dataset integrity", () => {
  assertUniqueIds(writingMistakes);
  assert.ok(writingMistakes.length >= 20);
  for (const mistake of writingMistakes) {
    assert.ok(MISTAKE_CATEGORIES.includes(mistake.category), mistake.id);
    assert.notEqual(mistake.incorrect, mistake.corrected, mistake.id);
    assert.ok(mistake.explanation.length >= 30, mistake.id);
  }
});

test("speaking bank integrity", () => {
  assertUniqueIds(speakingItems);
  const parts = speakingItems.map((item) => item.part).sort();
  assert.deepEqual(parts, [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3]);
  for (const item of speakingItems) {
    assert.ok(speakingTopics.includes(item.topic), item.id);
    if (item.part === 2) {
      assert.ok(item.sampleAnswer.split(/\s+/).length >= 80, item.id);
      assert.ok(item.points.length >= 3, item.id);
      assert.ok(item.keyVocabulary.length >= 3, item.id);
      for (const entry of item.keyVocabulary) {
        assert.ok(entry.term.length > 0 && entry.meaning.length > 0, item.id);
      }
    } else {
      assert.ok(item.questions.length >= 4, item.id);
      if (item.part === 3) {
        assert.ok(item.strategy.length >= 30, item.id);
      }
    }
  }
});

test("tips dataset integrity", () => {
  assertUniqueIds(tips);
  for (const tip of tips) {
    assert.ok(
      TIP_SKILLS.includes(tip.skill as (typeof SKILLS)[number] | "general"),
      tip.id,
    );
    assert.ok(tip.detail.length >= 50, tip.id);
    assert.ok(tip.title.length >= 5, tip.id);
  }
  for (const skill of SKILLS) {
    assert.ok(
      tips.some((tip) => tip.skill === skill),
      `expected tips for ${skill}`,
    );
  }
});

test("band tables are complete, ordered, and cover every raw score", () => {
  for (const skill of RAW_SCORE_SKILLS) {
    const table = RAW_SCORE_TABLES[skill];
    assert.ok(table.length >= 10, skill);
    assert.equal(table[0]!.band, 9, `${skill} starts at band 9`);
    assert.equal(table[table.length - 1]!.minRaw, 0, `${skill} ends at 0`);
    for (let i = 1; i < table.length; i += 1) {
      assert.ok(
        table[i]!.minRaw < table[i - 1]!.minRaw,
        `${skill} brackets must descend`,
      );
      assert.ok(
        table[i]!.band <= table[i - 1]!.band,
        `${skill} bands must not increase`,
      );
      assert.ok((table[i]!.band * 2) % 1 === 0, `${skill} half-band steps`);
    }
    for (let raw = 0; raw <= 40; raw += 1) {
      const band = rawToBand(skill, raw);
      assert.ok(band >= 1 && band <= 9, `${skill} raw ${raw} -> ${band}`);
    }
  }
});

test("advertised dataset counts match the raw collections", () => {
  assert.equal(datasetCounts.words, words.length);
  assert.equal(datasetCounts.readingTests, readingTests.length);
  assert.equal(datasetCounts.listeningTests, listeningTests.length);
  assert.equal(datasetCounts.practiceQuestions, allQuestions.length);
  assert.equal(datasetCounts.writingTasks, writingTasks.length);
  assert.equal(datasetCounts.writingMistakes, writingMistakes.length);
  assert.equal(datasetCounts.speakingItems, speakingItems.length);
  assert.equal(datasetCounts.tips, tips.length);
  const speaking: readonly SpeakingItem[] = speakingItems;
  assert.ok(speaking.length >= 14);
});
