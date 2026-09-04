export type Skill = 'listening' | 'reading' | 'writing' | 'speaking';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export interface Exercise { id: string; skill: Skill; title: string; difficulty: Difficulty; prompt: string; tags: string[]; source: { title: string; url: string }; }

// Original, openly licensed metadata and prompts. Do not redistribute copyrighted test books.
export const exercises: Exercise[] = [
  { id: 'reading-paraphrase-001', skill: 'reading', title: 'Paraphrase recognition', difficulty: 'beginner', prompt: 'Identify the sentence that has the same meaning as the passage.', tags: ['paraphrase', 'vocabulary'], source: { title: 'IELTS research and resources', url: 'https://www.ielts.org/for-organisations/research' } },
  { id: 'writing-opinion-001', skill: 'writing', title: 'Opinion essay planner', difficulty: 'intermediate', prompt: 'Some people believe public transport should be free. Outline both views and give your opinion.', tags: ['task-2', 'opinion'], source: { title: 'IELTS test format', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test' } },
  { id: 'speaking-city-001', skill: 'speaking', title: 'Describe a place', difficulty: 'beginner', prompt: 'Describe a city you would like to visit. You should say where it is, what you would do there, and why.', tags: ['part-2', 'fluency'], source: { title: 'IELTS speaking test format', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test' } },
  { id: 'listening-numbers-001', skill: 'listening', title: 'Numbers and spelling', difficulty: 'beginner', prompt: 'Practise writing names, addresses, prices, and dates accurately while listening.', tags: ['part-1', 'accuracy'], source: { title: 'IELTS test format', url: 'https://ielts.org/take-a-test/test-types/ielts-academic-test' } }
];
