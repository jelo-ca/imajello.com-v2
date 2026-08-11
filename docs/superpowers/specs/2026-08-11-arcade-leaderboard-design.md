# Arcade Leaderboard & Barrel Telegraph — Design

Date: 2026-08-11

## Problem

The Donkey Kong climb has no record of a run. You die, the banner says GAME OVER, and
nothing carries forward — there is no reason to try for a better run than the last one.

Separately, barrels spawn already moving. A barrel can appear and reach the player before
they have had a chance to read it, which turns a fair dodge into a coin flip.

## Scope

Two changes, shipped together:

1. A one-second telegraph before each barrel starts rolling.
2. A persistent arcade leaderboard: the player names a run at game over, and the scores
   are stored server-side in JSON.

## Part 1 — Barrel telegraph

`Barrel` gains one field:

```ts
// Seconds left before this barrel goes live. While above zero the barrel hangs at the
// spawn point: no gravity, no movement, and no collision with the player. Gives the
// player a beat to read the colour and count of what is about to roll, so a barrel can
// never appear and kill in the same breath.
arming: number;
```

`BARREL_ARM_TIME = 1.0` seconds.

A spawned barrel is given its full velocity up front but does not use it while arming. In
the per-barrel loop, an arming barrel decrements `arming` by `dt` and then `continue`s —
skipping gravity, integration, surface landing, and off-screen culling. It is also excluded
from the player-overlap test, so contact during the telegraph is harmless.

Paired barrels (the `pairChance` roll) arm on the same clock, so a pair telegraphs as a
pair rather than one barrel appearing to trail a live one.

Arming barrels still count toward the spawn cadence — the cadence is unchanged, every
barrel is simply delayed by a fixed second.

### Rendering

`RenderableBarrel` gains `arming: boolean`. `DkLevel` appends an `arming` class when set.
The class pulses opacity and applies a slight transparency, so "not live yet" reads at a
glance without needing to know the rules. Purely presentational — `DkLevel` stays free of
physics knowledge, as it is today.

## Part 2 — Run scoring

A run's score is **the level reached** plus **the elapsed time of the run**.

Ranking is level descending, then time ascending: reaching level 5 beats reaching level 4,
and two players who both reached level 5 are separated by who got there faster.

### The clock

The run clock accumulates inside the physics loop, advancing only while
`status === 'climbing'` and the game is unpaused. Dialogs, the familiar panel and the
death/win banners all freeze the game already; the clock freezes with them, so idling in a
menu cannot inflate or deflate a time.

It resets on `DK_RESTART` and on the initial spawn, and carries across levels — the clock
measures the whole climb, not the current level.

Elapsed milliseconds are published on `DkPose` each frame and shown as a timer chip beside
the existing `LVL` chip, so the number being competed over is visible while playing.

### Ending a run

`DK_HIT` carries `elapsedMs`, rolled at the dispatch site so the reducer stays pure — the
same pattern the existing `seed` fields already use. When the hit is fatal, the reducer
stores it as `dkRunMs` alongside the `gameover` status. `dkRunMs` is what the submit form
reports.

## Part 3 — Server

New module `server/src/leaderboard.ts`, mounted in `index.ts` before the static handler:

- `GET /api/leaderboard` → `{ entries: Entry[] }`, top 20, already sorted.
- `POST /api/leaderboard` → `{ entry, rank }` on success.

### Storage

`server/data/leaderboard.json`, created on demand, added to `.gitignore`. Shape:

```json
{ "entries": [ { "id", "displayName", "firstName", "lastName", "company", "level", "timeMs", "createdAt" } ] }
```

Writes are tmp-file-plus-rename so a crash mid-write cannot leave a truncated file, and
every write goes through a single promise chain so two concurrent posts cannot interleave.
A malformed or missing file is treated as an empty board rather than a fatal error — a
corrupt file should not take the site down.

The file is capped at 100 entries; the tail is dropped after each insert.

### Validation

| Field | Rule |
|---|---|
| `displayName` | required, trimmed, 2–20 chars |
| `firstName`, `lastName` | optional, ≤30 chars |
| `company` | optional, ≤40 chars |
| `level` | integer, 1–999 |
| `timeMs` | integer, 0–86_400_000 |

All strings have control characters stripped and are stored as plain text. React escapes
on render, so no HTML sanitisation is needed beyond that. A failed validation returns 400
with a message the dialog can show.

Rate limit: 5 posts per IP per 10 minutes, held in memory. `trust proxy` is already set, so
`req.ip` is the real client address behind nginx.

### Trust

Scores are client-reported. A hand-rolled POST can claim level 999. This is a portfolio
toy, so the defence stops at the range clamps above — there is deliberately no server-side
replay or verification, and the board should not be read as tamper-proof.

## Part 4 — Client UI

### State

Global state (`State`) gains exactly two fields:

- `leaderboardOpen: boolean` — ephemeral, always false on load, like `roadmapOpen`.
- `dkRunMs: number` — the finished run's time, set by the fatal `DK_HIT`.

Form fields, submit status, errors and the fetched entries all live in local `useState`
inside `LeaderboardDialog`. They are transient view state with no other consumer, and the
reducer is already carrying more form state than it benefits from.

New actions: `OPEN_LEADERBOARD`, `CLOSE_LEADERBOARD`.

### Components

`components/shared/LeaderboardDialog.tsx` + `.module.css`, following the existing
`SettingsDialog` structure (overlay, ESC to close, close glyph from content, focus
handling). It fetches on open and renders rank / display name / company / level / time.

The game-over banner in `Platformer.tsx` gains a submit form: display name (required),
first name, last name, company — all three of the latter optional — with SUBMIT and SKIP.
On success it swaps to the board with the new row highlighted. TRY AGAIN stays available
throughout, so the form never traps a player who just wants to replay.

Submitter identity (the four name fields, not the scores) is cached in `localStorage` so a
second run prefills, matching how `sound`/`theme`/`visited` already persist.

A `TopBar` button next to roadmap and settings opens the board outside a run.

### Copy

Every string lands in `content.json` under `ui.leaderboard`, with the matching interface in
`content.ts` — no literal UI text in components, consistent with the rest of the app.

## Error handling

- Fetch fails → the dialog shows a retry line; the board is never a blank void.
- Submit fails → inline error, the form keeps its values, submit re-enables.
- Server file unreadable → treated as empty board, GET still answers 200.
- Rate limited → 429 with a plain "try again shortly" message.

## Testing

The repo has no test framework and this change does not justify introducing one. Verified
by `tsc -b` and `oxlint` clean, plus a manual pass: telegraph visible before roll, timer
freezes with the pause, submit writes the file, board survives a server restart, and a
second submit from the same browser prefills the names.

## Out of scope

- Anti-cheat / server-side score verification.
- Per-level boards, or any scoring beyond level and time.
- Editing or deleting submitted entries.
- A database. A JSON file is the right size for this.
