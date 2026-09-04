/**
 * IELTS band information.
 *
 * `BAND_OVERVIEWS` summarises the nine-band scale. The criterion descriptors
 * are condensed paraphrases of the publicly published band descriptors used by
 * examiners for Writing Task 1, Writing Task 2 and Speaking
 * (British Council / IDP / Cambridge Assessment English). They are provided
 * for study purposes; the official descriptors are the authoritative source.
 *
 * IELTS(R) is a registered trademark of its respective owners; this project is
 * not affiliated with or endorsed by them.
 */

export interface BandOverview {
  readonly band: number;
  readonly name: string;
  readonly description: string;
}

export interface CriterionDescriptors {
  readonly criterion: string;
  readonly focusesOn: string;
  readonly descriptors: readonly BandDescriptor[];
}

export interface BandDescriptor {
  readonly band: number;
  readonly summary: string;
}

const BAND_OVERVIEW_ROWS: readonly BandOverview[] = [
  {
    band: 9,
    name: 'Expert user',
    description:
      'Has fully operational command of the language: appropriate, accurate and fluent with complete understanding.'
  },
  {
    band: 8,
    name: 'Very good user',
    description:
      'Has fully operational command of the language with only occasional unsystematic inaccuracies and inappropriate usage. Misunderstandings may occur in unfamiliar situations.'
  },
  {
    band: 7,
    name: 'Good user',
    description:
      'Has operational command of the language, though with occasional inaccuracies and inappropriate usage in some situations. Generally handles complex language well.'
  },
  {
    band: 6,
    name: 'Competent user',
    description:
      'Has generally effective command of the language despite some inaccuracies and inappropriate usage. Can use and understand fairly complex language, particularly in familiar situations.'
  },
  {
    band: 5,
    name: 'Modest user',
    description:
      'Has partial command of the language, coping with overall meaning in most situations, though likely to make many mistakes. Should be able to handle basic communication in own field.'
  },
  {
    band: 4,
    name: 'Limited user',
    description:
      'Basic competence is limited to familiar situations. Frequent problems in understanding and expression; unable to use complex language.'
  },
  {
    band: 3,
    name: 'Extremely limited user',
    description:
      'Conveys and understands only general meaning in very familiar situations. Frequent breakdowns in communication occur.'
  },
  {
    band: 2,
    name: 'Intermittent user',
    description:
      'No real communication is possible except for the most basic information using isolated words or short formulae in familiar situations.'
  },
  {
    band: 1,
    name: 'Non-user',
    description:
      'Essentially has no ability to use the language beyond possibly a few isolated words.'
  }
];

/** Ascending by band (1..9) so consumers can index `band - 1` directly. */
export const BAND_OVERVIEWS: readonly BandOverview[] = [...BAND_OVERVIEW_ROWS].sort(
  (first, second) => first.band - second.band
);

const COHERENCE_DESCRIPTORS: readonly BandDescriptor[] = [
  {
    band: 9,
    summary:
      'Uses cohesion in such a way that it attracts no attention; manages paragraphing skilfully so the message progresses effortlessly.'
  },
  {
    band: 8,
    summary:
      'Sequences information and ideas logically and manages all aspects of cohesion well; paragraphing is sufficient and appropriate.'
  },
  {
    band: 7,
    summary:
      'Logically organises information with clear progression throughout; uses a range of cohesive devices appropriately, with only occasional over- or under-use.'
  },
  {
    band: 6,
    summary:
      'Arranges information coherently with clear overall progression; uses cohesive devices effectively but cohesion within sentences may be faulty or mechanical.'
  },
  {
    band: 5,
    summary:
      'Presents information with some organisation but without clear overall progression; cohesive devices are inadequate, overused or inaccurate and paragraphing may be insufficient.'
  }
];

const LEXICAL_DESCRIPTORS: readonly BandDescriptor[] = [
  {
    band: 9,
    summary:
      'Uses a wide range of vocabulary with very natural and sophisticated control of lexical features; rare minor errors occur only as slips.'
  },
  {
    band: 8,
    summary:
      'Uses a wide range of vocabulary fluently and flexibly to convey precise meanings; skilfully uses uncommon words, though occasional inaccuracies in word choice occur.'
  },
  {
    band: 7,
    summary:
      'Uses a sufficient range of vocabulary to allow some flexibility and precision; uses less common lexical items with some awareness of style and collocation; occasional errors in word choice.'
  },
  {
    band: 6,
    summary:
      'Has an adequate range of vocabulary for the topic; attempts less common vocabulary but with some inaccuracy; makes some errors in spelling and word formation that do not impede communication.'
  },
  {
    band: 5,
    summary:
      'Uses a limited range of vocabulary barely adequate for minimal tasks; noticeable errors in spelling and word formation may cause some difficulty for the reader.'
  }
];

