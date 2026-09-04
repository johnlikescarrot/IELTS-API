import { describe, expect, it } from "vitest";

import { getTopicById, isTopicId, topics } from "../src/data/topics.js";
import {
  getVocabularyById,
  getVocabularyByTopic,
  searchVocabulary,
  vocabulary,
} from "../src/data/vocabulary.js";
import { getSynonymById, searchSynonyms, synonymGroups } from "../src/data/synonyms.js";
import {
  getBandDescriptorById,
  getBandDescriptors,
  bandDescriptors,
} from "../src/data/band-descriptors.js";
import { getWritingTaskById, getWritingTasks, writingTasks } from "../src/data/writing.js";
import {
  getCueCardById,
  getSpeakingPartById,
  searchSpeaking,
  speakingCueCards,
  speakingParts,
} from "../src/data/speaking.js";
import {
  getReadingQuestionTypeById,
  readingQuestionTypes,
  searchReadingQuestionTypes,
} from "../src/data/reading.js";
import { getIdiomById, getIdiomsByTopic, idioms, searchIdioms } from "../src/data/idioms.js";
import { commonMistakes, getMistakeById, searchMistakes } from "../src/data/common-mistakes.js";
import { examTips, getTipById, getTipsBySkill, searchTips } from "../src/data/tips.js";

import { optionalInt, optionalSkill, optionalString, optionalTask } from "../src/lib/params.js";
import { paginate, parseNonNegativeInt, parsePagination } from "../src/lib/query.js";

describe("topics data", () => {
  it("returns the full topic set", () => {
    expect(topics.length).toBeGreaterThan(0);
  });

  it("looks up a topic by id", () => {
    expect(getTopicById("education")?.name).toBe("Education");
    expect(getTopicById("nope")).toBeUndefined();
  });

  it("validates topic ids", () => {
    expect(isTopicId("environment")).toBe(true);
    expect(isTopicId("totally-fake")).toBe(false);
  });
});

describe("vocabulary data", () => {
  it("filters by topic", () => {
    expect(getVocabularyByTopic("education").length).toBeGreaterThan(0);
    expect(getVocabularyByTopic("nope")).toEqual([]);
  });

  it("looks up by id", () => {
    expect(getVocabularyById("vocab-educ-1")?.word).toBe("curriculum");
    expect(getVocabularyById("nope")).toBeUndefined();
  });

  it("searches by keyword, definition and synonyms", () => {
    expect(searchVocabulary("")).toHaveLength(vocabulary.length);
    expect(searchVocabulary("curriculum")[0]?.id).toBe("vocab-educ-1");
    expect(searchVocabulary("syllabus").some((v) => v.word === "curriculum")).toBe(true);
    expect(searchVocabulary("climate change").some((v) => v.word === "deforestation")).toBe(true);
    expect(searchVocabulary("zzz-no-match")).toEqual([]);
  });
});

describe("synonyms data", () => {
  it("looks up by id", () => {
    expect(getSynonymById("syn-important")?.headword).toBe("important");
    expect(getSynonymById("nope")).toBeUndefined();
  });

  it("searches by headword or contained words", () => {
    expect(searchSynonyms("")).toHaveLength(synonymGroups.length);
    expect(searchSynonyms("crucial")[0]?.id).toBe("syn-important");
    expect(searchSynonyms("no-match")).toEqual([]);
  });
});

describe("band descriptor data", () => {
  it("filters by skill only", () => {
    expect(getBandDescriptors("writing")).toHaveLength(
      bandDescriptors.filter((d) => d.skill === "writing").length,
    );
  });

  it("filters by band only", () => {
    expect(getBandDescriptors(undefined, 9)).toHaveLength(
      bandDescriptors.filter((d) => d.band === 9).length,
    );
  });

  it("filters by skill and band", () => {
    const result = getBandDescriptors("writing", 7);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("band-writing-7");
  });

  it("returns all descriptors when no filter is given", () => {
    expect(getBandDescriptors()).toHaveLength(bandDescriptors.length);
  });

  it("looks up by id", () => {
    expect(getBandDescriptorById("band-speaking-6")?.band).toBe(6);
    expect(getBandDescriptorById("nope")).toBeUndefined();
  });
});

