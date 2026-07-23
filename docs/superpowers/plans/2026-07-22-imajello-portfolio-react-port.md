# Imajello Portfolio React Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the "Game HUD" portfolio prototype (`design_handoff_portfolio_game_hud/design/Imajello Site v4b - Game HUD.dc.html`) into a production Vite + React + TypeScript app, pixel-faithful to the prototype, with a small Express backend for the familiar-chat LLM feature, deployable on the user's Hostinger VPS.

**Architecture:** Single-page React app (no router) with one `useReducer` + Context for shared game state, CSS Modules per component ported 1:1 from the prototype's inline styles, static data extracted to `src/data/*.ts`. Express serves the built static files and one `/api/chat` endpoint.

**Tech Stack:** Vite, React 18, TypeScript, CSS Modules, Express, Node 18+, Anthropic API (server-side).

## Global Constraints

- **Source of truth for all visual/interaction values:** `design_handoff_portfolio_game_hud/design/Imajello Site v4b - Game HUD.dc.html` (referred to below as "the reference file"). Every task that ports UI cites exact line ranges in this file as it exists today (1368 lines total) — read those lines directly before implementing; do not rely on paraphrase.
- **Fidelity rule (from spec):** colors, typography, spacing, copy, and interaction timing are final — recreate pixel-perfectly. Do not "improve" layout, wording, or animation curves.
- **Known source bugs to fix, not copy:** the reference file's Battle Log dialog header (reference line 352, inside the `isQuests` block) reads `[3]` — this collides with the Quest Log dialog header (reference line 465) which also reads `[3]`. The nav bar itself (reference lines 250/257/264) proves the correct numbering: World Map=1, Battle Log=2 (state key `quests`), Quest Log=3 (state key `experience`), Inventory=4, Contact=5. Port the Battle Log dialog header badge as `[2]`, not the source's stale `[3]`.
- **Known source naming quirk, intentionally cleaned up:** the reference script's `battleTab` state field (reference line 791) controls the **Quest Log** dialog's three tabs (Main/Side/Timeline) — it has nothing to do with the Battle Log dialog, which has no tabs. Port this as `questLogTab` in the reducer state/actions for clarity. Behavior must remain identical; this is a rename only.
- **Placeholders:** every image slot except the PlanPal project thumbnail renders with no `src` (dashed-border "coming soon" box) per the project owner's decision — see `ImageSlot` component (Task 8). The resume PDF is a placeholder file until the real one is supplied.
- **No automated test suite** (explicit project decision, documented in the design spec): this is a visual/interaction-driven single-page site. Each task's verification step is manual — run the dev server and compare the rendered output against the cited reference lines — plus `npx tsc --noEmit` for type safety and `npm run build` for build-health. Do not add Vitest/RTL.
- **Translation rules** (apply throughout; not repeated per task):
  - `<sc-if value="{{ cond }}">...</sc-if>` → `{cond && (...)}` or a ternary when there's a paired false-branch `sc-if`.
  - `<sc-for list="{{ arr }}" as="x">...</sc-for>` → `{arr.map(x => (...))}` with a stable `key`.
  - `{{ expr }}` → `{expr}` (JSX interpolation) or a template-string interpolation inside a `style` object value.
  - Inline `style="a:b;c:d"` strings → a `style={{ a: 'b', c: 'd' }}` object (camelCase properties) **or** a CSS Module class when the value is static — use CSS Modules for anything that doesn't depend on component state, inline `style` objects only for values computed from state (matches what the prototype itself does dynamically vs. statically).
  - `style-hover="..."` → a `:hover` rule in the component's CSS Module (there is no inline JS hover-style prop in real CSS).
  - `style-focus="..."` → a `:focus` rule in the CSS Module.
  - `onClick="{{ handler }}"` → `onClick={handler}` wired to a reducer `dispatch` call or context method.
  - `<x-import component-from-global-scope="image-slot" ... src="X" placeholder="Y" fit="Z">` → `<ImageSlot src={X ?? undefined} placeholder="Y" fit="Z" />` (Task 8's shared component).
  - `data-sfx=""` → the element should trigger the `useSfx().tick()` hover sound. Implement via a single delegated `mouseover` listener in `App` (ported from reference lines 896-901), matching a `data-sfx` attribute — not per-element `onMouseEnter` handlers (avoids re-render churn and matches the prototype's approach).

---

## File Structure

```
/ (repo root)
├── package.json                 # root workspaces: client, server
├── .gitignore
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/
│   │   ├── sprites/              # copied from design/sprites/
│   │   ├── fonts/                # self-hosted Silkscreen + Archivo woff2
│   │   └── Anjoelo_Calderon_Resume.pdf   # placeholder
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── App.module.css
│       ├── styles/
│       │   ├── tokens.css
│       │   └── global.css
│       ├── data/
│       │   ├── chars.ts
│       │   ├── invItems.ts
│       │   ├── discoveries.ts
│       │   ├── familiar.ts
│       │   ├── projects.ts
│       │   ├── quests.ts
│       │   └── journey.ts
│       ├── state/
│       │   ├── types.ts
│       │   ├── reducer.ts
│       │   └── GameStateContext.tsx
│       ├── hooks/
│       │   ├── useSfx.ts
│       │   ├── useParticles.ts
│       │   ├── useKonami.ts
│       │   └── useLocalStorage.ts
│       ├── components/
│       │   ├── shared/
│       │   │   ├── ImageSlot.tsx / .module.css
│       │   │   ├── Toast.tsx / .module.css
│       │   │   ├── DiscoveryListPanel.tsx / .module.css
│       │   │   └── KonamiOverlay.tsx
│       │   ├── scene/
│       │   │   ├── GameScene.tsx / .module.css
│       │   │   ├── TopBar.tsx / .module.css
│       │   │   ├── KeybindsLegend.tsx / .module.css
│       │   │   ├── HeroCharacterViewer.tsx / .module.css
│       │   │   └── PlayerBar.tsx / .module.css
│       │   ├── dialogs/
│       │   │   ├── DialogHost.tsx
│       │   │   ├── WorldMapDialog.tsx / .module.css
│       │   │   ├── BattleLogDialog.tsx / .module.css
│       │   │   ├── QuestLogDialog.tsx / .module.css
│       │   │   ├── TimelineTab.tsx / .module.css
│       │   │   ├── InventoryDialog.tsx / .module.css
│       │   │   └── ContactDialog.tsx / .module.css
│       │   └── familiar/
│       │       └── FamiliarChat.tsx / .module.css
│       └── vite-env.d.ts
└── server/
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── .env                      # gitignored
    └── src/
        ├── index.ts
        └── chat.ts
```

---

### Task 1: Scaffold client + server projects

**Files:**
- Create: `package.json` (root)
- Create: `.gitignore` (root)
- Create: `client/` (via Vite scaffold, then modified)
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`

**Interfaces:**
- Produces: root `npm run dev` (runs client + server concurrently), `npm run build` (builds client, compiles server), `npm start` (runs compiled server, which serves `client/dist`).

- [ ] **Step 1: Scaffold the Vite React-TS app**

```bash
npm create vite@latest client -- --template react-ts
cd client && npm install && cd ..
```

- [ ] **Step 2: Scaffold the server package**

```bash
mkdir -p server/src
```

Create `server/package.json`:

```json
{
  "name": "imajello-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0"
  }
}
```

Create `server/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

Create `server/src/index.ts`:

```ts
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
```

- [ ] **Step 3: Root package.json + .gitignore**

Create root `package.json`:

```json
{
  "name": "imajello-portfolio",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev:client": "npm run dev --workspace client",
    "dev:server": "npm run dev --workspace server",
    "build": "npm run build --workspace client && npm run build --workspace server",
    "start": "npm run start --workspace server"
  }
}
```

Create root `.gitignore`:

```
node_modules/
dist/
.env
*.local
```

- [ ] **Step 4: Verify both projects build**

Run: `cd client && npx tsc --noEmit && cd ..`
Expected: no errors (default Vite template compiles clean).

Run: `cd server && npm install && npx tsc --noEmit && cd ..`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore client server
git commit -m "chore: scaffold Vite React-TS client and Express server"
```

---

### Task 2: Design tokens, global styles, fonts, static assets

**Files:**
- Create: `client/src/styles/tokens.css`
- Create: `client/src/styles/global.css`
- Modify: `client/src/main.tsx` (import global styles)
- Modify: `client/index.html` (title, meta viewport, font preload)
- Copy: `design_handoff_portfolio_game_hud/design/sprites/*.png` → `client/public/sprites/`
- Create: `client/public/Anjoelo_Calderon_Resume.pdf` (placeholder)

**Interfaces:**
- Produces: CSS custom properties consumed by every later component: `--ink`, `--ink-dark`, `--ink-darker`, `--cream`, `--cream2`, `--pink`, `--rose`, `--grey`, `--grey-light`, `--border-dark`, `--yellow`, `--uci-blue`, `--uci-gold`.

- [ ] **Step 1: Copy sprite assets**

```bash
mkdir -p "client/public/sprites"
cp "design_handoff_portfolio_game_hud/design/sprites/professional.png" "design_handoff_portfolio_game_hud/design/sprites/muaythai.png" "design_handoff_portfolio_game_hud/design/sprites/musician.png" "design_handoff_portfolio_game_hud/design/sprites/gaming.png" "design_handoff_portfolio_game_hud/design/sprites/travel.png" "design_handoff_portfolio_game_hud/design/sprites/planpal-thumb.png" client/public/sprites/
```

- [ ] **Step 2: Placeholder resume PDF**

Create a minimal placeholder file at `client/public/Anjoelo_Calderon_Resume.pdf` (any valid tiny PDF, or a plain text file renamed — it only needs to exist so the link doesn't 404; owner replaces it later). If no PDF generator is available, write a one-line text file with a `.pdf` extension is acceptable as a placeholder since it's explicitly temporary.

- [ ] **Step 3: Design tokens**

Create `client/src/styles/tokens.css` (values from the design spec, reference file uses these literals throughout):

```css
:root {
  --ink: #2b2b30;
  --ink-dark: #232327;
  --ink-darker: #1c1c20;
  --cream: #f5d9dc;
  --cream2: #f4efe6;
  --pink: #ee9aa3;
  --rose: #c25f74;
  --grey: #6d6a72;
  --grey-light: #a8a5ac;
  --border-dark: #4a4a52;
  --yellow: #ffd43b;
  --uci-blue: #0064a4;
  --uci-gold: #ffd200;
  --font-pixel: 'Silkscreen', monospace;
  --font-display: 'Archivo Black', sans-serif;
  --font-body: 'Archivo', system-ui, sans-serif;
}
```

- [ ] **Step 4: Global styles + fonts**

Reference file lines 1-38 contain the reset, keyframes, and body styles. Port them into `client/src/styles/global.css`: `body` margin/background/color/font-family/antialiasing (reference line 14), the `.proj-shot-wrap`/`.coming-soon` rule pair (reference lines 15-16, needed by `ImageSlot` in Task 8), the `a`/`a:hover` rule (line 17-18), every `@keyframes` block (lines 19-35: `toastIn`, `blink`, `charInR`, `charInL`, `charOutR`, `charOutL`, `dialogIn`, `scrimIn`, `trailFall`, `dropdownIn`, `cursorSpin`, `konamiStarUp`, `konamiStarDown`, `chatboxIn`, `familiarBob`), the two `@media` rules (lines 30-31), and `::selection` (line 36).

Add an `@font-face` block for self-hosted Silkscreen (400, 700) and Archivo Black + Archivo (400/500/600/700) — download the woff2 files from Google Fonts into `client/public/fonts/` and reference them with `url('/fonts/...')`. If font files aren't available in this environment, fall back to the Google Fonts `<link>` in `client/index.html` (reference lines 11-12) instead — either is acceptable, self-host is preferred per the design spec.

- [ ] **Step 5: Wire up global styles**

In `client/src/main.tsx`, import `'./styles/tokens.css'` then `'./styles/global.css'` before rendering `<App />`.

- [ ] **Step 6: Verify**

Run: `cd client && npm run dev`
Expected: dev server starts, page background is `#f5d9dc` (cream), no console errors about missing CSS.

- [ ] **Step 7: Commit**

```bash
git add client/public client/src/styles client/src/main.tsx client/index.html
git commit -m "feat: design tokens, global styles, self-hosted fonts, sprite assets"
```

---

### Task 3: Static data files

**Files:**
- Create: `client/src/data/chars.ts`
- Create: `client/src/data/invItems.ts`
- Create: `client/src/data/discoveries.ts`
- Create: `client/src/data/familiar.ts`
- Create: `client/src/data/projects.ts`
- Create: `client/src/data/quests.ts`
- Create: `client/src/data/journey.ts`

**Interfaces:**
- Produces: `CHARS: Char[]`, `INV_ITEMS: InvItem[]`, `DISCOVERIES: Discovery[]`, `KONAMI: string[]`, `SECTIONS: Record<SectionKey,string>`, `SECTION_TO_DISCOVERY: Record<SectionKey,string>`, `CHAT_QUESTION_LIMIT: number`, `FAMILIAR_ANIMALS: string[]`, `FAMILIAR_FOOD: string[]`, `FAMILIAR_GREETINGS: Record<string,string>`, `PROJECTS: Project[]`, `MAIN_QUESTS: Job[]`, `SIDE_QUESTS: Job[]`, `TIMELINE_BARS: TimelineBar[]`, `JOURNEY_STOPS: JourneyStop[]` — consumed by every dialog/scene task below.

- [ ] **Step 1: `chars.ts`** (ported verbatim from reference lines 853-864)

```ts
export interface CharStat { name: string; mod: string; w: string; }
export interface Char { src: string; name: string; cls: string; stats: CharStat[]; }

export const CHARS: Char[] = [
  { src: '/sprites/professional.png', name: 'THE ENGINEER', cls: 'CLASS: WIZARD', stats: [
    { name: 'PYTHON', mod: '+4', w: '88%' },
    { name: 'ESTIMATING DEADLINES', mod: '-2', w: '20%' },
    { name: 'RAG / LLAMAINDEX', mod: '+3', w: '74%' },
    { name: 'JS / REACT', mod: '+3', w: '78%' } ] },
  { src: '/sprites/muaythai.png', name: 'MUAY THAI', cls: 'CLASS: FIGHTER', stats: [
    { name: 'GRAPPLING', mod: '-3', w: '18%' },
    { name: 'DISCIPLINE', mod: '+4', w: '90%' },
    { name: 'CLINCH', mod: '+2', w: '66%' },
    { name: 'TEEP', mod: '+3', w: '74%' } ] },
  { src: '/sprites/musician.png', name: 'MUSICIAN', cls: 'CLASS: BARD', stats: [
    { name: 'COMPOSING', mod: '-2', w: '24%' },
    { name: 'RHYTHM', mod: '+4', w: '84%' },
    { name: 'EAR TRAINING', mod: '+2', w: '66%' },
    { name: 'IMPROVISATION', mod: '+3', w: '74%' } ] },
  { src: '/sprites/gaming.png', name: 'GAMER', cls: 'CLASS: ROGUE', stats: [
    { name: 'FPS GAMES', mod: '-3', w: '20%' },
    { name: 'STRATEGY', mod: '+3', w: '80%' },
    { name: 'REFLEXES', mod: '+4', w: '86%' },
    { name: 'GRINDING', mod: '+3', w: '76%' } ] },
  { src: '/sprites/travel.png', name: 'THE TRAVELER', cls: 'CLASS: RANGER', stats: [
    { name: 'GETTING LOST', mod: '+3', w: '80%' },
    { name: 'PACKING LIGHT', mod: '-2', w: '22%' },
    { name: 'NEW CUISINE', mod: '+4', w: '88%' },
    { name: 'DIRECTIONS', mod: '-1', w: '30%' } ] },
];
```

- [ ] **Step 2: `invItems.ts`** (ported verbatim from reference lines 835-851)

```ts
export interface InvPhoto { id: string; placeholder: string; }
export interface InvItem { key: string; icon: string; tag: string; label: string; desc: string; photos: InvPhoto[]; }

export const INV_ITEMS: InvItem[] = [
  { key: 'music', icon: '🎸', tag: 'LUTE', label: 'Lute', desc: 'Guitar started as a way to unwind between problem sets and turned into writing and recording my own stuff — mostly lo-fi, mostly late at night.', photos: [
    { id: 'gal-music-1', placeholder: 'photo: playing guitar' },
    { id: 'gal-music-2', placeholder: 'photo: recording session' } ] },
  { key: 'muaythai', icon: '🥊', tag: 'GLOVES', label: 'Boxing Gloves', desc: 'Muay Thai is where I go to think about nothing. A few sessions a week keeps me sharp and honest about how much I can actually push through.', photos: [
    { id: 'gal-muaythai-1', placeholder: 'photo: pad work' },
    { id: 'gal-muaythai-2', placeholder: 'photo: sparring' } ] },
  { key: 'tcg', icon: '🃏', tag: 'TCG', label: 'TCG Cards', desc: 'Collecting and deck-building scratches the same itch as engineering — optimizing under constraints, just with more foil cards involved.', photos: [
    { id: 'gal-tcg-1', placeholder: 'photo: card collection' },
    { id: 'gal-tcg-2', placeholder: 'photo: deck build' } ] },
  { key: 'gaming', icon: '🎮', tag: 'CTRL', label: 'Controller', desc: 'Where I first got curious about how software works. Still my go-to for game nights and co-op runs with friends.', photos: [
    { id: 'gal-gaming-1', placeholder: 'photo: gaming setup' },
    { id: 'gal-gaming-2', placeholder: 'photo: game night' } ] },
  { key: 'travel', icon: '🧭', tag: 'COMPASS', label: 'Compass', desc: 'New cities force me to problem-solve outside my usual toolkit — reading transit maps, ordering in another language, getting comfortably lost. Every trip resets how I see a problem.', photos: [
    { id: 'gal-travel-1', placeholder: 'photo: city skyline' },
    { id: 'gal-travel-2', placeholder: 'photo: on the road' } ] },
];

// Reference lines 1209-1225: 18-slot grid, only these positions (0-indexed) are filled,
// in this order, mapped 1:1 to INV_ITEMS above.
export const INV_GRID_SIZE = 18;
export const INV_FILLED_POSITIONS = [1, 3, 6, 10, 13];
```

- [ ] **Step 3: `discoveries.ts`** (ported verbatim from reference lines 793-808, 866-872, 1027)

```ts
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
```

- [ ] **Step 4: `familiar.ts`** (ported verbatim from reference lines 809-833)

```ts
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
```

- [ ] **Step 5: `projects.ts`** (Battle Log content, ported from reference lines 356-456 — read those lines directly for the exact bullet copy, badges, and GitHub URLs)

```ts
export interface Project {
  id: string;
  repoUrl: string;
  imageId: string;
  imageSrc?: string;   // only PlanPal has one (planpal-thumb.png); all others are undefined -> ImageSlot placeholder
  imagePlaceholder: string;
  rank: 'S' | 'A';
  title: string;
  status: 'complete' | 'in-progress';
  statusLabel: string; // '✓ QUEST COMPLETE' or '◆ IN PROGRESS'
  meta: string;        // e.g. 'VIA EXTERN · JAN–MAR 2026 · REMOTE'
  bullets: string[];
  loot: string[];
}

export const PROJECTS: Project[] = [
  { id: 'pfizer', repoUrl: 'https://github.com/jelo-ca/pharma_rag', imageId: 'proj-pfizer', imagePlaceholder: 'screenshot: pipeline / demo', rank: 'S', title: 'AI/ML Extern — Pfizer', status: 'complete', statusLabel: '✓ QUEST COMPLETE', meta: 'VIA EXTERN · JAN–MAR 2026 · REMOTE', bullets: [
    'Document pipeline extracting structured data from scanned pharma PDFs with Tesseract, PaddleOCR, and frontier LLMs.',
    'Multi-agent RAG system with LlamaIndex for semantic search over unstructured regulatory documents.',
    'Regression harness — 20+ factual-retrieval and hallucination queries across 500+ documents.' ], loot: ['PYTHON', 'LLAMAINDEX', 'TESSERACT', 'PADDLEOCR'] },
  { id: 'scheduler', repoUrl: 'https://github.com/jelo-ca/agentic-task-scheduler', imageId: 'proj-scheduler', imageSrc: '/sprites/planpal-thumb.png', imagePlaceholder: 'screenshot: PlanPal', rank: 'S', title: 'PlanPal', status: 'complete', statusLabel: '✓ QUEST COMPLETE', meta: 'CODEPATH · SPRING 2026', bullets: [
    'AI-assisted scheduler converting natural-language requests into structured, confidence-scored tasks through a multi-agent Gemini pipeline (Parser → Temporal → Normalization → Validation).',
    'RAG chatbot grounded in live task context, answering scheduling questions via Gemini 2.0 Flash with a FastAPI backend and Streamlit UI.',
    'Built a 3-tier evaluation harness (baseline vs. few-shot, adversarial robustness, context sensitivity) — few-shot prompting scored 96.7% vs. 88.3% baseline across 12 test cases.' ], loot: ['PYTHON', 'FASTAPI', 'GEMINI', 'RAG'] },
  { id: 'studyguild', repoUrl: 'https://github.com/jelo-ca/study-guild', imageId: 'proj-studyguild', imagePlaceholder: 'screenshot: Study Guild', rank: 'A', title: 'Study Guild', status: 'in-progress', statusLabel: '◆ IN PROGRESS', meta: 'PERSONAL · DEC 2025 – PRESENT', bullets: [
    'Gamified multi-agent AI study tool generating in-scope study guides and quizzes from class modules and notes.',
    'Database design that lets collected modules improve AI-generated quiz specialization per user.' ], loot: ['REACT', 'RAG', 'SUPABASE'] },
  { id: 'scantry', repoUrl: 'https://github.com/jelo-ca/scantry', imageId: 'proj-scantry', imagePlaceholder: 'screenshot: Scantry', rank: 'A', title: 'Scantry', status: 'in-progress', statusLabel: '◆ IN PROGRESS', meta: 'HACK YOUR SUMMER · JUL 2026 – PRESENT', bullets: [
    'Building a grocery inventory tracking system using Raspberry Pi and open-source Grocy.' ], loot: ['RASPBERRY PI', 'GROCY'] },
];
```

- [ ] **Step 6: `quests.ts`** (Quest Log content — Main/Side quests + Achievements + Education + Timeline bars, ported from reference lines 474-661 — read those lines directly for exact copy)

```ts
export interface Job { dateRange: string; title: string; org: string; bullets: string[]; skills?: string[]; }
export interface Achievement { icon: string; title: string; desc: string; }
export interface EducationEntry { title: string; meta: string; }
export interface TimelineBar {
  label: string;
  sublabel?: string;
  top: number; left: number; width: number; height: number;
  variant: 'education-pink' | 'education-uci' | 'main' | 'side';
}

export const MAIN_QUESTS: Job[] = [
  { dateRange: 'MAR 2025 – PRESENT', title: 'Software Engineering Intern', org: 'Unimode AI · Fremont, CA', bullets: [
    'Semantic search API over 1.3M+ indexed records — cut p95 latency from 700ms to 200ms.',
    'Automated onboarding pipeline — demo setup from ~3 days to under 4 hours.',
    'Multi-agent adapter normalizing client schemas — hours of manual mapping to seconds.' ] },
  { dateRange: 'JAN – MAR 2026', title: 'AI/ML Extern', org: 'Pfizer · Remote', bullets: [
    'Document pipeline extracting structured data from scanned pharma PDFs with Tesseract, PaddleOCR, and frontier LLMs.',
    'Multi-agent RAG system with LlamaIndex for semantic search over unstructured regulatory documents.',
    'Regression harness — 20+ factual-retrieval and hallucination queries across 500+ documents.' ] },
];

export const SIDE_QUESTS: Job[] = [
  { dateRange: 'OCT 2021 – JUN 2024', title: 'Assistant Restaurant Manager — Country Gourmet American Bistro', org: 'Food Service · Sunnyvale, CA', bullets: [
    'Managed and trained a front service team of 9, resolving customer conflicts to raise overall service quality.',
    'Oversaw technical operations to streamline daily processes, keeping the team efficient without burning out.' ], skills: ['TEAM LEADERSHIP', 'GRACE UNDER FIRE'] },
  { dateRange: 'SEP 2025 – MAR 2026', title: 'STEM Teaching Assistant', org: 'De Anza College · Cupertino, CA', bullets: [
    'Tutored 30+ students per term in calculus, linear algebra, and physics.' ] },
  { dateRange: 'JUN 2024 – MAR 2026', title: 'STEM Teacher', org: 'Young Gates · Milpitas, CA', bullets: [
    'Delivered 20+ hands-on workshops in programming, game dev, drones, and 3D design.' ] },
  { dateRange: 'FEB 2026 – JUN 2026', title: 'STEM Tutor', org: 'MESA De Anza · Cupertino, CA', bullets: [
    'Embedded in-class tutor, working alongside instructors on real-time problem-solving; mentored underrepresented students in STEM.' ] },
];

export const ACHIEVEMENTS: Achievement[] = [
  { icon: '🏆 GUILD MASTER', title: 'Club President, Game Dev Club', desc: 'Grew from 5 founding members to an online community of 200+.' },
  { icon: '🏆 JAM DIRECTOR ×2', title: 'Two annual game jams', desc: '145 → 300 participants, 69 submissions, 4 industry sponsors.' },
  { icon: '🏆 EXPO FOUNDER', title: 'Co-Founder & Director, De Anza Expo', desc: 'Built a student tech showcase from scratch — logistics, sponsors, and a funding plan for the long haul.' },
  { icon: '🏆 SCHOLAR', title: 'AS-T CS · GPA 3.74', desc: 'De Anza College, March 2026 — Magna Cum Laude in CS and Math. C++, data structures, x86 assembly, SQL.' },
];

export const EDUCATION: EducationEntry[] = [
  { title: 'UC Irvine — B.S. Computer Science', meta: '2026 – Present · Irvine, CA' },
  { title: 'De Anza College — AS-T Computer Science', meta: 'GPA 3.74 · March 2026 · Cupertino, CA' },
];

// Pixel positions ported verbatim from reference lines 614-651 (px values are exact, do not recompute).
export const TIMELINE_BARS: TimelineBar[] = [
  { label: 'EDUCATION', sublabel: 'AS-T CS', top: 184, left: 14, width: 118, height: 532, variant: 'education-pink' },
  { label: 'UC Irvine · Sept 2026 →', top: 44, left: 14, width: 118, height: 46, variant: 'education-uci' },
  { label: 'MAIN', sublabel: 'SWE Intern · Unimode AI', top: 128, left: 138, width: 84, height: 224, variant: 'main' },
  { label: 'Pfizer Extern', top: 184, left: 228, width: 74, height: 28, variant: 'main' },
  { label: 'SIDE', sublabel: 'PlanPal', top: 227, left: 228, width: 74, height: 42, variant: 'side' },
  { label: 'SIDE', sublabel: 'STEM Teacher · Young Gates', top: 184, left: 308, width: 88, height: 294, variant: 'side' },
  { label: 'SIDE', sublabel: 'STEM TA', top: 184, left: 402, width: 88, height: 84, variant: 'side' },
  { label: 'SIDE', sublabel: 'STEM Tutor', top: 142, left: 496, width: 88, height: 56, variant: 'side' },
  { label: 'SIDE', sublabel: 'Asst. Restaurant Manager · Country Gourmet', top: 478, left: 308, width: 88, height: 448, variant: 'side' },
];
```

- [ ] **Step 7: `journey.ts`** (World Map content, ported from reference lines 325-342)

```ts
export interface JourneyStop {
  id: string;
  worldLabel: string;   // 'WORLD 1-1'
  statusLabel: string;  // '★★★ CLEARED' or blinking '▶ NOW PLAYING'
  current: boolean;
  title: string;
  body: string;
}

export const JOURNEY_STOPS: JourneyStop[] = [
  { id: 'journey-ph', worldLabel: 'WORLD 1-1', statusLabel: '★★★ CLEARED', current: false, title: 'Roots · Philippines', body: 'Born and raised in the Philippines — where curiosity about how games worked turned into curiosity about how everything worked.' },
  { id: 'journey-ca', worldLabel: 'WORLD 2-1', statusLabel: '★★★ CLEARED', current: false, title: 'The Move · California', body: 'Immigrated to the Bay Area — new country, new everything. Started over at De Anza College and made it count: 3.74 GPA, club president, two game jams directed.' },
  { id: 'journey-uci', worldLabel: 'WORLD 3-1', statusLabel: '▶ NOW PLAYING', current: true, title: 'Now · CS @ UCI', body: 'Studying CS at UC Irvine while shipping real systems — an internship at Unimode AI and an AI/ML externship with Pfizer.' },
];
```

- [ ] **Step 2 (verify): Type-check**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3 (commit)**

```bash
git add client/src/data
git commit -m "feat: extract static content data from design reference"
```

---

### Task 4: State types and reducer

**Files:**
- Create: `client/src/state/types.ts`
- Create: `client/src/state/reducer.ts`

**Interfaces:**
- Consumes: `SectionKey`, `KONAMI`, `CHAT_QUESTION_LIMIT`, `SECTIONS`, `SECTION_TO_DISCOVERY` from `data/discoveries.ts`; `CHARS` from `data/chars.ts`.
- Produces: `State`, `Action` types and `reducer(state, action): State`, `initialState: State` — consumed by `GameStateContext` (Task 5) and every component from Task 8 onward.

- [ ] **Step 1: `types.ts`**

```ts
import type { SectionKey } from '../data/discoveries';

export interface ChatMessage { text: string; color: string; }

export interface State {
  open: SectionKey | null;
  toast: string | null;
  sound: boolean | null;
  questLogTab: 'main' | 'side' | 'timeline';
  charIdx: number;
  charPrevIdx: number | null;
  charDir: 'prev' | 'next' | null;
  visited: SectionKey[];
  invItem: string | null;
  invPhotoFront: 'first' | 'second';
  konamiUnlocked: boolean;
  familiarOpen: boolean;
  familiarEmoji: string | null;
  discoveries: Record<string, boolean>;
  charsSeen: number[];
  discoveriesOpen: boolean;
  chatMessages: ChatMessage[];
  chatInputValue: string;
  chatSending: boolean;
  chatQuestionsAsked: number;
  familiarAsleep: boolean;
  familiarSleepReason: string;
  msgName: string;
  msgEmail: string;
  msgBody: string;
  navHover: SectionKey | null;
  familiarHover: boolean;
}

export type Action =
  | { type: 'OPEN_SECTION'; section: SectionKey }
  | { type: 'CLOSE_SECTION' }
  | { type: 'OPEN_FAMILIAR'; emoji: string; greeting: string }
  | { type: 'CLOSE_FAMILIAR' }
  | { type: 'SET_SOUND'; value: boolean }
  | { type: 'SET_QUEST_TAB'; tab: State['questLogTab'] }
  | { type: 'PREV_CHAR' }
  | { type: 'NEXT_CHAR' }
  | { type: 'CLEAR_CHAR_PREV' }
  | { type: 'UNLOCK_DISCOVERY'; key: string }
  | { type: 'SET_INV_ITEM'; key: string }
  | { type: 'INV_BACK' }
  | { type: 'SWAP_PHOTOS' }
  | { type: 'TOGGLE_DISCOVERIES' }
  | { type: 'SET_NAV_HOVER'; section: SectionKey | null }
  | { type: 'SET_FAMILIAR_HOVER'; value: boolean }
  | { type: 'SET_KONAMI_UNLOCKED' }
  | { type: 'SET_TOAST'; text: string | null }
  | { type: 'CHAT_SEND_START'; text: string }
  | { type: 'CHAT_SEND_SUCCESS'; reply: string }
  | { type: 'CHAT_SEND_ERROR'; reason: string }
  | { type: 'SET_CHAT_INPUT'; value: string }
  | { type: 'SET_MSG_FIELD'; field: 'msgName' | 'msgEmail' | 'msgBody'; value: string }
  | { type: 'HYDRATE_PERSISTED'; sound: boolean; visited: SectionKey[]; discoveries: Record<string, boolean> };
```

- [ ] **Step 2: `reducer.ts`**

Behavior ported from reference `openSection` (lines 1029-1040), `closeSection` (1042-1045), `toggleFamiliar` (1047-1059), `unlockDiscovery` (1061-1066), `doPrevChar`/`doNextChar` (1164-1180) + `noteCharSeen` (1157-1162), inventory handlers (1219, 1241-1242), `swapPhotos` (1241), `openDiscoveries` (1255), chat handlers (1074-1108), contact form field setters (1286-1288).

```ts
import type { State, Action } from './types';
import { CHARS } from '../data/chars';
import { DISCOVERIES, CHAT_QUESTION_LIMIT } from '../data/discoveries';

export const initialState: State = {
  open: null,
  toast: null,
  sound: null,
  questLogTab: 'main',
  charIdx: 0,
  charPrevIdx: null,
  charDir: null,
  visited: [],
  invItem: null,
  invPhotoFront: 'first',
  konamiUnlocked: false,
  familiarOpen: false,
  familiarEmoji: null,
  discoveries: {},
  charsSeen: [],
  discoveriesOpen: false,
  chatMessages: [],
  chatInputValue: '',
  chatSending: false,
  chatQuestionsAsked: 0,
  familiarAsleep: false,
  familiarSleepReason: '',
  msgName: '',
  msgEmail: '',
  msgBody: '',
  navHover: null,
  familiarHover: false,
};

function unlockDiscovery(state: State, key: string): State {
  if (state.discoveries[key]) return state;
  const entry = DISCOVERIES.find(d => d.key === key);
  return {
    ...state,
    discoveries: { ...state.discoveries, [key]: true },
    toast: entry ? entry.name : state.toast,
  };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'OPEN_SECTION': {
      const alreadyVisited = state.visited.includes(action.section);
      const visited = alreadyVisited ? state.visited : [...state.visited, action.section];
      let next: State = { ...state, open: action.section, visited };
      if (!alreadyVisited) {
        const { SECTIONS } = requireSections();
        next = { ...next, toast: SECTIONS[action.section] };
      }
      const { SECTION_TO_DISCOVERY } = requireSections();
      const dKey = SECTION_TO_DISCOVERY[action.section];
      if (dKey) next = unlockDiscovery(next, dKey);
      return next;
    }
    case 'CLOSE_SECTION':
      return { ...state, open: null };
    case 'OPEN_FAMILIAR':
      return {
        ...state,
        familiarOpen: true,
        familiarEmoji: action.emoji,
        chatMessages: [{ text: 'FAMILIAR: ' + action.greeting, color: '#ee9aa3' }],
        chatQuestionsAsked: 0,
        familiarAsleep: false,
        familiarSleepReason: '',
      };
    case 'CLOSE_FAMILIAR':
      return { ...state, familiarOpen: false };
    case 'SET_SOUND':
      return { ...state, sound: action.value };
    case 'SET_QUEST_TAB':
      return { ...state, questLogTab: action.tab };
    case 'PREV_CHAR': {
      const prevIdx = (state.charIdx + CHARS.length - 1) % CHARS.length;
      const charsSeen = state.charsSeen.includes(prevIdx) ? state.charsSeen : [...state.charsSeen, prevIdx];
      let next: State = { ...state, charDir: 'prev', charPrevIdx: state.charIdx, charIdx: prevIdx, charsSeen };
      if (charsSeen.length === CHARS.length) next = unlockDiscovery(next, 'allchars');
      return next;
    }
    case 'NEXT_CHAR': {
      const nextIdx = (state.charIdx + 1) % CHARS.length;
      const charsSeen = state.charsSeen.includes(nextIdx) ? state.charsSeen : [...state.charsSeen, nextIdx];
      let next: State = { ...state, charDir: 'next', charPrevIdx: state.charIdx, charIdx: nextIdx, charsSeen };
      if (charsSeen.length === CHARS.length) next = unlockDiscovery(next, 'allchars');
      return next;
    }
    case 'CLEAR_CHAR_PREV':
      return { ...state, charPrevIdx: null };
    case 'UNLOCK_DISCOVERY':
      return unlockDiscovery(state, action.key);
    case 'SET_INV_ITEM':
      return unlockDiscovery({ ...state, invItem: action.key, invPhotoFront: 'first' }, 'item');
    case 'INV_BACK':
      return { ...state, invItem: null, invPhotoFront: 'first' };
    case 'SWAP_PHOTOS':
      return { ...state, invPhotoFront: state.invPhotoFront === 'first' ? 'second' : 'first' };
    case 'TOGGLE_DISCOVERIES':
      return { ...state, discoveriesOpen: !state.discoveriesOpen };
    case 'SET_NAV_HOVER':
      return { ...state, navHover: action.section };
    case 'SET_FAMILIAR_HOVER':
      return { ...state, familiarHover: action.value };
    case 'SET_KONAMI_UNLOCKED':
      return state.konamiUnlocked ? state : unlockDiscovery({ ...state, konamiUnlocked: true }, 'konami');
    case 'SET_TOAST':
      return { ...state, toast: action.text };
    case 'CHAT_SEND_START':
      return {
        ...state,
        chatMessages: [...state.chatMessages, { text: 'YOU: ' + action.text, color: '#f5d9dc' }],
        chatInputValue: '',
        chatSending: true,
        chatQuestionsAsked: state.chatQuestionsAsked + 1,
      };
    case 'CHAT_SEND_SUCCESS':
      return {
        ...state,
        chatMessages: [...state.chatMessages, { text: 'FAMILIAR: ' + action.reply, color: '#ee9aa3' }],
        chatSending: false,
      };
    case 'CHAT_SEND_ERROR':
      return { ...state, familiarAsleep: true, familiarSleepReason: action.reason, chatSending: false };
    case 'SET_CHAT_INPUT':
      return { ...state, chatInputValue: action.value };
    case 'SET_MSG_FIELD':
      return { ...state, [action.field]: action.value };
    case 'HYDRATE_PERSISTED':
      return { ...state, sound: action.sound, visited: action.visited, discoveries: action.discoveries };
    default:
      return state;
  }
}

// Local import indirection to avoid a require() in an ESM file while keeping this
// block visually adjacent to its only two call sites above.
import { SECTIONS, SECTION_TO_DISCOVERY } from '../data/discoveries';
function requireSections() { return { SECTIONS, SECTION_TO_DISCOVERY }; }

export { CHAT_QUESTION_LIMIT };
```

- [ ] **Step 3: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: no errors. (If the `requireSections()` indirection trips a lint/type rule, simplify by moving the `import { SECTIONS, SECTION_TO_DISCOVERY }` to the top of the file and deleting the helper — functionally equivalent, just remove the indirection.)

- [ ] **Step 4: Commit**

```bash
git add client/src/state
git commit -m "feat: game state reducer and action types"
```

---

### Task 5: GameStateContext with localStorage persistence

**Files:**
- Create: `client/src/state/GameStateContext.tsx`

**Interfaces:**
- Consumes: `reducer`, `initialState` from `state/reducer.ts`; `State`, `Action` from `state/types.ts`.
- Produces: `GameStateProvider` (wraps `App`), `useGameState(): { state: State; dispatch: Dispatch<Action> }` — consumed by every component from Task 8 onward.

- [ ] **Step 1: Write the context**

Ported from reference `componentDidMount` localStorage read (lines 875-878) and `toggleSound` write (lines 1356-1362).

```tsx
import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { reducer, initialState } from './reducer';
import type { State, Action } from './types';

interface Ctx { state: State; dispatch: React.Dispatch<Action>; }

const GameStateContext = createContext<Ctx | null>(null);

const SOUND_KEY = 'imajello-sfx';
const VISITED_KEY = 'imajello-visited';
const DISCOVERIES_KEY = 'imajello-discoveries';

export function GameStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let sound = true;
    let visited: State['visited'] = [];
    let discoveries: State['discoveries'] = {};
    try {
      const storedSound = localStorage.getItem(SOUND_KEY);
      if (storedSound !== null) sound = storedSound === 'on';
      const storedVisited = localStorage.getItem(VISITED_KEY);
      if (storedVisited) visited = JSON.parse(storedVisited);
      const storedDiscoveries = localStorage.getItem(DISCOVERIES_KEY);
      if (storedDiscoveries) discoveries = JSON.parse(storedDiscoveries);
    } catch {
      // localStorage unavailable (private browsing, etc.) - fall back to defaults
    }
    dispatch({ type: 'HYDRATE_PERSISTED', sound, visited, discoveries });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.sound === null) return;
    try { localStorage.setItem(SOUND_KEY, state.sound ? 'on' : 'off'); } catch { /* ignore */ }
  }, [state.sound]);

  useEffect(() => {
    try { localStorage.setItem(VISITED_KEY, JSON.stringify(state.visited)); } catch { /* ignore */ }
  }, [state.visited]);

  useEffect(() => {
    try { localStorage.setItem(DISCOVERIES_KEY, JSON.stringify(state.discoveries)); } catch { /* ignore */ }
  }, [state.discoveries]);

  return <GameStateContext.Provider value={{ state, dispatch }}>{children}</GameStateContext.Provider>;
}

