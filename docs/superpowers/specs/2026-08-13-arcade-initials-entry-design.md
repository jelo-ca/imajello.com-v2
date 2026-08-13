# Arcade Initials Entry — Design

Date: 2026-08-13

## Problem

The leaderboard's claim form asks for a display name through an ordinary text input, up to
20 characters. It works, but it reads as a web form bolted onto a cabinet. Nothing about
typing a nickname into a box says arcade, and the required field looks the same size as
the three optional ones beside it, so the one thing that ends up on the public board gets
no more weight than the company field.

## Goal

Replace the display-name input with a three-letter initials reel driven by the arrow keys,
the way a cabinet takes a high score. The reel is the largest thing in the form, and the
player can see the board row they are about to create before they commit to it.

## Scope

Client-side rewrite of the claim form's name field, plus a matching tightening of the
server's `displayName` validation. The board table, the fetch/submit calls, the ranking
rules, the rate limit, and the storage format are all untouched.

## Decisions

Settled during brainstorming:

- **The initials are the display name.** They replace `Identity.displayName` rather than
  sitting beside a longer nickname. The board's CLIMBER column shows `AJC`.
- **A–Z only.** 26 letters, no digits, no blank, no punctuation. Every entry is exactly
  three letters, so there is no partial or padded state to handle.
- **Arrow keys, direct typing, and tappable chevrons** all drive the reel. Backspace and
  Enter are deliberately not bound.
- **First name, last name, and company stay** as optional fields. They are still collected
  and still deliberately not rendered on the public board.

## Part 1 — `InitialsEntry` component

New files: `client/src/components/shared/InitialsEntry.tsx` and
`InitialsEntry.module.css`.

The component is props-only and knows nothing about scores, submission, or the board:

```ts
interface InitialsEntryProps {
  value: string;              // always exactly 3 characters, each A-Z
  onChange: (next: string) => void;
  disabled?: boolean;         // true while a submission is in flight
}
```

Its only internal state is `slot: 0 | 1 | 2` — which reel is active. The value itself lives
in the dialog, so the preview row and the submit handler read the same source.

### Layout

```
        ▲      ▲      ▲
        Z      C      A          dim: the letter one step back
     ┌────┐ ┌────┐ ┌────┐
     │  A │ │  D │ │  B │        40px pixel font, yellow
     └────┘ └▔▔▔▔┘ └────┘        active slot: yellow border + caret
        B      E      C          dim: the letter one step forward
        ▼      ▼      ▼

     ↑↓ LETTER   ←→ MOVE   OR TYPE
```

The dim neighbour letters above and below are what make it read as a physical reel rather
than three dropdowns. They are non-interactive and `aria-hidden`.

### Keyboard

The whole group is a single focusable element (`tabIndex={0}`) with one `onKeyDown`. Three
slots sharing one tab stop matches how the control behaves — you are turning one dial, not
tabbing between three widgets.

| Key | Effect |
| --- | --- |
| `↑` | Active slot advances one letter, `Z` wraps to `A` |
| `↓` | Active slot goes back one letter, `A` wraps to `Z` |
| `←` / `→` | Move the active slot, wrapping across the three |
| `A`–`Z` | Set the active slot to that letter, then advance the slot (stops at the third) |

Every handled key calls `preventDefault()` so arrows never scroll the dialog. Unhandled
keys fall through untouched, so `Escape` still closes the board via the window handler.

Arrow keys are already free while the board is open: `Platformer.tsx:34` includes
`state.leaderboardOpen` in `paused`, which unregisters `useHeldKeys`' window listeners, and
`App.tsx:54` returns early on every key but `Escape`. No changes needed in either file.

### Focus

The dialog autofocuses the reel when the run card mounts, so the arrow keys work the moment
GAME OVER comes up without the player having to click first.

### Touch and mouse

Each `▲` and `▼` is a real `<button type="button">` with an aria-label, so the reel is
fully usable on a phone — the climb itself is playable on touch, so the name entry has to
be too. Clicking a slot makes it active.

## Part 2 — Board row preview

Directly under the reel, inside the run card:

```
ON THE BOARD
──────────────────────────
 #?    ADB      Imajello
```

A one-row mock using the real table's CLIMBER and GUILD styling, updating live as the reel
turns and as the company field is typed. Rank shows `#?` because it isn't known until the
server has ranked the run. An empty company shows the same `—` the real board uses.

