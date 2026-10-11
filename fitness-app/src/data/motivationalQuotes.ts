export interface MotivationalQuote {
  text: string;
  author: string;
}

export const MOTIVATIONAL_QUOTES: MotivationalQuote[] = [
  // David Goggins
  { text: "Don't stop when you're tired. Stop when you're done.", author: 'David Goggins' },
  { text: 'Stay hard.', author: 'David Goggins' },
  { text: 'You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.', author: 'David Goggins' },
  { text: "We live in a world where mediocrity is often celebrated. My philosophy is that we grow only through suffering, through challenge.", author: 'David Goggins' },
  { text: 'Motivation is crap. Motivation comes and goes. When you are driven, whatever is in front of you will get destroyed.', author: 'David Goggins' },
  { text: 'No matter how bad things get, if you stick to the plan and execute, you will be fine.', author: 'David Goggins' },
  { text: 'The most important conversations you will ever have are the ones you have with yourself.', author: 'David Goggins' },

  // Arnold Schwarzenegger
  { text: 'Strength does not come from winning. Your struggles develop your strengths.', author: 'Arnold Schwarzenegger' },
  { text: 'The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.', author: 'Arnold Schwarzenegger' },
  { text: "Nothing is impossible. The word itself says, 'I'm possible.'", author: 'Arnold Schwarzenegger' },
  { text: 'The resistance that you fight physically in the gym and the resistance that you fight in life can only build a strong character.', author: 'Arnold Schwarzenegger' },
  { text: 'For me, life is continuously being hungry. The meaning of life is not simply to exist.', author: 'Arnold Schwarzenegger' },
  { text: 'Strip away the loss, and what remains? Sometimes exactly the thing you need.', author: 'Arnold Schwarzenegger' },

  // Other motivating voices
  { text: "I hated every minute of training, but I said, 'Don't quit. Suffer now and live the rest of your life as a champion.'", author: 'Muhammad Ali' },
  { text: 'The most important thing is to try and inspire people so that they can be great in whatever they want to do.', author: 'Kobe Bryant' },
  { text: "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.", author: 'Ronnie Coleman' },
  { text: "I've failed over and over and over again in my life and that is why I succeed.", author: 'Michael Jordan' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'The pain you feel today will be the strength you feel tomorrow.', author: 'Arnold Schwarzenegger' },
];

/**
 * Deterministic per-day pick so the quote stays stable across renders and
 * re-visits within the same day instead of flickering to something new
 * every reload.
 */
export function quoteOfTheDay(date: Date = new Date()): MotivationalQuote {
  const dayKey = Number(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  );
  const index = dayKey % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}

export function randomQuote(): MotivationalQuote {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}
