import type { GrammarRule, PhraseEntry } from '../types.js';

export const grammarRules: GrammarRule[] = [
  {
    id: 'g-01',
    title: 'Articles with countable nouns',
    explanation:
      'Singular countable nouns need a determiner. Use “a/an” for first mention and “the” for specific reference.',
    correctExample: 'A new library opened; the library is free for students.',
    incorrectExample: 'New library opened; library is free for students.',
  },
  {
    id: 'g-02',
    title: 'Subject-verb agreement',
    explanation:
      'The verb agrees with the head noun, not the nearest noun in an “of” phrase.',
    correctExample: 'The number of tourists has grown.',
    incorrectExample: 'The number of tourists have grown.',
  },
  {
    id: 'g-03',
    title: 'Uncountable nouns',
    explanation:
      'Words like information, advice, equipment, knowledge and research have no plural and take singular verbs.',
    correctExample: 'The research shows a clear trend.',
    incorrectExample: 'The researches show a clear trend.',
  },
  {
    id: 'g-04',
    title: 'Comparatives',
    explanation:
      'Use one comparative marker: either “more + adjective” or the “-er” form.',
    correctExample: 'City life is more exciting than village life.',
    incorrectExample: 'City life is more excitinger than village life.',
  },
  {
    id: 'g-05',
    title: 'Present perfect vs past simple',
    explanation:
      'Use present perfect for unfinished time or visible results; past simple for finished time with a date.',
    correctExample: 'Tourism has grown rapidly in recent years.',
    incorrectExample: 'Tourism grew rapidly in recent years and still grows.',
  },
  {
    id: 'g-06',
    title: 'Conditionals for Task 2',
    explanation:
      'First conditional discusses likely results; second conditional explores hypothetical ideas.',
    correctExample: 'If governments invested more, pollution would fall.',
    incorrectExample: 'If governments will invest more, pollution would fall.',
  },
  {
    id: 'g-07',
    title: 'Passive for processes (Task 1)',
    explanation:
      'Process diagrams describe actions done to materials, so passive forms dominate.',
    correctExample: 'The bottles are washed and then shredded.',
    incorrectExample: 'They wash the bottles and then they shred them people do.',
  },
  {
    id: 'g-08',
    title: 'Relative clauses',
    explanation:
      'Relative pronouns add detail without starting a new sentence. Use commas for non-defining clauses.',
    correctExample: 'Teenagers, who use phones heavily, sleep less.',
    incorrectExample: 'Teenagers who use phones heavily sleep less always all of them.',
  },
  {
    id: 'g-09',
    title: 'Affect vs effect',
    explanation:
      '“Affect” is usually the verb; “effect” is usually the noun meaning result.',
    correctExample: 'Smoking affects health; its effects are well known.',
    incorrectExample: 'Smoking effects health badly.',
  },
  {
    id: 'g-10',
    title: 'Prepositions after adjectives',
    explanation:
      'Common pairings: responsible for, famous for, good at, worried about, different from.',
    correctExample: 'She is good at managing time.',
    incorrectExample: 'She is good in managing time.',
  },
  {
    id: 'g-11',
    title: 'Parallel structure in lists',
    explanation: 'Items in a list must share the same grammatical form.',
    correctExample: 'The plan saves money, reduces traffic and improves air.',
    incorrectExample: 'The plan saves money, to reduce traffic and improving air.',
  },
  {
    id: 'g-12',
    title: 'Quantifiers with countable/uncountable nouns',
    explanation:
      '“Many/few” pair with countable nouns; “much/little” with uncountable nouns.',
    correctExample: 'Many tourists visit; little damage was reported.',
    incorrectExample: 'Much tourists visit; few damage was reported.',
  },
];

export const collocations: PhraseEntry[] = [
  {
    id: 'c-01',
    phrase: 'pose a threat',
    meaning: 'to present a danger to something',
    example: 'Plastic waste poses a serious threat to marine life.',
    formality: 'formal',
  },
  {
    id: 'c-02',
    phrase: 'bridge the gap',
    meaning: 'to reduce a difference between two groups',
    example: 'Scholarships help bridge the gap between rich and poor students.',
    formality: 'neutral',
  },
  {
    id: 'c-03',
    phrase: 'raise awareness',
    meaning: 'to make people more conscious of an issue',
    example: 'Campaigns raise awareness of mental health.',
    formality: 'neutral',
  },
  {
    id: 'c-04',
    phrase: 'meet a deadline',
    meaning: 'to finish something on time',
    example: 'Journalists often work late to meet deadlines.',
    formality: 'neutral',
  },
  {
    id: 'c-05',
    phrase: 'take responsibility',
    meaning: 'to accept duty for something',
    example: 'Companies should take responsibility for their packaging.',
    formality: 'neutral',
  },
  {
    id: 'c-06',
    phrase: 'strike a balance',
    meaning: 'to find a fair middle position',
    example: 'Cities must strike a balance between growth and green space.',
    formality: 'neutral',
  },
  {
    id: 'c-07',
    phrase: 'play a role',
    meaning: 'to have an effect or function',
    example: 'Parents play a key role in reading habits.',
    formality: 'neutral',
  },
  {
    id: 'c-08',
    phrase: 'draw a conclusion',
    meaning: 'to decide something after thought',
    example: 'It is hard to draw conclusions from one small study.',
    formality: 'formal',
  },
  {
    id: 'c-09',
    phrase: 'bear in mind',
    meaning: 'to remember when deciding',
    example: 'Bear in mind that rents are higher near the centre.',
    formality: 'neutral',
  },
  {
    id: 'c-10',
    phrase: 'break a habit',
    meaning: 'to stop a repeated behaviour',
    example: 'It is difficult to break the habit of checking phones at night.',
    formality: 'neutral',
  },
  {
    id: 'c-11',
    phrase: 'commit a crime',
    meaning: 'to do something illegal',
    example: 'Most young offenders never commit another crime.',
    formality: 'formal',
  },
  {
    id: 'c-12',
    phrase: 'ease congestion',
    meaning: 'to reduce crowding, especially traffic',
    example: 'New tram lines eased congestion downtown.',
    formality: 'formal',
  },
];

