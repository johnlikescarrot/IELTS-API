import type { SpeakingTopic } from "../types.ts";

/**
 * Ten complete IELTS Speaking practice topics, each with Part 1 questions,
 * a Part 2 cue card and Part 3 discussion questions.
 */
export const SPEAKING_TOPICS: readonly SpeakingTopic[] = [
  {
    id: "work-and-career",
    topic: "Work and career",
    part1: [
      "Do you work, or are you a student?",
      "What are your main responsibilities?",
      "Do you prefer working alone or in a team? Why?",
      "Would you like to change jobs in the future?",
      "How do you relax after work?",
    ],
    part2: {
      cueCard: "Describe a job you would like to have in the future.",
      prompts: [
        "what the job is",
        "what qualifications or skills it requires",
        "why it appeals to you",
        "and explain what you would need to do to get it",
      ],
      followUp: [
        "Is it better to have one career for life or several?",
        "Do salaries matter more than job satisfaction?",
      ],
    },
    part3: [
      "How have workplaces changed in the last twenty years?",
      "Should employers offer training throughout a person's career?",
      "Will automation make most office jobs unnecessary?",
      "What makes a workplace attractive to talented people?",
    ],
  },
  {
    id: "education-and-learning",
    topic: "Education and learning",
    part1: [
      "What did you like most about school?",
      "Did you have a favourite teacher? What made them special?",
      "How much homework did you have?",
      "Would you like to study something new in the future?",
      "Do you prefer studying in the morning or at night?",
    ],
    part2: {
      cueCard: "Describe a course or subject you enjoyed studying.",
      prompts: [
        "what the subject was",
        "who taught it",
        "what you learned",
        "and explain why you enjoyed it",
      ],
      followUp: [
        "Do exams measure ability fairly?",
        "Is online learning as effective as classroom learning?",
      ],
    },
    part3: [
      "Should university education be free for everyone?",
      "How might schools change in the next fifty years?",
      "Are exams or coursework a better measure of learning?",
      "Why do some adults return to study later in life?",
    ],
  },
  {
    id: "technology-and-gadgets",
    topic: "Technology and gadgets",
    part1: [
      "Which device do you use the most?",
      "How often do you buy new gadgets?",
      "Are you good with technology? Why or why not?",
      "What app could you not live without?",
      "Do you think people spend too much time on screens?",
    ],
    part2: {
      cueCard: "Describe a piece of technology you find useful.",
      prompts: [
        "what it is",
        "how long you have had it",
        "how you use it",
        "and explain how it helps you",
      ],
      followUp: [
        "Do older and younger people use technology differently?",
        "Should children learn coding at school?",
      ],
    },
    part3: [
      "Has technology made people more or less patient?",
      "Who should be responsible for protecting children online?",
      "How will artificial intelligence change daily life?",
      "Are we becoming too dependent on machines?",
    ],
  },
  {
    id: "travel-and-holidays",
    topic: "Travel and holidays",
    part1: [
      "Where did you spend your last holiday?",
      "Do you prefer beach or city breaks? Why?",
      "Do you like planning trips in advance?",
      "Have you ever travelled alone?",
      "What is the longest journey you have ever taken?",
    ],
    part2: {
      cueCard: "Describe a memorable trip you have taken.",
      prompts: [
        "where you went",
        "who you went with",
        "what you did there",
        "and explain why the trip was memorable",
      ],
      followUp: [
        "Does tourism benefit local communities?",
        "Is it better to travel widely or to know one place deeply?",
      ],
    },
    part3: [
      "How will people travel in fifty years?",
      "Should there be limits on flights to protect the environment?",
      "Why do some people never travel abroad?",
      "Does travel really broaden the mind?",
    ],
  },
  {
    id: "health-and-fitness",
    topic: "Health and fitness",
    part1: [
      "What do you do to stay healthy?",
      "How often do you exercise?",
      "Do you try to eat healthily? In what way?",
      "How much sleep do you usually get?",
      "Have your habits changed in the last five years?",
    ],
    part2: {
      cueCard: "Describe a time when you changed a habit to improve your health.",
      prompts: [
        "what the habit was",
        "why you decided to change",
        "how difficult it was",
        "and explain how you felt afterwards",
      ],
      followUp: [
        "Are people today healthier than in the past?",
        "Should governments tax unhealthy food?",
      ],
    },
    part3: [
      "Who is responsible for public health: individuals or governments?",
      "Why are young people less fit than previous generations?",
      "How can cities encourage walking and cycling?",
      "Will technology make doctors less necessary?",
    ],
  },
  {
    id: "the-environment",
    topic: "The environment",
    part1: [
      "Do you recycle at home?",
      "Is air quality a problem in your city?",
      "Do you worry about climate change? Why?",
      "Have you ever taken part in an environmental project?",
      "Would you pay more for environmentally friendly products?",
    ],
    part2: {
      cueCard: "Describe an environmental problem in the place where you live.",
      prompts: [
        "what the problem is",
        "what causes it",
        "how it affects people",
        "and explain what could be done to solve it",
      ],
      followUp: [
        "Are individuals or governments more responsible for protecting nature?",
        "Can economic growth and environmental protection go together?",
      ],
    },
    part3: [
      "Will green energy replace fossil fuels in your lifetime?",
      "Should international agreements set environmental targets?",
      "How does consumer behaviour drive environmental damage?",
      "Are zoos good or bad for conservation?",
    ],
  },
  {
    id: "family-and-friends",
    topic: "Family and friends",
    part1: [
      "How much time do you spend with your family?",
      "Who are you closest to in your family?",
      "Do you prefer spending time with friends or family? Why?",
      "What do you enjoy doing together?",
      "Did your family have any traditions when you were a child?",
    ],
    part2: {
      cueCard: "Describe a friend who has had an important influence on you.",
      prompts: [
        "who the friend is",
        "how you met",
        "what they are like",
        "and explain how they have influenced you",
      ],
      followUp: [
        "Is it easier to make friends as a child or as an adult?",
        "Can online friendships be as strong as offline ones?",
      ],
    },
    part3: [
      "How have family roles changed in your country?",
      "Should elderly parents live with their children?",
      "Why do some friendships last a lifetime?",
      "Is the size of families changing? Why?",
    ],
  },
  {
    id: "hobbies-and-leisure",
    topic: "Hobbies and leisure",
    part1: [
      "What do you do in your free time?",
      "Did you have any hobbies as a child?",
      "Do you prefer indoor or outdoor activities?",
      "Have you ever tried an extreme sport?",
      "Would you like to turn a hobby into a career?",
    ],
    part2: {
      cueCard: "Describe a hobby you enjoy.",
      prompts: [
        "what the hobby is",
        "when you started it",
        "how often you do it",
        "and explain what you enjoy about it",
      ],
      followUp: [
        "Should hobbies be difficult to be rewarding?",
        "Do people have less free time than in the past?",
      ],
    },
    part3: [
      "Why do some hobbies suddenly become fashionable?",
      "Are traditional hobbies dying out because of screens?",
      "Should schools spend more time on arts and crafts?",
      "Can hobbies help people's careers?",
    ],
  },
  {
    id: "food-and-eating-out",
    topic: "Food and eating out",
    part1: [
      "What is your favourite meal of the day?",
      "Do you enjoy cooking?",
      "How often do you eat out?",
      "Did you eat healthily as a child?",
      "Is there any food you really dislike?",
    ],
    part2: {
      cueCard: "Describe a meal that you really enjoyed.",
      prompts: [
        "when you had it",
        "who you were with",
        "what you ate",
        "and explain why you enjoyed it",
      ],
      followUp: [
        "Is home cooking better than fast food?",
        "Should children learn to cook at school?",
      ],
    },
    part3: [
      "How have eating habits changed in your country?",
      "Will people still cook at home in fifty years?",
      "Is vegetarianism becoming more popular? Why?",
      "How does food bring cultures together?",
    ],
  },
  {
    id: "hometown-and-accommodation",
    topic: "Hometown and accommodation",
    part1: [
      "Where do you live now?",
      "What do you like about your area?",
      "Has your town changed much recently?",
      "Do you live in a house or a flat?",
      "Would you like to move somewhere else one day?",
    ],
    part2: {
      cueCard: "Describe the home you would like to have in the future.",
      prompts: [
        "what kind of home it would be",
        "where it would be",
        "what it would look like",
        "and explain why you would like it",
      ],
      followUp: [
        "Is it better to rent or buy a home?",
        "Do cities need more green space?",
      ],
    },
    part3: [
      "Why is housing so expensive in many cities?",
      "Should governments build more public housing?",
      "How will people live in cities in the future?",
      "Will remote work change where people choose to live?",
    ],
  },
];
