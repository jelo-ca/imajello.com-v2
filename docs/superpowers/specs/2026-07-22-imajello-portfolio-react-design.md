# Imajello Portfolio — React Port Design

## Overview

Port the "Game HUD" portfolio design (`design_handoff_portfolio_game_hud/design/Imajello Site v4b - Game HUD.dc.html`, `design_handoff_portfolio_game_hud/README.md`) from its HTML prototype (custom `<x-dc>`/`sc-if`/`sc-for` templating + `support.js` runtime) into a production React app, pixel-faithful to the prototype, deployable on the user's Hostinger VPS.

Full visual/interaction spec (colors, typography, tokens, screen-by-screen behavior, state shape, assets) is already authoritative in the README and the `.dc.html` file — this document covers **architecture decisions for the port**, not a re-derivation of the design itself. Implementers must treat the `.dc.html` markup/inline styles and the `class Component` script at its bottom as the source of truth for exact values, copy, and animation timing.

## Tech Stack

- **Vite + React + TypeScript**, single-page app (no router — the design is one persistent scene with modal dialogs, not routed views).
- **Plain CSS** (CSS Modules per component), not Tailwind/CSS-in-JS. The prototype's styling is 100% bespoke inline values (hard shadows, `clip-path` polygons, `steps()` easing) — CSS Modules make it easy to diff a component's styles against the corresponding `.dc.html` block for fidelity checks, without fighting a utility framework's abstractions.
- **Express** (Node) serves the built `client/dist` static files and exposes `POST /api/chat` for the familiar-chat LLM feature. One process, pm2-managed on the VPS, behind nginx (reverse proxy + TLS via certbot).

## Project Structure

```
/ (repo root)
├── client/                  # Vite React app
│   ├── src/
│   │   ├── data/             # chars.ts, invItems.ts, discoveries.ts, familiar.ts,
│   │   │                     # sections.ts, jobs.ts, timeline.ts, journey.ts
│   │   ├── state/            # reducer.ts, GameStateContext.tsx, actions.ts
│   │   ├── hooks/            # useParticles, useSfx, useKonami, useLocalStorage
│   │   ├── components/
│   │   │   ├── scene/        # GameScene, HeroCharacterViewer, TopBar, PlayerBar,
│   │   │   │                 # ParticleField, CursorTrail, KeybindsLegend
│   │   │   ├── dialogs/       # DialogHost, WorldMapDialog, BattleLogDialog,
│   │   │   │                 # QuestLogDialog (+ tabs incl TimelineTab),
│   │   │   │                 # InventoryDialog (+ Grid/Detail), ContactDialog
│   │   │   ├── familiar/      # FamiliarChat
│   │   │   ├── shared/        # ImageSlot, Toast, DiscoveryListPanel, KonamiOverlay
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── public/
│       ├── sprites/           # copied verbatim from design/sprites/
│       ├── fonts/              # self-hosted Silkscreen + Archivo/Archivo Black woff2
│       └── Anjoelo_Calderon_Resume.pdf   # placeholder until real file supplied
├── server/
│   ├── index.ts               # Express: static serve + /api/chat
│   ├── .env.example
│   └── .env                   # gitignored — ANTHROPIC_API_KEY lives here on the VPS
└── docs/superpowers/specs/    # this file
```

## State Management

- Prototype uses one class component with a flat `state` object and a single `renderVals()` deriving all display values. React equivalent:
  - One `useReducer` in a top-level `App`, actions mirroring prototype intents: `OPEN_SECTION`, `CLOSE_SECTION`, `TOGGLE_FAMILIAR`, `NEXT_CHAR`, `PREV_CHAR`, `UNLOCK_DISCOVERY`, `SET_INV_ITEM`, `SEND_CHAT_*`, contact-form field actions, `TOGGLE_SOUND`.
  - Wrapped in a `GameStateContext` so dialogs dispatch without prop drilling.
  - Persisted slice (`visited`, `discoveries`, `sound`) synced to `localStorage` on change, using prototype's own keys where they exist (`imajello-sfx`) plus new keys for `visited`/`discoveries`.
- Derived values (XP%, per-nav border color, inventory 18-slot grid, gallery photo transform math) computed with `useMemo` locally in the components that need them — not centralized into one god-function, to keep each dialog self-contained.
- Imperative/non-reactive concerns (WebAudio context, particle RAF loop, konami key-sequence tracking, cursor trail) live in refs + custom hooks (`useParticles`, `useSfx`, `useKonami`), not in reducer state — matches the prototype's own separation.