describe("writing data", () => {
  it("filters by task only", () => {
    expect(getWritingTasks(2)).toHaveLength(writingTasks.filter((w) => w.task === 2).length);
  });

  it("filters by topic only", () => {
    expect(getWritingTasks(undefined, "education")).toHaveLength(
      writingTasks.filter((w) => w.topicId === "education").length,
    );
  });

  it("filters by task and topic", () => {
    expect(getWritingTasks(1, "technology")).toHaveLength(1);
  });

  it("returns all when no filter is given", () => {
    expect(getWritingTasks()).toHaveLength(writingTasks.length);
  });

  it("looks up by id", () => {
    expect(getWritingTaskById("writing-t2-education-1")?.task).toBe(2);
    expect(getWritingTaskById("nope")).toBeUndefined();
  });
});

describe("speaking data", () => {
  it("looks up parts and cue cards by id", () => {
    expect(getSpeakingPartById("speak-1-hometown")?.question).toContain("Where are you from");
    expect(getSpeakingPartById("nope")).toBeUndefined();
    expect(getCueCardById("cue-tech-1")?.title).toBe("A useful app");
    expect(getCueCardById("nope")).toBeUndefined();
  });

  it("returns everything with an empty query", () => {
    const all = searchSpeaking("");
    expect(all.parts).toHaveLength(speakingParts.length);
    expect(all.cueCards).toHaveLength(speakingCueCards.length);
  });

  it("matches a part question", () => {
    const all = searchSpeaking("hometown");
    expect(all.parts.length).toBeGreaterThan(0);
    expect(all.cueCards).toHaveLength(0);
  });

  it("matches a cue card", () => {
    const all = searchSpeaking("app");
    expect(all.parts).toHaveLength(0);
    expect(all.cueCards.length).toBeGreaterThan(0);
  });

  it("handles a non-matching query", () => {
    const all = searchSpeaking("zzz-no-match");
    expect(all.parts).toHaveLength(0);
    expect(all.cueCards).toHaveLength(0);
  });
});

describe("reading data", () => {
  it("looks up by id", () => {
    expect(getReadingQuestionTypeById("reading-tfng")?.name).toContain("True");
    expect(getReadingQuestionTypeById("nope")).toBeUndefined();
  });

  it("searches", () => {
    expect(searchReadingQuestionTypes("")).toHaveLength(readingQuestionTypes.length);
    expect(searchReadingQuestionTypes("headings")[0]?.id).toBe("reading-headings");
    expect(searchReadingQuestionTypes("no-match")).toEqual([]);
  });
});

describe("idiom data", () => {
  it("looks up by id", () => {
    expect(getIdiomById("idiom-1")?.expression).toBe("a double-edged sword");
    expect(getIdiomById("nope")).toBeUndefined();
  });

  it("filters by topic", () => {
    expect(getIdiomsByTopic("technology").length).toBeGreaterThan(0);
    expect(getIdiomsByTopic("crime")).toEqual([]);
  });

  it("searches", () => {
    expect(searchIdioms("")).toHaveLength(idioms.length);
    expect(searchIdioms("iceberg")[0]?.id).toBe("idiom-2");
    expect(searchIdioms("no-match")).toEqual([]);
  });
});

describe("common mistakes data", () => {
  it("looks up by id", () => {
    expect(getMistakeById("mistake-1")?.category).toBe("word choice");
    expect(getMistakeById("nope")).toBeUndefined();
  });

  it("searches", () => {
    expect(searchMistakes("")).toHaveLength(commonMistakes.length);
    expect(searchMistakes("goverment")[0]?.id).toBe("mistake-5");
    expect(searchMistakes("no-match")).toEqual([]);
  });
});

