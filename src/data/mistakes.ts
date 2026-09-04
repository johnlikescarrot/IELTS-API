import type { CommonMistake } from "../types.ts";

/**
 * Forty high-frequency learner mistakes drawn from common IELTS writing
 * corrections, grouped by category. Each entry pairs an incorrect sentence
 * with its correction and a plain explanation.
 */
export const COMMON_MISTAKES: readonly CommonMistake[] = [
  // ----- grammar (1-12) -----
  { id: 1, category: "grammar", incorrect: "People is becoming more health-conscious.", correct: "People are becoming more health-conscious.", explanation: "\"People\" is a plural noun, so it takes \"are\"." },
  { id: 2, category: "grammar", incorrect: "One of my friend is a doctor.", correct: "One of my friends is a doctor.", explanation: "\"One of\" must be followed by a plural noun; the singular verb then matches \"one\"." },
  { id: 3, category: "grammar", incorrect: "He suggested me to study abroad.", correct: "He suggested that I study abroad.", explanation: "\"Suggest\" is not followed by an object plus infinitive; use a that-clause or an -ing form." },
  { id: 4, category: "grammar", incorrect: "Although the weather was bad, but we enjoyed the trip.", correct: "Although the weather was bad, we enjoyed the trip.", explanation: "English uses one conjunction per clause pair; never combine \"although\" with \"but\"." },
  { id: 5, category: "grammar", incorrect: "If I will have time, I will help you.", correct: "If I have time, I will help you.", explanation: "In a first conditional, the if-clause uses the present simple, not \"will\"." },
  { id: 6, category: "grammar", incorrect: "There is many reasons to exercise.", correct: "There are many reasons to exercise.", explanation: "With a plural subject, use \"there are\"." },
  { id: 7, category: "grammar", incorrect: "I have visited London last year.", correct: "I visited London last year.", explanation: "A finished time expression such as \"last year\" requires the past simple, not the present perfect." },
  { id: 8, category: "grammar", incorrect: "She is married with a teacher.", correct: "She is married to a teacher.", explanation: "The fixed collocation is \"married to\"." },
  { id: 9, category: "grammar", incorrect: "The most of students work part-time.", correct: "Most students work part-time.", explanation: "\"Most\" is used directly before a noun without \"the\"." },
  { id: 10, category: "grammar", incorrect: "I look forward to meet you.", correct: "I look forward to meeting you.", explanation: "\"To\" in \"look forward to\" is a preposition, so it is followed by the -ing form." },
  { id: 11, category: "grammar", incorrect: "Each students must bring ID.", correct: "Each student must bring ID.", explanation: "\"Each\" is followed by a singular noun." },
  { id: 12, category: "grammar", incorrect: "He explained me the problem.", correct: "He explained the problem to me.", explanation: "\"Explain\" cannot take an indirect object; add \"to\"." },
  // ----- word-choice (13-19) -----
  { id: 13, category: "word-choice", incorrect: "Smoking effects your health.", correct: "Smoking affects your health.", explanation: "\"Affect\" is the verb; \"effect\" is normally the noun." },
  { id: 14, category: "word-choice", incorrect: "I want to loose weight.", correct: "I want to lose weight.", explanation: "\"Lose\" is the verb; \"loose\" is an adjective meaning not tight." },
  { id: 15, category: "word-choice", incorrect: "Its a great idea.", correct: "It's a great idea.", explanation: "\"It's\" means \"it is\"; \"its\" shows possession." },
  { id: 16, category: "word-choice", incorrect: "There are less cars on the road today.", correct: "There are fewer cars on the road today.", explanation: "Use \"fewer\" with countable nouns and \"less\" with uncountable nouns." },
  { id: 17, category: "word-choice", incorrect: "Despite of the rain, we walked on.", correct: "Despite the rain, we walked on.", explanation: "\"Despite\" is never followed by \"of\"; \"in spite of\" is." },
  { id: 18, category: "word-choice", incorrect: "I am agree with this view.", correct: "I agree with this view.", explanation: "\"Agree\" is a verb in English; it does not need \"am\"." },
  { id: 19, category: "word-choice", incorrect: "We discussed about the plan.", correct: "We discussed the plan.", explanation: "\"Discuss\" takes a direct object without \"about\"." },
  // ----- grammar, articles (20) -----
  { id: 20, category: "grammar", incorrect: "Children must attend the school until sixteen.", correct: "Children must attend school until sixteen.", explanation: "No article is used for institutions such as school, hospital or prison when speaking generally." },
  // ----- punctuation (21-27) -----
  { id: 21, category: "punctuation", incorrect: "I like reading, my favourite author is Orwell.", correct: "I like reading; my favourite author is Orwell.", explanation: "Two independent clauses cannot be joined by a comma alone (a comma splice); use a semicolon or a full stop." },
  { id: 22, category: "punctuation", incorrect: "Its' success surprised everyone.", correct: "Its success surprised everyone.", explanation: "The possessive of \"it\" is \"its\" with no apostrophe." },
  { id: 23, category: "punctuation", incorrect: "My brother who lives in Rome is a chef.", correct: "My brother, who lives in Rome, is a chef.", explanation: "A non-defining relative clause adds extra information and must sit between commas." },
  { id: 24, category: "punctuation", incorrect: "We bought: apples, pears and plums.", correct: "We bought apples, pears and plums.", explanation: "Do not put a colon between a verb and its objects." },
  { id: 25, category: "punctuation", incorrect: "The plan failed, however, we learned a lot.", correct: "The plan failed; however, we learned a lot.", explanation: "\"However\" as a linking adverb needs a semicolon before it or a new sentence." },
  { id: 26, category: "punctuation", incorrect: "The bus was late we missed the meeting.", correct: "The bus was late, so we missed the meeting.", explanation: "Independent clauses need a conjunction, a semicolon or a full stop between them." },
  { id: 27, category: "punctuation", incorrect: "She asked me where do you live?", correct: "She asked me, \"Where do you live?\"", explanation: "When quoting a question, capitalise its first word and keep the question mark inside the quotation marks." },
  // ----- spelling (28-34) -----
  { id: 28, category: "spelling", incorrect: "I recieved the letter yesterday.", correct: "I received the letter yesterday.", explanation: "Remember \"i before e except after c\": received." },
  { id: 29, category: "spelling", incorrect: "Accomodation is expensive here.", correct: "Accommodation is expensive here.", explanation: "\"Accommodation\" has double c and double m." },
  { id: 30, category: "spelling", incorrect: "The goverment should act now.", correct: "The government should act now.", explanation: "\"Government\" keeps the n before the m." },
  { id: 31, category: "spelling", incorrect: "We definately agree with you.", correct: "We definitely agree with you.", explanation: "There is no a in \"definitely\"." },
  { id: 32, category: "spelling", incorrect: "The accident occured last night.", correct: "The accident occurred last night.", explanation: "\"Occurred\" doubles the r." },
  { id: 33, category: "spelling", incorrect: "Sleep is necesary for good health.", correct: "Sleep is necessary for good health.", explanation: "\"Necessary\" has one c and two s letters." },
  { id: 34, category: "spelling", incorrect: "Untill next time, goodbye.", correct: "Until next time, goodbye.", explanation: "\"Until\" has only one l." },
  // ----- style (35-40) -----
  { id: 35, category: "style", incorrect: "The thing is that pollution is bad.", correct: "Pollution damages people's health.", explanation: "Replace empty openers like \"the thing is that\" with a direct statement." },
  { id: 36, category: "style", incorrect: "It is very very difficult.", correct: "It is extremely difficult.", explanation: "Avoid repeating intensifiers; choose one stronger word instead." },
  { id: 37, category: "style", incorrect: "There are many people who believe that exercise helps.", correct: "Many people believe that exercise helps.", explanation: "Avoid the wordy \"there are ... who\" pattern; let the subject lead the sentence." },
  { id: 38, category: "style", incorrect: "In my opinion, I think that cars should be banned.", correct: "In my opinion, cars should be banned.", explanation: "\"In my opinion\" and \"I think\" express the same idea; use only one." },
  { id: 39, category: "style", incorrect: "The graph went up a lot in 2020.", correct: "The graph rose sharply in 2020.", explanation: "Academic Task 1 needs precise verbs and adverbs rather than vague phrases." },
  { id: 40, category: "style", incorrect: "Nowadays everybody uses mobile phones and this is a fact.", correct: "Today, mobile phones are ubiquitous.", explanation: "Cut filler phrases that add no information; make every word earn its place." },
];
