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
      'Variety is the spice of life. You brought salt. Just salt. Every time.',
      'Somewhere a {item} is crying because it got the same score as every other {item}.',
      'Your ratings are a flatline. Somewhere a doctor is concerned.',
      'You found your number and you stuck with it. Loyalty like that is rare.',
      'If your ratings were a playlist, it\'d be one song on repeat.',
      'The {items} showed up in different outfits. You didn\'t notice.',
      'Consistency is a virtue. You\'ve made it a lifestyle.',
    ],
  },
  'love-hate-critic': {
    name: 'The Love-Hate Critic',
    emoji: '⚖️',
    quotes: [
      'It\'s a 1 or a {max} with you. No middle ground. You\'d be terrifying on a jury.',
      'You don\'t do "fine." Things are either legendary or a crime. There is no in-between.',
      'Your ratings look like a lie detector test. Peaks and valleys. No plateau.',
      'Your rating history reads like a soap opera. Love. Betrayal. Nothing in between.',
      'Nuance called. You sent it to voicemail.',
      'You rate like you\'re sorting laundry — lights and darks. Nothing in between.',
      'Moderation isn\'t a word in your vocabulary. And honestly, it shouldn\'t be.',
      'You loved it or you buried it. The {items} didn\'t get a warning.',
      'Every {item} either made your night or ruined it. No one went home neutral.',
      'You experience {items} the way people experience skydiving — thrilling or terrifying.',
    ],
  },
  'speedrun': {
    name: 'The Speedrun',
    emoji: '⚡',
    quotes: [
      'You rated {count} {items} in {minutes} minutes. The grapes didn\'t get a fair trial.',
      'Blink and you missed them. Or maybe you didn\'t blink. Either way: speed record.',
      'Some people savor. You conquered.',
      'Your palate has a no-loitering policy.',
      'You tasted {count} {items} like someone was about to take them away.',
      'If tasting were an Olympic sport, you\'d be disqualified for false-starting.',
      'You didn\'t taste — you scanned. Beep. Beep. Beep. Done.',
      'The {items} barely had time to introduce themselves.',
      'Speed isn\'t everything. But you disagree.',
      'Somewhere a sommelier just felt a disturbance in the force.',
    ],
  },
  'golden-retriever': {
    name: 'The Golden Retriever',
    emoji: '🐕',
    quotes: [
      'Everything\'s amazing and you love everyone. Are you always like this, or is it the {items}?',
      'Your average rating is {avg}. You\'re not tasting, you\'re cheerleading. And honestly? The {items} appreciate it.',
      'If optimism were a palate, yours would be it.',
      'You\'d give a participation trophy to grape juice.',
      'Every {item} left this tasting feeling seen and validated.',
      'You don\'t have a critical bone in your body. The {items} adore you for it.',
      'Your palate doesn\'t have standards. It has open arms.',
      'If your ratings were a weather forecast, it\'d be sunshine every day.',
      'You\'re the person who claps when the plane lands. And the {items} are the plane.',
      'Negativity bounces off you like light off a disco ball.',
    ],
  },
  'simon-cowell': {
    name: 'The Simon Cowell',
    emoji: '🎤',
    quotes: [
      'Your average rating is {avg}. The {items} didn\'t audition for this kind of judgment.',
      'Tough crowd. Population: you.',
      'Someone had to say what everyone else was too polite to say. That someone is you.',
      'You didn\'t come here to make friends. You came here to be honest. Brutally.',
      'The {items} have filed a class-action lawsuit against your palate.',
      'Your palate has impossibly high standards. The {items} tried their best.',
      'You grade on a curve where the curve is a cliff.',
      'Even the best {item} tonight got a polite nod at most.',
      'You taste {items} the way a teacher grades essays — red pen energy.',
      'Generous isn\'t in your tasting vocabulary. Precise is.',
    ],
  },
  'novelist': {
    name: 'The Novelist',
    emoji: '📝',
    quotes: [
      'Your tasting notes have more words than most people\'s wedding vows. The {items} are flattered.',
      'You didn\'t just taste — you wrote a memoir. Each {item} got its own chapter.',
      'If this were a writing contest, you\'d be winning.',
      'Your notes have footnotes. The {items} are considering a publishing deal.',
      'You\'ve written more tonight than most people write in a thank-you card.',
      'Each {item} got a review longer than its ingredient list.',
      'Your tasting notes could be submitted as a short story. Non-fiction, we hope.',
      'You brought a pen to a tasting. Metaphorically. And literally, probably.',
      'If words were ratings, you\'d be off the chart.',
      'The {items} didn\'t just get tasted. They got documented.',
    ],
  },
  'rollercoaster': {
    name: 'The Rollercoaster',
    emoji: '🎢',
    quotes: [
      'Your ratings went {preview}. Are you tasting {items} or having an emotional journey?',
      'Up, down, up, down. Your palate has range. Or commitment issues. Hard to tell.',
      'No two {items} got the same treatment. Every sip was a fresh start.',
      'Your palate doesn\'t have preferences. It has plot twists.',
      'Consistency is not your love language.',
      'Your ratings have more ups and downs than a season finale.',
      'Predicting your next rating is like predicting the weather in April.',
      'Every {item} was a fresh coin flip. The {items} never knew what was coming.',
      'Stable is for horses. You\'re here for the drama.',
      'Your ratings tell a story. A chaotic, unpredictable, page-turning story.',
    ],
  },
  'diplomat': {
    name: 'The Diplomat',
    emoji: '🕊️',
    quotes: [
      'You refuse to commit to strong opinions. Every {item} is a "yeah, it\'s fine." You must be great at workplace feedback.',
      'Playing it safe with a side of "no comment." The Switzerland of tasters.',
      'Your ratings are so middle-of-the-road they need a center line.',
      'You have the palate of a press secretary. Everything is "fine."',
      'If fence-sitting were a sport, you\'d medal.',
      'Not a single hot take. You played it cooler than the {items} themselves.',
      'Strong opinions are for other people. You\'re here for the ambiance.',
      'You rated every {item} like a politician answering a direct question.',
      'Middle of the road, every time. The rumble strips are your comfort zone.',
      'You give "no further comment" energy. The {items} wanted more.',
    ],
  },
  'ghost': {
    name: 'The Ghost',
    emoji: '👻',
    quotes: [
      'Not a single note. The strong, silent type. The {items} will never know how you really feel.',
      'You said everything you needed to say with a number. Words are overrated anyway.',
      'Some people write novels. You write receipts. A number. That\'s it. Efficient.',
      'You rated. You left no trace. The CIA would be proud.',
      'You\'re the strong, silent type. The {items} respect that. Probably.',
      'Zero notes. Maximum mystery. The {items} will wonder about you forever.',
      'You let the numbers speak for themselves. The numbers said very little.',
      'Your tasting notes are a blank page. Bold artistic choice.',
      'You\'re not quiet — you\'re efficient. Big difference. Allegedly.',
      'A rating. No commentary. You treat {items} like elevator small talk.',
    ],
  },
  'philosopher': {
    name: 'The Philosopher',
    emoji: '🧐',
    quotes: [
      'You took your sweet time. {minutes} minutes across {count} {items}. Each one got the respect it deserved.',
      'Deliberate. Thoughtful. Some might say slow. We say "thorough."',
      'While everyone else was racing, you were savoring. This is the way.',
      'You took longer per {item} than most people take choosing a Netflix show.',
      'Rushed decisions are for people who don\'t understand {items}. You understand {items}.',
      'You don\'t sip — you contemplate. Each {item} got a meditation session.',
      'Time is a construct. You treated it that way tonight.',
      'Your pace suggests either deep thought or excellent conversation. Possibly both.',
      'You gave every {item} the time others reserve for important life decisions.',
      'Patience is a virtue. You\'ve turned it into a tasting strategy.',
    ],
  },
  'explorer': {
    name: 'The Explorer',
    emoji: '🧭',
    quotes: [
      'A little of everything. You gave the {items} a fair shot across the board. Responsible. Balanced. Boringly admirable.',
      'No extreme patterns. No hot takes. Just honest, well-considered ratings. How refreshingly normal.',
      'You\'re the control group. The baseline. The reason science works.',
      'You spread your ratings around like a responsible voter.',
      'No agenda. No bias. Just vibes. Perfectly calibrated vibes.',
      'You\'re the most balanced person here. Congratulations. We think.',
      'Your ratings are so reasonable it\'s almost suspicious.',
      'You defied every algorithm that tried to put you in a box.',
      'Normal is underrated. Literally. You rated it just right.',
      'Everyone else got a dramatic personality. You got common sense.',
    ],
  },
};

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Get display data for a personality — name and a selected, interpolated quote.
 * When quoteIndex is omitted a random quote is chosen; when provided that
 * exact index is used (clamped to the pool size) for deterministic selection.
 * @param {string} personalityId
 * @param {object} templateVars - Token values for interpolation
 * @param {number} [quoteIndex] - Explicit index into the quote pool (clamped)
 * @returns {{ name: string, emoji: string, quote: string, quoteIndex: number } | null}
 */
export function getPersonalityDisplay(personalityId, templateVars = {}, quoteIndex) {
  const entry = PERSONALITY_CONTENT[personalityId];
  if (!entry) return null;

  const { name, emoji, quotes } = entry;
  if (!quotes || quotes.length === 0) {
    return { name, emoji: emoji || '', quote: '', quoteIndex: -1 };
  }

  const idx = quoteIndex !== undefined
    ? Math.max(0, Math.min(quoteIndex, quotes.length - 1))
    : Math.floor(Math.random() * quotes.length);
  const rawQuote = quotes[idx];
  return { name, emoji: emoji || '', quote: interpolate(rawQuote, templateVars), quoteIndex: idx };
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
