import { describe, expect, it } from "vitest";
import { analyseWriting } from "../../src/analysis/writing.ts";

/** Builds a deterministic alphabetic pseudo-word for index `n`. */
function uniqueWord(index: number): string {
  let value = index;
  let word = "";
  do {
    word = String.fromCharCode(97 + (value % 26)) + word;
    value = Math.floor(value / 26);
  } while (value > 0);
  return `q${word}`;
}

/** Builds a text of `count` unique words arranged into sentences. */
function uniqueText(count: number, wordsPerSentence = 15): string {
  const words = Array.from({ length: count }, (_unused, index) =>
    uniqueWord(index),
  );
  const sentences: string[] = [];
  for (let index = 0; index < words.length; index += wordsPerSentence) {
    sentences.push(
      `${words.slice(index, index + wordsPerSentence).join(" ")}.`,
    );
  }
  return sentences.join(" ");
}

/** Builds a text of `count` repeated words to force low lexical variety. */
function repeatedText(count: number, wordsPerSentence = 15): string {
  const pool = ["alpha", "beta", "gamma", "delta", "epsilon"];
  const words = Array.from(
    { length: count },
    (_unused, index) => pool[index % pool.length]!,
  );
  const sentences: string[] = [];
  for (let index = 0; index < words.length; index += wordsPerSentence) {
    sentences.push(
      `${words.slice(index, index + wordsPerSentence).join(" ")}.`,
    );
  }
  return sentences.join(" ");
}

const ESSAY = [
  "Some commentators argue that governments should allocate public funds to space research.",
  "In my view this position is difficult to sustain when domestic needs remain unmet.",
  "",
  "Firstly, the economic benefits of orbital research are indirect and slow to appear.",
  "For example, satellite navigation required decades of sustained investment before it became profitable.",
  "Moreover, the initial capital could be redirected towards health infrastructure with immediate effect.",
  "",
  "However, opponents of this analysis emphasise the strategic value of technological independence.",
  "Although this argument has merit, the distribution of benefits remains highly concentrated.",
  "Consequently, a balanced policy would fund applied research while protecting essential services.",
  "",
  "In conclusion, public expenditure should prioritise immediate welfare over exploratory science.",
].join("\n");

