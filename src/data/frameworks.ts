/**
 * Response frameworks for the productive papers.
 *
 * Task banks tell a candidate *what* to write or say; a framework tells them
 * *how to organise it*. The taxonomy below distils the response shapes that
 * recur across published IELTS preparation material into citable, machine-
 * readable plans: one framework per question family for Writing Task 2, and
 * one per recurring Speaking Part 2 and Part 3 interaction pattern.
 *
 * Every stage, move, cue phrase and pitfall is original to this project. The
 * frameworks cross-reference the question families of `/v1/topics/writing`
 * (`questionTypes`) and the speaking parts of `/v1/topics/speaking`
 * (`speakingParts`) so a client can move from a prompt to a plan in two calls.
 */

import { matchesQuery, paginate } from '../lib/search.js';

import type { Page } from '../lib/search.js';
import type { EssayQuestionType, FrameworkSection, ResponseFramework } from '../types.js';

/** Compact stage row: position, purpose, moves, cue language. */
type StageRow = readonly [string, string, readonly string[], readonly string[]];

/** Compact framework row before enrichment. */
type FrameworkRow = readonly [
  FrameworkSection,
  'writing' | 'speaking',
  string,
  string,
  string,
  readonly EssayQuestionType[],
  readonly number[],
  readonly StageRow[],
  readonly string[],
  number | null,
  number | null,
];

