/**
 * Personality content map and display utilities.
 * Maps personality type IDs to display names and quote pools.
 * Template tokens in quotes are interpolated at render time.
 */

const PERSONALITY_CONTENT = {
  'broken-record': {
    name: 'The Broken Record',
    emoji: '🔁',
    quotes: [
      'You gave everything a {n}. Either every {item} was identical, or you made up your mind before you got here.',
      'A {n} for you, a {n} for you — everybody gets a {n}! Commitment to consistency.',
      'You have a type. It\'s {n}. Every time.',
    ],
  },
  'love-hate-critic': {
    name: 'The Love-Hate Critic',
    emoji: '⚖️',
    quotes: [
      'It\'s a 1 or a {max} with you. No middle ground. You\'d be terrifying on a jury.',
      'You don\'t do "fine." Things are either legendary or a crime. There is no in-between.',
      'Your ratings look like a lie detector test. Peaks and valleys. No plateau.',
    ],
  },
  'speedrun': {
    name: 'The Speedrun',
    emoji: '⚡',
    quotes: [
      'You rated {count} {items} in {minutes} minutes. The grapes didn\'t get a fair trial.',
      'Blink and you missed them. Or maybe you didn\'t blink. Either way: speed record.',
      'Some people savor. You conquered.',
    ],
  },
  'golden-retriever': {
    name: 'The Golden Retriever',
    emoji: '🐕',
    quotes: [
      'Everything\'s amazing and you love everyone. Are you always like this, or is it the {items}?',
      'Your average rating is {avg}. You\'re not tasting, you\'re cheerleading. And honestly? The {items} appreciate it.',
      'If optimism were a palate, yours would be it.',
    ],
  },
  'simon-cowell': {
    name: 'The Simon Cowell',
    emoji: '🎤',
    quotes: [
      'Your average rating is {avg}. The {items} didn\'t audition for this kind of judgment.',
      'Tough crowd. Population: you.',
      'Someone had to say what everyone else was too polite to say. That someone is you.',
    ],
  },
  'novelist': {
    name: 'The Novelist',
    emoji: '📝',
    quotes: [
      'Your tasting notes have more words than most people\'s wedding vows. The {items} are flattered.',
      'You didn\'t just taste — you wrote a memoir. Each {item} got its own chapter.',
      'If this were a writing contest, you\'d be winning.',
    ],
  },
  'rollercoaster': {
    name: 'The Rollercoaster',
    emoji: '🎢',
    quotes: [
      'Your ratings went {preview}. Are you tasting {items} or having an emotional journey?',
      'Up, down, up, down. Your palate has range. Or commitment issues. Hard to tell.',
      'No two {items} got the same treatment. Every sip was a fresh start.',
    ],
  },
  'diplomat': {
    name: 'The Diplomat',
    emoji: '🕊️',
    quotes: [
      'You refuse to commit to strong opinions. Every {item} is a "yeah, it\'s fine." You must be great at workplace feedback.',
      'Playing it safe with a side of "no comment." The Switzerland of tasters.',
      'Your ratings are so middle-of-the-road they need a center line.',
    ],
  },
  'ghost': {
    name: 'The Ghost',
    emoji: '👻',
    quotes: [
      'Not a single note. The strong, silent type. The {items} will never know how you really feel.',
      'You said everything you needed to say with a number. Words are overrated anyway.',
      'Some people write novels. You write receipts. A number. That\'s it. Efficient.',
    ],
  },
  'philosopher': {
    name: 'The Philosopher',
    emoji: '🧐',
    quotes: [
      'You took your sweet time. {minutes} minutes across {count} {items}. Each one got the respect it deserved.',
      'Deliberate. Thoughtful. Some might say slow. We say "thorough."',
      'While everyone else was racing, you were savoring. This is the way.',
    ],
  },
  'explorer': {
    name: 'The Explorer',
    emoji: '🧭',
    quotes: [
      'A little of everything. You gave the {items} a fair shot across the board. Responsible. Balanced. Boringly admirable.',
      'No extreme patterns. No hot takes. Just honest, well-considered ratings. How refreshingly normal.',
      'You\'re the control group. The baseline. The reason science works.',
    ],
  },
};

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Get display data for a personality — name and a randomly selected, interpolated quote.
 * @param {string} personalityId
 * @param {object} templateVars - Token values for interpolation
 * @returns {{ name: string, quote: string } | null}
 */
export function getPersonalityDisplay(personalityId, templateVars = {}) {
  const entry = PERSONALITY_CONTENT[personalityId];
  if (!entry) return null;

  const { name, emoji, quotes } = entry;
  if (!quotes || quotes.length === 0) {
    return { name, emoji: emoji || '', quote: '' };
  }

  const rawQuote = quotes[Math.floor(Math.random() * quotes.length)];
  return { name, emoji: emoji || '', quote: interpolate(rawQuote, templateVars) };
}

/**
 * Get just the display name for a personality.
 * @param {string} personalityId
 * @returns {string|null}
 */
export function getPersonalityName(personalityId) {
  return PERSONALITY_CONTENT[personalityId]?.name ?? null;
}

export { PERSONALITY_CONTENT, interpolate };
