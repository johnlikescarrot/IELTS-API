/**
 * Original fictional reading exercises authored for IELTS API, CC BY 4.0.
 *
 * The upstream study platform informed the workflow, NOT the passages, questions
 * or answer keys. Difficulty labels are editorial and have not been calibrated.
 * Keep identifiers stable; change the dataset version whenever content changes.
 */

import type { ReadingEntry } from '../reading-types.js';

/** The small, fully inspectable source collection, including research answer keys. */
export const READING_CONTENT: readonly ReadingEntry[] = [
  {
    exercise: {
      id: 'library-of-things',
      title: 'A library of things',
      level: 'foundation',
      topic: 'community',
      suggestedMinutes: 8,
      paragraphs: [
        'In March, Brook Street Library opened a small room for things that people need only occasionally. Members can borrow a drill, a sewing machine or a camping stove. They must be at least eighteen years old and show a library card. Borrowing is free, but members pay for any materials they use, such as thread. Each item must be returned within seven days.',
        'The room is open on Tuesday and Thursday afternoons. Before taking an item home, a new borrower receives a short safety demonstration from a volunteer. Items cannot be reserved online; members book them at the library desk. Staff record how often each item is borrowed. At the end of the year, they will use these records to decide which additional items to buy. The library has not yet announced a budget for those purchases.',
      ],
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          prompt: 'Who can borrow an item?',
          options: [
            { id: 'A', text: 'Any visitor, regardless of age' },
            { id: 'B', text: 'An adult who shows a library card' },
            { id: 'C', text: 'Only people who work at the library' },
          ],
        },
        {
          id: 'q2',
          type: 'single-choice',
          prompt: 'What will help staff choose new items?',
          options: [
            { id: 'A', text: 'Online reservations' },
            { id: 'B', text: 'The price of thread' },
            { id: 'C', text: 'Records of borrowing' },
          ],
        },
        {
          id: 'q3',
          type: 'true-false-not-given',
          prompt: 'Members can reserve equipment on the library website.',
        },
        {
          id: 'q4',
          type: 'true-false-not-given',
          prompt: 'The library will spend five hundred pounds on new equipment.',
        },
        {
          id: 'q5',
          type: 'short-answer',
          prompt: 'For how many days may a member keep an item? Use a word or a number.',
          maxWords: 1,
        },
        {
          id: 'q6',
          type: 'short-answer',
          prompt: 'Who gives the safety demonstration? Use one word from the passage.',
          maxWords: 1,
        },
      ],
    },
    solutions: [
      {
        questionId: 'q1',
        acceptedAnswers: ['B'],
        explanation:
          'Borrowers must be at least eighteen and show a library card; being a visitor is not sufficient.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q2',
        acceptedAnswers: ['C'],
        explanation: 'Staff will use records of how often items are borrowed to select additional equipment.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q3',
        acceptedAnswers: ['FALSE'],
        explanation: 'The passage explicitly rules out online reservations and requires booking at the desk.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q4',
        acceptedAnswers: ['NOT GIVEN'],
        explanation:
          'No budget has been announced. The passage neither confirms nor contradicts the proposed amount.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q5',
        acceptedAnswers: ['seven', '7'],
        explanation:
          'The borrowing period is seven days. Both the word and the digit are explicitly accepted.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q6',
        acceptedAnswers: ['volunteer'],
        explanation: 'A volunteer provides the safety demonstration; the answer must contain only one word.',
        evidenceParagraphs: [2],
      },
    ],
  },
  {
    exercise: {
      id: 'market-bus',
      title: 'The Saturday market bus',
      level: 'foundation',
      topic: 'transport',
      suggestedMinutes: 8,
      paragraphs: [
        'The village of Fenwick has started a Saturday bus to the town market. The first bus leaves the village square at nine in the morning. It stops at the health centre before continuing to the market. The complete journey takes thirty minutes. A return ticket costs three pounds for an adult. Children under twelve travel free when they are with an adult.',
        'The service is a trial lasting six weeks. Passengers do not need to book seats. There is space for shopping bags, but bicycles are not allowed on the bus. On the return journey, the driver gives each household a paper survey. The council wants to know whether passengers would also use a Wednesday service. It will read the surveys before deciding whether to keep the Saturday bus. No decision about a Wednesday bus has been made.',
      ],
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          prompt: 'Where does the bus stop before the market?',
          options: [
            { id: 'A', text: 'The railway station' },
            { id: 'B', text: 'The health centre' },
            { id: 'C', text: 'The library' },
          ],
        },
        {
          id: 'q2',
          type: 'single-choice',
          prompt: 'What is the main purpose of the survey?',
          options: [
            { id: 'A', text: 'To collect views about the bus service' },
            { id: 'B', text: 'To reserve seats for next Saturday' },
            { id: 'C', text: 'To sell tickets for a Wednesday bus' },
          ],
        },
        { id: 'q3', type: 'true-false-not-given', prompt: 'A child aged ten can travel free with an adult.' },
        { id: 'q4', type: 'true-false-not-given', prompt: 'More than twenty households used the first bus.' },
        {
          id: 'q5',
          type: 'short-answer',
          prompt: 'How long does the full journey take? Use two words from the passage.',
          maxWords: 2,
        },
        {
          id: 'q6',
          type: 'short-answer',
          prompt: 'What type of vehicle may passengers not take onto the bus? Use one word from the passage.',
          maxWords: 1,
        },
      ],
    },
    solutions: [
      {
        questionId: 'q1',
        acceptedAnswers: ['B'],
        explanation: 'The health centre is the stop between the village square and the market.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q2',
        acceptedAnswers: ['A'],
        explanation:
          "The council will use passengers' views when considering future services; the survey is not a booking form.",
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q3',
        acceptedAnswers: ['TRUE'],
        explanation:
          'A ten-year-old is under twelve and meets the stated condition when accompanied by an adult.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q4',
        acceptedAnswers: ['NOT GIVEN'],
        explanation: 'Households are mentioned, but the passage provides no passenger count.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q5',
        acceptedAnswers: ['thirty minutes'],
        explanation: 'The complete journey lasts thirty minutes. The prompt requests words from the passage.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q6',
        acceptedAnswers: ['bicycles'],
        explanation: 'Shopping bags are permitted, whereas bicycles are explicitly excluded.',
        evidenceParagraphs: [2],
      },
    ],
  },
  {
    exercise: {
      id: 'cooler-roofs',
      title: 'Testing cooler roofs',
      level: 'intermediate',
      topic: 'environment',
      suggestedMinutes: 10,
      paragraphs: [
        'A housing cooperative wanted to know whether a reflective roof coating could make its top-floor flats more comfortable in summer. Rather than coating every building immediately, it selected two blocks with similar layouts. One received the coating in May; the other retained its dark roof. Sensors recorded the temperature in an empty top-floor room in each block every fifteen minutes. During the first week, the coated building was cooler on most sunny afternoons.',
        'The cooperative initially planned to publish the difference as evidence of energy savings. An engineer pointed out that neither room had air conditioning, so no electricity reduction had actually been measured. She also noticed that a tree shaded the untreated building in the late afternoon. Comparing two rooms without accounting for shade, ventilation and weather could therefore give a misleading impression of the coating alone. The team added outdoor sensors and kept a record of when the windows were open.',
        'Residents valued the project even though its conclusions were narrower than the cooperative had hoped. Some wanted the coating used immediately; others preferred a longer trial that included the winter months. The cooperative agreed to monitor the rooms for a full year before considering a larger installation. It would report indoor temperatures and maintenance costs separately. The engineer stressed that a comfortable room and a lower energy bill were related possibilities, not interchangeable measurements.',
      ],
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          prompt: 'Why did the engineer challenge the proposed energy-saving claim?',
          options: [
            { id: 'A', text: 'The coating had already damaged both roofs' },
            { id: 'B', text: 'Electricity savings had not been measured' },
            { id: 'C', text: 'Residents had refused to use sensors' },
          ],
        },
        {
          id: 'q2',
          type: 'single-choice',
          prompt: 'What is the main lesson of the trial?',
          options: [
            { id: 'A', text: 'A temperature difference alone does not establish energy savings' },
            { id: 'B', text: 'Reflective coatings always increase electricity use' },
            { id: 'C', text: 'Residents cannot help evaluate housing projects' },
          ],
        },
        {
          id: 'q3',
          type: 'true-false-not-given',
          prompt: 'The untreated building received some shade from a tree.',
        },
        {
          id: 'q4',
          type: 'true-false-not-given',
          prompt: 'Both monitored rooms used air conditioning during the trial.',
        },
        {
          id: 'q5',
          type: 'short-answer',
          prompt: 'How often were room temperatures recorded? Use no more than two words from the passage.',
          maxWords: 2,
        },
        {
          id: 'q6',
          type: 'short-answer',
          prompt:
            'Which costs would be reported separately from indoor temperatures? Use two words from the passage.',
          maxWords: 2,
        },
      ],
    },
    solutions: [
      {
        questionId: 'q1',
        acceptedAnswers: ['B'],
        explanation: 'The empty rooms had no air conditioning, and electricity reduction was not measured.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q2',
        acceptedAnswers: ['A'],
        explanation:
          'The final paragraph distinguishes thermal comfort from energy consumption rather than treating one as proof of the other.',
        evidenceParagraphs: [2, 3],
      },
      {
        questionId: 'q3',
        acceptedAnswers: ['TRUE'],
        explanation: 'The engineer observed that a tree shaded the untreated building in the late afternoon.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q4',
        acceptedAnswers: ['FALSE'],
        explanation:
          'The passage states that neither room had air conditioning, directly contradicting the statement.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q5',
        acceptedAnswers: ['fifteen minutes'],
        explanation:
          'Sensors took readings every fifteen minutes; adding "every" would exceed the two-word limit.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q6',
        acceptedAnswers: ['maintenance costs'],
        explanation:
          'The cooperative planned separate reporting of indoor temperatures and maintenance costs.',
        evidenceParagraphs: [3],
      },
    ],
  },
  {
    exercise: {
      id: 'repair-workshops',
      title: 'Learning through repair',
      level: 'intermediate',
      topic: 'education',
      suggestedMinutes: 10,
      paragraphs: [
        'Westmere College opened an evening repair workshop after students asked for more practical ways to learn about materials. Participants bring a broken household object, describe its problem and work alongside a volunteer technician. They are encouraged to draw the object before taking it apart. The organiser believes that a drawing makes students notice connections that they might overlook when simply watching a demonstration. Electrical appliances are accepted only when a qualified supervisor is present.',
        'At first, the college measured success by counting repaired objects. This made the workshop look less useful than participants said it was: some objects could not be repaired because spare parts were unavailable, yet students still learned how the mechanisms worked. The organisers therefore added a short reflection at the end of each session. Students describe one test they performed and one assumption they changed. These accounts are kept alongside, rather than substituted for, the repair totals.',
        'The new approach does not show that workshops are better than classroom lessons. Attendance is voluntary, and people who enjoy solving practical problems may be especially likely to join. The college has not compared the participants with a similar group attending another course. Nevertheless, the reflections help tutors plan future sessions. Several accounts mentioned difficulty identifying different plastics, so a session on material identification was added. No fee is charged, and participants are asked to bring only one object each.',
      ],
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          prompt: 'Why are participants encouraged to draw their objects?',
          options: [
            { id: 'A', text: 'To avoid touching any broken parts' },
            { id: 'B', text: 'To enter a college art competition' },
            { id: 'C', text: 'To notice how components are connected' },
          ],
        },
        {
          id: 'q2',
          type: 'single-choice',
          prompt: 'What limitation prevents a strong comparison with classroom lessons?',
          options: [
            { id: 'A', text: 'There is no comparable group taking another course' },
            { id: 'B', text: 'All the objects are repaired successfully' },
            { id: 'C', text: 'Tutors refuse to read student reflections' },
          ],
        },
        {
          id: 'q3',
          type: 'true-false-not-given',
          prompt: 'Reflections completely replaced the counts of repaired objects.',
        },
        {
          id: 'q4',
          type: 'true-false-not-given',
          prompt: 'Most participants were studying engineering degrees.',
        },
        {
          id: 'q5',
          type: 'short-answer',
          prompt:
            'What must be available for electrical appliances to be accepted? Use two words from the passage.',
          maxWords: 2,
        },
        {
          id: 'q6',
          type: 'short-answer',
          prompt:
            'What were students having difficulty identifying? Use no more than two words from the passage.',
          maxWords: 2,
        },
      ],
    },
    solutions: [
      {
        questionId: 'q1',
        acceptedAnswers: ['C'],
        explanation: 'The organiser links drawing to noticing connections, not to artistic achievement.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q2',
        acceptedAnswers: ['A'],
        explanation:
          'Voluntary attendance and the lack of a comparable group limit conclusions about relative teaching effectiveness.',
        evidenceParagraphs: [3],
      },
      {
        questionId: 'q3',
        acceptedAnswers: ['FALSE'],
        explanation: 'Reflections are kept alongside the repair totals; they do not replace them.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q4',
        acceptedAnswers: ['NOT GIVEN'],
        explanation:
          'The passage discusses participants and their interests but never specifies their degree programmes.',
        evidenceParagraphs: [1, 3],
      },
      {
        questionId: 'q5',
        acceptedAnswers: ['qualified supervisor'],
        explanation: 'A qualified supervisor must be present when electrical appliances are accepted.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q6',
        acceptedAnswers: ['different plastics', 'plastics'],
        explanation:
          'Several reflections identified plastics as a difficulty. Both listed answers fit the word limit.',
        evidenceParagraphs: [3],
      },
    ],
  },
  {
    exercise: {
      id: 'citizen-rainfall',
      title: 'When more measurements are not enough',
      level: 'advanced',
      topic: 'science',
      suggestedMinutes: 12,
      paragraphs: [
        "A regional observatory invited residents to measure rainfall in their gardens. The project quickly produced more readings than the observatory's small network of professional stations. A map of the submissions appeared impressively detailed, but the density of points concealed an uneven distribution: most volunteers lived near the university, while several farming districts contributed almost nothing. Treating every reading as an independent representation of the region would have given well-connected neighbourhoods disproportionate influence.",
        'The researchers considered correcting this imbalance by assigning greater weight to observations from sparsely represented districts. Such weighting could reduce the influence of heavily sampled areas, but it could not create observations for places with none. Nor could it resolve another problem: volunteers had placed their gauges in different conditions. A gauge beneath a tree might collect less rain than one in an open field, even during the same storm. The team distributed a placement guide and asked contributors to submit photographs of their installations. These photographs documented measurement conditions rather than proving the readings accurate.',
        'For their first public report, the researchers separated the number of submissions from the proportion of the region represented. They also published the rules used to exclude readings and retained an unmodified copy of the original records. This allowed other analysts to investigate how alternative rules affected the result. Exclusion was not a declaration that a volunteer had acted carelessly; an observation could be unsuitable for a regional estimate yet useful for studying conditions beneath trees.',
        "The project's main achievement was therefore not a definitive rainfall map. It established a process in which uncertainty could be described and revisited. The observatory planned to recruit volunteers in the missing districts before expanding the network around the university. More measurements would still be welcome, but their value depended on where and how they were collected, not merely on their contribution to an impressive total.",
      ],
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          prompt: 'What did the detailed submission map initially conceal?',
          options: [
            { id: 'A', text: 'An uneven geographical distribution of contributors' },
            { id: 'B', text: 'The complete absence of professional weather stations' },
            { id: 'C', text: 'A decision to stop measuring rainfall' },
          ],
        },
        {
          id: 'q2',
          type: 'single-choice',
          prompt: 'Why were unmodified records retained?',
          options: [
            { id: 'A', text: 'To prevent anyone from questioning the exclusion rules' },
            { id: 'B', text: 'To allow analysis under alternative exclusion rules' },
            { id: 'C', text: 'To guarantee that every observation was accurate' },
          ],
        },
        {
          id: 'q3',
          type: 'true-false-not-given',
          prompt: 'Weighting can supply observations for districts where none were collected.',
        },
        {
          id: 'q4',
          type: 'true-false-not-given',
          prompt: 'A reading excluded from a regional estimate might still be useful for another question.',
        },
        {
          id: 'q5',
          type: 'short-answer',
          prompt:
            'What did contributors submit to document their gauge installations? Use one word from the passage.',
          maxWords: 1,
        },
        {
          id: 'q6',
          type: 'short-answer',
          prompt:
            'Where did the observatory plan to recruit before expanding near the university? Use two words from the passage.',
          maxWords: 2,
        },
      ],
    },
    solutions: [
      {
        questionId: 'q1',
        acceptedAnswers: ['A'],
        explanation:
          'Many submissions came from near the university, while some farming districts were barely represented.',
        evidenceParagraphs: [1],
      },
      {
        questionId: 'q2',
        acceptedAnswers: ['B'],
        explanation: 'Keeping the original records lets other analysts test different exclusion rules.',
        evidenceParagraphs: [3],
      },
      {
        questionId: 'q3',
        acceptedAnswers: ['FALSE'],
        explanation:
          'The passage explicitly distinguishes adjusting weights from creating missing observations.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q4',
        acceptedAnswers: ['TRUE'],
        explanation:
          'A reading unsuitable for a regional estimate could still inform research on conditions beneath trees.',
        evidenceParagraphs: [3],
      },
      {
        questionId: 'q5',
        acceptedAnswers: ['photographs'],
        explanation: 'Photographs document placement; the passage cautions that they do not prove accuracy.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q6',
        acceptedAnswers: ['missing districts'],
        explanation:
          'Recruitment was to prioritise the missing districts rather than the already well-represented university area.',
        evidenceParagraphs: [4],
      },
    ],
  },
  {
    exercise: {
      id: 'digital-archive',
      title: 'An archive that keeps its uncertainties',
      level: 'advanced',
      topic: 'technology',
      suggestedMinutes: 12,
      paragraphs: [
        'When the town museum digitised a collection of handwritten shop ledgers, its first objective was speed. Automatic transcription made thousands of pages searchable within weeks. Visitors could find a surname without turning fragile pages, and staff could locate recurring purchases across decades. Yet searchability created an impression of precision that the underlying records did not always support. A faint number might be recognised confidently as the wrong digit, while a perfectly legible but unusual surname could be replaced by a more familiar one.',
        "The museum initially considered correcting uncertain entries directly in the transcription. A historian objected that silently replacing a doubtful reading would conceal the distinction between the original mark, the software's interpretation and a later editorial judgement. Instead, the team preserved the page image, retained the first machine transcription and stored proposed corrections as a separate layer. Each proposal included the relevant page identifier and a reason. Different interpretations could coexist until there was sufficient evidence to prefer one.",
        'This arrangement required more care from users. A researcher counting transactions had to decide whether to include uncertain entries and explain the choice. It also made the collection more useful for evaluating transcription software: the first output was still available rather than being overwritten by subsequent improvements. The museum warned that agreement between two programs was not independent confirmation if both had learned from the same training examples. Shared errors could look like corroboration.',
        'The archive did not promise a final, flawless text. Its value lay partly in making revisions traceable. The team published a version number and a change record for each release, while leaving previous releases accessible. A reader could therefore identify the transcription used in an earlier study even after a disputed name had been revised. Preserving uncertainty was not a refusal to improve the collection; it was a way to make improvement visible without rewriting the evidence on which earlier conclusions depended.',
      ],
      questions: [
        {
          id: 'q1',
          type: 'single-choice',
          prompt: 'Why did the historian oppose silent corrections?',
          options: [
            { id: 'A', text: 'They would prevent visitors from viewing any page images' },
            { id: 'B', text: 'They would make handwritten records physically fragile' },
            { id: 'C', text: 'They would obscure the difference between evidence and interpretation' },
          ],
        },
        {
          id: 'q2',
          type: 'single-choice',
          prompt: 'Why might agreement between two transcription programs be misleading?',
          options: [
            { id: 'A', text: 'The programs may share errors learned from the same examples' },
            { id: 'B', text: 'Agreement proves that the original ledgers were printed' },
            { id: 'C', text: 'The museum never retained any software output' },
          ],
        },
        {
          id: 'q3',
          type: 'true-false-not-given',
          prompt: 'Earlier releases remained accessible after revisions.',
        },
        {
          id: 'q4',
          type: 'true-false-not-given',
          prompt: 'The museum used exactly three transcription programs.',
        },
        {
          id: 'q5',
          type: 'short-answer',
          prompt: 'Where were proposed corrections stored? Use two words from the passage.',
          maxWords: 2,
        },
        {
          id: 'q6',
          type: 'short-answer',
          prompt: 'What accompanied the version number for each release? Use two words from the passage.',
          maxWords: 2,
        },
      ],
    },
    solutions: [
      {
        questionId: 'q1',
        acceptedAnswers: ['C'],
        explanation:
          'Silent replacement would hide the distinction between the original mark, machine output and editorial judgement.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q2',
        acceptedAnswers: ['A'],
        explanation:
          'Programs trained on the same examples may make shared errors, so agreement need not be independent confirmation.',
        evidenceParagraphs: [3],
      },
      {
        questionId: 'q3',
        acceptedAnswers: ['TRUE'],
        explanation: 'The museum explicitly kept previous releases accessible.',
        evidenceParagraphs: [4],
      },
      {
        questionId: 'q4',
        acceptedAnswers: ['NOT GIVEN'],
        explanation:
          'The discussion of agreement between two programs is a caution, not a count of programs used by the museum.',
        evidenceParagraphs: [3],
      },
      {
        questionId: 'q5',
        acceptedAnswers: ['separate layer'],
        explanation:
          'Corrections were stored as a separate layer while the image and first transcription were retained.',
        evidenceParagraphs: [2],
      },
      {
        questionId: 'q6',
        acceptedAnswers: ['change record'],
        explanation:
          'Each release included a version number and a change record, enabling earlier analyses to be traced.',
        evidenceParagraphs: [4],
      },
    ],
  },
];