## Component Breakdown

```
App
 ├─ GameScene (persistent base layer)
 │   ├─ ParticleField, CursorTrail, KeybindsLegend
 │   ├─ HeroCharacterViewer   (portrait + stat panel, ←/→ cycling, 5 CHARS)
 │   ├─ TopBar                (discoveries counter, resume/github/linkedin/sfx)
 │   └─ PlayerBar             (P1/LVL, HP/EN meters, 5 nav buttons, XP bar)
 ├─ DialogHost                (renders active dialog by `open` key; ESC/backdrop/scroll-lock)
 │   ├─ WorldMapDialog
 │   ├─ BattleLogDialog        (project cards)
 │   ├─ QuestLogDialog
 │   │   ├─ MainQuestsTab / SideQuestsTab
 │   │   └─ TimelineTab        (absolute-positioned bar chart, isolated date-to-px math)
 │   ├─ InventoryDialog
 │   │   ├─ InventoryGrid      (18 slots, 5 filled from INV_ITEMS)
 │   │   └─ InventoryDetail    (gallery photo stack + description)
 │   └─ ContactDialog          (form + player-status card; mailto: submit)
 ├─ DiscoveryListPanel
 ├─ Toast                      (achievement/XP toasts, 3.2s auto-dismiss)
 ├─ FamiliarChat                (summon button + chat panel, POSTs /api/chat)
 └─ KonamiOverlay
```

- `ImageSlot`: shared component replacing every `<x-import image-slot>`. Renders `<img>` if given a `src`; otherwise a dashed-border "coming soon" placeholder box, matching prototype's `.coming-soon` styling. Used for journey photos, project screenshots (except PlanPal, which ships with its thumbnail), and hobby gallery photos — all placeholder for now per owner's decision to supply real files post-launch by dropping them into `public/photos/` and setting `src`.
- Static content (chars, inventory items, discoveries, familiar greetings/emoji pools, konami sequence, jobs/timeline/journey copy) extracted verbatim from the `.dc.html` script/template into `src/data/*.ts` modules — no copy changes.

## Backend / API — Familiar Chat

- `POST /api/chat` — body `{ message: string, sessionId: string }`. Server calls the Anthropic API using `ANTHROPIC_API_KEY` from `server/.env` (never exposed to the client), with the same system prompt and resume-facts restriction as the prototype's `window.claude.complete` call, word limit preserved (~60 words).
- Server enforces the 3-question-per-session limit independently of the client (in-memory map keyed by `sessionId`, a client-generated UUID persisted in `sessionStorage`) — cheap abuse guard, resets on server restart, no DB required for this.
- LLM errors / exhausted limit return an error response the client maps to the existing `familiarAsleep` UI state (same behavior as prototype's catch block, just server-driven instead of a thrown client promise).
- Contact form stays `mailto:` (no backend involved) per owner's choice — zero deliverability/spam surface for v1.

## Assets & Data

- Fonts: self-host `Silkscreen` + `Archivo Black`/`Archivo` as woff2 in `public/fonts` (avoids runtime dependency on Google Fonts CDN).
- Sprites: `design/sprites/*.png` copied as-is to `public/sprites/`, rendered with `image-rendering:pixelated`.
- Resume PDF: `public/Anjoelo_Calderon_Resume.pdf` placeholder committed until the real file is supplied; link path is stable so dropping in the real PDF later requires no code change.
- Photos (journey, project screenshots, hobby gallery): placeholder `ImageSlot` boxes; drop-in ready later.

## Testing

No automated test suite. This is a visual/interaction-driven single-page portfolio site — correctness is judged by matching the `.dc.html` reference pixel-for-pixel and behavior-for-behavior, which is best verified by running the dev server and comparing directly, not by unit tests. TypeScript covers structural/type safety. Skipping Vitest/RTL scaffolding as unnecessary overhead for this project's shape.

## Open Items (explicitly deferred, not blocking)

- Real photos, hobby gallery images, and resume PDF — owner supplies later; `ImageSlot`/file-path contracts already accommodate drop-in replacement.
- Font self-hosting vs Google Fonts link — defaulting to self-host; trivial to swap if owner prefers the CDN link.
