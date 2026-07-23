# Handoff: Imajello Portfolio — "Game HUD" Personal Site

## Overview
A personal portfolio site for Anjoelo Calderon (CS student, UC Irvine; AI/ML + full-stack) styled as a retro RPG game HUD. Every portfolio section is framed as a game construct: World Map (journey), Battle Log (projects), Quest Log (experience + timeline), Inventory (hobbies), Contact (final chapter). Includes an AI "familiar" chat, achievement toasts, discovery tracking, sound effects, and a Konami-code easter egg.

## About the Design Files
The files in `design/` are **design references created in HTML** — a working prototype showing intended look and behavior, NOT production code to copy directly. The task is to **recreate this design as a React app** (Vite + React or Next.js recommended; no design system dependency needed — styling is bespoke). `support.js` is the prototype's runtime and should be ignored entirely; the source of truth is the markup between `<x-dc>...</x-dc>` (template, with `{{ }}` value holes) and the `class Component` script (state + logic) inside the `.dc.html` file. `image-slot.js` is a drag-and-drop image placeholder used in the prototype; in production replace each `<x-import component-from-global-scope="image-slot" ...>` with a plain `<img>` (assets to be supplied) preserving the stated `fit`/size.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interactions are final. Recreate pixel-perfectly. All styles are inline in the markup — treat them as the spec.

## Design Tokens
Colors:
- Ink / near-black: `#2b2b30` (panels, borders, main-quest bars)
- Darker ink: `#232327`, `#1c1c20` (form card, meter troughs)
- Cream / paper: `#f5d9dc` (light text, side-quest fills), `#f4efe6`
- Pink accent: `#ee9aa3` (primary accent: highlights, buttons, education bars, HP)
- Deep rose: `#c25f74` (secondary accent, NOW line, "SIDE" labels)
- Muted grey: `#6d6a72` (secondary text), `#a8a5ac` (body text on dark), `#4a4a52` (dark borders)
- Yellow: `#ffd43b` (EN meter, gold trim)
- UCI blue/gold: `#0064a4` / `#ffd200` (UCI education bar only)

Typography:
- `Silkscreen` (Google Fonts) — all HUD/UI labels, buttons, monospace-pixel voice. Sizes 7–20px, letter-spacing occasionally .16em.
- `Archivo Black` — display headings, uppercase. Sizes 16–48px (clamp for hero).
- System sans for body paragraphs, 13–14px / 1.6.

Other tokens:
- Borders: 2–4px solid `#2b2b30` (or dashed for "side quest" items). No border-radius anywhere — everything is square/pixel.
- Shadows: hard offset shadows only, e.g. `10px 10px 0 rgba(20,20,23,.6)` on dialogs. Never blurred.
- Button corner clip: `clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)`.
- Dialog entrance: `dialogIn .22s steps(5)` (scale/fade with stepped easing — all animations use `steps()` for a pixel-game feel).
- Scanline texture: `repeating-linear-gradient(0deg, transparent 0 7px, rgba(43,43,48,.06) 7px 8px)` over background.

## Screens / Views
All "screens" are modal dialogs over a persistent game scene (single-page app, no routing needed; optionally sync open dialog to URL hash).

### 1. Game Scene (base layer)
- Full viewport, pink-tinted background with scanlines and animated drifting particles (small `+` and `◆` glyphs; drift slowly, react subtly to cursor).
- Center: hero character viewer — 210×210 portrait box (dark `#2b2b30`, scanline inset, radial pink glow at feet) with prev/next arrows cycling 5 pixel-art characters (see Assets). Beside it, a stat panel: 4 stat bars per character (name, modifier like `+4`, filled bar in pink on `#1c1c20` trough, `steps(4)` width transition).
- Top-left: `DISCOVERIES n / 10` counter (opens discovery list).
- Top-right: system buttons `RESUME ↓`, `GITHUB`, `LINKEDIN`, `SFX ON/OFF` — 9px Silkscreen, dark chip, pink hover inversion.
- Left: keybinds legend (keys 1–5, F, ESC with labels).
- Bottom: player bar (`P1 · IMAJELLO`, `LVL 21`, HP/EN segmented meters) + 5 nav buttons (WORLD MAP, BATTLE LOG, QUEST LOG, INVENTORY, CONTACT), each with number badge, icon glyph, sublabel, pink fill-up hover animation (scaleY from bottom, .32s), and a visited-state border. XP bar fills as sections are visited: `xp% XP · n/4 CHAPTERS`, "LVL UP★ ALL CHAPTERS EXPLORED" at 100%.
- Bottom-right: familiar summon button (F).

### 2. World Map dialog [1]
Journey/about: level-select cards (WORLD 1-1 style) walking through De Anza → UC Irvine path, with image slots for photos. Pink `#ee9aa3` panel for the current chapter ("Now · CS @ UCI").

### 3. Battle Log dialog [2] — Projects
Grey `#6d6a72` dialog. Project cards: 260px-wide screenshot slot (e.g. `sprites/planpal-thumb.png` for PlanPal), `RANK S` badge, title, tech-stack chips, professional description, GitHub link button anchored bottom-right.

