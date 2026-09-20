// Short, punchy nudges — mixed tones so daily notifications don't feel repetitive.
export const QUOTES = [
  "Every euro you don't spend today is a step closer to that flight to Europe.",
  "Small leaks sink ships. Check today's spending before it checks you.",
  "You're not depriving yourself — you're funding a better memory.",
  "The trip doesn't fund itself. Today's the day to protect the goal.",
  "Future-you, sitting in a café in Lisbon, says thank you.",
  "Skip it today, sip it there. Your goal is closer than it feels.",
  "Discipline today is a plane ticket tomorrow.",
  "You don't need it. You need the goal more.",
  "One boring Tuesday of restraint = one unforgettable day abroad.",
  "Check your spend. Protect the plan. The trip is real if you make it real.",
  "Nobody regrets the money they didn't spend on things they don't remember.",
  "Your goal doesn't care about convenience. Stay the course.",
  "Every day under budget compounds. Keep stacking them.",
  "The version of you in Europe was built by the version of you today.",
];

export function getRandomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