describe("analyseWriting", () => {
  it("produces a complete, internally consistent report", () => {
    const analysis = analyseWriting(ESSAY, { task: 2, module: "academic" });
    expect(analysis.task).toBe(2);
    expect(analysis.module).toBe("academic");
    expect(analysis.minimumWords).toBe(250);
    expect(analysis.paragraphCount).toBe(4);
    expect(analysis.criteria).toHaveLength(4);
    expect(analysis.criteria[0]!.criterion).toBe("task-response");
    expect(analysis.estimatedBand).toBeGreaterThanOrEqual(0);
    expect(analysis.estimatedBand).toBeLessThanOrEqual(9);
    expect(Number.isInteger(analysis.estimatedBand * 2)).toBe(true);
    expect(analysis.disclaimer).toContain("not a prediction");
    for (const criterion of analysis.criteria) {
      expect(criterion.rationale.length).toBeGreaterThan(0);
      expect(Number.isInteger(criterion.score * 2)).toBe(true);
    }
  });

  it("uses task achievement for Task 1 and the 150-word minimum", () => {
    const analysis = analyseWriting(ESSAY, { task: 1 });
    expect(analysis.minimumWords).toBe(150);
    expect(analysis.module).toBeNull();
    expect(analysis.criteria[0]!.criterion).toBe("task-achievement");
  });

  it("is deterministic", () => {
    expect(analyseWriting(ESSAY, { task: 2 })).toEqual(
      analyseWriting(ESSAY, { task: 2 }),
    );
  });

  it("truncates the issue list without changing the counts", () => {
    const text =
      "The goverment recieved thier plan. It occured untill now. Definately seperate.";
    const full = analyseWriting(text, { task: 2 });
    const limited = analyseWriting(text, { task: 2, issueLimit: 1 });
    expect(full.issues.length).toBeGreaterThan(1);
    expect(limited.issues).toHaveLength(1);
    expect(limited.issueCounts).toEqual(full.issueCounts);
  });

  describe("length thresholds for the task criterion", () => {
    it.each([
      [60, "far below"],
      [160, "below"],
      [200, "just below"],
      [240, "just under"],
      [260, "on target"],
      [330, "comfortably over"],
      [500, "far over"],
    ])("scores a %i-word response (%s)", (count) => {
      const analysis = analyseWriting(uniqueText(count), { task: 2 });
      expect(analysis.wordCount).toBe(count);
      expect(analysis.criteria[0]!.score).toBeGreaterThanOrEqual(0);
      expect(analysis.criteria[0]!.rationale.join(" ")).toContain(
        "of the 250-word minimum",
      );
    });

    it("penalises an over-long response explicitly", () => {
      const analysis = analyseWriting(uniqueText(500), { task: 2 });
      expect(analysis.criteria[0]!.rationale.join(" ")).toContain(
        "over the word minimum",
      );
    });

    it("meets the minimum only when long enough", () => {
      expect(
        analyseWriting(uniqueText(240), { task: 2 }).meetsWordMinimum,
      ).toBe(false);
      expect(
        analyseWriting(uniqueText(260), { task: 2 }).meetsWordMinimum,
      ).toBe(true);
    });
  });

  describe("paragraphing", () => {
    it("penalises a single undivided block", () => {
      const analysis = analyseWriting(uniqueText(300), { task: 2 });
      expect(analysis.paragraphCount).toBe(1);
      expect(analysis.criteria[0]!.rationale.join(" ")).toContain(
        "single undivided block",
      );
      expect(analysis.criteria[1]!.rationale.join(" ")).toContain(
        "No paragraphing",
      );
    });

    it("neither rewards nor penalises two paragraphs", () => {
      const two = `${uniqueText(150)}\n\n${uniqueText(150)}`;
      const analysis = analyseWriting(two, { task: 2 });
      expect(analysis.paragraphCount).toBe(2);
      const rationale = analysis.criteria[0]!.rationale.join(" ");
      expect(rationale).not.toContain("single undivided block");
      expect(rationale).not.toContain("paragraphs.");
    });

    it("rewards four or more paragraphs", () => {
      const analysis = analyseWriting(ESSAY, { task: 2 });
      expect(analysis.criteria[1]!.rationale.join(" ")).toContain(
        "clear progression",
      );
    });
  });

  describe("cohesion", () => {
    it("rewards a wide functional range", () => {
      const analysis = analyseWriting(ESSAY, { task: 2 });
      expect(analysis.cohesion.distinctFunctions).toBeGreaterThanOrEqual(4);
    });

    it("awards the top tier for six or more functions", () => {
      const text = [
        uniqueText(200),
        "",
        "Firstly, demand rose because supply contracted.",
        "However, prices fell in some regions.",
        "In addition, exports grew, and therefore the deficit narrowed.",
        "For example, the coastal provinces recorded a surplus.",
      ].join("\n");
      const analysis = analyseWriting(text, { task: 2 });
      expect(analysis.cohesion.distinctFunctions).toBeGreaterThanOrEqual(6);
    });

    it("reports an absence of cohesive devices", () => {
      const analysis = analyseWriting(uniqueText(120), { task: 2 });
      expect(analysis.cohesion.total).toBe(0);
      expect(analysis.criteria[1]!.rationale.join(" ")).toContain(
        "0 distinct cohesive functions",
      );
    });

    it.each([
      ["However, the position holds.", 1],
      ["However, the position holds. Moreover, costs fell.", 2],
      [
        "However, the position holds. Moreover, costs fell. For example, demand rose.",
        3,
      ],
      [
        "However, the position holds. Moreover, costs fell. For example, demand rose. Therefore, exports grew.",
        4,
      ],
      [
        "However, the position holds. Moreover, costs fell. For example, demand rose. Therefore, exports grew. Firstly, the data are clear.",
        5,
      ],
    ])("grades %s as %i distinct functions", (text, expected) => {
      const analysis = analyseWriting(`${uniqueText(200)}\n\n${text}`, {
        task: 2,
      });
      expect(analysis.cohesion.distinctFunctions).toBe(expected);
      expect(analysis.criteria[1]!.rationale.join(" ")).toContain(
        `${String(expected)} distinct cohesive functions`,
      );
    });

    it("penalises over-use", () => {
      const text =
        "However, moreover, furthermore, therefore, consequently, similarly, indeed, finally, although, overall.";
      const analysis = analyseWriting(text, { task: 2 });
      expect(analysis.cohesion.densityPer100Words).toBeGreaterThan(12);
      expect(analysis.criteria[1]!.rationale.join(" ")).toContain("over-used");
    });

    it("penalises sparse use", () => {
      const text = `${uniqueText(300)} Overall the position holds.`;
      const analysis = analyseWriting(text, { task: 2 });
      expect(analysis.cohesion.total).toBeGreaterThan(0);
      expect(analysis.cohesion.densityPer100Words).toBeLessThan(1);
      expect(analysis.criteria[1]!.rationale.join(" ")).toContain("sparse");
    });

    it("penalises punctuation faults at clause boundaries", () => {
      const text = `${uniqueText(200)}\n\nHowever the position holds.`;
      const analysis = analyseWriting(text, { task: 2 });
      expect(analysis.criteria[1]!.rationale.join(" ")).toContain(
        "punctuation problems",
      );
    });
  });

  describe("lexical resource", () => {
    it("rewards dense academic vocabulary", () => {
      const academic =
        "The analysis of significant economic policy requires formal research, " +
        "consistent evaluation, adequate legislation, sufficient data and a coherent approach.";
      const analysis = analyseWriting(academic, { task: 2 });
      expect(analysis.lexis.academicCoverage).toBeGreaterThan(0.12);
      expect(analysis.criteria[2]!.score).toBeGreaterThanOrEqual(7);
    });

    it.each([0.1, 0.07, 0.05, 0.03, 0.01, 0])(
      "grades a response with roughly %f academic coverage",
      (targetCoverage) => {
        const total = 200;
        const academicCount = Math.round(total * targetCoverage);
        const words = [
          ...Array.from({ length: academicCount }, () => "analysis"),
          ...Array.from({ length: total - academicCount }, (_unused, index) =>
            uniqueWord(index),
          ),
        ];
        const analysis = analyseWriting(`${words.join(" ")}.`, { task: 2 });
        expect(analysis.criteria[2]!.score).toBeGreaterThan(0);
      },
    );

    it("rewards high lexical variety", () => {
      const analysis = analyseWriting(uniqueText(200), { task: 2 });
      expect(analysis.lexis.rootTypeTokenRatio).toBeGreaterThanOrEqual(7);
      expect(analysis.criteria[2]!.rationale.join(" ")).toContain(
        "variety is high",
      );
    });

    it("penalises heavy repetition", () => {
      const analysis = analyseWriting(repeatedText(200), { task: 2 });
      expect(analysis.lexis.rootTypeTokenRatio).toBeLessThan(4);
      expect(analysis.criteria[2]!.rationale.join(" ")).toContain(
        "repeated heavily",
      );
    });

    it("penalises spelling and register problems", () => {
      const text = `${uniqueText(200)}\n\nThe goverment can't recieve alot of stuff.`;
      const analysis = analyseWriting(text, { task: 2 });
      const rationale = analysis.criteria[2]!.rationale.join(" ");
      expect(rationale).toContain("non-standard spellings");
      expect(rationale).toContain("informal items");
    });
  });

  describe("grammatical range and accuracy", () => {
    it("awards the top tier when no problems are detected", () => {
      const analysis = analyseWriting(uniqueText(200), { task: 2 });
      expect(analysis.criteria[3]!.rationale.join(" ")).toContain(
        "0 grammatical problems",
      );
      expect(analysis.criteria[3]!.score).toBeGreaterThanOrEqual(8);
    });

    it.each([
      [400, 1],
      [150, 1],
      [60, 1],
      [60, 2],
      [60, 3],
      [60, 6],
    ])(
      "grades %i words containing %i grammatical problems",
      (words, faults) => {
        const filler = uniqueText(words);
        const errors = Array.from(
          { length: faults },
          () => "There is many problems.",
        ).join(" ");
        const analysis = analyseWriting(`${filler} ${errors}`, { task: 2 });
        expect(analysis.criteria[3]!.score).toBeGreaterThan(0);
        expect(analysis.criteria[3]!.score).toBeLessThanOrEqual(9);
      },
    );

    it("rewards typical academic sentence length", () => {
      const analysis = analyseWriting(uniqueText(200, 15), { task: 2 });
      expect(analysis.criteria[3]!.rationale.join(" ")).toContain(
        "typical of academic prose",
      );
    });

    it("penalises very long sentences", () => {
      const analysis = analyseWriting(uniqueText(200, 50), { task: 2 });
      expect(
        analysis.readability.statistics.meanSentenceLength,
      ).toBeGreaterThan(30);
      expect(analysis.criteria[3]!.rationale.join(" ")).toContain("atypical");
    });

    it("penalises very short sentences", () => {
      const analysis = analyseWriting(uniqueText(200, 4), { task: 2 });
      expect(analysis.readability.statistics.meanSentenceLength).toBeLessThan(
        7,
      );
      expect(analysis.criteria[3]!.rationale.join(" ")).toContain("atypical");
    });

    it("accepts sentence lengths between the two penalty zones", () => {
      const analysis = analyseWriting(uniqueText(200, 25), { task: 2 });
      const rationale = analysis.criteria[3]!.rationale.join(" ");
      expect(rationale).not.toContain("atypical");
      expect(rationale).not.toContain("typical of academic prose");
    });
  });

  it("handles text with no word tokens at all", () => {
    const analysis = analyseWriting("123 456 !!!", { task: 1 });
    expect(analysis.wordCount).toBe(0);
    expect(analysis.lexis.tokens).toBe(0);
    expect(analysis.estimatedBand).toBeGreaterThanOrEqual(0);
    expect(analysis.criteria[3]!.rationale.join(" ")).toContain(
      "0 grammatical problems",
    );
  });
});