export function useGameState(): Ctx {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used within GameStateProvider');
  return ctx;
}
```

- [ ] **Step 2: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/state/GameStateContext.tsx
git commit -m "feat: GameStateProvider with localStorage persistence"
```

---

### Task 6: Sound hook

**Files:**
- Create: `client/src/hooks/useSfx.ts`

**Interfaces:**
- Consumes: `state.sound` from `useGameState()`.
- Produces: `useSfx(): { tick(): void; chime(): void; fanfare(): void; playNote(freq, start, dur, vol, type?): void }` — consumed by `App.tsx` (Task 9, delegated hover listener), `Toast`, `DialogHost`, nav buttons, `PlayerBar` (sound toggle chime).

- [ ] **Step 1: Write the hook**

Ported verbatim from reference `audioCtx`/`playNote`/`chime`/`fanfare`/`tick` (lines 977-1018).

```ts
import { useRef, useCallback } from 'react';
import { useGameState } from '../state/GameStateContext';

export function useSfx() {
  const { state } = useGameState();
  const ctxRef = useRef<AudioContext | null>(null);

  const audioCtx = useCallback((): AudioContext | null => {
    if (!ctxRef.current) {
      try {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const playNote = useCallback((freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'square') => {
    const ctx = audioCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
    o.connect(g).connect(ctx.destination);
    o.start(ctx.currentTime + start);
    o.stop(ctx.currentTime + start + dur + 0.05);
  }, [audioCtx]);

  const tick = useCallback(() => {
    if (!state.sound) return;
    playNote(988, 0, 0.045, 0.018, 'square');
  }, [state.sound, playNote]);

  const chime = useCallback(() => {
    if (!state.sound) return;
    playNote(523, 0, 0.12, 0.035);
    playNote(659, 0.08, 0.12, 0.035);
    playNote(784, 0.16, 0.2, 0.04);
  }, [state.sound, playNote]);

  const fanfare = useCallback(() => {
    if (!state.sound) return;
    playNote(523, 0, 0.1, 0.035);
    playNote(659, 0.1, 0.1, 0.035);
    playNote(784, 0.2, 0.1, 0.035);
    playNote(1047, 0.3, 0.35, 0.045);
  }, [state.sound, playNote]);

  return { tick, chime, fanfare, playNote };
}
```

