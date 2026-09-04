import type { Topic, TopicId } from "../types.js";

/**
 * The canonical set of IELTS topic areas. Topics are the primary way learners
 * organise vocabulary, writing prompts and speaking questions.
 */
export const topics: Topic[] = [
  {
    id: "education",
    name: "Education",
    category: "general",
    description: "Schools, universities, learning, teaching and academic success.",
    keywords: ["school", "university", "study", "teacher", "student", "exam", "course"],
  },
  {
    id: "environment",
    name: "Environment",
    category: "general",
    description: "Climate change, pollution, conservation and sustainability.",
    keywords: ["climate", "pollution", "recycle", "energy", "nature", "waste"],
  },
  {
    id: "technology",
    name: "Technology",
    category: "general",
    description: "The internet, artificial intelligence, devices and the digital age.",
    keywords: ["internet", "ai", "computer", "smartphone", "digital", "robot"],
  },
  {
    id: "health",
    name: "Health",
    category: "general",
    description: "Fitness, diet, medicine, well-being and public health.",
    keywords: ["fitness", "diet", "doctor", "exercise", "mental", "nutrition"],
  },
  {
    id: "work",
    name: "Work & Careers",
    category: "general",
    description: "Jobs, employment, careers, business and the workplace.",
    keywords: ["job", "career", "business", "salary", "company", "employee"],
  },
  {
    id: "society",
    name: "Society",
    category: "general",
    description: "Communities, government, social issues and population.",
    keywords: ["community", "government", "population", "crime", "welfare", "culture"],
  },
  {
    id: "travel",
    name: "Travel & Tourism",
    category: "general",
    description: "Holidays, tourism, transport and exploring new places.",
    keywords: ["holiday", "tourism", "transport", "destination", "journey", "flight"],
  },
  {
    id: "culture",
    name: "Culture",
    category: "general",
    description: "Traditions, the arts, media, festivals and identity.",
    keywords: ["tradition", "art", "festival", "language", "media", "heritage"],
  },
  {
    id: "family",
    name: "Family & Relationships",
    category: "general",
    description: "Family structures, parenting, friendship and relationships.",
    keywords: ["family", "parent", "child", "marriage", "friendship", "generation"],
  },
  {
    id: "crime",
    name: "Crime & Law",
    category: "general",
    description: "Law, justice, punishment, policing and criminal behaviour.",
    keywords: ["law", "justice", "punishment", "police", "offence", "prison"],
  },
];

/** Find a topic by its id. */
export function getTopicById(id: string): Topic | undefined {
  return topics.find((topic) => topic.id === id);
}

/** Return all topic ids as a tuple for runtime validation. */
export function isTopicId(value: string): value is TopicId {
  return topics.some((topic) => topic.id === value);
}