const ROWS: readonly FrameworkRow[] = [
  // ------------------------------------------------------- writing task 2
  [
    'writing-task-2',
    'writing',
    'w2-thesis-led',
    'Thesis-led essay',
    'The candidate states a clear position in the introduction and defends it with two body paragraphs of independent support. It is the default shape for an opinion prompt and rewards a position taken early and held consistently.',
    ['opinion'],
    [],
    [
      [
        'Introduction',
        'Frame the debate and commit to a position.',
        [
          'Open with a general statement of the controversy, not the prompt wording.',
          'Paraphrase the task claim in the candidate\u2019s own words.',
          'State the thesis with a signpost of the two supporting lines of argument.',
        ],
        [
          'It is often argued that \u2026',
          'I believe this holds only partially / holds in most cases, for two reasons.',
          'This essay will defend that view on the grounds of X and Y.',
        ],
      ],
      [
        'Body paragraph 1',
        'Deliver the strongest line of support.',
        [
          'Open with a topic sentence that asserts the reason, not an example.',
          'Develop the mechanism: explain why the reason follows from the claim.',
          'Anchor the paragraph in one concrete example or one quantified observation.',
        ],
        ['The first point is that \u2026', 'This matters because \u2026', 'A case in point is \u2026'],
      ],
      [
        'Body paragraph 2',
        'Add an independent second line of support.',
        [
          'Choose a reason of a different kind (economic vs. social, principle vs. practice).',
          'Develop it with the same depth as the first, not as an afterthought.',
          'Close the paragraph by tying the reason back to the thesis.',
        ],
        [
          'A second consideration is \u2026',
          'By the same token \u2026',
          'Taken together with the first point, this suggests \u2026',
        ],
      ],
      [
        'Conclusion',
        'Restate the position and its grounds without new argument.',
        [
          'Rephrase the thesis in fresh words.',
          'Compress the two reasons into one sentence.',
          'End with a consequence or implication, not an apology or a new claim.',
        ],
        ['In conclusion, \u2026', 'For these reasons, \u2026', 'The implication is that \u2026'],
      ],
    ],
    [
      'A position that shifts between paragraphs reads as no position at all.',
      'Two paragraphs that make the same point twice score as one idea.',
      'An example without a stated mechanism is narration, not argument.',
    ],
    40,
    250,
  ],
  [
    'writing-task-2',
    'writing',
    'w2-concession-rebuttal',
    'Concession\u2013rebuttal essay',
    'A stronger thesis-led variant for opinion prompts: the essay first grants the opposing view its best case, then shows why it fails or stops short, and only then defends the candidate\u2019s own position. The concession makes the rebuttal credible instead of dismissive.',
    ['opinion'],
    [],
    [
      [
        'Introduction',
        'Frame the disagreement and state the position the essay will defend.',
        [
          'Present the two readings of the issue in one balanced sentence.',
          'Commit to a position explicitly; the concession to come is a tactic, not neutrality.',
        ],
        [
          'While some maintain that \u2026, I take the opposite view.',
          'Although the case for X is real, it is outweighed by \u2026',
        ],
      ],
      [
        'Concession paragraph',
        'State the opposing view at its strongest.',
        [
          'Open by naming the opposing position fairly.',
          'Give its best justification, ideally with the evidence its holders cite.',
          'Do not caricature: the paragraph must survive a holder of that view reading it.',
        ],
        ['Admittedly, \u2026', 'It is understandable why \u2026', 'To be sure, X offers \u2026'],
      ],
      [
        'Rebuttal pivot',
        'Show where the conceded argument breaks down.',
        [
          'Mark the turn explicitly with a contrastive connective.',
          'Attack the reasoning (scope, evidence, hidden assumption), not the people.',
          'State the condition under which the concession would hold \u2014 and that it rarely does.',
        ],
        [
          'However, this argument assumes \u2026',
          'Yet the benefit is confined to \u2026',
          'This holds only where \u2026, which is the exception rather than the rule.',
        ],
      ],
      [
        'Defence paragraph',
        'Argue the candidate\u2019s own position.',
        [
          'Give the positive case with the strongest reason first.',
          'Support with one specific, plausible example.',
          'Mirror the depth granted to the concession so the essay stays balanced.',
        ],
        ['In contrast, \u2026', 'The stronger explanation is \u2026', 'In practice, \u2026'],
      ],
      [
        'Conclusion',
        'Adjudicate between the two cases.',
        [
          'Restate that the conceded point, while real, is not decisive.',
          'Close on the position and its single strongest ground.',
        ],
        [
          'On balance, \u2026',
          'The concession survives; the conclusion does not.',
          'X matters, but Y matters more, because \u2026',
        ],
      ],
    ],
    [
      'A concession that occupies most of the essay inverts the thesis.',
      'Rebuttal by assertion ("this is wrong") without a stated reason scores for coherence, not argument.',
      'Leaving the pivot unstated forces the reader to guess which side the writer takes.',
    ],
    40,
    250,
  ],
  [
    'writing-task-2',
    'writing',
    'w2-discussion-verdict',
    'Discussion\u2013verdict essay',
    'For prompts that ask the candidate to discuss two opposing views: each side is expounded in its own paragraph at its most persuasive, and the essay closes by adjudicating between them with a qualified verdict rather than a coin-flip.',
    ['discussion'],
    [],
    [
      [
        'Introduction',
        'Set out the two views and announce the adjudication to come.',
        [
          'Paraphrase both positions as claims, not as quotes from the prompt.',
          'Signal that the essay will weigh them before taking a side.',
        ],
        [
          'Opinion is divided between those who \u2026 and those who \u2026',
          'This essay examines both positions before reaching a view.',
        ],
      ],
      [
        'View A paragraph',
        'Make the strongest case for the first position.',
        [
          'Open with the position stated in one sentence.',
          'Give its principal justification and one illustration.',
          'Add the kind of person or context in which the view is most convincing.',
        ],
        [
          'Those who favour X point out that \u2026',
          'The rationale is that \u2026',
          'This is particularly true for \u2026',
        ],
      ],
      [
        'View B paragraph',
        'Make the strongest case for the second position.',
        [
          'Match the depth given to View A; asymmetry reads as bias.',
          'Choose a justification of a different kind where possible.',
          'Keep evaluation out: this paragraph reports, the verdict evaluates.',
        ],
        [
          'Supporters of Y, meanwhile, contend that \u2026',
          'They would argue that \u2026',
          'Evidence for this can be seen in \u2026',
        ],
      ],
      [
        'Verdict paragraph',
        'Adjudicate with a qualifier.',
        [
          'State which case is stronger on the criterion that matters.',
          'Name the qualifier honestly: the losing view usually wins somewhere.',
          'Explain the verdict in one mechanism sentence.',
        ],
        [
          'On balance, the more persuasive position is \u2026',
          'Both capture part of the truth, but \u2026',
          'The deciding consideration is \u2026',
        ],
      ],
      [
        'Conclusion',
        'Restate the verdict and its ground.',
        [
          'Compress the adjudication into two sentences.',
          'Optionally end with the wider implication of the verdict.',
        ],
        ['In summary, \u2026', 'The discussion therefore points to \u2026'],
      ],
    ],
    [
      'Adding a personal opinion inside the exposition paragraphs pre-empts the verdict.',
      'A verdict of "both are right" without a criterion avoids the task.',
      'Uneven paragraphs signal that the weaker view was set up to lose.',
    ],
    40,
    250,
  ],
  [
    'writing-task-2',
    'writing',
    'w2-weighing',
    'Advantage\u2013disadvantage weighing essay',
    'For prompts that ask whether the benefits of something outweigh the drawbacks: the essay separates the two cases, then decides the direction and size of the net balance on an explicit criterion, rather than listing points in a dead heat.',
    ['advantages-disadvantages'],
    [],
    [
      [
        'Introduction',
        'Identify the practice under discussion and the weighing question.',
        [
          'Paraphrase the prompt\u2019s subject precisely (what policy, technology, trend).',
          'State that the essay weighs both sides and previews the eventual direction.',
        ],
        ['The growth of X has renewed debate over its costs and benefits.', 'This essay weighs the two.'],
      ],
      [
        'Advantages paragraph',
        'Present the case in favour with mechanisms.',
        [
          'Group advantages by type rather than listing three shallow ones.',
          'Explain the mechanism of the strongest advantage.',
          'Quantify or concretise with one plausible example.',
        ],
        ['The principal benefit is that \u2026', 'This works by \u2026', 'For instance, \u2026'],
      ],
      [
        'Disadvantages paragraph',
        'Present the case against with the same seriousness.',
        [
          'Match the structure of the advantages paragraph for balance.',
          'Prefer structural drawbacks (who bears the cost) over anecdotal ones.',
          'Avoid repeating an advantage in negative clothing.',
        ],
        [
          'Set against this, \u2026',
          'The chief drawback is that \u2026',
          'The cost falls disproportionately on \u2026',
        ],
      ],
      [
        'Weighing paragraph',
        'Decide the net balance on a stated criterion.',
        [
          'Name the criterion the decision uses (efficiency, equity, long-term effect).',
          'Compare the strongest advantage against the strongest drawback directly.',
          'State the verdict with its size: clearly, narrowly, or conditionally.',
        ],
        [
          'Measured against \u2026, the advantages prove \u2026',
          'Weighed directly, X outweighs Y because \u2026',
          'The balance is close / decisive, tipping towards \u2026',
        ],
      ],
      [
        'Conclusion',
        'Restate the net verdict.',
        [
          'Restate the direction of the balance in one sentence.',
          'Close without introducing a new consideration.',
        ],
        ['Overall, \u2026', 'The benefits / drawbacks therefore carry greater weight.'],
      ],
    ],
    [
      'A list of three advantages and three disadvantages with no weighing answers a different task.',
      'Advantages and drawbacks that are secretly the same point cancel silently.',
      'A verdict without a criterion cannot be wrong, and therefore cannot persuade.',
    ],
    40,
    250,
  ],
  [
    'writing-task-2',
    'writing',
    'w2-causal-chain',
    'Problem\u2013solution essay with matched causes',
    'For prompts about causes, effects or solutions: the essay frames the problem, traces its actual causes, and proposes solutions that are matched one-to-one to those causes \u2014 so each proposal inherits the justification of the cause it removes.',
    ['problem-solution', 'two-part'],
    [],
    [
      [
        'Introduction',
        'Define the problem and preview the causal analysis.',
        [
          'State the problem as a situation with stakes, not a single word.',
          'Signal the structure: causes first, matched solutions second.',
        ],
        [
          'X has become one of the defining pressures of \u2026',
          'This essay traces its causes and matches them with responses.',
        ],
      ],
      [
        'Problem and causes paragraph',
        'Establish the problem and diagnose its drivers.',
        [
          'Specify the problem\u2019s scale or who it affects.',
          'Give two causes of different kinds (structural and individual, for example).',
          'Keep the diagnosis analytical: a cause explains, it does not merely co-occur.',
        ],
        [
          'The problem is most visible in \u2026',
          'Two drivers stand out: \u2026',
          'The underlying cause is \u2026, of which the rest are symptoms.',
        ],
      ],
      [
        'Solutions paragraph',
        'Propose measures matched to the diagnosed causes.',
        [
          'Take the causes in the order introduced and address each in turn.',
          'Say who acts (government, employers, individuals) and how.',
          'Prefer two developed proposals over four names of policies.',
        ],
        [
          'The first cause yields to \u2026',
          'Where the driver is X, the corresponding response is \u2026',
          'This would work by \u2026',
        ],
      ],
      [
        'Feasibility check',
        'Anticipate the obvious objection to the proposals.',
        [
          'Name the most likely objection (cost, behaviour, enforcement).',
          'Answer it briefly or concede its limit on the solution\u2019s reach.',
        ],
        ['The obvious worry is \u2026', 'This objection carries weight where \u2026; elsewhere \u2026'],
      ],
      [
        'Conclusion',
        'Restate the causal link between diagnosis and cure.',
        [
          'Bind each solution back to the cause it removes.',
          'End on the condition for improvement, not a slogan.',
        ],
        ['Because the problem is driven by \u2026, it will ease only when \u2026'],
      ],
    ],
    [
      'Solutions unrelated to the stated causes read as a memorised list.',
      'Describing the problem at length and solving it in one sentence inverts the weighting.',
      'Utopian proposals ("governments should simply ban \u2026") concede the feasibility check in advance.',
    ],
    40,
    250,
  ],
  [
    'writing-task-2',
    'writing',
    'w2-sequenced-answers',
    'Sequenced two-part answer essay',
    'For prompts carrying two questions: the essay answers each sub-question in its own body paragraph, in the order asked, keeping the two answers proportionate and explicitly linked so the response reads as one essay rather than two halves.',
    ['two-part'],
    [],
    [
      [
        'Introduction',
        'Identify the phenomenon and split the task into its two questions.',
        [
          'Paraphrase the prompt\u2019s situation in one sentence.',
          'Mirror both questions explicitly so the reader can track both answers.',
        ],
        [
          'X raises two immediate questions: why it occurs, and what should follow.',
          'This essay takes each in turn.',
        ],
      ],
      [
        'First answer paragraph',
        'Answer the first question directly and completely.',
        [
          'Open with the answer in a single stated sentence.',
          'Support with mechanism and one example.',
          'Close by signalling the turn to the second question.',
        ],
        [
          'The first explanation lies in \u2026',
          'This is illustrated by \u2026',
          'The consequences of this lead to the second question.',
        ],
      ],
      [
        'Second answer paragraph',
        'Answer the second question, building on the first.',
        [
          'Open with the second answer stated just as directly.',
          'Reuse the first paragraph\u2019s reasoning where it genuinely applies.',
          'Keep the length proportionate to the first answer unless the prompt weights one question more.',
        ],
        [
          'Given those causes, \u2026',
          'The corresponding response is \u2026',
          'This follows from the first point because \u2026',
        ],
      ],
      [
        'Conclusion',
        'Bind the two answers into one position.',
        ['Restate both answers in one compound sentence.', 'Close with the joint implication of the pair.'],
        ['In short, X happens because \u2026, and the appropriate answer is \u2026'],
      ],
    ],
    [
      'Answering one question superbly and ignoring the other caps task response.',
      'Blending both questions into one paragraph hides the second answer.',
      'A second answer that contradicts the first destroys the essay\u2019s own logic.',
    ],
    40,
    250,
  ],
  // ------------------------------------------------------- speaking part 2
  [
    'speaking-part-2',
    'speaking',
    'p2-narrative-spine',
    'Narrative-spine long turn',
    'A Part 2 cue card about an experience is delivered as a shaped story rather than an improvised list: a compact setup, one complication that generates suspense, a turn, a resolution, and a closing reflection \u2014 with the cue-card bullets folded in as the story passes them.',
    [],
    [2],
    [
      [
        'Setup',
        'Locate the story in time, place and company.',
        [
          'Answer the When / Where / Who bullets in two sentences, not one each.',
          'Establish why you were there at all \u2014 it seeds the complication.',
        ],
        ['This happened a couple of winters ago, when \u2026', 'A friend of mine had persuaded me to \u2026'],
      ],
      [
        'Complication',
        'Introduce the event that made the experience memorable.',
        [
          'State the thing that went wrong, surprised or mattered.',
          'React to it in the moment ("I remember thinking \u2026") to add voice.',
        ],
        ['What I had not bargained for was \u2026', 'Halfway through, \u2026', 'I honestly thought \u2026'],
      ],
      [
        'Turn',
        'Show what changed and how you responded.',
        ['Give the turning point a physical or sensory anchor.', 'Say what you actually did, step by step.'],
        ['In the end, what saved the day was \u2026', 'So I decided to \u2026'],
      ],
      [
        'Resolution and reflection',
        'Close the story and answer the Why-important bullet.',
        [
          'Resolve the outcome in one sentence.',
          'Reflect with a feeling, a lesson or a comparison with now.',
        ],
        ['Looking back, \u2026', 'What stayed with me was \u2026', 'It changed how I \u2026'],
      ],
    ],
    [
      'Narrating bullets in card order produces a list with dates, not a story.',
      'A second story started for a later bullet displaces the reflection \u2014 the examiner is listening for it.',
      'Excessive background (family tree, travel logistics) burns the two minutes before anything happens.',
    ],
    2,
    null,
  ],
  [
    'speaking-part-2',
    'speaking',
    'p2-feature-highlight',
    'Feature-highlight description',
    'A Part 2 cue card about a thing, place or person is delivered as an overall impression followed by two or three highlighted features, each carried by a micro-story or specific detail, and closed with personal significance.',
    [],
    [2],
    [
      [
        'Overall impression',
        'Name the subject and give its one-line character.',
        [
          'Identify the subject immediately \u2014 no suspense.',
          'Offer the headline judgement the features will substantiate.',
        ],
        ['The place I have in mind is \u2026, and the word I would use for it is \u2026'],
      ],
      [
        'Feature one',
        'Highlight one telling detail.',
        [
          'Pick a concrete, checkable feature rather than an abstract virtue.',
          'Attach a micro-story of ten seconds that shows the feature.',
        ],
        ['The first thing that strikes you is \u2026', 'What makes it unusual is \u2026'],
      ],
      [
        'Feature two',
        'Highlight a second, contrasting detail.',
        [
          'Vary the lens (appearance vs. function, public vs. private side).',
          'Compare with an alternative to sharpen what is distinctive.',
        ],
        ['Beyond that, \u2026', 'Compared with \u2026, it \u2026'],
      ],
      [
        'Significance close',
        'Explain what the subject means to you.',
        [
          'Answer the final bullet with a feeling or a habit it created.',
          'End deliberately; a trailing "yeah, that\u2019s it" wastes the last impression.',
        ],
        ['The reason it matters to me is \u2026', 'Whenever I \u2026, I think of it.'],
      ],
    ],
    [
      'Listing five adjectives replaces description with inventory.',
      'Superlatives without evidence ("it was amazing, really amazing") fill time without content.',
      'The significance bullet left unanswered is the most common single point lost in Part 2.',
    ],
    2,
    null,
  ],
  // ------------------------------------------------------- speaking part 3
  [
    'speaking-part-3',
    'speaking',
    'p3-stance-and-support',
    'Stance\u2013reason\u2013example\u2013concession turn',
    'The default Part 3 turn: a direct stance, the reason it is held, one specific example, and a closing concession that shows the speaker can see past their own answer. Each element earns its own sentence; none is skipped.',
    [],
    [3],
    [
      [
        'Stance',
        'Answer the question in the first sentence.',
        [
          'Choose a position within a second and commit.',
          'Keep the stance itself simple; complexity comes later.',
        ],
        ['On the whole, I would say yes / no.', 'My honest view is that \u2026'],
      ],
      [
        'Reason',
        'Give the main reason the stance is held.',
        ['State one reason, not three stacked half-reasons.', 'Explain the mechanism in a second sentence.'],
        ['The main reason is that \u2026', 'This is largely because \u2026'],
      ],
      [
        'Example',
        'Anchor the reason in one specific instance.',
        [
          'Choose an example the examiner can picture.',
          'Say where and when in half a sentence to make it specific.',
        ],
        ['For example, where I live, \u2026', 'I saw this first-hand when \u2026'],
      ],
      [
        'Concession',
        'Qualify the stance to close the turn.',
        ['Name the case where the stance weakens.', 'Return to the stance so the turn ends where it began.'],
        ['That said, \u2026', 'Having said that, there are exceptions, notably \u2026'],
      ],
    ],
    [
      'Opening with "it depends" every turn reads as evasion when the question seeks a view.',
      'Three reasons with no example scores as abstract.',
      'A concession that grows into a second full turn leaves the answer unfinished.',
    ],
    null,
    null,
  ],
  [
    'speaking-part-3',
    'speaking',
    'p3-it-depends',
    'Dependent-answer split',
    'For Part 3 questions that genuinely vary by person, place or period: the answer is split into two contrasting groups, each with its own logic and example, and closed with the dividing principle. The split must be asserted fast to stay an answer rather than a shrug.',
    [],
    [3],
    [
      [
        'Frame',
        'Name the dependency immediately.',
        [
          'Say "it depends" plus the dividing variable in the same breath.',
          'Choose a split with two clear, contrasting groups.',
        ],
        ['It really depends on \u2026', 'That varies a lot, mainly by \u2026'],
      ],
      [
        'Group one',
        'Answer for the first group.',
        [
          'Name the group precisely (city families, older shoppers).',
          'Give the group\u2019s answer and its reason.',
        ],
        ['For \u2026, the answer is clearly \u2026', 'People who \u2026 tend to \u2026'],
      ],
      [
        'Group two',
        'Answer for the contrasting group.',
        [
          'Contrast explicitly, not just in sequence.',
          'Give the second reason, different in kind from the first.',
        ],
        ['Whereas for \u2026, \u2026', 'By contrast, \u2026 are far more likely to \u2026'],
      ],
      [
        'Principle close',
        'State what the split turns on.',
        [
          'Formulate the dividing principle in one sentence.',
          'It should predict both halves, not merely describe them.',
        ],
        ['So the real distinction is between \u2026 and \u2026', 'In the end it comes down to \u2026'],
      ],
    ],
    [
      'Splitting without a closing principle leaves two answers and no answer.',
      'Groups defined too broadly ("young people" vs. "old people" for everything) sound rehearsed.',
      'Both halves given the same reason cancel the contrast.',
    ],
    null,
    null,
  ],
  [
    'speaking-part-3',
    'speaking',
    'p3-comparison-over-time',
    'Then-and-now comparison',
    'For Part 3 questions about change: the turn fixes a baseline in the past, describes the present against it with concrete drivers, and, when invited, projects forward with hedged modality rather than false confidence.',
    [],
    [3],
    [
      [
        'Baseline',
        'Fix how it used to be.',
        [
          'Anchor the past in a period the speaker can actually speak about.',
          'Give one concrete detail of the old state.',
        ],
        ['When my parents were my age, \u2026', 'Fifteen years ago, it was normal to \u2026'],
      ],
      [
        'Contrast',
        'State the change and its driver.',
        [
          'Name the sharpest difference, not every difference.',
          'Attribute a cause: technology, economics, policy or habit.',
        ],
        ['Nowadays, by contrast, \u2026', 'What has really changed is \u2026, largely because \u2026'],
      ],
      [
        'Present texture',
        'Make the current state specific.',
        [
          'Give one everyday scene that shows the new state.',
          'Include a personal observation for authenticity.',
        ],
        ['These days you can see \u2026', 'In my own family, \u2026'],
      ],
      [
        'Projection',
        'Project forward with hedges.',
        [
          'Use hedged modality (might, could, would not be surprised).',
          'Tie the projection to one trend already visible.',
        ],
        ['I would not be surprised if, in ten years, \u2026', 'It could well go the other way if \u2026'],
      ],
    ],
    [
      'Comparing without a stated driver turns analysis into nostalgia.',
      'Projecting with certainty about the future overreaches and invites the examiner\u2019s follow-up.',
      'A past described as uniformly better reads as topic vocabulary without ideas.',
    ],
    null,
    null,
  ],
  [
    'speaking-part-3',
    'speaking',
    'p3-criteria-evaluation',
    'Criteria-based evaluation',
    'For Part 3 questions that ask whether something matters, helps or is worth doing: the turn selects an explicit criterion, evaluates the subject against it with an example, tests a second criterion, and concludes with a qualified judgement.',
    [],
    [3],
    [
      [
        'Criterion',
        'Choose and state the yardstick.',
        [
          'Pick the criterion the question implicitly turns on.',
          'State it as a question the turn will answer.',
        ],
        ['The real question is whether \u2026', 'Judged by \u2026, the answer is clearer.'],
      ],
      [
        'First test',
        'Evaluate the subject against the criterion.',
        ['State how well the subject meets the criterion.', 'Support with one short, concrete case.'],
        [
          'On that measure, \u2026 clearly does / does not \u2026',
          'Take \u2026: it shows exactly how \u2026',
        ],
      ],
      [
        'Second test',
        'Introduce a competing criterion.',
        ['Choose a criterion that pulls the other way.', 'Evaluate honestly against it too.'],
        [
          'But there is another way to look at it: \u2026',
          'Measured instead by \u2026, the picture changes.',
        ],
      ],
      [
        'Qualified judgement',
        'Weigh the two tests into a position.',
        [
          'State which criterion should dominate and why.',
          'Keep the qualification visible in the final sentence.',
        ],
        ['Weighing the two, I would say \u2026, though only where \u2026'],
      ],
    ],
    [
      'Evaluating without naming a criterion produces a list of likes and dislikes.',
      'Choosing criteria that all point the same way stages agreement with yourself.',
      'An unqualified final verdict after a balanced analysis wastes the analysis.',
    ],
    null,
    null,
  ],
];