const GRAMMAR_DESCRIPTORS: readonly BandDescriptor[] = [
  {
    band: 9,
    summary:
      'Uses a full range of structures with natural and appropriate flexibility; the majority of sentences are error-free with only very rare minor slips.'
  },
  {
    band: 8,
    summary:
      'Uses a wide range of structures; the majority of sentences are error-free; makes only very occasional errors or inappropriacies.'
  },
  {
    band: 7,
    summary:
      'Uses a variety of complex structures; produces frequent error-free sentences; grammar and punctuation are well controlled with only a few errors.'
  },
  {
    band: 6,
    summary:
      'Uses a mix of simple and complex sentence forms; makes some errors in grammar and punctuation but they rarely reduce communication.'
  },
  {
    band: 5,
    summary:
      'Uses only a limited range of structures; attempts complex sentences but these tend to be less accurate than simple sentences; errors may cause some problems for the reader.'
  }
];

const WRITING_TASK_2_CRITERIA: readonly CriterionDescriptors[] = [
  {
    criterion: 'Task Response',
    focusesOn: 'How fully and relevantly the question is answered',
    descriptors: [
      {
        band: 9,
        summary:
          'Fully and appropriately satisfies all parts of the task with a well-developed response; extends and supports ideas with relevant, fully elaborated examples.'
      },
      {
        band: 8,
        summary:
          'Covers all requirements of the task sufficiently; presents a well-developed response with relevant, extended and well-supported ideas.'
      },
      {
        band: 7,
        summary:
          'Addresses all parts of the task; presents a clear position throughout and mainly well-developed ideas, though some may be less fully supported.'
      },
      {
        band: 6,
        summary:
          'Addresses the task although some parts may be more fully covered than others; presents a relevant position although conclusions may be unclear or repetitive.'
      },
      {
        band: 5,
        summary:
          'Addresses the task only partially; the format may be inappropriate in places; expresses a position but ideas are limited, under-developed and sometimes irrelevant.'
      }
    ]
  },
  {
    criterion: 'Coherence and Cohesion',
    focusesOn: 'Organisation, paragraphing and linking of ideas',
    descriptors: COHERENCE_DESCRIPTORS
  },
  {
    criterion: 'Lexical Resource',
    focusesOn: 'Range and accuracy of vocabulary',
    descriptors: LEXICAL_DESCRIPTORS
  },
  {
    criterion: 'Grammatical Range and Accuracy',
    focusesOn: 'Variety of sentence structures and grammatical control',
    descriptors: GRAMMAR_DESCRIPTORS
  }
];

const WRITING_TASK_1_CRITERIA: readonly CriterionDescriptors[] = [
  {
    criterion: 'Task Achievement',
    focusesOn: 'How accurately and fully the visual information is covered',
    descriptors: [
      {
        band: 9,
        summary:
          'Fully satisfies all requirements of the task; clearly presents a fully developed response, covering all key features with accurate detail.'
      },
      {
        band: 8,
        summary:
          'Covers all requirements of the task sufficiently; presents, highlights and illustrates key features clearly and appropriately.'
      },
      {
        band: 7,
        summary:
          'Covers the requirements of the task; presents a clear overview of main trends, differences or stages, and clearly presents and highlights key features with some detail.'
      },
      {
        band: 6,
        summary:
          'Addresses the requirements of the task; presents an overview with information appropriately selected, but detail may be inaccurate, irrelevant or repetitive.'
      },
      {
        band: 5,
        summary:
          'Generally addresses the task but the format may be inappropriate in places; recounts detail mechanically with no clear overview; data may be insufficiently covered or inaccurate.'
      }
    ]
  },
  {
    criterion: 'Coherence and Cohesion',
    focusesOn: 'Organisation, paragraphing and linking of ideas',
    descriptors: COHERENCE_DESCRIPTORS
  },
  {
    criterion: 'Lexical Resource',
    focusesOn: 'Range and accuracy of vocabulary',
    descriptors: LEXICAL_DESCRIPTORS
  },
  {
    criterion: 'Grammatical Range and Accuracy',
    focusesOn: 'Variety of sentence structures and grammatical control',
    descriptors: GRAMMAR_DESCRIPTORS
  }
];