Level and time are omitted: they are already stated above in the run card, and repeating
them would make the mock compete with the reel instead of explaining it.

## Part 3 — Form layout

`LeaderboardDialog.module.css`'s `.form` grid stays a two-column grid. The reel block,
its hint, and the preview span the full width (`grid-column: 1 / -1`) in a single section
roughly 140px tall. `FIRST NAME` and `LAST NAME` keep the small side-by-side pair below it,
and `COMPANY` keeps the full-width row under those, all at their current 12px.

No relabelling is needed to signal which field matters — the size difference does it.

At the existing 480px breakpoint the reel stays three-across (three 40px glyphs fit
comfortably) while the optional fields collapse to one per row, as they already do.

## Part 4 — Identity normalisation

`Identity.displayName` now holds three characters. `api/leaderboard.ts` gains:

```ts
// The reel can only represent three A-Z letters, so anything else has to be coerced before
// it reaches the component — including the longer nickname a returning player may already
// have cached from the previous form.
export function normalizeInitials(value: string): string
```

Uppercase, strip everything outside `A-Z`, take the first three, then pad with `A` to
length three. Called in `loadIdentity()` so a stale cached name becomes a valid reel state
rather than breaking it, and applied to `EMPTY_IDENTITY.displayName`, which becomes `AAA`.

`saveIdentity` is unchanged — it stores whatever the reel produced, which is already valid.

## Part 5 — Server validation

`server/src/leaderboard.ts` currently accepts any cleaned string of 2–20 characters. Since
the column is now sized and styled for three glyphs, tighten it:

```ts
const displayName = cleanString(body.displayName, 20).toUpperCase();
if (!/^[A-Z]{3}$/.test(displayName)) {
  res.status(400).json({ error: 'display name must be three letters A-Z' });
  return;
}
```

The 20-character cap stays on the `cleanString` call rather than dropping to 3, so an
over-long name is rejected outright instead of being silently truncated to its first three
letters.

Rows already in `leaderboard.json` are not touched or re-validated; they keep rendering,
and the table's `word-break: break-word` already handles a longer legacy name. Only new
submissions are held to the rule.

## Part 6 — Strings

Everything user-visible goes in `content.json` under `ui.leaderboard.form`, matching how the
rest of the dialog already works. Added or changed:

| Key | Value |
| --- | --- |
| `displayName` | `INITIALS` (was `DISPLAY NAME`) |
| `initialsHint` | `↑↓ LETTER · ←→ MOVE · OR TYPE` |
| `previewHeading` | `ON THE BOARD` |
| `previewRank` | `#?` |
| `nameRequired` | `Enter three letters.` |
| `initialsAriaLabel` | `Your three initials` |
| `slotAriaLabel` | `Letter {n} of 3` |
| `letterUpAriaLabel` | `Next letter` |
| `letterDownAriaLabel` | `Previous letter` |

`displayNamePlaceholder` is removed — a reel has no placeholder.

## Error handling

The reel cannot produce an invalid value, so the client-side `nameRequired` check becomes
unreachable in practice. It stays as a `/^[A-Z]{3}$/` guard in `onSubmit` anyway, because
the value round-trips through `localStorage` and a hand-edited entry should fail loudly at
the form rather than at the server.

Submit failures, rate-limit responses, and load errors keep their existing handling — the
server's message is shown verbatim, which now includes the new three-letter rejection.

While `submitting` is true the reel takes `disabled`: keys are ignored and the chevrons are
disabled, so the value can't drift out from under an in-flight request.

## Testing

The repo has no test runner — `client` builds with `tsc -b` and lints with `oxlint`.
Verification is therefore:

1. `npm run build` — type-checks client and server.
2. `npm run lint --workspace client` — clean.
3. Manual pass in the browser: die in the climb, confirm the reel is focused, scroll each
   slot with `↑↓`, move with `←→` including the wrap, type three letters and watch the slot
   advance, confirm the page never scrolls, confirm the preview row tracks both the reel and
   the company field, submit, and confirm the board row shows the initials.
4. Manual touch pass at 480px: chevrons tap correctly and the reel stays three-across.
5. `curl` a POST with a 10-character `displayName` and confirm a 400.

## Out of scope

- Migrating existing long names in `leaderboard.json`.
- A profanity filter on three-letter combinations. Standard cabinet behaviour is to allow
  them; adding a blocklist is a separate decision.
- Changing the board table's columns, ranking, or the barrel/level systems.