/** Every response framework, enriched from the compact rows. */
export const RESPONSE_FRAMEWORKS: readonly ResponseFramework[] = ROWS.map(
  ([
    section,
    skill,
    id,
    name,
    summary,
    questionTypes,
    speakingParts,
    stages,
    pitfalls,
    suggestedMinutes,
    suggestedWords,
  ]) => ({
    section,
    skill,
    id,
    name,
    summary,
    questionTypes: [...questionTypes],
    speakingParts: [...speakingParts],
    stages: stages.map(([position, purpose, moves, language]) => ({
      position,
      purpose,
      moves: [...moves],
      language: [...language],
    })),
    pitfalls: [...pitfalls],
    suggestedMinutes,
    suggestedWords,
  }),
);

/** The distinct framework sections. */
export const FRAMEWORK_SECTIONS: readonly FrameworkSection[] = [
  'writing-task-2',
  'speaking-part-2',
  'speaking-part-3',
];

/**
 * Find a framework by identifier.
 *
 * @param id - Framework identifier.
 */
export function findFramework(id: string): ResponseFramework | undefined {
  return RESPONSE_FRAMEWORKS.find((framework) => framework.id === id);
}

/** Options accepted by {@link searchFrameworks}. */
export type FrameworkQuery = {
  /** Free-text search over name, summary and pitfalls. */
  query?: string;
  /** Page size. */
  limit: number;
  /** Offset. */
  offset: number;
};

/**
 * Search the framework taxonomy by free text.
 *
 * @param options - Search options.
 * @returns A page of matching frameworks.
 */
export function searchFrameworks(options: FrameworkQuery): Page<ResponseFramework> {
  const query = options.query ?? '';
  const filtered = RESPONSE_FRAMEWORKS.filter((framework) => {
    if (query.length === 0) {
      return true;
    }
    return matchesQuery(
      [
        framework.id,
        framework.name,
        framework.summary,
        ...framework.stages.flatMap((stage) => [stage.position, stage.purpose, ...stage.language]),
      ],
      query,
    );
  });
  return paginate(filtered, options.limit, options.offset);
}