### 4. Quest Log dialog [3] — Experience
Cream `#f5d9dc` dialog, 3 tabs: MAIN QUESTS / SIDE QUESTS +n / TIMELINE.
- Main/Side tabs: job entries with dates, roles, bullet achievements; "Achievements Unlocked" heading section.
- TIMELINE tab: vertical time chart, **14px = 1 month**, recent at top. Left axis (50px) labels top-to-bottom: 2027 (44px), NOW in rose (128px), 2026 (212px), 2025 (380px), 2024 (548px), 2023 (716px), 2022 (884px); container 950px tall. Chart column: dotted year gridlines, solid rose NOW line, `↑ future` caption above 2027. Bars are absolutely positioned boxes (position = date, height = duration): education (pink solid / UCI blue `#0064a4` starting late Sept 2026, running off the top), main quests (dark solid), side quests (cream with dashed border). Legend repeated above and below.

### 5. Inventory dialog [4] — Hobbies
Item grid (icons + LUTE-style RPG tags); clicking an item opens a detail view with description and photo gallery slots. Hobby copy is in `INV_ITEMS` in the script.

### 6. Contact dialog [5]
Dark `#2b2b30` dialog, 4px pink border, `min(860px, 94vw)`. Sticky header `[5] CONTACT` + `✕ ESC`.
Two-column grid `minmax(0,1fr) / minmax(240px,320px)`, gap 32px, stretch:
- Left: blinking `CONTINUE?` eyebrow (step-end 1.4s), heading "READY FOR THE NEXT **QUEST?**" (Archivo Black, clamp(26px,3.6vw,40px)), intro paragraph, then a 2×2 link grid (EMAIL / GITHUB / LINKEDIN / RESUME, `▸` prefix, pink hover), then a dashed-border `PLAYER STATUS` 2×2 stat grid: AVAILABILITY "NOW · FALL/SPRING/SUMMER", FOCUS "AI/ML · FULL-STACK", RESPONSE TIME "< 24 HRS", LOCATION "OPEN TO RELOCATE".
- Right: `SEND A MESSAGE` form card (`#232327`, 2px `#4a4a52` border): name, email inputs + message textarea (textarea flexes to bottom-align the card with the left column), full-width pink `▶ SAY HELLO` clipped button, fine-print note. Submit builds a `mailto:contact@imajello.com` URL with subject `Hello from {name}` and body `{message}\n\n— {name} ({email})`. (In production, consider swapping mailto for a form service/API endpoint.)
- Footer row: `© 2026 · INSERT COIN` right-aligned above a 2px top border.

## Interactions & Behavior
- Keyboard: `1–5` open sections, `F`/`6` toggles familiar, `ESC` closes, `←/→` cycle characters when the scene is focused. Konami code unlocks a star-burst easter egg overlay.
- Achievement toasts: first visit to each section pops a toast ("Cartographer — Visit the World Map", etc.); 10 discoveries total tracked in a persistent list (persist to localStorage).
- Sound: WebAudio-synthesized blips on hover/click (elements marked `data-sfx`); global SFX toggle, default from a `soundDefault` prop.
- Familiar chat: floating pixel creature (random emoji persona per summon, each with a scripted greeting); free-form Q&A about the resume answered by an LLM call — prototype uses `window.claude.complete` with a system prompt restricting answers to resume content; production needs an equivalent API route. Limit: 3 questions per session, then the familiar "falls asleep."
- All transitions use stepped easing (`steps(4-6)`) and ≤ .32s durations.
- Dialogs: max-height 86vh, internal scroll, sticky headers.

## State Management
Single component state in the prototype (`state` in the script): `open` (current dialog), `battleTab`, `charIdx`/`charDir`, `visited[]`, `discoveries{}`, `toast`, `sound`, `invItem`, chat state (`chatMessages`, `chatQuestionsAsked`, `familiarAsleep`), `konamiUnlocked`, contact form fields (`msgName`, `msgEmail`, `msgBody`). In React: one context or a top-level component with useState/useReducer is sufficient. Persist `visited`, `discoveries`, and sound preference to localStorage.

## Assets
- `design/sprites/*.png` — five 176×224 pixel-art character sprites (professional/engineer with glasses, muaythai fighter, musician with strap + note, gamer with headset hoodie, traveler with hat), drawn programmatically to match the site palette. Render with `image-rendering: pixelated`, width 62% of the portrait box.
- `design/sprites/planpal-thumb.png` — PlanPal project screenshot.
- Fonts: Google Fonts `Silkscreen` and `Archivo Black`.
- Image slots (photos of UCI, guitar, etc.) are placeholders — real photos to be supplied by the owner.
- Resume PDF: linked at `uploads/Anjoelo_Calderon_Resume.pdf` in the prototype — bundle the real file in the app's public assets.

## Files
- `design/Imajello Site v4b - Game HUD.dc.html` — the full design: template markup (styles inline) + `class Component` logic at the bottom. **Primary reference.**
- `design/sprites/` — character sprites + project thumbnail.
- `design/support.js`, `design/image-slot.js` — prototype runtime only; do not port.
