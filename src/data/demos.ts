export interface LyricLine {
  text: string;
  finished: boolean;
}

export interface Demo {
  id: string;
  title: string;
  year: number;
  vibeNote: string;
  processNote?: string;
  lyrics: LyricLine[];
  reactions: number;
}

export const demos: Demo[] = [
  {
    id: "1",
    title: "Ghosts in the Hallway",
    year: 2021,
    vibeNote: "bedroom recording, 3am",
    processNote: "first time using the loop pedal, just seeing what happens",
    lyrics: [
      { text: "I hear them walking when the lights go down", finished: true },
      { text: "Footsteps echo through this empty town", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~~ ~~~~~", finished: false },
      { text: "~~~ ~~~~ ~~~~~~ ~~~~~~~", finished: false },
      { text: "Maybe I'm the ghost they talk about", finished: true },
      { text: "~~~ ~~~~~~ ~~~~~ ~~~ ~~~~", finished: false },
    ],
    reactions: 12,
  },
  {
    id: "2",
    title: "Cardboard Crown",
    year: 2021,
    vibeNote: "phone voice memo, walking home",
    processNote: "melody came first, words are placeholders",
    lyrics: [
      { text: "Wearing something that don't fit right", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~~~~~~~", finished: false },
      { text: "~~~ ~~~~ ~~~~~ ~~~ ~~~~", finished: false },
      { text: "But I'll wear it through the night", finished: true },
    ],
    reactions: 8,
  },
  {
    id: "3",
    title: "Soft Landing",
    year: 2022,
    vibeNote: "garage session, rain outside",
    processNote: "chorus not figured out yet",
    lyrics: [
      { text: "Falling doesn't scare me anymore", finished: true },
      { text: "I've been closer to the floor", finished: true },
      { text: "Than the ceiling ever was", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~ ~~~~", finished: false },
      { text: "~~~ ~~~~ ~~~~~ ~~~~~~", finished: false },
      { text: "Just let me land where I land", finished: true },
    ],
    reactions: 24,
  },
  {
    id: "4",
    title: "Paper Thin Walls",
    year: 2022,
    vibeNote: "late night, headphones on",
    processNote: "beat placeholder — need to find the right sample",
    lyrics: [
      { text: "I can hear your conversations", finished: true },
      { text: "Through the drywall and the paint", finished: true },
      { text: "Every argument sounds like a prayer", finished: true },
      { text: "~~~ ~~~~~~ ~~~~~ ~~~ ~~~ ~~~~", finished: false },
    ],
    reactions: 31,
  },
  {
    id: "5",
    title: "Kitchen Light",
    year: 2023,
    vibeNote: "4am, couldn't sleep",
    processNote: "this one came out almost whole, rare",
    lyrics: [
      { text: "You left the kitchen light on again", finished: true },
      { text: "Like a lighthouse for the lost", finished: true },
      { text: "I followed it home through the fog", finished: true },
      { text: "And forgot what it cost", finished: true },
    ],
    reactions: 47,
  },
  {
    id: "6",
    title: "Static",
    year: 2023,
    vibeNote: "broken mic, kept it anyway",
    processNote: "the distortion IS the song",
    lyrics: [
      { text: "~~~ ~~~~~~ ~~~~ ~~~", finished: false },
      { text: "Between the channels there's a voice", finished: true },
      { text: "~~~ ~~~~ ~~~~~~~ ~~~~", finished: false },
      { text: "It sounds like mine but with no choice", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~ ~~~~ ~~~~", finished: false },
    ],
    reactions: 19,
  },
  {
    id: "7",
    title: "Undelivered",
    year: 2024,
    vibeNote: "voice memo turned song",
    processNote: "wrote it in one take, afraid to touch it",
    lyrics: [
      { text: "I wrote you letters I never sent", finished: true },
      { text: "Folded them into paper planes", finished: true },
      { text: "And flew them into the rain", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~~~ ~~~~~", finished: false },
      { text: "Maybe drowning was the point", finished: true },
    ],
    reactions: 56,
  },
  {
    id: "8",
    title: "Fluorescent",
    year: 2024,
    vibeNote: "recorded at a friend's place",
    processNote: "bridge needs work, verse 2 is a mumble placeholder",
    lyrics: [
      { text: "Under lights that make you look sick", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~~~~~ ~~~~", finished: false },
      { text: "We pretend this is living", finished: true },
      { text: "~~~ ~~~~ ~~~~ ~~~~~~ ~~~~", finished: false },
      { text: "~~~ ~~~~~~ ~~~~~ ~~ ~~~~", finished: false },
    ],
    reactions: 33,
  },
  {
    id: "9",
    title: "Outline",
    year: 2025,
    vibeNote: "new mic, testing levels",
    processNote: "just the skeleton — flesh comes later",
    lyrics: [
      { text: "I'm just an outline of the person", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~~~ ~~~~", finished: false },
      { text: "~~~ ~~~~ ~~~~~~ ~~~~~~~~", finished: false },
      { text: "Fill me in when you're ready", finished: true },
      { text: "~~~ ~~~~~~ ~~~~~ ~~~ ~~~~", finished: false },
    ],
    reactions: 14,
  },
  {
    id: "10",
    title: "Almost There",
    year: 2025,
    vibeNote: "2am, headphones, quiet house",
    processNote: "this might be the one. need to sit with it.",
    lyrics: [
      { text: "We're almost there, I keep saying", finished: true },
      { text: "But the road keeps rearranging", finished: true },
      { text: "~~~ ~~~~~~ ~~~~ ~~~~ ~~~~", finished: false },
      { text: "Every mile looks like the last one", finished: true },
    ],
    reactions: 41,
  },
  {
    id: "11",
    title: "Untitled (March)",
    year: 2026,
    vibeNote: "fresh start, blank page energy",
    processNote: "nothing figured out. that's the point.",
    lyrics: [
      { text: "~~~ ~~~~~~ ~~~~ ~~~", finished: false },
      { text: "~~~ ~~~~ ~~~~~~ ~~~~", finished: false },
      { text: "Something wants to start here", finished: true },
      { text: "~~~ ~~~~~~ ~~~~~ ~~~ ~~~~", finished: false },
      { text: "~~~ ~~~~ ~~~~~ ~~~~~~", finished: false },
    ],
    reactions: 7,
  },
];

export const years = [2026, 2025, 2024, 2023, 2022, 2021];
