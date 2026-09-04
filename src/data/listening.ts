/**
 * Listening practice tests (2 tests x 2 sections).
 *
 * Each section ships the full audio transcript plus questions with answers
 * and explanations, so learners can self-study without the audio file.
 * All content is original to this project (MIT).
 */

import type { ListeningTest } from "../types.js";

export const listeningTests: readonly ListeningTest[] = [
  {
    id: "lt-001",
    skill: "listening",
    module: "both",
    title: "Campus Life",
    minutes: 30,
    sections: [
      {
        id: "lt-001-s1",
        title: "Joining the university library",
        scenario:
          "A conversation between a new student and a library assistant.",
        transcript: [
          "Woman: Good morning, how can I help you?",
          "Man: Hi, I've just started my course and I'd like to join the library.",
          "Woman: Of course. Can I take your name?",
          "Man: Anna Whitfield. That's W-H-I-T-F-I-E-L-D.",
          "Woman: Thank you. And which department are you in?",
          "Man: Chemistry - but I'm on the foundation year.",
          "Woman: That's fine. Membership is free, but there's a refundable deposit of five pounds for the card.",
          "Man: No problem. How many books can I borrow at once?",
          "Woman: Foundation students can borrow six items for two weeks. Postgraduates get ten.",
          "Man: And what happens if a book comes back late?",
          "Woman: It's fifty pence a day for standard loans, so please don't be late! Items on the reserved shelf can't leave the library at all.",
          "Man: Understood. One last thing - are you open at weekends?",
          "Woman: We're open until nine on weekdays, and from ten to four on Saturdays. We're closed on Sundays.",
          "Man: That works for me. Here's my deposit.",
        ].join("\n"),
        questions: [
          {
            id: "lt-001-s1-q1",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with ONE WORD: Membership form - Name: Anna ______",
            answer: "Whitfield",
            wordLimit: 1,
            explanation:
              "The student spells the surname: 'Whitfield, W-H-I-T-F-I-E-L-D'.",
          },
          {
            id: "lt-001-s1-q2",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with ONE WORD OR NUMBER: Card deposit (refundable): £______",
            answer: "5",
            wordLimit: 1,
            explanation:
              "'There's a refundable deposit of five pounds for the card.'",
          },
          {
            id: "lt-001-s1-q3",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with NO MORE THAN TWO WORDS: Loan period for foundation students: ______",
            answer: "two weeks",
            wordLimit: 2,
            explanation:
              "'Foundation students can borrow six items for two weeks.'",
          },
          {
            id: "lt-001-s1-q4",
            type: "multiple_choice",
            band: 6,
            prompt: "How many items can postgraduate students borrow?",
            options: ["Six", "Eight", "Ten"],
            answer: "Ten",
            explanation: "'Postgraduates get ten.'",
          },
          {
            id: "lt-001-s1-q5",
            type: "multiple_choice",
            band: 6,
            prompt: "The library is closed",
            options: ["on Saturdays", "on Sundays", "after four on weekdays"],
            answer: "on Sundays",
            explanation:
              "'From ten to four on Saturdays. We're closed on Sundays.'",
          },
        ],
      },
      {
        id: "lt-001-s2",
        title: "Welcome to the sports centre",
        scenario: "A short talk given to new students by a centre manager.",
        transcript: [
          "Good morning, and welcome to the university sports centre. I'll quickly run through what's available and how to book it.",
          "Your student card already includes basic membership, which covers the swimming pool, the gym and all fitness classes. Team sports - football, basketball and hockey - are organised through the students' union, and sign-up sheets go up in the main corridor every Monday morning.",
          "The climbing wall and the sauna are extra. Passes cost twelve pounds a month, or a hundred pounds for the year. If you'd like personal coaching, sessions are twenty pounds each, and if you block-book four, the fifth one is free.",
          "We're open from six in the morning to ten at night during term time, and we run a reduced timetable, eight till six, during the vacations.",
          "One last thing: the lockers take a one-pound coin, which you get back when you return the key. That's everything from me - I'll now take questions.",
        ].join("\n"),
        questions: [
          {
            id: "lt-001-s2-q1",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with NO MORE THAN TWO WORDS: Basic membership covers the pool, the gym and ______",
            answer: "fitness classes",
            wordLimit: 2,
            explanation:
              "Basic membership 'covers the swimming pool, the gym and all fitness classes'.",
          },
          {
            id: "lt-001-s2-q2",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with ONE WORD OR NUMBER: Annual climbing-wall and sauna pass: £______",
            answer: "100",
            wordLimit: 1,
            explanation:
              "'Passes cost twelve pounds a month, or a hundred pounds for the year.'",
          },
          {
            id: "lt-001-s2-q3",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with NO MORE THAN TWO WORDS: Vacation closing time: ______",
            answer: "6 p.m.",
            wordLimit: 2,
            explanation:
              "'A reduced timetable, eight till six, during the vacations.'",
          },
          {
            id: "lt-001-s2-q4",
            type: "multiple_choice",
            band: 7,
            prompt: "How do students join a team sport?",
            options: [
              "By signing up through the sports centre",
              "By signing up through the students' union",
              "By emailing the coach",
            ],
            answer: "By signing up through the students' union",
            explanation:
              "Team sports 'are organised through the students' union'.",
          },
          {
            id: "lt-001-s2-q5",
            type: "multiple_choice",
            band: 7,
            prompt: "What is offered to students who buy coaching sessions?",
            options: [
              "The fifth session is free after block-booking four",
              "All sessions are half price",
              "Free use of the climbing wall",
            ],
            answer: "The fifth session is free after block-booking four",
            explanation:
              "'Sessions are twenty pounds each, and if you block-book four, the fifth one is free.'",
          },
        ],
      },
    ],
  },
  {
    id: "lt-002",
    skill: "listening",
    module: "both",
    title: "City Living",
    minutes: 30,
    sections: [
      {
        id: "lt-002-s1",
        title: "Booking a photography workshop",
        scenario: "A phone call to a community college.",
        transcript: [
          "Woman: Good afternoon, Pinefield Community College. How can I help?",
          "Man: Hello. I saw a poster about the Saturday photography workshop. Is it still possible to book?",
          "Woman: Let me check. The beginners' workshop on the fourteenth of March has spaces. That one runs from nine thirty until four.",
          "Man: Great. How much is it?",
          "Woman: Forty pounds, and that includes the materials. You would need to bring your own camera, though.",
          "Man: That's fine. And where does it take place?",
          "Woman: In the annexe - that's the building behind the main college - room 2B. There's parking on site, and the college is a five-minute walk from Central Station.",
          "Man: Perfect. There was an intermediate class as well, wasn't there?",
          "Woman: Yes, on the twenty-first. That one is thirty-two pounds, but I'm afraid it's completely full. I can put you on the waiting list if you like.",
          "Man: No, don't worry. I'll take the beginners' one on the fourteenth. Can I pay now?",
          "Woman: Certainly - you can reserve with a card over the phone, or pay cash at reception on any weekday before the course starts.",
          "Man: I'll pay by card now, actually.",
        ].join("\n"),
        questions: [
          {
            id: "lt-002-s1-q1",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with ONE WORD: Beginners' workshop date: 14 ______",
            answer: "March",
            wordLimit: 1,
            explanation:
              "'The beginners' workshop on the fourteenth of March has spaces.'",
          },
          {
            id: "lt-002-s1-q2",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with NO MORE THAN TWO WORDS: Workshop times: 9:30 a.m. to ______",
            answer: "4 p.m.",
            wordLimit: 2,
            explanation: "'That one runs from nine thirty until four.'",
          },
          {
            id: "lt-002-s1-q3",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with ONE WORD OR NUMBER: Course fee (materials included): £______",
            answer: "40",
            wordLimit: 1,
            explanation: "'Forty pounds, and that includes the materials.'",
          },
          {
            id: "lt-002-s1-q4",
            type: "multiple_choice",
            band: 7,
            prompt: "Why does the man book the beginners' workshop?",
            options: [
              "It is cheaper than the intermediate class",
              "The intermediate class is fully booked",
              "It is closer to his home",
            ],
            answer: "The intermediate class is fully booked",
            explanation:
              "The intermediate class 'is completely full' and he declines the waiting list.",
          },
          {
            id: "lt-002-s1-q5",
            type: "multiple_choice",
            band: 6,
            prompt: "What must participants bring themselves?",
            options: ["The course materials", "A packed lunch", "A camera"],
            answer: "A camera",
            explanation: "'You would need to bring your own camera, though.'",
          },
        ],
      },
      {
        id: "lt-002-s2",
        title: "The city bike-share scheme",
        scenario: "A local radio news segment about a new transport scheme.",
        transcript: [
          "From next month, Rivermouth will join the growing list of cities running a public bike-share scheme. Two hundred electric bikes will be stationed at forty docking points around the city centre and the university district. The project has cost the council one point two million pounds, half of which came from a national green-transport grant.",
          "Here's how it works. Riders unlock a bike with an app or a membership card. The first thirty minutes of every ride are free; after that, pricing is deliberately designed to keep trips short - one pound for each extra half hour. Annual members pay sixty pounds and get the first hour of every ride free instead.",
          "Supporters, including the cycling campaign group RideSafe, say the scheme will cut congestion and give residents who don't own a bike easy access to one. Critics counter that the docking points are clustered in wealthier neighbourhoods and that the city still has no safe cycle lanes on either of its two bridges. The council replies that a separate lanes programme begins in the autumn.",
          "The scheme opens on the third of April, and rides will be free for everyone during the opening weekend.",
        ].join("\n"),
        questions: [
          {
            id: "lt-002-s2-q1",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with ONE WORD OR NUMBER: Bikes available at launch: ______",
            answer: "200",
            wordLimit: 1,
            explanation:
              "'Two hundred electric bikes will be stationed at forty docking points.'",
          },
          {
            id: "lt-002-s2-q2",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with NO MORE THAN TWO WORDS: Free riding time on each trip: the first ______",
            answer: "30 minutes",
            wordLimit: 2,
            explanation: "'The first thirty minutes of every ride are free.'",
          },
          {
            id: "lt-002-s2-q3",
            type: "note_completion",
            band: 6,
            prompt:
              "Complete the note with ONE WORD: Free rides for everyone during the opening ______",
            answer: "weekend",
            wordLimit: 1,
            explanation:
              "'Rides will be free for everyone during the opening weekend.'",
          },
          {
            id: "lt-002-s2-q4",
            type: "multiple_choice",
            band: 7,
            prompt: "What was the total cost of the scheme?",
            options: ["£1.2 million", "£600,000", "£40,000"],
            answer: "£1.2 million",
            explanation:
              "'The project has cost the council one point two million pounds, half of which came from a national green-transport grant.'",
          },
          {
            id: "lt-002-s2-q5",
            type: "multiple_choice",
            band: 8,
            prompt: "Which criticism of the scheme is mentioned?",
            options: [
              "The bikes are too expensive to ride",
              "The docking points are unevenly distributed",
              "There are not enough bikes",
            ],
            answer: "The docking points are unevenly distributed",
            explanation:
              "Critics say 'the docking points are clustered in wealthier neighbourhoods'.",
          },
        ],
      },
    ],
  },
];