export const idioms: PhraseEntry[] = [
  {
    id: 'i-01',
    phrase: 'a blessing in disguise',
    meaning: 'something good that first seemed bad',
    example: 'Losing that job was a blessing in disguise — I found a better one.',
    formality: 'informal',
  },
  {
    id: 'i-02',
    phrase: 'bite the bullet',
    meaning: 'to face something unpleasant bravely',
    example: 'I bit the bullet and started running every morning.',
    formality: 'informal',
  },
  {
    id: 'i-03',
    phrase: 'burn the midnight oil',
    meaning: 'to study or work late into the night',
    example: 'She burned the midnight oil before the final exam.',
    formality: 'informal',
  },
  {
    id: 'i-04',
    phrase: 'cut corners',
    meaning: 'to do something cheaply or badly to save time',
    example: 'Cheap construction often means cutting corners on safety.',
    formality: 'informal',
  },
  {
    id: 'i-05',
    phrase: 'hit the books',
    meaning: 'to start studying hard',
    example: 'Exams are near, so it is time to hit the books.',
    formality: 'informal',
  },
  {
    id: 'i-06',
    phrase: 'on the same page',
    meaning: 'in agreement',
    example: 'The team is finally on the same page about the deadline.',
    formality: 'informal',
  },
  {
    id: 'i-07',
    phrase: 'the tip of the iceberg',
    meaning: 'a small visible part of a bigger problem',
    example: 'Plastic on beaches is just the tip of the iceberg.',
    formality: 'neutral',
  },
  {
    id: 'i-08',
    phrase: 'break the ice',
    meaning: 'to start a friendly conversation',
    example: 'A smile is the easiest way to break the ice.',
    formality: 'informal',
  },
  {
    id: 'i-09',
    phrase: 'under the weather',
    meaning: 'feeling slightly ill',
    example: 'I skipped the trip because I felt under the weather.',
    formality: 'informal',
  },
  {
    id: 'i-10',
    phrase: 'once in a blue moon',
    meaning: 'very rarely',
    example: 'We eat out only once in a blue moon.',
    formality: 'informal',
  },
  {
    id: 'i-11',
    phrase: 'cost an arm and a leg',
    meaning: 'to be very expensive',
    example: 'Rents near campus cost an arm and a leg.',
    formality: 'informal',
  },
  {
    id: 'i-12',
    phrase: 'learn the ropes',
    meaning: 'to learn how a job or place works',
    example: 'It took a month to learn the ropes at the hotel.',
    formality: 'informal',
  },
];

export const phrasalVerbs: PhraseEntry[] = [
  {
    id: 'p-01',
    phrase: 'carry out',
    meaning: 'to perform or complete (research, a plan)',
    example: 'Scientists carried out over 200 interviews.',
    formality: 'formal',
  },
  {
    id: 'p-02',
    phrase: 'bring about',
    meaning: 'to cause something to happen',
    example: 'New laws brought about cleaner rivers.',
    formality: 'formal',
  },
  {
    id: 'p-03',
    phrase: 'look into',
    meaning: 'to investigate',
    example: 'The council will look into cheaper bus fares.',
    formality: 'neutral',
  },
  {
    id: 'p-04',
    phrase: 'put off',
    meaning: 'to delay',
    example: 'Don’t put off writing your essay plan.',
    formality: 'neutral',
  },
  {
    id: 'p-05',
    phrase: 'take up',
    meaning: 'to start a hobby or activity',
    example: 'He took up swimming to stay fit.',
    formality: 'neutral',
  },
  {
    id: 'p-06',
    phrase: 'cut down on',
    meaning: 'to reduce consumption',
    example: 'Many families are cutting down on sugar.',
    formality: 'neutral',
  },
  {
    id: 'p-07',
    phrase: 'come up with',
    meaning: 'to invent or suggest an idea',
    example: 'Students came up with clever recycling designs.',
    formality: 'neutral',
  },
  {
    id: 'p-08',
    phrase: 'run out of',
    meaning: 'to have none left',
    example: 'The city ran out of burial space, so it built a new cemetery.',
    formality: 'neutral',
  },
  {
    id: 'p-09',
    phrase: 'account for',
    meaning: 'to explain or form a share of',
    example: 'Buses account for 40% of school trips.',
    formality: 'formal',
  },
  {
    id: 'p-10',
    phrase: 'cope with',
    meaning: 'to deal with difficulty',
    example: 'Nurses learn to cope with night shifts.',
    formality: 'neutral',
  },
  {
    id: 'p-11',
    phrase: 'set up',
    meaning: 'to establish or arrange',
    example: 'They set up a study group for speaking practice.',
    formality: 'neutral',
  },
  {
    id: 'p-12',
    phrase: 'phase out',
    meaning: 'to stop gradually',
    example: 'The country plans to phase out single-use plastics.',
    formality: 'formal',
  },
];