- [ ] **Step 2: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useSfx.ts
git commit -m "feat: WebAudio sound-effects hook"
```

---

### Task 7: Particle field, cursor trail, and Konami hooks

**Files:**
- Create: `client/src/hooks/useParticles.ts`
- Create: `client/src/hooks/useKonami.ts`

**Interfaces:**
- Produces: `useParticles(hostRef: RefObject<HTMLDivElement>, cursorHostRef: RefObject<HTMLDivElement>, cursorRef: RefObject<HTMLDivElement>): void` (imperative DOM effect, no return value needed by callers) and `useKonami(onUnlock: () => void): void` — both consumed by `GameScene` (Task 10).

- [ ] **Step 1: `useParticles.ts`**

Ported verbatim from reference `initFx` (lines 912-975), adapted to a `useEffect` that owns its own cleanup instead of instance fields.

```ts
import { useEffect } from 'react';
import type { RefObject } from 'react';

const GLYPHS = ['◆', '✦', '●', '＋'];
const COLORS = ['rgba(43,43,48,.16)', 'rgba(194,95,116,.20)', 'rgba(238,154,163,.50)', 'rgba(43,43,48,.11)'];
const TRAIL_COLORS = ['#ee9aa3', '#c25f74', '#2b2b30'];

interface Particle { el: HTMLSpanElement; x: number; y: number; vx: number; vy: number; up: number; phase: number; amp: number; }

