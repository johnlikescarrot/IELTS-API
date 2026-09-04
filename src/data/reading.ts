/**
 * Academic Reading practice tests (2 tests x 3 sections).
 *
 * Passages, questions, answers, and explanations are original to this
 * project (MIT). Answers are always derivable from the passage, and each
 * explanation points the learner back to the relevant evidence.
 */

import type { ReadingTest } from "../types.js";

export const readingTests: readonly ReadingTest[] = [
  {
    id: "rt-001",
    skill: "reading",
    module: "academic",
    title: "Science and the Natural World",
    minutes: 60,
    sections: [
      {
        id: "rt-001-s1",
        title: "The Antikythera Mechanism",
        headings: [],
        passage: [
          "In 1901, sponge divers working off the Greek island of Antikythera recovered a corroded lump of bronze from a shipwreck that had lain undisturbed for roughly two thousand years. Museum curators initially paid it little attention, but when the object split apart, they noticed gear wheels embedded inside - an astonishing sight, because geared machines were believed to be unknown in the ancient world.",
          "X-ray imaging in the 1970s, and later three-dimensional scanning, revealed something even more remarkable: at least thirty interlocking gears, originally housed in a wooden case the size of a shoebox. Turned by a hand crank, the device modelled the positions of the Sun and Moon in the sky and predicted both lunar and solar eclipses on a spiral dial. Inscriptions on the front and back covers appear to have served as an instruction manual.",
          "Who built the mechanism remains a mystery, though most scholars now attribute it to a workshop influenced by the astronomer Hipparchus, and date it to roughly 150-100 BCE. Whatever its origin, the device demonstrates that Greek craftsmen possessed engineering skills far beyond what surviving written records suggest - skills that would not be matched again until Europe's astronomical clocks of the fourteenth century.",
        ].join("\n\n"),
        questions: [
          {
            id: "rt-001-s1-q1",
            type: "multiple_choice",
            band: 6,
            prompt: "The true nature of the object was first recognised when",
            options: [
              "a diver opened it on the seabed",
              "it split apart during cleaning",
              "X-ray photographs were taken",
              "a hand crank was discovered beside it",
            ],
            answer: "it split apart during cleaning",
            explanation:
              "The curators 'paid it little attention, but when the object split apart, they noticed gear wheels' - the significance emerged only after it broke open.",
          },
          {
            id: "rt-001-s1-q2",
            type: "multiple_choice",
            band: 7,
            prompt: "Which capability is NOT attributed to the mechanism?",
            options: [
              "Modelling the position of the Sun",
              "Predicting lunar and solar eclipses",
              "Keeping accurate time at sea",
              "Modelling the position of the Moon",
            ],
            answer: "Keeping accurate time at sea",
            explanation:
              "The passage lists the Sun, the Moon, and eclipses, but never timekeeping; astronomical clocks are mentioned only as a later European parallel.",
          },
          {
            id: "rt-001-s1-q3",
            type: "true_false_not_given",
            band: 6,
            prompt: "The shipwreck was discovered by archaeologists.",
            answer: "false",
            explanation:
              "It was found by 'sponge divers working off the Greek island'; no archaeologists took part in the discovery.",
          },
          {
            id: "rt-001-s1-q4",
            type: "true_false_not_given",
            band: 7,
            prompt: "The inscriptions helped users operate the device.",
            answer: "true",
            explanation:
              "The inscriptions 'appear to have served as an instruction manual'.",
          },
          {
            id: "rt-001-s1-q5",
            type: "short_answer",
            band: 6,
            prompt:
              "Answer the question using NO MORE THAN THREE WORDS: What powered the mechanism?",
            answer: "a hand crank",
            wordLimit: 3,
            explanation:
              "The second paragraph states the device was 'turned by a hand crank'.",
          },
          {
            id: "rt-001-s1-q6",
            type: "short_answer",
            band: 7,
            prompt:
              "Answer the question using NO MORE THAN THREE WORDS: In which century were comparable machines built in Europe?",
            answer: "the fourteenth century",
            wordLimit: 3,
            explanation:
              "The final sentence refers to 'Europe's astronomical clocks of the fourteenth century'.",
          },
        ],
      },
      {
        id: "rt-001-s2",
        title: "Bees in the City",
        headings: [],
        passage: [
          "Urban beekeeping has moved from curiosity to craze. Rooftop hives now sit atop hotels, museums and office blocks in cities from New York to Berlin, and waiting lists for beekeeping courses run for months. The appeal is easy to understand: bees are charismatic, honey is a tangible reward, and a hive signals a city's green ambitions.",
          "Yet a growing number of ecologists urge caution. Wild bees - and most of the roughly twenty thousand species worldwide are solitary, nothing like the domesticated honeybee - often struggle in cities, where flowering patches are scattered and frequently contaminated by pollutants. Adding thousands of honeybees, they argue, intensifies competition: one study in Berlin found that wild bees close to dense groups of hives collected noticeably less pollen.",
          "Supporters respond that managed hives act as a flagship: people who keep bees also plant flowers, avoid pesticides and lobby for greener streets. The debate is unresolved. What both sides accept is the underlying problem - modern agriculture has replaced diverse, flower-rich grassland with monocultures, leaving cities, with their gardens, parks and railway embankments, unexpectedly rich in forage. By some measurements, urban honeybee colonies now outperform their rural cousins.",
        ].join("\n\n"),
        questions: [
          {
            id: "rt-001-s2-q1",
            type: "true_false_not_given",
            band: 6,
            prompt: "Rooftop hives have been installed on public buildings.",
            answer: "true",
            explanation:
              "Hives are described 'atop hotels, museums and office blocks'; museums are public buildings.",
          },
          {
            id: "rt-001-s2-q2",
            type: "true_false_not_given",
            band: 7,
            prompt: "Most wild bee species live in colonies like the honeybee.",
            answer: "false",
            explanation:
              "The passage states most wild species 'are solitary, nothing like the domesticated honeybee'.",
          },
          {
            id: "rt-001-s2-q3",
            type: "true_false_not_given",
            band: 6,
            prompt:
              "Beekeepers and ecologists have settled their disagreement.",
            answer: "false",
            explanation:
              "'The debate is unresolved' directly contradicts the statement.",
          },
          {
            id: "rt-001-s2-q4",
            type: "sentence_completion",
            band: 6,
            prompt:
              "Complete the sentence with ONE WORD: One tangible reward of urban beekeeping is ______.",
            answer: "honey",
            wordLimit: 1,
            explanation:
              "'honey is a tangible reward' appears in the first paragraph.",
          },
          {
            id: "rt-001-s2-q5",
            type: "sentence_completion",
            band: 7,
            prompt:
              "Complete the sentence with ONE WORD: Modern agriculture has replaced flower-rich grassland with ______.",
            answer: "monocultures",
            wordLimit: 1,
            explanation:
              "The final paragraph names 'monocultures' as what replaced flower-rich grassland.",
          },
          {
            id: "rt-001-s2-q6",
            type: "sentence_completion",
            band: 7,
            prompt:
              "Complete the sentence with NO MORE THAN TWO WORDS: Cities provide forage in gardens, parks and ______.",
            answer: "railway embankments",
            wordLimit: 2,
            explanation:
              "The passage lists 'gardens, parks and railway embankments' as urban forage sources.",
          },
        ],
      },
      {
        id: "rt-001-s3",
        title: "Coral Gardening",
        headings: [
          "Why reefs matter",
          "How warmer water starves coral",
          "Growing corals for replanting",
          "The limits of restoration",
          "The economics of the aquarium trade",
          "A history of diving research",
        ],
        passage: [
          "A. Coral reefs occupy less than one percent of the ocean floor, yet they shelter roughly a quarter of all marine species. They also shield coastlines from storms and support fishing and tourism industries worth tens of billions of dollars a year. Since 2016, however, repeated mass bleaching events have degraded large sections of the world's largest reefs.",
          "B. Bleaching begins when water temperatures rise. Under that stress, corals expel the microscopic algae that live inside their tissues and supply most of their food. Stripped of algae, the coral turns white and begins to starve; if the heat persists, it dies.",
          "C. In response, scientists have developed what is known as coral gardening. Fragments are collected from healthy colonies and raised in underwater nurseries, where they are grown on frames until large enough to be transplanted back onto damaged reefs. Projects in the Caribbean and South-East Asia have replanted thousands of square metres of reef this way.",
          "D. Gardening, however, treats the symptom rather than the cause, which is warming water. Some programmes therefore breed selectively, cross-raising the corals that survived past bleaching in the hope of producing strains that tolerate more heat - an approach sometimes called assisted evolution. Even so, biologists are blunt: without cuts in greenhouse-gas emissions, even the toughest coral cannot survive the century.",
        ].join("\n\n"),
        questions: [
          {
            id: "rt-001-s3-q1",
            type: "matching_headings",
            band: 7,
            prompt: "Choose the correct heading for paragraph B from the list.",
            answer: "How warmer water starves coral",
            explanation:
              "Paragraph B explains the bleaching mechanism: heat causes corals to expel their food-supplying algae and starve.",
          },
          {
            id: "rt-001-s3-q2",
            type: "matching_headings",
            band: 7,
            prompt: "Choose the correct heading for paragraph C from the list.",
            answer: "Growing corals for replanting",
            explanation:
              "Paragraph C describes collecting fragments, raising them in nurseries, and transplanting them onto damaged reefs.",
          },
          {
            id: "rt-001-s3-q3",
            type: "matching_headings",
            band: 8,
            prompt: "Choose the correct heading for paragraph D from the list.",
            answer: "The limits of restoration",
            explanation:
              "Paragraph D stresses that gardening 'treats the symptom rather than the cause' and cannot succeed without emission cuts.",
          },
          {
            id: "rt-001-s3-q4",
            type: "multiple_choice",
            band: 6,
            prompt: "Corals bleach because rising temperatures make them",
            options: [
              "expel the algae that feed them",
              "absorb too much sunlight",
              "grow faster than their skeletons",
              "release carbon into the water",
            ],
            answer: "expel the algae that feed them",
            explanation:
              "Paragraph B: corals 'expel the microscopic algae... and supply most of their food'.",
          },
          {
            id: "rt-001-s3-q5",
            type: "multiple_choice",
            band: 8,
            prompt: "The aim of assisted evolution is to",
            options: [
              "replace coral with artificial reefs",
              "produce corals that tolerate more heat",
              "speed up the growth of algae",
              "move reefs to colder water",
            ],
            answer: "produce corals that tolerate more heat",
            explanation:
              "Paragraph D: selective breeding hopes 'of producing strains that tolerate more heat'.",
          },
          {
            id: "rt-001-s3-q6",
            type: "sentence_completion",
            band: 7,
            prompt:
              "Complete the sentence with ONE WORD: Corals receive most of their food from ______ that live in their tissues.",
            answer: "algae",
            wordLimit: 1,
            explanation:
              "Paragraph B describes 'the microscopic algae... supply most of their food'.",
          },
        ],
      },
    ],
  },
  {
    id: "rt-002",
    skill: "reading",
    module: "academic",
    title: "Ideas That Travel",
    minutes: 60,
    sections: [
      {
        id: "rt-002-s1",
        title: "The Lost Libraries of Timbuktu",
        headings: [],
        passage: [
          "For four centuries beginning in the 1300s, Timbuktu, on the southern edge of the Sahara, was a centre of scholarship whose schools drew as many as twenty-five thousand students. Its private libraries accumulated hundreds of thousands of manuscripts on astronomy, mathematics, medicine and law, written mainly in Arabic and local languages, on paper carried across the desert by camel caravan.",
          "European explorers of the nineteenth century ridiculed tales of Timbuktu's libraries, doubting that sub-Saharan Africa had produced written scholarship at all. The tales proved true - but by then the manuscripts had begun to scatter. Looted by collectors, sold piecemeal and damaged by damp and insects, the collections dispersed into family chests across the region.",
          "The twenty-first century brought new threats and an unlikely rescue. When extremists occupied northern Mali in 2012 and began destroying shrines and manuscripts, librarians and volunteers smuggled more than 350,000 volumes by road and river to the capital, Bamako. Today conservationists race against the city's humid climate to digitise and preserve them, and Timbuktu's written heritage is slowly returning to public view - this time online.",
        ].join("\n\n"),
        questions: [
          {
            id: "rt-002-s1-q1",
            type: "multiple_choice",
            band: 7,
            prompt:
              "What was the initial European reaction to stories of Timbuktu's libraries?",
            options: ["Admiration", "Disbelief", "Indifference", "Jealousy"],
            answer: "Disbelief",
            explanation:
              "Nineteenth-century explorers 'ridiculed' the tales, 'doubting that sub-Saharan Africa had produced written scholarship'.",
          },
          {
            id: "rt-002-s1-q2",
            type: "multiple_choice",
            band: 7,
            prompt: "Why were the manuscripts moved in 2012?",
            options: [
              "Scholars wanted to study them abroad",
              "Extremists were destroying them",
              "The desert climate was too dry",
              "Collectors offered high prices",
            ],
            answer: "Extremists were destroying them",
            explanation:
              "The occupation had brought the destruction of shrines and manuscripts, so volunteers smuggled the volumes to Bamako.",
          },
          {
            id: "rt-002-s1-q3",
            type: "true_false_not_given",
            band: 6,
            prompt: "Most of the manuscripts were written in Latin.",
            answer: "false",
            explanation:
              "They were 'written mainly in Arabic and local languages'.",
          },
          {
            id: "rt-002-s1-q4",
            type: "true_false_not_given",
            band: 8,
            prompt: "All of the rescued manuscripts have now been digitised.",
            answer: "false",
            explanation:
              "Conservationists still 'race against' the humid climate to digitise them, so the work is unfinished.",
          },
          {
            id: "rt-002-s1-q5",
            type: "short_answer",
            band: 6,
            prompt:
              "Answer the question using NO MORE THAN THREE WORDS: How did paper historically reach Timbuktu?",
            answer: "by camel caravan",
            wordLimit: 3,
            explanation:
              "The first paragraph says paper was 'carried across the desert by camel caravan'.",
          },
          {
            id: "rt-002-s1-q6",
            type: "short_answer",
            band: 6,
            prompt:
              "Answer the question using NO MORE THAN TWO WORDS: To which city were the manuscripts moved in 2012?",
            answer: "Bamako",
            wordLimit: 2,
            explanation:
              "The volumes were 'smuggled by road and river to the capital, Bamako'.",
          },
        ],
      },
      {
        id: "rt-002-s2",
        title: "Vertical Farms",
        headings: [],
        passage: [
          "By 2050, two out of three people are expected to live in cities, and feeding them without clearing the world's remaining wilderness is arguably agriculture's greatest challenge. One answer grows upward: vertical farms, stacks of indoor crop beds lit by LEDs, stacked in warehouses close to the people they feed.",
          "Supporters quote impressive figures. Vertical farms use no pesticides and need up to ninety-five percent less water than field agriculture, because water is captured and recycled. Harvests continue all year, unaffected by drought, frost or flood. Because a farm can sit inside the city itself, 'food miles' collapse, and produce can reach shelves within hours of picking.",
          "Critics reply that the figures conceal one stubborn problem: electricity. Plants need light, and however efficient LEDs become, powering a warehouse full of lamps costs far more than sunshine. Life-cycle studies therefore differ wildly depending on the grid: a vertical farm running on wind or solar power can outperform field-grown crops on several measures, while one drawing on coal can emit several times more carbon per head of lettuce than a field.",
          "The industry's bet is that renewable electricity will keep getting cheaper. Already, vertical farms are profitable for herbs and leafy greens, which grow quickly and sell at premium prices; staple crops such as wheat and rice, which need far more light energy per calorie, remain firmly out of reach.",
        ].join("\n\n"),
        questions: [
          {
            id: "rt-002-s2-q1",
            type: "sentence_completion",
            band: 6,
            prompt:
              "Complete the sentence with ONE WORD: Vertical farms need up to 95% less ______ than fields.",
            answer: "water",
            wordLimit: 1,
            explanation:
              "Paragraph two: farms 'need up to ninety-five percent less water... because water is captured and recycled'.",
          },
          {
            id: "rt-002-s2-q2",
            type: "sentence_completion",
            band: 6,
            prompt:
              "Complete the sentence with ONE WORD: Produce can reach shops within ______ of being picked.",
            answer: "hours",
            wordLimit: 1,
            explanation: "'produce can reach shelves within hours of picking'.",
          },
          {
            id: "rt-002-s2-q3",
            type: "sentence_completion",
            band: 7,
            prompt:
              "Complete the sentence with ONE WORD: The most stubborn cost problem for vertical farming is ______.",
            answer: "electricity",
            wordLimit: 1,
            explanation:
              "Critics say the figures 'conceal one stubborn problem: electricity'.",
          },
          {
            id: "rt-002-s2-q4",
            type: "true_false_not_given",
            band: 6,
            prompt: "Vertical farming requires the use of pesticides.",
            answer: "false",
            explanation:
              "The passage states that vertical farms 'use no pesticides'.",
          },
          {
            id: "rt-002-s2-q5",
            type: "true_false_not_given",
            band: 7,
            prompt:
              "Vertical farming is currently profitable for staple crops such as wheat.",
            answer: "false",
            explanation:
              "The final paragraph says staples 'remain firmly out of reach'; only herbs and leafy greens are profitable.",
          },
          {
            id: "rt-002-s2-q6",
            type: "multiple_choice",
            band: 8,
            prompt:
              "According to the passage, the carbon footprint of a vertical farm depends mainly on",
            options: [
              "the crop that is grown",
              "how its electricity is generated",
              "the distance to the shop",
              "the price of land in the city",
            ],
            answer: "how its electricity is generated",
            explanation:
              "Studies 'differ wildly depending on the grid': wind or solar beats fields on some measures, coal is far worse.",
          },
        ],
      },
      {
        id: "rt-002-s3",
        title: "Do Animals Have Culture?",
        headings: [
          "Behaviours copied across the animal kingdom",
          "From ridicule to acceptance",
          "How scientists decide what counts",
          "Why culture matters for conservation",
          "The economics of wildlife tourism",
        ],
        passage: [
          "A. In Shark Bay, Australia, dolphins protect their beaks with sea sponges while searching the seabed for food - a trick mothers pass on to their daughters. In New Caledonia, crows cut and bend leaves into hooked tools for extracting insects. Humpback whales learn new songs that sweep across the Pacific Ocean like hit records.",
          "B. Fifty years ago, such reports were dismissed as anecdote. Culture - behaviour learned from others rather than inherited genetically or discovered independently - was held to be uniquely human. The tide turned slowly, beginning with long-running field studies such as the Japanese macaques that learned to wash sweet potatoes in the sea, and gathered force as video and genetics made animal behaviour easier to document.",
          "C. Not every learned habit qualifies as culture, however. Researchers now look for three pieces of evidence: the behaviour spreads socially, it varies between groups, and it persists across generations. Applied strictly, those tests leave dozens of species on the list - from chimpanzee termite-fishing traditions to the regional dialects of songbirds.",
          "D. Accepting animal culture has practical consequences for conservation. Protecting habitat is not enough if knowledge about where to find food or how to raise young lives only in the memories of older individuals. When populations are restocked or relocated, managers increasingly try to keep families and mentors together, so that inherited knowledge - not just genes - survives the move.",
        ].join("\n\n"),
        questions: [
          {
            id: "rt-002-s3-q1",
            type: "matching_headings",
            band: 6,
            prompt: "Choose the correct heading for paragraph A from the list.",
            answer: "Behaviours copied across the animal kingdom",
            explanation:
              "Paragraph A gives three examples of learned, socially spread behaviours in dolphins, crows and whales.",
          },
          {
            id: "rt-002-s3-q2",
            type: "matching_headings",
            band: 7,
            prompt: "Choose the correct heading for paragraph C from the list.",
            answer: "How scientists decide what counts",
            explanation:
              "Paragraph C lists the three tests researchers apply to decide whether a behaviour is culture.",
          },
          {
            id: "rt-002-s3-q3",
            type: "matching_headings",
            band: 8,
            prompt: "Choose the correct heading for paragraph D from the list.",
            answer: "Why culture matters for conservation",
            explanation:
              "Paragraph D explains how animal knowledge changes conservation practice.",
          },
          {
            id: "rt-002-s3-q4",
            type: "multiple_choice",
            band: 6,
            prompt: "Dolphins in Shark Bay use sea sponges in order to",
            options: [
              "attract a mate",
              "protect their beaks while foraging",
              "play with their daughters",
              "build shelters on the seabed",
            ],
            answer: "protect their beaks while foraging",
            explanation:
              "Paragraph A: dolphins 'protect their beaks with sea sponges while searching the seabed for food'.",
          },
          {
            id: "rt-002-s3-q5",
            type: "multiple_choice",
            band: 7,
            prompt:
              "According to the definition used, culture is behaviour that is",
            options: [
              "present at birth",
              "unique to humans",
              "learned from others",
              "repeated by accident",
            ],
            answer: "learned from others",
            explanation:
              "Paragraph B defines culture as 'behaviour learned from others rather than inherited genetically or discovered independently'.",
          },
          {
            id: "rt-002-s3-q6",
            type: "short_answer",
            band: 6,
            prompt:
              "Answer the question using NO MORE THAN THREE WORDS: What spreads across the Pacific like hit records?",
            answer: "humpback whale songs",
            wordLimit: 3,
            explanation:
              "Paragraph A: 'Humpback whales learn new songs that sweep across the Pacific Ocean like hit records.'",
          },
        ],
      },
    ],
  },
];