const SPEAKING_CRITERIA: readonly CriterionDescriptors[] = [
  {
    criterion: 'Fluency and Coherence',
    focusesOn: 'Flow, pace and logical organisation of speech',
    descriptors: [
      {
        band: 9,
        summary:
          'Speaks fluently with only rare repetition or self-correction; any hesitation is content-related; develops topics coherently and appropriately.'
      },
      {
        band: 8,
        summary:
          'Speaks fluently with only occasional repetition or self-correction; hesitation is usually content-related; develops topics coherently and appropriately.'
      },
      {
        band: 7,
        summary:
          'Speaks at length without noticeable effort or loss of coherence; may demonstrate language-related hesitation at times; uses a range of connectives and discourse markers with some flexibility.'
      },
      {
        band: 6,
        summary:
          'Willing to speak at length though may lose coherence at times from repetition, self-correction or hesitation; uses a range of connectives and discourse markers but not always appropriately.'
      },
      {
        band: 5,
        summary:
          'Usually maintains flow of speech but uses repetition, self-correction or slow speech to keep going; may over-use certain connectives; speech can be unclear at times.'
      }
    ]
  },
  {
    criterion: 'Lexical Resource',
    focusesOn: 'Range and precision of vocabulary',
    descriptors: [
      {
        band: 9,
        summary:
          'Uses vocabulary with full flexibility and precision in all topics; uses idiomatic language naturally and accurately.'
      },
      {
        band: 8,
        summary:
          'Uses a wide vocabulary resource readily and flexibly to convey precise meaning; uses less common and idiomatic vocabulary skilfully, with occasional inaccuracies.'
      },
      {
        band: 7,
        summary:
          'Uses vocabulary resource flexibly to discuss a variety of topics; uses some less common and idiomatic vocabulary with some awareness of style and collocation.'
      },
      {
        band: 6,
        summary:
          'Has a wide enough vocabulary to discuss topics at length and make meaning clear despite inappropriacies; generally paraphrases successfully.'
      },
      {
        band: 5,
        summary:
          'Manages to talk about familiar and unfamiliar topics but uses vocabulary with limited flexibility; attempts paraphrase but with mixed success.'
      }
    ]
  },
  {
    criterion: 'Grammatical Range and Accuracy',
    focusesOn: 'Variety of structures and grammatical control in speech',
    descriptors: [
      {
        band: 9,
        summary:
          'Uses a full range of structures naturally and appropriately; produces consistently accurate structures with only rare minor slips.'
      },
      {
        band: 8,
        summary:
          'Uses a full range of structures naturally and appropriately; produces a majority of error-free sentences with only occasional mistakes.'
      },
      {
        band: 7,
        summary:
          'Uses a range of complex structures with some flexibility; frequently produces error-free sentences though some grammatical mistakes persist.'
      },
      {
        band: 6,
        summary:
          'Uses a mix of simple and complex structures, but with limited flexibility; may make frequent mistakes with complex structures though these rarely cause comprehension problems.'
      },
      {
        band: 5,
        summary:
          'Produces basic sentence forms with reasonable accuracy; uses a limited range of more complex structures but these usually contain errors and may require the listener to work hard.'
      }
    ]
  },
  {
    criterion: 'Pronunciation',
    focusesOn: 'Intelligibility, stress, intonation and individual sounds',
    descriptors: [
      {
        band: 9,
        summary:
          'Uses a full range of pronunciation features with precision and subtlety; effortless to understand throughout.'
      },
      {
        band: 8,
        summary:
          'Uses a wide range of pronunciation features; shows sustained flexible use of stress and intonation; is easy to understand throughout, with only occasional lapses.'
      },
      {
        band: 7,
        summary:
          'Shows all the positive features of band 6 and some of band 8; pronunciation is generally clear with effective use of features, though control is not always sustained.'
      },
      {
        band: 6,
        summary:
          'Uses a range of pronunciation features with mixed control; can generally be understood throughout, though mispronunciation of individual sounds reduces clarity at times.'
      },
      {
        band: 5,
        summary:
          'Shows all the positive features of band 4 and some of band 6; can be generally understood despite noticeable mispronunciation, though listeners may have to ask for clarification at times.'
      }
    ]
  }
];

export const BAND_DATA = {
  overviews: BAND_OVERVIEWS,
  writingTask1: WRITING_TASK_1_CRITERIA,
  writingTask2: WRITING_TASK_2_CRITERIA,
  speaking: SPEAKING_CRITERIA
} as const;
