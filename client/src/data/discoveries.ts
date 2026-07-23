export type SectionKey = 'journey' | 'quests' | 'experience' | 'hobbies' | 'contact';

export interface Discovery { key: string; name: string; how: string; }

export const CHAT_QUESTION_LIMIT = 3;

export const DISCOVERIES: Discovery[] = [
  { key: 'worldmap', name: 'Cartographer', how: 'Visit the World Map' },
  { key: 'battlelog', name: 'War Historian', how: 'Visit the Battle Log' },
  { key: 'questlog', name: 'Lore Keeper', how: 'Visit the Quest Log' },
  { key: 'inventory', name: 'Pack Rat', how: 'Open the Inventory' },
  { key: 'contact', name: 'Messenger', how: 'Reach the Contact page' },
  { key: 'item', name: 'Curious Collector', how: 'Inspect an inventory item' },
  { key: 'allchars', name: 'Shapeshifter', how: 'Cycle through every character' },
  { key: 'sound', name: 'Sound Engineer', how: 'Toggle the sound' },
  { key: 'familiar', name: 'Beast Tamer', how: 'Summon your familiar' },
  { key: 'konami', name: 'Code Breaker', how: 'Enter a legendary input sequence' },
];

export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export const SECTIONS: Record<SectionKey, string> = {
  journey: 'World Map opened',
  quests: 'Battle Log opened',
  experience: 'Quest Log opened',
  contact: 'Final chapter reached',
  hobbies: 'Inventory opened',
};

export const SECTION_TO_DISCOVERY: Record<SectionKey, string> = {
  journey: 'worldmap',
  quests: 'battlelog',
  experience: 'questlog',
  hobbies: 'inventory',
  contact: 'contact',
};