export function useParticles(
  hostRef: RefObject<HTMLDivElement | null>,
  cursorHostRef: RefObject<HTMLDivElement | null>,
  cursorRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const host = hostRef.current;
    const cursorHost = cursorHostRef.current;
    const cursor = cursorRef.current;
    if (!host) return;

    const parts: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('span');
      const size = 10 + Math.random() * 20;
      el.textContent = GLYPHS[i % 4];
      el.style.cssText = `position:absolute;left:0;top:0;font:400 ${size}px 'Silkscreen',monospace;color:${COLORS[i % 4]};will-change:transform`;
      host.appendChild(el);
      parts.push({ el, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, vx: 0, vy: 0, up: 10 + Math.random() * 24, phase: Math.random() * 6.28, amp: 8 + Math.random() * 18 });
    }

    const mouse = { x: -9999, y: -9999 };
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let trailDist = 0;
    let lastMx: number | null = null;
    let lastMy: number | null = null;

    const onMove = (e: MouseEvent) => {
      if (lastMx != null && lastMy != null) trailDist += Math.abs(e.clientX - lastMx) + Math.abs(e.clientY - lastMy);
      lastMx = e.clientX; lastMy = e.clientY;
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (cursor) cursor.style.opacity = '1';
      if (trailDist > 26 && cursorHost) {
        trailDist = 0;
        const s = document.createElement('span');
        const sz = 4 + Math.round(Math.random() * 5);
        const jx = (Math.random() - 0.5) * 14;
        const jy = (Math.random() - 0.5) * 14;
        s.style.cssText = `position:absolute;left:${e.clientX + jx}px;top:${e.clientY + jy}px;width:${sz}px;height:${sz}px;background:${TRAIL_COLORS[Math.floor(Math.random() * 3)]};transform:translate(-50%,-50%);animation:trailFall .65s steps(6) forwards`;
        cursorHost.appendChild(s);
        setTimeout(() => s.remove(), 700);
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    let last = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = window.innerWidth, H = window.innerHeight;
      for (const p of parts) {
        p.phase += dt * 0.7;
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 12100 && d2 > 1) { const d = Math.sqrt(d2); const f = (110 - d) * 9; p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt; }
        p.vx *= Math.pow(0.88, dt * 60); p.vy *= Math.pow(0.88, dt * 60);
        p.x += p.vx * dt + Math.cos(p.phase) * p.amp * dt;
        p.y += p.vy * dt - p.up * dt;
        if (p.y < -40) { p.y = H + 30; p.x = Math.random() * W; }
        if (p.y > H + 60) p.y = -30;
        if (p.x < -40) p.x = W + 30; else if (p.x > W + 40) p.x = -30;
        p.el.style.transform = `translate(${Math.round(p.x / 2) * 2}px,${Math.round(p.y / 2) * 2}px)`;
      }
      if (cursor && mouse.x > -999) {
        const k = Math.min(1, dt * 14);
        cx += (mouse.x - cx) * k;
        cy += (mouse.y - cy) * k;
        cursor.style.transform = `translate(${Math.round(cx)}px,${Math.round(cy)}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      parts.forEach(p => p.el.remove());
    };
  }, [hostRef, cursorHostRef, cursorRef]);
}
```

- [ ] **Step 2: `useKonami.ts`**

Ported from reference `trackKonami` (lines 1116-1129, called from the global keydown handler at line 885).

```ts
import { useCallback, useRef } from 'react';
import { KONAMI } from '../data/discoveries';

export function useKonami(onUnlock: () => void) {
  const progress = useRef<string[]>([]);

  const trackKey = useCallback((key: string) => {
    const expected = KONAMI[progress.current.length];
    const got = key.length === 1 ? key.toLowerCase() : key;
    if (got === expected) {
      progress.current.push(got);
      if (progress.current.length === KONAMI.length) {
        progress.current = [];
        onUnlock();
      }
    } else {
      progress.current = got === KONAMI[0] ? [got] : [];
    }
  }, [onUnlock]);

  return trackKey;
}
```

- [ ] **Step 3: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useParticles.ts client/src/hooks/useKonami.ts
git commit -m "feat: particle field, cursor trail, and konami-sequence hooks"
```

---

### Task 8: Shared components — ImageSlot, Toast, DiscoveryListPanel, KonamiOverlay

**Files:**
- Create: `client/src/components/shared/ImageSlot.tsx`, `ImageSlot.module.css`
- Create: `client/src/components/shared/Toast.tsx`, `Toast.module.css`
- Create: `client/src/components/shared/DiscoveryListPanel.tsx`, `DiscoveryListPanel.module.css`
- Create: `client/src/components/shared/KonamiOverlay.tsx`

**Interfaces:**
- Consumes: `useGameState()`, `DISCOVERIES` from `data/discoveries.ts`.
- Produces: `<ImageSlot src?, alt, placeholder, fit?, style?>`, `<Toast />`, `<DiscoveryListPanel />`, `<KonamiOverlay />` — consumed by every dialog (Task 12+) and `GameScene`/`App` (Tasks 10, 15).

- [ ] **Step 1: `ImageSlot`**

Replaces every `<x-import component-from-global-scope="image-slot">` (e.g. reference lines 327, 359, 706). Renders a real `<img>` when given `src`; otherwise the dashed "coming soon" placeholder matching reference lines 15-16 (`.coming-soon` CSS) and line 360's inline `COMING SOON` badge markup.

```tsx
import styles from './ImageSlot.module.css';

interface Props {
  src?: string;
  alt?: string;
  placeholder: string;
  fit?: 'cover' | 'contain';
  style?: React.CSSProperties;
}

export function ImageSlot({ src, alt = '', placeholder, fit = 'cover', style }: Props) {
  if (src) {
    return <img src={src} alt={alt} style={{ objectFit: fit, width: '100%', height: '100%', ...style }} />;
  }
  return (
    <div className={styles.placeholder} style={style} title={placeholder}>
      <span className={styles.badge}>COMING SOON</span>
    </div>
  );
}
```

`ImageSlot.module.css`:

```css
.placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--cream);
  display: flex;
  align-items: center;
  justify-content: center;
}
.badge {
  font: 400 12px 'Silkscreen', monospace;
  color: var(--cream);
  background: var(--ink);
  padding: 16px 14px;
  width: 100%;
  text-align: center;
}
```

- [ ] **Step 2: `Toast`**

Ported from reference lines 778-783.

```tsx
import { useGameState } from '../../state/GameStateContext';
import styles from './Toast.module.css';

export function Toast() {
  const { state } = useGameState();
  if (!state.toast) return null;
  return (
    <div className={styles.toast} key={state.toast}>
      <span className={styles.star}>★</span>
      <div>
        <div className={styles.text}>{state.toast}</div>
        <div className={styles.label}>DISCOVERED</div>
      </div>
    </div>
  );
}
```

`Toast.module.css` (values from reference line 779, keyframe `toastIn` already in `global.css` from Task 2):

```css
.toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translate(-50%, 0);
  z-index: 100;
  background: var(--ink);
  color: var(--cream);
  border: 3px solid var(--pink);
  padding: 12px 22px 12px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  animation: toastIn 3.2s ease forwards;
  clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
}
.star {
  width: 34px; height: 34px; flex: none;
  display: flex; align-items: center; justify-content: center;
  background: var(--pink); color: var(--ink);
  font: 400 18px 'Silkscreen', monospace;
  border-radius: 50%;
}
.text { font: 400 11px 'Silkscreen', monospace; }
.label { font: 400 9px 'Silkscreen', monospace; color: var(--pink); }
```

Note: the reducer sets `toast` to a new string on every unlock but never explicitly clears it — reference lines 1020-1025 (`showToast`) run a 3.2s `setTimeout` that clears it. Add that timeout behavior in `App.tsx` (Task 9) via a `useEffect` on `state.toast`, dispatching `SET_TOAST` with `text: null` after 3200ms, rather than in the reducer (side effects don't belong in a reducer).

- [ ] **Step 3: `DiscoveryListPanel`**

Ported from reference lines 209-244.

```tsx
import { useGameState } from '../../state/GameStateContext';
import { DISCOVERIES } from '../../data/discoveries';
import styles from './DiscoveryListPanel.module.css';

