/**
 * Speaking question bank: Part 1 topics, Part 2 cue cards with model
 * responses, and Part 3 discussion topics.
 *
 * All questions, cue cards, and sample answers are original to this
 * project (MIT).
 */

import type { SpeakingItem } from "../types.js";

export const speakingItems: readonly SpeakingItem[] = [
  {
    id: "sp-101",
    part: 1,
    topic: "home",
    questions: [
      "Do you live in a house or a flat?",
      "What do you like most about where you live?",
      "Is your neighbourhood convenient for shopping and transport?",
      "Would you like to move to a different place in the future? Why?",
      "What can you see from the windows of your home?",
    ],
  },
  {
    id: "sp-102",
    part: 1,
    topic: "work",
    questions: [
      "Do you work or are you a student?",
      "Why did you choose that job or subject?",
      "What is the most interesting part of your work or studies?",
      "Would you like to change your job or course in the future?",
      "Do you prefer working alone or with other people?",
    ],
  },
  {
    id: "sp-103",
    part: 1,
    topic: "hobbies",
    questions: [
      "What do you do in your free time?",
      "Do you prefer indoor or outdoor hobbies? Why?",
      "Did you have a hobby as a child that you have given up?",
      "Is there a hobby you would like to try in the future?",
      "Do you think hobbies should be useful, or just enjoyable?",
    ],
  },
  {
    id: "sp-104",
    part: 1,
    topic: "food",
    questions: [
      "What is your favourite meal of the day?",
      "Do you prefer cooking at home or eating out?",
      "Is there any food you dislike?",
      "Do you think people in your country eat more healthily than in the past?",
      "When did you last try a new kind of food?",
    ],
  },
  {
    id: "sp-105",
    part: 1,
    topic: "weather",
    questions: [
      "What is the weather like in your hometown?",
      "Do you prefer hot or cold weather? Why?",
      "Does the weather ever change your plans?",
      "What do you do on rainy days?",
      "Is the weather in your country changing, in your opinion?",
    ],
  },
  {
    id: "sp-201",
    part: 2,
    topic: "skills",
    prompt:
      "Describe a skill you learned recently that was difficult at first.",
    points: [
      "what the skill was",
      "why you decided to learn it",
      "how you learned it",
      "and explain how you felt when you finally mastered it.",
    ],
    sampleAnswer: [
      "A skill I picked up recently is touch-typing - typing without looking at the keyboard.",
      "I decided to learn it because I was spending hours every day writing, and hunting for keys one finger at a time was slowing me down badly. A colleague types effortlessly, and seeing that made the goal feel achievable.",
      "I used a free website with short daily drills for about twenty minutes a evening. The first week was genuinely frustrating - my speed dropped below my old two-finger pace - but after a fortnight something clicked, and my fingers began to find the keys by themselves.",
      "When I finally typed a full page without a single glance down, I felt a real sense of accomplishment. It's a small thing, but it saved me time every single day since, and it reminded me that most skills respond to steady, patient practice rather than talent.",
    ].join(" "),
    keyVocabulary: [
      {
        term: "picked up",
        meaning: "learned informally, without formal teaching",
      },
      {
        term: "hunting for keys",
        meaning: "searching the keyboard slowly for each letter",
      },
      { term: "drills", meaning: "short repeated practice exercises" },
      {
        term: "something clicked",
        meaning: "it suddenly became easy or clear",
      },
      {
        term: "a sense of accomplishment",
        meaning: "a feeling of pride at achieving something",
      },
    ],
  },
  {
    id: "sp-202",
    part: 2,
    topic: "places",
    prompt: "Describe a place you go to when you want to relax.",
    points: [
      "where the place is",
      "how often you go there",
      "what you do there",
      "and explain why this place helps you relax.",
    ],
    sampleAnswer: [
      "The place I escape to is a small park by the river, about ten minutes' walk from my flat.",
      "I try to get there most weekends, and sometimes after a long working day in summer, when it is still light in the evenings.",
      "There is a bench under a willow tree where I sit with a coffee. Some days I read; most days I simply watch the rowing boats and the heron that fishes near the bank. If I am restless, I walk a loop along the water, which takes about half an hour.",
      "It relaxes me because it is completely removed from screens and noise. The river moves at its own pace, and somehow that slows my thoughts down to match it. Even twenty minutes there leaves me feeling as if I have been away for a weekend.",
    ].join(" "),
    keyVocabulary: [
      { term: "escape to", meaning: "go somewhere to get away from stress" },
      { term: "removed from", meaning: "far away from; separate from" },
      { term: "at its own pace", meaning: "slowly, without hurry" },
      { term: "restless", meaning: "unable to relax or keep still" },
      { term: "slows my thoughts down", meaning: "makes me think more calmly" },
    ],
  },
  {
    id: "sp-203",
    part: 2,
    topic: "people",
    prompt: "Describe a person who has inspired you.",
    points: [
      "who the person is",
      "how you know this person",
      "what they have achieved or done",
      "and explain why they inspire you.",
    ],
    sampleAnswer: [
      "The person I would choose is my secondary-school physics teacher, Mr Okafor.",
      "He taught me for three years, and I have stayed in touch with him since leaving school.",
      "He never won prizes or made the news. What he did was more remarkable: he ran an after-hours science club, in his own time, for students the school had written off as hopeless at physics. Year after year, those students went on to pass the subject, and several - including me - chose it at university.",
      "He inspires me because he proved that belief in people is a powerful teaching tool. He never raised his voice or gave up on anyone; he simply assumed you could understand, and kept explaining until you did. I try to bring that same patience to everything I teach and lead now, and when I find it hard, I imagine how he would have handled it.",
    ].join(" "),
    keyVocabulary: [
      {
        term: "stayed in touch",
        meaning: "continued to communicate over time",
      },
      { term: "written off", meaning: "judged as unlikely to succeed" },
      {
        term: "belief in people",
        meaning: "confidence that others can succeed",
      },
      { term: "gave up on", meaning: "stopped trying to help" },
      { term: "remarkable", meaning: "surprising and worthy of attention" },
    ],
  },
  {
    id: "sp-204",
    part: 2,
    topic: "technology",
    prompt: "Describe an app or piece of software you find useful.",
    points: [
      "what the app is",
      "how long you have used it",
      "what you use it for",
      "and explain why you find it so useful.",
    ],
    sampleAnswer: [
      "The app I could not do without is a free one called Library Finder.",
      "I have used it for about two years, since a friend recommended it during my final year at university.",
      "It does one simple thing: it maps every public library in the city and shows, in real time, which study rooms and seats are free. I use it three or four times a week to find a quiet desk before exams or meetings, and it can reserve a seat and remind me fifteen minutes before my booking ends.",
      "It is useful precisely because it solves a small problem perfectly. Before it existed, I wasted half an hour walking to libraries that were full. It also quietly changed my habits: because finding a place is now effortless, I study far more regularly than I used to. The best technology, I think, is the kind that disappears into your routine like that.",
    ].join(" "),
    keyVocabulary: [
      { term: "could not do without", meaning: "depend on completely" },
      { term: "in real time", meaning: "with information updated instantly" },
      { term: "precisely because", meaning: "exactly because (emphatic)" },
      { term: "effortless", meaning: "requiring no effort" },
      {
        term: "disappears into your routine",
        meaning: "becomes a natural, unnoticed habit",
      },
    ],
  },
  {
    id: "sp-205",
    part: 2,
    topic: "travel",
    prompt: "Describe a memorable journey you have made.",
    points: [
      "where you were travelling to",
      "how you travelled",
      "what happened during the journey",
      "and explain why the journey was memorable.",
    ],
    sampleAnswer: [
      "The journey I remember best is an overnight train trip I took across the mountains to visit my grandmother.",
      "It was a twelve-hour ride on an old sleeper train, and I shared a compartment with three strangers.",
      "What made it special was how the journey unfolded. We started as four silent passengers, but after dinner someone offered round fruit, and by midnight we were playing cards, sharing snacks and telling stories. An elderly woman taught us a card game I still play. When the sun rose over the mountains, the whole carriage went quiet just to watch.",
      "It was memorable because it reversed my expectations. I had expected a long, uncomfortable night; instead I arrived with three new friends and a story I still tell. Since then I have preferred slow travel to flying - the journey itself became the destination.",
    ].join(" "),
    keyVocabulary: [
      {
        term: "sleeper train",
        meaning: "a train with beds for overnight travel",
      },
      {
        term: "compartment",
        meaning: "a separate section of a train carriage",
      },
      { term: "offered round", meaning: "shared with everyone in a group" },
      {
        term: "reversed my expectations",
        meaning: "proved the opposite of what I expected",
      },
      {
        term: "the journey itself became the destination",
        meaning: "the travel mattered more than arriving",
      },
    ],
  },
  {
    id: "sp-301",
    part: 3,
    topic: "technology and education",
    questions: [
      "How has technology changed the way people learn languages?",
      "Do you think online learning will ever completely replace classrooms?",
      "Should schools teach coding as a core subject like mathematics?",
      "Who benefits more from educational technology: children or adults?",
    ],
    strategy:
      "Compare eras ('twenty years ago... whereas today') and evaluate rather than listing. Push beyond description: which change matters most, and for whom?",
  },
  {
    id: "sp-302",
    part: 3,
    topic: "environmental responsibility",
    questions: [
      "Whose responsibility is it to protect the environment: governments, companies, or individuals?",
      "Are people in your country more environmentally aware than they used to be?",
      "Should environmentally harmful products be banned or taxed?",
      "Can economic growth and environmental protection go together?",
    ],
    strategy:
      "Weigh different actors explicitly ('on the one hand... ultimately, though') and support your ranking with one concrete example per argument.",
  },
  {
    id: "sp-303",
    part: 3,
    topic: "cities and urban life",
    questions: [
      "Why do so many people move to cities in your country?",
      "What are the biggest problems facing large cities today?",
      "Would you rather live in a big city or a small town? Why?",
      "How might cities change in the next fifty years?",
    ],
    strategy:
      "Use speculation language for the future question ('it is likely that', 'I would imagine'), and structure problems by scale: social, economic, environmental.",
  },
  {
    id: "sp-304",
    part: 3,
    topic: "work-life balance",
    questions: [
      "Why do some people work much longer hours than others?",
      "Do you think technology has made it easier or harder to switch off from work?",
      "Should governments limit working hours by law?",
      "How might attitudes to retirement change in the future?",
    ],
    strategy:
      "Distinguish causes (culture, money, technology) before giving opinions, and use concessive structures ('although', 'despite') to sound balanced.",
  },
];