describe("tips data", () => {
  it("looks up by id", () => {
    expect(getTipById("tip-listening-1")?.skill).toBe("listening");
    expect(getTipById("nope")).toBeUndefined();
  });

  it("filters by skill", () => {
    expect(getTipsBySkill("listening").length).toBeGreaterThan(0);
    expect(getTipsBySkill("music")).toEqual([]);
  });

  it("searches", () => {
    expect(searchTips("")).toHaveLength(examTips.length);
    expect(searchTips("plan")[0]?.id).toBe("tip-writing-1");
    expect(searchTips("no-match")).toEqual([]);
  });
});

describe("params helpers", () => {
  it("optionalInt", () => {
    expect(optionalInt("3")).toBe(3);
    expect(optionalInt("abc")).toBeUndefined();
    expect(optionalInt("")).toBeUndefined();
    expect(optionalInt(4)).toBe(4);
    expect(optionalInt(-1)).toBeUndefined();
    expect(optionalInt(2.5)).toBeUndefined();
    expect(optionalInt(undefined)).toBeUndefined();
    expect(optionalInt(null)).toBeUndefined();
  });

  it("optionalString", () => {
    expect(optionalString("  hello ")).toBe("hello");
    expect(optionalString("")).toBeUndefined();
    expect(optionalString("   ")).toBeUndefined();
    expect(optionalString(undefined)).toBeUndefined();
    expect(optionalString(42)).toBeUndefined();
  });

  it("optionalTask", () => {
    expect(optionalTask("1")).toBe(1);
    expect(optionalTask("2")).toBe(2);
    expect(optionalTask("3")).toBeUndefined();
    expect(optionalTask(undefined)).toBeUndefined();
  });

  it("optionalSkill", () => {
    expect(optionalSkill("writing")).toBe("writing");
    expect(optionalSkill("Writing")).toBe("writing");
    expect(optionalSkill("music")).toBeUndefined();
    expect(optionalSkill(undefined)).toBeUndefined();
    expect(optionalSkill(7)).toBeUndefined();
  });
});

describe("query helpers", () => {
  it("parseNonNegativeInt handles strings", () => {
    expect(parseNonNegativeInt("10", 5)).toBe(10);
    expect(parseNonNegativeInt("abc", 5)).toBe(5);
    expect(parseNonNegativeInt("", 5)).toBe(5);
  });

  it("parseNonNegativeInt handles numbers and other types", () => {
    expect(parseNonNegativeInt(7, 5)).toBe(7);
    expect(parseNonNegativeInt(-3, 5)).toBe(5);
    expect(parseNonNegativeInt(2.5, 5)).toBe(5);
    expect(parseNonNegativeInt(undefined, 5)).toBe(5);
    expect(parseNonNegativeInt(null, 5)).toBe(5);
  });

  it("parsePagination clamps limit and defaults offset", () => {
    expect(parsePagination({ limit: "500" }, { defaultLimit: 20, maxLimit: 100 })).toEqual({
      limit: 100,
      offset: 0,
    });
    expect(
      parsePagination({ limit: "5", offset: "3" }, { defaultLimit: 20, maxLimit: 100 }),
    ).toEqual({ limit: 5, offset: 3 });
    expect(parsePagination({}, { defaultLimit: 20, maxLimit: 100 })).toEqual({
      limit: 20,
      offset: 0,
    });
  });

  it("paginate slices and reports total", () => {
    const items = [1, 2, 3, 4, 5];
    expect(paginate(items, 2, 0)).toEqual({ total: 5, limit: 2, offset: 0, items: [1, 2] });
    expect(paginate(items, 2, 4)).toEqual({ total: 5, limit: 2, offset: 4, items: [5] });
    expect(paginate(items, 10, 10)).toEqual({ total: 5, limit: 10, offset: 10, items: [] });
  });
});