export function DiscoveryListPanel() {
  const { state, dispatch } = useGameState();
  const discoveredCount = Object.keys(state.discoveries).length;

  return (
    <div className={styles.wrap}>
      <button
        data-sfx
        className={styles.trigger}
        onClick={() => dispatch({ type: 'TOGGLE_DISCOVERIES' })}
      >
        <span>🧭</span> DISCOVERIES {discoveredCount}/{DISCOVERIES.length}
      </button>
      {state.discoveriesOpen && (
        <div className={styles.panel}>
          <div className={styles.intro}>
            <p>Poke around the site to find them all — some are in plain sight, some are secrets.</p>
          </div>
          <div className={styles.rows}>
            {discoveredCount > 0 && (
              <>
                <div className={styles.groupLabel}>FOUND</div>
                <div className={styles.groupList}>
                  {DISCOVERIES.filter(d => state.discoveries[d.key]).map(d => (
                    <div key={d.key} className={styles.row}>
                      <span className={styles.icon}>★</span>
                      <span className={styles.name} style={{ color: '#f5d9dc' }}>{d.name}</span>
                      <span className={styles.how} style={{ color: '#ee9aa3' }}>{d.how}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className={styles.groupLabel}>UNDISCOVERED</div>
            <div className={styles.groupList}>
              {DISCOVERIES.filter(d => !state.discoveries[d.key]).map(d => (
                <div key={d.key} className={styles.row}>
                  <span className={styles.icon}>🔒</span>
                  <span className={styles.name} style={{ color: '#a8a5ac' }}>{d.name}</span>
                  <span className={styles.how} style={{ color: '#4a4a52' }}>???</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

`DiscoveryListPanel.module.css`: port the exact declarations from reference lines 209-244 (position `fixed`, `top:18px;left:18px;z-index:50` on `.wrap`'s trigger container; `dropdownIn .16s ease both` animation on `.panel`; `9px 12px` row padding; etc.) — read those lines directly while writing this file so every pixel value matches.

- [ ] **Step 4: `KonamiOverlay`**

Ported from reference `spawnKonamiStars` (lines 1139-1155) — this stays imperative DOM (matches the prototype, and it's a fire-once burst, not reactive UI).

```tsx
import { useEffect, useRef } from 'react';

export function KonamiOverlay({ trigger }: { trigger: number }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger === 0) return;
    const host = hostRef.current;
    if (!host) return;
    const W = window.innerWidth, H = window.innerHeight;
    const timers: number[] = [];
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('span');
      const fromBottom = Math.random() < 0.5;
      const x = Math.random() * W;
      const size = 12 + Math.random() * 20;
      const dur = 1.4 + Math.random() * 1.2;
      const delay = Math.random() * 0.6;
      s.textContent = '★';
      s.style.cssText = `position:absolute;left:${x}px;${fromBottom ? 'bottom:0;' : 'top:0;'}font-size:${size}px;color:#ffd43b;animation:${fromBottom ? 'konamiStarUp' : 'konamiStarDown'} ${dur}s ease-out ${delay}s forwards;filter:drop-shadow(2px 2px 0 rgba(43,43,48,.5))`;
      host.appendChild(s);
      timers.push(window.setTimeout(() => s.remove(), (dur + delay) * 1000 + 100));
    }
    return () => timers.forEach(clearTimeout);
  }, [trigger]);

  return <div ref={hostRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }} />;
}
```

`trigger` is a number the parent increments every time it wants a new burst (konami unlocked for the first time, or re-entered after already unlocked — reference lines 1131-1137 both call `spawnKonamiStars`).

- [ ] **Step 5: Verify**

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/shared
git commit -m "feat: shared components - ImageSlot, Toast, DiscoveryListPanel, KonamiOverlay"
```

---

### Task 9: App shell — keyboard handling, delegated SFX hover, toast auto-dismiss

**Files:**
- Create: `client/src/App.tsx`
- Modify: `client/src/main.tsx` (render `<GameStateProvider><App /></GameStateProvider>`)

**Interfaces:**
- Consumes: `useGameState`, `useSfx`, `useKonami`; will render `GameScene` (Task 10), `DialogHost` (Task 11), `FamiliarChat` (Task 16), `Toast`, `DiscoveryListPanel`, `KonamiOverlay` (Task 8) once those exist — for this task, render placeholders (`<div>GameScene</div>` etc.) that later tasks replace, so the keyboard/lifecycle logic can be verified standalone first.

- [ ] **Step 1: Write `App.tsx`**

Ported from reference `componentDidMount`/`componentWillUnmount` (lines 874-910) and the key map (line 890), plus `showToast`'s timeout (lines 1020-1025) and the `konamiUnlocked` → `fanfare()` + star-burst side effect (lines 1131-1137).

```tsx
import { useEffect, useRef, useState } from 'react';
import { useGameState } from './state/GameStateContext';
import { useSfx } from './hooks/useSfx';
import { useKonami } from './hooks/useKonami';
import { GameScene } from './components/scene/GameScene';
import { DialogHost } from './components/dialogs/DialogHost';
import { FamiliarChat } from './components/familiar/FamiliarChat';
import { Toast } from './components/shared/Toast';
import { KonamiOverlay } from './components/shared/KonamiOverlay';
import styles from './App.module.css';

const SECTION_KEYS: Record<string, 'journey' | 'quests' | 'experience' | 'hobbies' | 'contact'> = {
  '1': 'journey', '2': 'quests', '3': 'experience', '4': 'hobbies', '5': 'contact',
};

export default function App() {
  const { state, dispatch } = useGameState();
  const { tick, fanfare } = useSfx();
  const [konamiTrigger, setKonamiTrigger] = useState(0);
  const lastSfxRef = useRef<Element | null>(null);

  const trackKonami = useKonami(() => {
    dispatch({ type: 'SET_KONAMI_UNLOCKED' });
    fanfare();
    setKonamiTrigger(t => t + 1);
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'Escape' && state.discoveriesOpen) { dispatch({ type: 'TOGGLE_DISCOVERIES' }); return; }
      if (e.key === 'Escape' && state.open) { dispatch({ type: 'CLOSE_SECTION' }); return; }
      if (e.key === 'Escape' && state.familiarOpen) { dispatch({ type: 'CLOSE_FAMILIAR' }); return; }
      trackKonami(e.key);
      if (!state.open) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'PREV_CHAR' }); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); dispatch({ type: 'NEXT_CHAR' }); return; }
      }
      const section = SECTION_KEYS[e.key];
      if (section) dispatch({ type: 'OPEN_SECTION', section });
      if (e.key === '6' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (state.familiarOpen) dispatch({ type: 'CLOSE_FAMILIAR' });
        // opening dispatches OPEN_FAMILIAR with a rolled emoji - handled in FamiliarChat's summon button;
        // duplicate that roll here so the 'F' keybind behaves identically to clicking the summon button.
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.discoveriesOpen, state.open, state.familiarOpen, dispatch, trackKonami]);

  useEffect(() => {
    const onHover = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-sfx]');
      if (t && t !== lastSfxRef.current) { lastSfxRef.current = t; tick(); }
      if (!t) lastSfxRef.current = null;
    };
    document.addEventListener('mouseover', onHover);
    return () => document.removeEventListener('mouseover', onHover);
  }, [tick]);

  useEffect(() => {
    if (!state.toast) return;
    const timer = setTimeout(() => dispatch({ type: 'SET_TOAST', text: null }), 3200);
    return () => clearTimeout(timer);
  }, [state.toast, dispatch]);

  return (
    <div className={styles.app}>
      <GameScene />
      <DialogHost />
      <FamiliarChat />
      <Toast />
      <KonamiOverlay trigger={konamiTrigger} />
    </div>
  );
}
```

`App.module.css`:

```css
.app { position: relative; height: 100vh; overflow: hidden; }
```

Note the `F`/`6` keybind comment above: Task 16 (`FamiliarChat`) owns the actual open logic (it needs to roll a random emoji via `rollFamiliar()` and dispatch `OPEN_FAMILIAR` with both the emoji and its greeting — the reducer doesn't roll random values itself, matching the "no side effects/randomness in reducers" convention). Task 16 must export a `useFamiliarToggle()` hook that both the summon button and this keydown handler call — revisit this `App.tsx` block in Task 16 to replace the comment with a call to that hook instead of duplicating logic. Flagging now so Task 16 doesn't skip it.

- [ ] **Step 2: Update `main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameStateProvider } from './state/GameStateContext';
import App from './App';
import './styles/tokens.css';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameStateProvider>
      <App />
    </GameStateProvider>
  </StrictMode>,
);
```

- [ ] **Step 3: Verify (placeholder render)**

Since `GameScene`, `DialogHost`, `FamiliarChat` don't exist yet, temporarily stub them as empty components exporting `() => null` in their target files so `npm run dev` runs. Run: `cd client && npm run dev`, open the browser, confirm no console errors and the page renders (blank is fine — later tasks fill it in).

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/App.module.css client/src/main.tsx client/src/components
git commit -m "feat: app shell with keyboard handling, delegated SFX hover, toast lifecycle"
```

---

### Task 10: GameScene — TopBar, KeybindsLegend, HeroCharacterViewer, PlayerBar

**Files:**
- Create: `client/src/components/scene/GameScene.tsx`, `.module.css`
- Create: `client/src/components/scene/TopBar.tsx`, `.module.css`
- Create: `client/src/components/scene/KeybindsLegend.tsx`, `.module.css`
- Create: `client/src/components/scene/HeroCharacterViewer.tsx`, `.module.css`
- Create: `client/src/components/scene/PlayerBar.tsx`, `.module.css`

**Interfaces:**
- Consumes: `useGameState`, `useSfx`, `useParticles`, `CHARS` from `data/chars.ts`, `SECTIONS`/`SECTION_TO_DISCOVERY` types.
- Produces: `<GameScene />` rendered by `App.tsx` (already wired in Task 9) — no other component depends on this task's internals directly (dialogs are siblings under `DialogHost`).

- [ ] **Step 1: `TopBar`** — ported from reference lines 200-207 (system buttons) plus `DiscoveryListPanel` (already built, Task 8) for the top-left tracker.

```tsx
import { useGameState } from '../../state/GameStateContext';
import { DiscoveryListPanel } from '../shared/DiscoveryListPanel';
import styles from './TopBar.module.css';

export function TopBar() {
  const { state, dispatch } = useGameState();
  return (
    <>
      <DiscoveryListPanel />
      <div className={styles.systemButtons}>
        <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>RESUME ↓</a>
        <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>GITHUB</a>
        <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" data-sfx className={styles.chip}>LINKEDIN</a>
        <button
          data-sfx
          className={styles.chip}
          onClick={() => dispatch({ type: 'SET_SOUND', value: !state.sound })}
        >
          {state.sound ? 'SFX ON' : 'SFX OFF'}
        </button>
      </div>
    </>
  );
}
```

Note: toggling sound in the reference (`toggleSound`, lines 1356-1362) also plays a confirmation note and unlocks the `sound` discovery — wire this in `PlayerBar`/`TopBar`'s click handler using `useSfx().playNote(660, 0, 0.12, 0.05)` plus `dispatch({ type: 'UNLOCK_DISCOVERY', key: 'sound' })`, only when turning sound **on** (matches `if (next) this.playNote(...)` at line 1360).

`TopBar.module.css`: port `position:fixed;top:18px;right:18px;display:flex;gap:8px;z-index:50` for `.systemButtons` and the chip button styles (font/background/border/padding + hover invert) from reference lines 201-205.

- [ ] **Step 2: `KeybindsLegend`** — ported from reference lines 48-60. Only rendered when `!state.familiarOpen` (reference `keybindsVisible`, line 1244).

```tsx
import { useGameState } from '../../state/GameStateContext';
import styles from './KeybindsLegend.module.css';

const ROWS: Array<{ key: string; label: string } | { keys: [string, string]; label: string }> = [
  { keys: ['←', '→'], label: 'CHANGE CHARACTER' },
  { key: '1', label: 'WORLD MAP' },
  { key: '2', label: 'BATTLE LOG' },
  { key: '3', label: 'QUEST LOG' },
  { key: '4', label: 'INVENTORY' },
  { key: '5', label: 'CONTACT' },
  { key: 'F', label: 'SUMMON FAMILIAR' },
  { key: 'ESC', label: 'CLOSE' },
];

export function KeybindsLegend() {
  const { state } = useGameState();
  if (state.familiarOpen) return null;
  return (
    <div className={styles.legend}>
      <div className={styles.heading}>KEYBINDS</div>
      {ROWS.map((row, i) => (
        <div className={styles.row} key={i}>
          {'keys' in row
            ? row.keys.map(k => <span className={styles.key} key={k}>{k}</span>)
            : <span className={styles.key}>{row.key}</span>}
          <span className={styles.label}>{row.label}</span>
        </div>
      ))}
    </div>
  );
}
```

`KeybindsLegend.module.css`: port `position:fixed;left:12%;top:300px` container and key-chip styles from reference lines 49-58 exactly (font sizes 8-10px, `border:2px solid rgba(43,43,48,.32)`, etc.).

- [ ] **Step 3: `HeroCharacterViewer`** — ported from reference lines 62-145 (name heading, character box with prev/next, stat panel). This is the most animation-sensitive piece (`charInR`/`charInL`/`charOutR`/`charOutL` keyframes already in `global.css` from Task 2) — read reference lines 62-145 directly before implementing so the 210×210 box dimensions, radial glow, and stat-bar `steps(4)` transition match exactly.

```tsx
import { useEffect } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { CHARS } from '../../data/chars';
import styles from './HeroCharacterViewer.module.css';

export function HeroCharacterViewer() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const char = CHARS[state.charIdx];
  const prevChar = state.charPrevIdx != null ? CHARS[state.charPrevIdx] : null;

  useEffect(() => {
    if (state.charPrevIdx == null) return;
    const timer = setTimeout(() => dispatch({ type: 'CLEAR_CHAR_PREV' }), 300);
    return () => clearTimeout(timer);
  }, [state.charPrevIdx, state.charIdx, dispatch]);

  const goPrev = () => { tick(); dispatch({ type: 'PREV_CHAR' }); };
  const goNext = () => { tick(); dispatch({ type: 'NEXT_CHAR' }); };

  return (
    <div className={styles.wrap}>
      <div className={styles.eyebrow}>SOFTWARE ENGINEER · AI/ML · FREMONT CA</div>
      <h1 className={styles.name}>Anjoelo Calder<span className={styles.accent}>o</span>n</h1>
      <div className={styles.row}>
        <button data-sfx className={styles.arrow} onClick={goPrev}>◀</button>
        <div className={styles.portraitBox}>
          <div className={styles.scanlines} />
          {prevChar && (
            <img
              key={`out-${state.charPrevIdx}`}
              src={prevChar.src}
              alt=""
              className={styles.portraitImg}
              style={{ animation: `${state.charDir === 'prev' ? 'charOutR' : 'charOutL'} .28s steps(6) both` }}
            />
          )}
          <img
            key={`in-${state.charIdx}`}
            src={char.src}
            alt={char.name}
            className={styles.portraitImg}
            style={{ position: 'relative', marginBottom: 18, animation: `${state.charDir === 'prev' ? 'charInL' : 'charInR'} .28s steps(6) both` }}
          />
          <div className={styles.glow} />
        </div>
        <div className={styles.statPanel}>
          <span className={styles.statsLabel}>STATS</span>
          {char.stats.map(stat => (
            <div className={styles.statRow} key={stat.name}>
              <div className={styles.statTop}>
                <span>{stat.name}</span>
                <span className={styles.statMod}>{stat.mod}</span>
              </div>
              <div className={styles.statTrough}>
                <div className={styles.statFill} style={{ width: stat.w, transition: 'width .4s steps(4)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <button data-sfx className={styles.arrow} onClick={goNext}>▶</button>
    </div>
  );
}
```

(The prev/next arrow layout above is simplified for readability — reference lines 69-70 and the closing arrow after the stat panel show `◀ [portrait] [stats] ▶` as one flex row; when porting, re-read lines 67-145 directly and match the exact flex structure, since this snippet's arrow placement is illustrative, not a literal transcription. The stat-bar trough/fill colors are `#1c1c20` background / `#ee9aa3` fill per the design tokens, and the portrait box is `210×210`, `background:#2b2b30`, `border:3px solid #2b2b30`, with the radial pink glow at the bottom per reference line 74.)

- [ ] **Step 4: `PlayerBar`** — ported from reference lines 179-293 (bottom bar: player plate, nav buttons, familiar summon button, XP fill). This is the largest single piece of markup in the scene — read reference lines 179-293 directly before implementing.

```tsx
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { DISCOVERIES } from '../../data/discoveries';
import type { SectionKey } from '../../data/discoveries';
import styles from './PlayerBar.module.css';

const NAV: Array<{ section: SectionKey; num: number; glyph: string; label: string; sublabel: string }> = [
  { section: 'journey', num: 1, glyph: '◆', label: 'WORLD MAP', sublabel: 'THE JOURNEY' },
  { section: 'quests', num: 2, glyph: '⚔', label: 'BATTLE LOG', sublabel: 'PROJECTS' },
  { section: 'experience', num: 3, glyph: '▣', label: 'QUEST LOG', sublabel: 'EXPERIENCE' },
  { section: 'hobbies', num: 4, glyph: '♦', label: 'INVENTORY', sublabel: 'HOBBIES' },
  { section: 'contact', num: 5, glyph: '✉', label: 'CONTACT', sublabel: 'SAY HELLO' },
];

export function PlayerBar({ onSummonFamiliar }: { onSummonFamiliar: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();

  const discoveredCount = Object.keys(state.discoveries).length;
  const xp = Math.round((discoveredCount / DISCOVERIES.length) * 100);
  const xpLabel = xp >= 100
    ? 'LVL UP★ ALL CHAPTERS EXPLORED'
    : `${xp}% XP · ${state.visited.length}/4 CHAPTERS`;

  return (
    <div className={styles.bar}>
      <div className={styles.xpTrack}><div className={styles.xpFill} style={{ width: `${xp}%` }} /></div>

      <div className={styles.playerPlate}>
        <div className={styles.plateTop}>
          <span>P1 · IMAJELLO</span>
          <span className={styles.level}>LVL 21</span>
        </div>
        <div className={styles.meterRow}>
          <span className={styles.meterLabelHp}>HP</span>
          <div className={styles.meterTrough}><div className={styles.meterFillHp} /><div className={styles.meterSegments} /></div>
        </div>
        <div className={styles.meterRow}>
          <span className={styles.meterLabelEn}>EN</span>
          <div className={styles.meterTrough}><div className={styles.meterFillEn} /><div className={styles.meterSegments} /></div>
        </div>
        <span className={styles.konamiHint}>{state.konamiUnlocked ? '★ KONAMI MASTER UNLOCKED' : '▲ ▲ ▼ ▼ ◀ ▶ ◀ ▶ B A'}</span>
        <span className={styles.xpLabel}>{xpLabel}</span>
      </div>

      <div className={styles.nav}>
        {NAV.map(item => {
          const visited = state.visited.includes(item.section);
          const hovering = state.navHover === item.section;
          return (
            <button
              key={item.section}
              data-sfx
              className={styles.navBtn}
              style={{
                background: hovering ? 'rgba(238,154,163,.16)' : 'none',
                borderRight: `3px solid ${visited ? '#ee9aa3' : '#2b2b30'}`,
              }}
              onMouseEnter={() => dispatch({ type: 'SET_NAV_HOVER', section: item.section })}
              onMouseLeave={() => dispatch({ type: 'SET_NAV_HOVER', section: null })}
              onClick={() => { tick(); dispatch({ type: 'OPEN_SECTION', section: item.section }); }}
            >
              <div className={styles.navFill} style={{ transform: hovering ? 'scaleY(1)' : 'scaleY(0)' }} />
              <span className={styles.navBadge}>{item.num}</span>
              <span className={styles.navGlyph}>{item.glyph}</span>
              <span className={styles.navLabel}>{item.label}</span>
              <span className={styles.navSub}>{item.sublabel}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.familiarWrap}>
        <button data-sfx className={styles.familiarBtn} onClick={onSummonFamiliar}>
          <span className={styles.familiarBadge}>F</span>
          <span className={styles.familiarIcon}>🔮</span>
        </button>
        <span className={styles.familiarLabel}>FAMILIAR</span>
      </div>
    </div>
  );
}
```

`PlayerBar.module.css`: port every value from reference lines 180-293 directly (grid `1fr auto 1fr`, `rgba(43,43,48,.96)` bar background, `112px` nav button width, `18px` circular number badges, HP fill `96%` pink / EN fill `100%` yellow with the repeating-gradient segment overlay, familiar button `64×64` with `4px 4px 0 rgba(20,20,23,.5)` shadow). `onSummonFamiliar` is passed down from `GameScene` and will be wired to the `useFamiliarToggle()` hook built in Task 16.

- [ ] **Step 5: `GameScene`** — composition root, ported from reference lines 42-46 (scene wrapper + particle host).

```tsx
import { useRef } from 'react';
import { HeroCharacterViewer } from './HeroCharacterViewer';
import { TopBar } from './TopBar';
import { KeybindsLegend } from './KeybindsLegend';
import { PlayerBar } from './PlayerBar';
import { useParticles } from '../../hooks/useParticles';
import { useGameState } from '../../state/GameStateContext';
import styles from './GameScene.module.css';

export function GameScene() {
  const { state } = useGameState();
  const particleHostRef = useRef<HTMLDivElement>(null);
  const cursorHostRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  useParticles(particleHostRef, cursorHostRef, cursorRef);

  return (
    <div className={styles.scene}>
      <div ref={particleHostRef} className={styles.particles} aria-hidden />
      <KeybindsLegend />
      <div className={styles.heroWrap} style={{ transform: state.familiarOpen ? 'translateX(-14vw)' : 'translateX(0)' }}>
        <HeroCharacterViewer />
      </div>
      <TopBar />
      {/* PlayerBar's onSummonFamiliar is wired in Task 16 once useFamiliarToggle exists */}
      <PlayerBar onSummonFamiliar={() => {}} />
    </div>
  );
}
```

`GameScene.module.css`: port `position:relative;height:100vh;overflow:hidden;display:flex;flex-direction:column;background:repeating-linear-gradient(...),#f5d9dc` for `.scene` from reference line 42, and `position:absolute;inset:0;overflow:hidden;pointer-events:none` for `.particles` from line 45. The `heroWrap` transform (`translateX(-14vw)` when familiar chat is open) is ported from reference line 63/1256.

- [ ] **Step 6: Verify**

Run: `cd client && npm run dev`. Open the browser side-by-side with the reference file (open the `.dc.html` directly in a second tab). Confirm: hero name/portrait/stats render, ←/→ cycles characters with slide animation, nav bar shows 5 buttons with correct icons/numbers/hover fill, HP/EN meters render, XP bar starts at 0%, discoveries counter shows `0/10`, resume/github/linkedin/SFX buttons appear top-right.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/scene
git commit -m "feat: game scene - hero viewer, top bar, keybinds legend, player bar"
```

---

### Task 11: DialogHost wrapper

**Files:**
- Create: `client/src/components/dialogs/DialogHost.tsx`, `.module.css`

**Interfaces:**
- Consumes: `useGameState`, `useSfx`.
- Produces: `<DialogHost />` — renders the active dialog by `state.open`, plus the scrim, vertical hotbar, and cursor-follower, all shared chrome ported from reference lines 295-315. Individual dialog bodies (Task 12-17) are its children, selected by `state.open`.

- [ ] **Step 1: Write `DialogHost.tsx`**

Ported from reference lines 295-315 (vertical hotbar + scrim + cursor follower, all gated on `anyOpen`). Dialog components themselves (imported from Tasks 12-17) render their own outer `<div data-screen-label=... style="position:fixed;...">` wrapper per-dialog (matches the reference, where each dialog's positioning/border/background differs) — `DialogHost` only supplies the shared overlay chrome and ESC-to-close backdrop.

```tsx
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { WorldMapDialog } from './WorldMapDialog';
import { BattleLogDialog } from './BattleLogDialog';
import { QuestLogDialog } from './QuestLogDialog';
import { InventoryDialog } from './InventoryDialog';
import { ContactDialog } from './ContactDialog';
import type { SectionKey } from '../../data/discoveries';
import styles from './DialogHost.module.css';

const HOTBAR: Array<{ section: SectionKey; glyph: string; num: string }> = [
  { section: 'journey', glyph: '◆', num: '1' },
  { section: 'quests', glyph: '⚔', num: '2' },
  { section: 'experience', glyph: '▣', num: '3' },
  { section: 'hobbies', glyph: '♦', num: '4' },
  { section: 'contact', glyph: '✉', num: '5' },
];

export function DialogHost() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const anyOpen = !!state.open;
  if (!anyOpen) return null;

  const close = () => { tick(); dispatch({ type: 'CLOSE_SECTION' }); };

  return (
    <>
      {state.open === 'journey' && <WorldMapDialog onClose={close} />}
      {state.open === 'quests' && <BattleLogDialog onClose={close} />}
      {state.open === 'experience' && <QuestLogDialog onClose={close} />}
      {state.open === 'hobbies' && <InventoryDialog onClose={close} />}
      {state.open === 'contact' && <ContactDialog onClose={close} />}

      <div className={styles.hotbar}>
        {HOTBAR.map(item => (
          <button
            key={item.section}
            data-sfx
            className={styles.hotbarBtn}
            style={{ background: state.open === item.section ? 'rgba(245,217,220,.14)' : 'none' }}
            onClick={() => dispatch({ type: 'OPEN_SECTION', section: item.section })}
          >
            <span>[<span>{item.glyph}</span>]</span>
            <span className={styles.hotbarNum}>{item.num}</span>
          </button>
        ))}
        <button data-sfx className={styles.hotbarBtn} onClick={close}>
          <span>[<span>✕</span>]</span>
          <span className={styles.hotbarNum}>ESC</span>
        </button>
      </div>

      <div className={styles.scrim} onClick={close}>
        <div className={styles.cursorHost}>
          <div className={styles.cursor}><div className={styles.cursorRing} /></div>
        </div>
      </div>
    </>
  );
}
```

`DialogHost.module.css`: port `.hotbar` (`position:fixed;right:14px;top:50%;transform:translateY(-50%);z-index:85`), `.scrim` (`position:fixed;inset:0;z-index:70;background:rgba(43,43,48,.72);animation:scrimIn .2s ease both;cursor:pointer`), and `.cursorRing` (`22×22`, `border:3px solid #c25f74`, `animation:cursorSpin 3s steps(8) infinite`) from reference lines 296-313 exactly. Each dialog component (Tasks 12-17) accepts `onClose: () => void` and is responsible for its own `position:fixed;top:50%;left:50%;...` outer wrapper, sticky header with the `✕ ESC` close button (calling `onClose`), and internal scroll — per-dialog because backgrounds/borders differ (World Map is `#2b2b30`/pink border, Battle Log is `#6d6a72`/dark border, Quest Log is `#f5d9dc`/dark border, Inventory is `#c25f74`, Contact is `#2b2b30`/pink border).

- [ ] **Step 2: Stub the five dialog components**

Create minimal stubs so `DialogHost` compiles before Tasks 12-17 land:

```tsx
// e.g. WorldMapDialog.tsx (repeat pattern for the other four)
export function WorldMapDialog({ onClose }: { onClose: () => void }) {
  return <div onClick={e => e.stopPropagation()}>World Map stub <button onClick={onClose}>close</button></div>;
}
```

- [ ] **Step 3: Verify**

Run: `cd client && npm run dev`. Press `1`-`5`, confirm a stub dialog appears with a scrim behind it, hotbar shows on the right, ESC closes it.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/dialogs
git commit -m "feat: dialog host - scrim, vertical hotbar, cursor follower, dialog routing"
```

---

### Task 12: WorldMapDialog

**Files:**
- Modify: `client/src/components/dialogs/WorldMapDialog.tsx` (replace stub)
- Create: `client/src/components/dialogs/WorldMapDialog.module.css`

**Interfaces:**
- Consumes: `JOURNEY_STOPS` from `data/journey.ts`, `ImageSlot` from `components/shared/ImageSlot.tsx`.
- Produces: `<WorldMapDialog onClose={() => void} />`.

- [ ] **Step 1: Implement**

Port reference lines 316-346 directly. Structure: sticky header (`[1] World Map · PH → CA → UCI` + close button), a 3-column auto-fit grid of `JOURNEY_STOPS`, each with an `ImageSlot` (280px tall, `fit="contain"`), title, and body paragraph. The current stop (`current: true`) gets the pink `#ee9aa3` background variant with a blinking `▶ NOW PLAYING` badge (uses the `blink` keyframe from `global.css`) instead of `★★★ CLEARED`.

```tsx
import { JOURNEY_STOPS } from '../../data/journey';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './WorldMapDialog.module.css';

export function WorldMapDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[1]</span>
          <span className={styles.title}>World Map</span>
          <span className={styles.sub}>PH → CA → UCI</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ ESC</button>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          {JOURNEY_STOPS.map(stop => (
            <div key={stop.id} className={stop.current ? styles.cardCurrent : styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.worldLabel}>{stop.worldLabel}</div>
                <span className={stop.current ? styles.statusNow : styles.statusCleared}>{stop.statusLabel}</span>
              </div>
              <div className={styles.photoBox}>
                <ImageSlot placeholder={`photo: ${stop.title}`} fit="contain" />
              </div>
              <div className={stop.current ? styles.cardTitleCurrent : styles.cardTitle}>{stop.title}</div>
              <p className={stop.current ? styles.bodyCurrent : styles.bodyText}>{stop.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

`WorldMapDialog.module.css`: port every value from reference lines 318-343 directly (dialog outer: `width:min(1020px,94vw);max-height:86vh;background:#2b2b30;border:4px solid #ee9aa3;box-shadow:10px 10px 0 rgba(20,20,23,.6);animation:dialogIn .22s steps(5) both`; grid: `repeat(auto-fit,minmax(240px,1fr))`; current card: `background:#ee9aa3`, text `#2b2b30`).

- [ ] **Step 2: Verify**

Run: `cd client && npm run dev`, press `1`. Compare against opening the reference `.dc.html` and pressing `1`: 3 cards, middle one pink with blinking "NOW PLAYING", photo placeholders showing "COMING SOON".

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/WorldMapDialog.tsx client/src/components/dialogs/WorldMapDialog.module.css
git commit -m "feat: World Map dialog"
```

---

### Task 13: BattleLogDialog

**Files:**
- Modify: `client/src/components/dialogs/BattleLogDialog.tsx` (replace stub)
- Create: `client/src/components/dialogs/BattleLogDialog.module.css`

**Interfaces:**
- Consumes: `PROJECTS` from `data/projects.ts`, `ImageSlot`.
- Produces: `<BattleLogDialog onClose={() => void} />`.

- [ ] **Step 1: Implement**

Port reference lines 349-459 directly (recall: this is the block gated on `isQuests`, mislabeled "Quest Log" in the source comment — its actual content, per `data-screen-label="Battle Log Dialog"` at reference line 350, is the projects list). Header badge is **`[2]`** (fixing the source's stale `[3]`, see Global Constraints). Each project renders: absolute-positioned `⌂ REPO` link bottom-right, `260×180` screenshot slot with `RANK S`/`RANK A` badge top-left (real `<img>` via `ImageSlot` for PlanPal since it has `imageSrc`, placeholder for the other three), title + status badge, meta line, bullet list, and a `LOOT:` tech-chip row.

```tsx
import { PROJECTS } from '../../data/projects';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './BattleLogDialog.module.css';

export function BattleLogDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[2]</span>
          <span className={styles.title}>Battle Log</span>
          <span className={styles.sub}>SELECTED PROJECTS</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ ESC</button>
      </div>
      <div className={styles.body}>
        {PROJECTS.map(p => (
          <div className={styles.card} key={p.id}>
            <a href={p.repoUrl} target="_blank" rel="noreferrer" data-sfx className={styles.repoLink}>⌂ REPO</a>
            <div className={styles.shotWrap}>
              <ImageSlot src={p.imageSrc} placeholder={p.imagePlaceholder} />
              <span className={styles.rankBadge}>RANK {p.rank}</span>
            </div>
            <div className={styles.info}>
              <div className={styles.infoTop}>
                <h3 className={styles.projTitle}>{p.title}</h3>
                <span className={p.status === 'complete' ? styles.statusComplete : styles.statusProgress}>{p.statusLabel}</span>
              </div>
              <div className={styles.meta}>{p.meta}</div>
              <ul className={styles.bullets}>
                {p.bullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <div className={styles.lootRow}>
                <span className={styles.lootLabel}>LOOT:</span>
                {p.loot.map(l => <span className={styles.lootChip} key={l}>{l}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

`BattleLogDialog.module.css`: port from reference lines 350-458 (dialog: `background:#6d6a72;color:#2b2b30;border:4px solid #2b2b30`; card: `background:#f5d9dc;border:3px solid #2b2b30`; screenshot wrap `260px` fixed width; `statusProgress` uses the `blink` keyframe per reference line 419/444).

- [ ] **Step 2: Verify**

Run: `cd client && npm run dev`, press `2`. Compare against the reference: 4 project cards, PlanPal shows its real thumbnail, others show "COMING SOON", header reads `[2] Battle Log`.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/BattleLogDialog.tsx client/src/components/dialogs/BattleLogDialog.module.css
git commit -m "feat: Battle Log dialog (projects)"
```

---

### Task 14: QuestLogDialog (Main/Side tabs + Achievements + Education)

**Files:**
- Modify: `client/src/components/dialogs/QuestLogDialog.tsx` (replace stub)
- Create: `client/src/components/dialogs/QuestLogDialog.module.css`

**Interfaces:**
- Consumes: `MAIN_QUESTS`, `SIDE_QUESTS`, `ACHIEVEMENTS`, `EDUCATION` from `data/quests.ts`; `useGameState` for `state.questLogTab`; renders `<TimelineTab />` (Task 15) when the timeline tab is active.
- Produces: `<QuestLogDialog onClose={() => void} />`.

- [ ] **Step 1: Implement**

Port reference lines 462-582 directly (recall: this is the block gated on `isExperience`, mislabeled "Battle Log" in the source comment — its actual content, per `data-screen-label="Quest Log Dialog"` at reference line 463, is the 3-tab experience view). Header badge `[3]` (this one is already correct in the source). Note the reference's odd but intentional layout: the "Achievements Unlocked" + Education block (lines 548-582, gated on `notTimeline`) renders on **both** the Main and Side tabs — only the Timeline tab hides it. Preserve that exactly.

```tsx
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { MAIN_QUESTS, SIDE_QUESTS, ACHIEVEMENTS, EDUCATION } from '../../data/quests';
import { TimelineTab } from './TimelineTab';
import styles from './QuestLogDialog.module.css';

export function QuestLogDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const tab = state.questLogTab;
  const setTab = (t: typeof tab) => { tick(); dispatch({ type: 'SET_QUEST_TAB', tab: t }); };

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[3]</span>
          <span className={styles.title}>Quest Log</span>
          <span className={styles.sub}>EXPERIENCE</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ ESC</button>
      </div>
      <div className={styles.body}>
        <div className={styles.tabs}>
          <button data-sfx className={tab === 'main' ? styles.tabActive : styles.tab} onClick={() => setTab('main')}>MAIN QUESTS</button>
          <button data-sfx className={tab === 'side' ? styles.tabActive : styles.tab} onClick={() => setTab('side')}>SIDE QUESTS <span className={styles.tabCount}>+4</span></button>
          <button data-sfx className={tab === 'timeline' ? styles.tabActive : styles.tab} onClick={() => setTab('timeline')}>TIMELINE</button>
        </div>

        {tab === 'main' && (
          <>
            <p className={styles.intro}>I find the edge cases more interesting than the happy path — reliable evaluation, honest failure modes, real constraints around latency and cost. That's the terrain I enjoy.</p>
            <div className={styles.jobGrid}>
              {MAIN_QUESTS.map(job => (
                <div className={styles.jobCard} key={job.title}>
                  <div className={styles.jobDate}>{job.dateRange}</div>
                  <div className={styles.jobHeading}><h3>{job.title}</h3><span>{job.org}</span></div>
                  <ul>{job.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'side' && (
          <div className={styles.sideWrap}>
            <p className={styles.introSide}>Not everything is in a terminal. These jobs taught me the stuff that doesn't show up in a commit log.</p>
            <div className={styles.sideGrid}>
              {SIDE_QUESTS.map(job => (
                <div className={styles.sideCard} key={job.title}>
                  <div className={styles.sideTop}><span className={styles.sideTag}>⚔ SIDE QUEST</span><span className={styles.sideDate}>{job.dateRange}</span></div>
                  <div className={styles.sideTitle}>{job.title}</div>
                  <div className={styles.sideOrg}>{job.org}</div>
                  <ul>{job.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  {job.skills && (
                    <div className={styles.skillsRow}>
                      <span className={styles.skillsLabel}>SKILLS GAINED:</span>
                      {job.skills.map(s => <span className={styles.skillChip} key={s}>{s}</span>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab !== 'timeline' && (
          <>
            <div className={styles.achHeading}>
              <h2>Achievements Unlocked</h2>
              <span className={styles.achTag}>LEADERSHIP</span>
            </div>
            <div className={styles.achGrid}>
              {ACHIEVEMENTS.map(a => (
                <div className={styles.achCard} key={a.title}>
                  <span className={styles.achIcon}>{a.icon}</span>
                  <div className={styles.achTitle}>{a.title}</div>
                  <div className={styles.achDesc}>{a.desc}</div>
                </div>
              ))}
            </div>
            <div className={styles.eduRow}>
              <div className={styles.eduLabel}>EDUCATION</div>
              <div className={styles.eduList}>
                {EDUCATION.map(e => (
                  <div key={e.title}>
                    <div className={styles.eduTitle}>{e.title}</div>
                    <div className={styles.eduMeta}>{e.meta}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'timeline' && <TimelineTab />}
      </div>
    </div>
  );
}
```

`QuestLogDialog.module.css`: port from reference lines 463-582 (dialog: `background:#f5d9dc;color:#2b2b30;border:4px solid #2b2b30`; tab buttons: active `background:#2b2b30;color:#f5d9dc` vs inactive `background:#f5d9dc;color:#2b2b30`, `3px solid #2b2b30` borders with `border-left:none` on tabs 2-3; job/side card grids `1fr 1fr`; side cards use `3px dashed #2b2b30`; achievements grid `2×2` with `2px` gap on `#2b2b30` background creating grid lines).

- [ ] **Step 2: Verify**

Run: `cd client && npm run dev`, press `3`. Click all three tabs, confirm Main/Side show job cards + achievements below, Timeline hides achievements and shows the (stubbed, until Task 15) timeline content.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/QuestLogDialog.tsx client/src/components/dialogs/QuestLogDialog.module.css
git commit -m "feat: Quest Log dialog - main/side quest tabs, achievements, education"
```

---

### Task 15: TimelineTab

**Files:**
- Create: `client/src/components/dialogs/TimelineTab.tsx`, `.module.css`

**Interfaces:**
- Consumes: `TIMELINE_BARS` from `data/quests.ts`.
- Produces: `<TimelineTab />`, rendered by `QuestLogDialog` (Task 14) when `state.questLogTab === 'timeline'`.

- [ ] **Step 1: Implement**

Port reference lines 584-661 directly — this is pure absolute-positioning with exact pixel values already captured in `TIMELINE_BARS` (Task 3, Step 6). The year-axis labels and gridlines use fixed pixel offsets too (reference lines 596-613): 2027=44px, NOW=128px (rose), 2026=212px, 2025=380px, 2024=548px, 2023=716px, 2022=884px, container height 950px, axis column 50px wide, chart column starts at `left:14px` inside a `border-left:3px solid #2b2b30` track.

```tsx
import { TIMELINE_BARS } from '../../data/quests';
import styles from './TimelineTab.module.css';

const YEAR_LABELS: Array<{ top: number; text: string; now?: boolean }> = [
  { top: 44, text: '2027' },
  { top: 128, text: 'NOW', now: true },
  { top: 212, text: '2026' },
  { top: 380, text: '2025' },
  { top: 548, text: '2024' },
  { top: 716, text: '2023' },
  { top: 884, text: '2022' },
];

const VARIANT_CLASS: Record<string, string> = {
  'education-pink': styles.barEducationPink,
  'education-uci': styles.barEducationUci,
  main: styles.barMain,
  side: styles.barSide,
};

function Legend() {
  return (
    <div className={styles.legend}>
      <span><span className={styles.swatchMain} /> Main quest</span>
      <span><span className={styles.swatchSide} /> Side quest</span>
      <span><span className={styles.swatchEduPink} /> Education (De Anza)</span>
      <span><span className={styles.swatchEduUci} /> Education (UCI)</span>
    </div>
  );
}

export function TimelineTab() {
  return (
    <div className={styles.wrap}>
      <div className={styles.introRow}>
        <p className={styles.intro}>Everything, side by side — main quests, side quests, and school, in the order they actually happened. Recent at the top.</p>
        <Legend />
      </div>
      <div className={styles.chartRow}>
        <div className={styles.axis}>
          {YEAR_LABELS.map(y => (
            <div key={y.text} className={y.now ? styles.axisLabelNow : styles.axisLabel} style={{ top: y.top }}>{y.text}</div>
          ))}
        </div>
        <div className={styles.track}>
          <div className={styles.futureLabel}>↑ future</div>
          {YEAR_LABELS.map(y => (
            <div
              key={y.text}
              className={y.now ? styles.gridlineNow : styles.gridline}
              style={{ top: y.top }}
            />
          ))}
          {TIMELINE_BARS.map((bar, i) => (
            <div
              key={i}
              className={VARIANT_CLASS[bar.variant]}
              style={{ top: bar.top, left: bar.left, width: bar.width, height: bar.height }}
            >
              <span className={styles.barLabel}>{bar.label}</span>
              {bar.sublabel && <span className={styles.barSublabel}>{bar.sublabel}</span>}
            </div>
          ))}
        </div>
      </div>
      <Legend />
    </div>
  );
}
```

`TimelineTab.module.css`: port from reference lines 585-660. Key values: `.axis`/`.track` both `height:950px`; `.track` has `border-left:3px solid #2b2b30;padding-left:14px`; gridlines are `border-top:2px dotted rgba(43,43,48,.25)` except the NOW line which is `2px solid #c25f74`; `.barEducationPink` = `background:#ee9aa3;border:3px solid #2b2b30`; `.barEducationUci` = `background:#0064a4;border:3px solid #2b2b30;color:#ffd200` text; `.barMain` = `background:#2b2b30;color:#f5d9dc`; `.barSide` = `background:#f5d9dc;border:3px dashed #2b2b30`. All bars need `overflow:hidden;box-sizing:border-box` (reference lines 614-651 use this on every bar).

- [ ] **Step 2: Verify**

Run: `cd client && npm run dev`, press `3`, click TIMELINE tab. Compare the bar chart against the reference pixel-for-pixel: 9 bars at the exact `top`/`left`/`width`/`height` from `TIMELINE_BARS`, dotted gridlines at each year, solid rose NOW line at 128px, "↑ future" caption above the 2027 line.

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/TimelineTab.tsx client/src/components/dialogs/TimelineTab.module.css
git commit -m "feat: Quest Log timeline chart"
```

---

### Task 16: InventoryDialog + familiar-summon hook

**Files:**
- Modify: `client/src/components/dialogs/InventoryDialog.tsx` (replace stub)
- Create: `client/src/components/dialogs/InventoryDialog.module.css`
- Create: `client/src/hooks/useFamiliarToggle.ts`
- Modify: `client/src/components/scene/GameScene.tsx` (wire `onSummonFamiliar` to the new hook)
- Modify: `client/src/App.tsx` (wire the `F`/`6` keybind to the new hook)

**Interfaces:**
- Consumes: `INV_ITEMS`, `INV_GRID_SIZE`, `INV_FILLED_POSITIONS` from `data/invItems.ts`; `ImageSlot`.
- Produces: `<InventoryDialog onClose={() => void} />`; `useFamiliarToggle(): () => void` (consumed by `PlayerBar`'s summon button via `GameScene`, and by `App.tsx`'s `F`/`6` keydown branch, and by `FamiliarChat`'s own close/✕ button in Task 17).

- [ ] **Step 1: `useFamiliarToggle` hook**

This resolves the note left in Task 9 — opening the familiar needs a random emoji roll (a side effect), which doesn't belong in the reducer. Ported from reference `toggleFamiliar` (lines 1047-1059).

```ts
import { useCallback } from 'react';
import { useGameState } from '../state/GameStateContext';
import { useSfx } from './useSfx';
import { rollFamiliar, FAMILIAR_GREETINGS } from '../data/familiar';

export function useFamiliarToggle() {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();

  return useCallback(() => {
    tick();
    if (state.familiarOpen) {
      dispatch({ type: 'CLOSE_FAMILIAR' });
      return;
    }
    const emoji = rollFamiliar();
    const greeting = FAMILIAR_GREETINGS[emoji] ?? '*looks up at you* Ask me anything.';
    dispatch({ type: 'OPEN_FAMILIAR', emoji, greeting });
    dispatch({ type: 'UNLOCK_DISCOVERY', key: 'familiar' });
  }, [state.familiarOpen, dispatch, tick]);
}
```

- [ ] **Step 2: Wire the hook into `App.tsx` and `GameScene.tsx`**

In `App.tsx`, replace the `if (e.key === '6' ...)` block's comment with an actual call:

```tsx
// add near the top of App():
const toggleFamiliar = useFamiliarToggle();
```

```tsx
// replace the F/6 branch body with:
if (e.key === '6' || e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFamiliar(); }
```

In `GameScene.tsx`, replace `<PlayerBar onSummonFamiliar={() => {}} />` with:

```tsx
const toggleFamiliar = useFamiliarToggle();
// ...
<PlayerBar onSummonFamiliar={toggleFamiliar} />
```

- [ ] **Step 3: Implement `InventoryDialog`**

Port reference lines 669-729 directly. Grid view: 18 slots (`INV_GRID_SIZE`), filled positions per `INV_FILLED_POSITIONS` mapped in order to `INV_ITEMS`; empty slots are dashed placeholders. Gallery/detail view: two overlapping rotated photo cards that swap z-order on click (reference `swapPhotos`, ported to the `SWAP_PHOTOS` action in Task 4), a giant faded icon watermark behind them, item label/tag/description on the right.

```tsx
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import { INV_ITEMS, INV_GRID_SIZE, INV_FILLED_POSITIONS } from '../../data/invItems';
import { ImageSlot } from '../shared/ImageSlot';
import styles from './InventoryDialog.module.css';

export function InventoryDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();
  const activeItem = INV_ITEMS.find(i => i.key === state.invItem) ?? null;

  const openItem = (key: string) => { tick(); dispatch({ type: 'SET_INV_ITEM', key }); };
  const back = () => { tick(); dispatch({ type: 'INV_BACK' }); };
  const swap = () => { tick(); dispatch({ type: 'SWAP_PHOTOS' }); };

  const slots = Array.from({ length: INV_GRID_SIZE }, (_, i) => {
    const pos = INV_FILLED_POSITIONS.indexOf(i);
    return pos === -1 ? { filled: false as const } : { filled: true as const, item: INV_ITEMS[pos] };
  });

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[4]</span>
          <span className={styles.title}>Inventory</span>
          <span className={styles.sub}>HOBBIES</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ ESC</button>
      </div>

      {!activeItem ? (
        <div className={styles.gridBody}>
          <p className={styles.hint}>CLICK AN ITEM TO VIEW</p>
          <div className={styles.grid}>
            {slots.map((slot, i) => slot.filled ? (
              <button key={i} data-sfx className={styles.slotFilled} onClick={() => openItem(slot.item.key)}>
                {slot.item.icon}
                <span className={styles.slotTag}>{slot.item.tag}</span>
              </button>
            ) : (
              <div key={i} className={styles.slotEmpty} />
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.galleryBody}>
          <button data-sfx className={styles.backBtn} onClick={back}>◀ BACK TO ITEMS</button>
          <div className={styles.galleryGrid}>
            <div className={styles.photoStage}>
              <span className={styles.watermark}>{activeItem.icon}</span>
              <div
                data-sfx
                className={styles.photoA}
                style={{
                  top: state.invPhotoFront === 'first' ? 0 : 78,
                  width: state.invPhotoFront === 'first' ? '64%' : '56%',
                  transform: `rotate(${state.invPhotoFront === 'first' ? -5 : -3}deg)`,
                  zIndex: state.invPhotoFront === 'first' ? 2 : 1,
                }}
                onClick={swap}
              >
                <ImageSlot placeholder={activeItem.photos[0].placeholder} />
              </div>
              <div
                data-sfx
                className={styles.photoB}
                style={{
                  top: state.invPhotoFront === 'first' ? 78 : 0,
                  width: state.invPhotoFront === 'first' ? '56%' : '64%',
                  transform: `rotate(${state.invPhotoFront === 'first' ? 5 : 3}deg)`,
                  zIndex: state.invPhotoFront === 'first' ? 1 : 2,
                }}
                onClick={swap}
              >
                <ImageSlot placeholder={activeItem.photos[1].placeholder} />
              </div>
            </div>
            <div>
              <div className={styles.metaRow}>
                <span className={styles.metaIcon}>{activeItem.icon}</span>
                <span className={styles.metaTag}>{activeItem.tag} · ITEM {INV_ITEMS.findIndex(i => i.key === activeItem.key) + 1}/{INV_ITEMS.length}</span>
              </div>
              <h3 className={styles.itemLabel}>{activeItem.label}</h3>
              <p className={styles.itemDesc}>{activeItem.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

`InventoryDialog.module.css`: port from reference lines 670-728 (dialog `background:#c25f74`; grid `repeat(6,1fr)` with `6px` gap, `max-width:520px`; slot `aspect-ratio:1`; photo cards `aspect-ratio:4/5;border:4px solid #2b2b30;box-shadow:9px 9px 0 rgba(43,43,48,.4)` with `transition:top .38s cubic-bezier(.2,.8,.2,1),width .38s ...,transform .38s ...`; watermark `font-size:120px;color:rgba(43,43,48,.12)`).

- [ ] **Step 4: Verify**

Run: `cd client && npm run dev`, press `4`. Confirm 18-slot grid with 5 filled icons at the correct positions, click one → gallery view with two overlapping rotated placeholder cards, click either photo → they swap front/back with animation, "BACK TO ITEMS" returns to grid. Press `F` (or click the familiar button), confirm the chat panel area responds (full chat UI lands in Task 17, but the open/close toggle and emoji roll should already work — verify via a temporary `console.log(state.familiarOpen, state.familiarEmoji)` if `FamiliarChat` is still a stub, then remove the log).

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/dialogs/InventoryDialog.tsx client/src/components/dialogs/InventoryDialog.module.css client/src/hooks/useFamiliarToggle.ts client/src/components/scene/GameScene.tsx client/src/App.tsx
git commit -m "feat: Inventory dialog and familiar-summon toggle hook"
```

---

### Task 17: FamiliarChat (client) + Express /api/chat backend

**Files:**
- Modify: `client/src/components/familiar/FamiliarChat.tsx` (replace empty stub from Task 9)
- Create: `client/src/components/familiar/FamiliarChat.module.css`
- Create: `server/src/chat.ts`
- Modify: `server/src/index.ts` (mount the chat route)
- Create: `server/.env.example`

**Interfaces:**
- Consumes (client): `useGameState`, `CHAT_QUESTION_LIMIT` from `data/discoveries.ts`.
- Produces (client): `<FamiliarChat />`, rendered by `App.tsx` (already wired in Task 9).
- Produces (server): `POST /api/chat` — request `{ message: string, sessionId: string }`, response `{ reply: string } | { error: string }`.

- [ ] **Step 1: Server-side chat endpoint**

Ported from reference `doSendChat`'s system prompt (lines 1096-1100), with the 3-question limit enforced server-side too (in-memory, keyed by `sessionId`) — the client already enforces it, this is a cheap second guard per the approved design (no DB).

```ts
// server/src/chat.ts
import type { Request, Response } from 'express';

const SYSTEM_PROMPT = "You are Anjoelo Calderon's familiar — a small RPG creature that speaks briefly and playfully in-character, answering questions about his resume, projects, and credibility using only these facts: Software Engineering Intern at Unimode AI (semantic search over 1.3M+ records, p95 latency 700ms->200ms); AI/ML Extern at Pfizer (OCR + RAG pipeline); Study Guild project (React/Supabase); CS student at UC Irvine via De Anza College (GPA 3.74); Club President of Game Dev Club; ran two game jams. Keep answers under 60 words.";

const QUESTION_LIMIT = 3;
const sessionCounts = new Map<string, number>();

export async function handleChat(req: Request, res: Response) {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };
  if (!message || typeof message !== 'string' || !sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'message and sessionId are required' });
    return;
  }

  const used = sessionCounts.get(sessionId) ?? 0;
  if (used >= QUESTION_LIMIT) {
    res.status(429).json({ error: 'question limit reached for this session' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'chat is not configured' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 220,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: message.slice(0, 2000) }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`upstream ${response.status}: ${detail.slice(0, 300)}`);
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const reply = data.content?.find(c => c.type === 'text')?.text?.trim();
    if (!reply) throw new Error('empty reply from model');

    sessionCounts.set(sessionId, used + 1);
    res.json({ reply });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'no credits remaining';
    res.status(502).json({ error: reason });
  }
}
```

Mount it in `server/src/index.ts` (add below the existing `app.use(express.json())` line from Task 1):

```ts
import { handleChat } from './chat.js';
// ...
app.post('/api/chat', handleChat);
```

Create `server/.env.example`:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

Load it at the top of `server/src/index.ts`:

```ts
import 'dotenv/config';
```

- [ ] **Step 2: Client `FamiliarChat`**

Ported from reference lines 145-176 (markup) and `doSendChat`/`onChatInput`/`onChatKeyDown` (lines 1074-1108), adapted to call `POST /api/chat` instead of `window.claude.complete`. A `sessionId` is generated once per browser tab via `sessionStorage`.

```tsx
import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../../state/GameStateContext';
import { useFamiliarToggle } from '../../hooks/useFamiliarToggle';
import { useSfx } from '../../hooks/useSfx';
import { CHAT_QUESTION_LIMIT } from '../../data/discoveries';
import styles from './FamiliarChat.module.css';

function getSessionId(): string {
  const KEY = 'imajello-chat-session';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function FamiliarChat() {
  const { state, dispatch } = useGameState();
  const toggleFamiliar = useFamiliarToggle();
  const { tick } = useSfx();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [state.chatMessages]);

  if (!state.familiarOpen) return null;

  const questionsLeft = CHAT_QUESTION_LIMIT - state.chatQuestionsAsked;
  const sleepy = state.familiarAsleep || questionsLeft <= 0;
  const disabled = state.familiarAsleep || state.chatSending || questionsLeft <= 0;
  const placeholder = state.familiarAsleep ? 'zzz...' : questionsLeft <= 0 ? "That's all for now..." : 'Ask your question...';
  const questionsLabel = state.familiarAsleep
    ? 'FAMILIAR IS SLEEPING'
    : `${questionsLeft} QUESTION${questionsLeft === 1 ? '' : 'S'} LEFT TODAY`;

  const send = async () => {
    const text = state.chatInputValue.trim();
    if (!text || disabled) return;
    tick();
    dispatch({ type: 'CHAT_SEND_START', text });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'request failed');
      dispatch({ type: 'CHAT_SEND_SUCCESS', reply: data.reply });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'no credits remaining';
      dispatch({ type: 'CHAT_SEND_ERROR', reason });
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.emoji}>
        {state.familiarEmoji}
        {sleepy && <span className={styles.sleepBadge}>💤</span>}
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>YOUR FAMILIAR</span>
          <button data-sfx className={styles.closeBtn} onClick={toggleFamiliar}>✕</button>
        </div>
        <div className={styles.body}>
          <div ref={scrollRef} className={styles.scroll}>
            {state.familiarAsleep ? (
              <div>💤 *the familiar is fast asleep and won't wake up* ({state.familiarSleepReason})</div>
            ) : (
              state.chatMessages.map((m, i) => <div key={i} style={{ color: m.color }}>{m.text}</div>)
            )}
          </div>
          <div className={styles.inputRow}>
            <input
              type="text"
              value={state.chatInputValue}
              onChange={e => dispatch({ type: 'SET_CHAT_INPUT', value: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder={placeholder}
              disabled={disabled}
              className={styles.input}
            />
            <button data-sfx disabled={disabled} className={styles.sendBtn} onClick={send}>SEND</button>
          </div>
          <span className={styles.questionsLeft}>{questionsLabel}</span>
        </div>
      </div>
    </div>
  );
}
```

`FamiliarChat.module.css`: port from reference lines 147-176 (`.wrap`: `position:fixed;right:5vw;top:50%;transform:translate(0,-50%);z-index:9;width:min(360px,88vw);height:40vh;animation:chatboxIn .38s cubic-bezier(.22,.8,.32,1) both`; `.emoji`: `font-size:40px;animation:familiarBob 2.2s ease-in-out infinite`; `.panel`: `background:#2b2b30;border:4px solid #ee9aa3;box-shadow:8px 8px 0 rgba(20,20,23,.5)`; `.scroll`: `background:#1c1c20;border:2px solid #45454c` with `overflow-y:auto`).

- [ ] **Step 3: Wire the dev proxy**

So `fetch('/api/chat')` works against the Express server during `npm run dev` (Vite dev server and Express run on different ports locally), add to `client/vite.config.ts`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
```

- [ ] **Step 4: Verify**

Set `ANTHROPIC_API_KEY` in `server/.env` (copy from `.env.example`). Run both dev servers: `npm run dev:server` in one terminal, `npm run dev:client` in the other. Open the client, press `F`, confirm a random emoji + greeting appears, type a question about the resume, confirm a real reply streams back within the word-limit tone. Ask 3 questions, confirm the 4th is blocked client-side with `"That's all for now..."`. Temporarily lower `QUESTION_LIMIT` server-side to 1 and `CHAT_QUESTION_LIMIT` client-side to 1 to verify the server-side 429 path fires if you bypass the client guard (e.g. via devtools), then revert both back to 3.

Run: `cd client && npx tsc --noEmit && cd ../server && npx tsc --noEmit`
Expected: no errors in either.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/familiar client/vite.config.ts server/src server/.env.example
git commit -m "feat: familiar chat UI and /api/chat backend endpoint"
```

---

### Task 18: ContactDialog

**Files:**
- Modify: `client/src/components/dialogs/ContactDialog.tsx` (replace stub)
- Create: `client/src/components/dialogs/ContactDialog.module.css`

**Interfaces:**
- Consumes: `useGameState` for `msgName`/`msgEmail`/`msgBody`.
- Produces: `<ContactDialog onClose={() => void} />`.

- [ ] **Step 1: Implement**

Port reference lines 732-775 directly. Two-column grid: left column has the "CONTINUE?" blinking eyebrow, heading, intro paragraph, 2×2 link grid, dashed "PLAYER STATUS" 2×2 stat grid; right column is the message form (mailto-based per the approved design — no backend call). Submit builds the same `mailto:` URL as reference `sendMessage` (lines 1289-1294).

```tsx
import { useGameState } from '../../state/GameStateContext';
import { useSfx } from '../../hooks/useSfx';
import styles from './ContactDialog.module.css';

export function ContactDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGameState();
  const { tick } = useSfx();

  const setField = (field: 'msgName' | 'msgEmail' | 'msgBody', value: string) =>
    dispatch({ type: 'SET_MSG_FIELD', field, value });

  const sendMessage = () => {
    tick();
    const { msgName, msgEmail, msgBody } = state;
    const subject = `Hello from ${msgName || 'a visitor'}`;
    const body = (msgBody || '') + (msgEmail ? `\n\n— ${msgName} (${msgEmail})` : `\n\n— ${msgName}`);
    window.location.href = `mailto:contact@imajello.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className={styles.dialog} onClick={e => e.stopPropagation()}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.badge}>[5]</span>
          <span className={styles.title}>Contact</span>
        </div>
        <button data-sfx className={styles.closeBtn} onClick={onClose}>✕ ESC</button>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          <div className={styles.left}>
            <div>
              <div className={styles.continueTag}>CONTINUE?</div>
              <h2 className={styles.heading}>Ready for the next <span className={styles.accent}>quest?</span></h2>
            </div>
            <p className={styles.intro}>Open to Summer 2027 internships and interesting collaborations in AI/ML and full-stack engineering.</p>
            <div className={styles.linkGrid}>
              <a href="mailto:contact@imajello.com" className={styles.link}><span className={styles.arrow}>▸</span>EMAIL</a>
              <a href="https://github.com/jelo-ca" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>GITHUB</a>
              <a href="https://linkedin.com/in/anjoelo-calderon" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>LINKEDIN</a>
              <a href="/Anjoelo_Calderon_Resume.pdf" target="_blank" rel="noreferrer" className={styles.link}><span className={styles.arrow}>▸</span>RESUME</a>
            </div>
            <div className={styles.statusGrid}>
              <span className={styles.statusHeading}>PLAYER STATUS</span>
              <div className={styles.statusItem}><span>AVAILABILITY</span><span>NOW · FALL/SPRING/SUMMER</span></div>
              <div className={styles.statusItem}><span>FOCUS</span><span>AI/ML · FULL-STACK</span></div>
              <div className={styles.statusItem}><span>RESPONSE TIME</span><span>&lt; 24 HRS</span></div>
              <div className={styles.statusItem}><span>LOCATION</span><span>OPEN TO RELOCATE</span></div>
            </div>
          </div>
          <div className={styles.formCard}>
            <span className={styles.formLabel}>SEND A MESSAGE</span>
            <input type="text" placeholder="YOUR NAME" value={state.msgName} onChange={e => setField('msgName', e.target.value)} className={styles.input} />
            <input type="email" placeholder="YOUR EMAIL" value={state.msgEmail} onChange={e => setField('msgEmail', e.target.value)} className={styles.input} />
            <textarea placeholder="YOUR MESSAGE" value={state.msgBody} onChange={e => setField('msgBody', e.target.value)} className={styles.textarea} />
            <button data-sfx className={styles.sendBtn} onClick={sendMessage}>▶ SAY HELLO</button>
            <span className={styles.finePrint}>Opens your email app pre-filled — nothing sends until you hit send there.</span>
          </div>
        </div>
        <div className={styles.footer}>
          <span>© 2026 · INSERT COIN</span>
        </div>
      </div>
    </div>
  );
}
```

`ContactDialog.module.css`: port from reference lines 734-773 (dialog `background:#2b2b30;border:4px solid #ee9aa3`; grid `minmax(0,1fr) minmax(240px,320px)` gap `32px`; form card `background:#232327;border:2px solid #4a4a52`; send button uses the clip-path polygon from the design tokens: `clip-path:polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px)`; textarea `flex:1;min-height:60px` so it bottom-aligns the card with the left column).

- [ ] **Step 2: Verify**

Run: `cd client && npm run dev`, press `5`. Fill in name/email/message, click "▶ SAY HELLO", confirm the browser attempts to open a `mailto:` link with the subject/body correctly encoded (check via browser dev tools network/protocol handler prompt, or temporarily `console.log` the constructed URL before removing the log).

Run: `cd client && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/dialogs/ContactDialog.tsx client/src/components/dialogs/ContactDialog.module.css
git commit -m "feat: Contact dialog"
```

---

### Task 19: Full integration pass + deployment docs

**Files:**
- Modify: any component where the integration check below finds a gap
- Create: `DEPLOY.md` (root)

**Interfaces:** none new — this task wires together everything from Tasks 1-18 and verifies the whole app end-to-end against the reference file.

- [ ] **Step 1: Full manual walkthrough**

Run: `cd client && npm run dev` (and `npm run dev:server` from root in a second terminal, with `ANTHROPIC_API_KEY` set). With the reference `.dc.html` open side-by-side in another browser tab, walk through and confirm parity for:
1. Hero name, character cycling (←/→ and click arrows), stat bars, "Shapeshifter" discovery unlocks after seeing all 5 characters.
2. All 5 nav buttons open their dialogs (keys `1`-`5` and clicks), visited border turns pink, XP bar fills, achievement toasts fire on first visit each, "LEVEL UP" toast + fanfare after visiting all 4 non-Contact... wait, verify against reference line 1034: the "all chapters explored" toast fires when `visited.length === 4`, regardless of which 4 — confirm this exact condition, not a hardcoded set of 4 specific sections.
3. Battle Log header reads `[2]` (the fixed bug), Quest Log reads `[3]`, World Map `[1]`, Inventory `[4]`, Contact `[5]`.
4. Quest Log tabs switch correctly, achievements/education hidden only on Timeline tab, Timeline bars match pixel positions.
5. Inventory grid → item → gallery swap → back, all 5 items reachable, "Pack Rat" discovery unlocks on first item view.
6. Familiar summon (F key and button), random emoji + greeting, chat round-trip via the real API, 3-question limit enforced, sleep state on error, ESC closes it and restores hero position (no `translateX(-14vw)`).
7. Discoveries panel shows correct found/undiscovered split, updates live.
8. Konami code (`↑↑↓↓←→←→BA`) triggers star burst + fanfare + "Code Breaker" discovery; re-entering it after unlock re-triggers just the star burst (reference lines 1131-1132).
9. Sound toggle persists across reload (localStorage), all `data-sfx` elements tick on hover, dialog open/close/chime sounds play.
10. Contact form mailto link builds correctly.
11. ESC closes whichever of {discoveries panel, open dialog, familiar chat} takes priority, matching reference lines 882-884's exact precedence order.
12. Resize the window to a short viewport (<640px height) and confirm the hero bio row hides (reference line 30's `@media (max-height:640px)` rule) and the keybinds legend hides below 520px height (line 31).

- [ ] **Step 2: Production build check**

```bash
npm run build
npm start
```

Open `http://localhost:3000`, repeat a subset of the walkthrough above (character cycling, one dialog, familiar chat) against the production build specifically, to catch any dev-only behavior (e.g. Vite proxy) that doesn't carry over.

- [ ] **Step 3: Deployment doc**

Create `DEPLOY.md`:

```markdown
# Deploying to the Hostinger VPS

1. On the VPS: install Node 18+, clone this repo, run `npm install` at the root (installs both workspaces).
2. Copy `server/.env.example` to `server/.env` and fill in `ANTHROPIC_API_KEY`.
3. `npm run build` (builds the client to `client/dist`, compiles the server to `server/dist`).
4. Run with pm2: `pm2 start server/dist/index.js --name imajello` (or `npm start` from the repo root directly).
5. Point nginx at the Node process (default port 3000) as a reverse proxy, terminate TLS there with certbot for your domain.
6. To update: `git pull`, `npm run build`, `pm2 restart imajello`.

## Supplying real assets later
- Photos: drop files into `client/public/photos/` and set the `src` prop on the relevant `ImageSlot` usage (World Map: `WorldMapDialog.tsx`; Battle Log: `data/projects.ts`'s `imageSrc` field; Inventory: `InventoryDialog.tsx`'s gallery `ImageSlot`s).
- Resume: replace `client/public/Anjoelo_Calderon_Resume.pdf` with the real file (same filename, no code change needed).
- Fonts: if self-hosted woff2 files weren't available during development, replace the Google Fonts `<link>` in `client/index.html` with real self-hosted `@font-face` files in `client/src/styles/global.css`.
```

- [ ] **Step 4: Commit**

```bash
git add DEPLOY.md
git commit -m "docs: deployment guide for Hostinger VPS"
```

---

## Self-Review Notes

- **Spec coverage:** every README section (Overview, Design Tokens, Screens 1-6, Interactions & Behavior, State Management, Assets) maps to a task above — scene/nav (Task 10), dialogs 1-6 (Tasks 12-18, Discoveries folded into Task 8), keyboard/sound/konami/familiar (Tasks 6, 7, 9, 16, 17), state/localStorage (Tasks 4-5), assets (Tasks 2-3, DEPLOY.md notes for photos/resume/fonts).
- **Known-bug fixes called out explicitly** (Battle Log `[3]`→`[2]` badge, `battleTab`→`questLogTab` rename) so no task silently reproduces a source defect or silently renames something without a paper trail.
- **Type consistency check:** `Action` types in `state/types.ts` (Task 4) are each dispatched with matching payload shapes in every consuming component (Tasks 8-18) — `OPEN_FAMILIAR` carries `emoji`+`greeting` (rolled in `useFamiliarToggle`, Task 16, not in the reducer); `SET_MSG_FIELD`'s `field` union (`'msgName' | 'msgEmail' | 'msgBody'`) matches the three `ContactDialog` inputs (Task 18) exactly.
- **No placeholders remain** except the two explicitly-scoped, owner-approved ones: real photos/resume PDF (Task 2/19, tracked in `DEPLOY.md`) and self-hosted font files if unavailable in this environment (Task 2 fallback).
