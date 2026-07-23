export const FAMILIAR_ANIMALS = ['🐉', '🦊', '🐺', '🦉', '🐢', '🐦', '🐲', '🦇', '🐍', '🦁', '🐸', '🦎', '🐧', '🦅', '🐨', '🐼'];
export const FAMILIAR_FOOD = ['🍕', '🍔', '🍩', '🍗'];

export const FAMILIAR_GREETINGS: Record<string, string> = {
  '🐉': "*uncurls a smoky tail* A hatchling of ancient fire, at your service. Ask away.",
  '🦊': "*ears perk up* Oh! A visitor. I was just about to nap. What do you want to know?",
  '🐺': "*circles once, sits* I run with Anjoelo's pack. Ask your questions, traveler.",
  '🦉': "*blinks slowly* Ah, a seeker of knowledge. I have been awake this whole time, obviously.",
  '🐢': "*pokes head out of shell* ...give me a second... okay, I'm ready. Go slow, I like slow.",
  '🐦': "*chirps twice, hops closer* Tweet tweet! That means hello. Ask me something!",
  '🐲': "*small wings flutter* I may be little, but I know all of Anjoelo's secrets. Try me.",
  '🦇': "*hangs upside down, opens one eye* Ask quick, before I doze off again.",
  '🐍': "*coils curiously* Ssssummoned, are we? Sssspeak your quessstion.",
  '🦁': "*shakes a tiny mane* Roar! (that means hi.) State your business, adventurer.",
  '🐸': "*ribbit* Hopped all the way here for you. What's the quest, friend?",
  '🦎': "*tilts head, changes color slightly* Curious little thing, aren't I? Ask away.",
  '🐧': "*waddles into view* Brrr, chilly out here. Warm me up with a good question.",
  '🦅': "*swoops down, lands*  I've seen this whole resume from above. Ask and I'll tell you.",
  '🐨': "*yawns, clings to a branch* Mm? Oh, right, you're here. What did you want to ask?",
  '🐼': "*rolls over, munching* Five more minutes... okay fine, I'm up. Go ahead.",
  '🍕': "*a slice waddles over, somehow* I am not an animal. I am pizza. Ask me anything anyway.",
  '🍔': "*wobbles proudly on its bun* You have summoned... a burger. This was not in the plan, but here we are.",
  '🍩': "*rolls in circles happily* Sprinkles and secrets, that's what I'm made of. Ask away!",
  '🍗': "*a drumstick with eyes blinks at you* This is unusual, even for me. Go on, ask your question.",
};

export function rollFamiliar(): string {
  const isFood = Math.random() < 1 / 20;
  const pool = isFood ? FAMILIAR_FOOD : FAMILIAR_ANIMALS;
  return pool[Math.floor(Math.random() * pool.length)];
}
