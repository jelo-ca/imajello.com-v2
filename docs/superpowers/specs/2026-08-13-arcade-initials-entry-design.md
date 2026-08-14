# Arcade Initials Entry — Design

Date: 2026-08-13

## Problem

The leaderboard's claim form asks for a display name through an ordinary text input, up to
20 characters. It works, but it reads as a web form bolted onto a cabinet. Nothing about
typing a nickname into a box says arcade, and the required field looks the same size as
the three optional ones beside it, so the one thing that ends up on the public board gets
no more weight than the company field.

## Goal

Replace the display-name input with a five-letter arcade-name reel driven by the arrow keys,
the way a cabinet takes a high score. The reel is the largest thing in the form, and the
player can see the board row they are about to create before they commit to it.

## Scope

Client-side rewrite of the claim form's name field, plus a matching tightening of the
server's `displayName` validation. The board table, the fetch/submit calls, the ranking
rules, the rate limit, and the storage format are all untouched.

## Decisions

Settled during brainstorming:

- **The reel value is the display name.** It replaces `Identity.displayName` rather than
  sitting beside a longer nickname. The board's CLIMBER column shows `ANJOE`.
- **A–Z only.** 26 letters, no digits, no blank, no punctuation. Every entry is exactly
  five letters, so there is no partial or padded state to handle.
- **Five reels, not three.** Long enough for a real short name (`ANJOE`) while still
  reading as a cabinet entry. `INITIALS_LENGTH` in `api/leaderboard.ts` is the single place
  the count is set on the client.
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
  value: string;              // always exactly INITIALS_LENGTH characters, each A-Z
  onChange: (next: string) => void;
  disabled?: boolean;         // true while a submission is in flight
}
```

Its only internal state is `slot` — the index of the active reel. The value itself lives in
the dialog, so the preview row and the submit handler read the same source.

### Layout

```
     ▲     ▲     ▲     ▲     ▲
     Z     M     I     N     D        dim: one step back
   ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
   │ A │ │ N │ │ J │ │ O │ │ E │      30px pixel font, yellow
   └───┘ └▔▔▔┘ └───┘ └───┘ └───┘      active slot: yellow border + caret
     B     O     K     P     F        dim: one step forward
     ▼     ▼     ▼     ▼     ▼

        ↑↓ LETTER  ←→ MOVE  OR TYPE
```

The dim neighbour letters above and below are what make it read as a physical reel rather
than five dropdowns. They are non-interactive and `aria-hidden`.

### Keyboard

The whole group is a single focusable element (`tabIndex={0}`) with one `onKeyDown`. Five
slots sharing one tab stop matches how the control behaves — you are turning one dial, not
tabbing between five widgets. Inner buttons take `tabIndex={-1}` so the group owns the only
tab stop.

The reel count is read from `value.length` rather than a constant of the component's own,
so changing `INITIALS_LENGTH` is the whole change.

| Key | Effect |
| --- | --- |
| `↑` | Active slot advances one letter, `Z` wraps to `A` |
| `↓` | Active slot goes back one letter, `A` wraps to `Z` |
| `←` / `→` | Move the active slot, wrapping across all five |
| `A`–`Z` | Set the active slot to that letter, then advance the slot (stops at the last) |

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
 #?    ANJOE    Imajello
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

At the existing 480px breakpoint the reel stays five-across — the boxes shrink to 38px wide
with a 5px gap (210px inside a ~266px panel at 320px) rather than wrapping, because a
wrapped reel stops reading as one name. The optional fields collapse to one per row, as
they already do.

## Part 4 — No stored identity

The form starts from scratch every time it opens: the reel at `AAAAA`, and first name, last
name and company blank. That is how a cabinet behaves — it resets for the next player
rather than remembering who was standing there last — and it matters more here than on a
normal form, because one browser is often several people taking turns at the same keyboard.

That makes the old `localStorage` identity cache a write nobody reads, so `IDENTITY_KEY`,
`loadIdentity` and `saveIdentity` are removed from `api/leaderboard.ts` outright rather than
left as dead weight. What replaces them:

```ts
export const INITIALS_LENGTH = 5;
export const INITIALS_PATTERN = new RegExp(`^[A-Z]{${INITIALS_LENGTH}}$`);

export const EMPTY_IDENTITY: Identity = {
  displayName: 'A'.repeat(INITIALS_LENGTH), firstName: '', lastName: '', company: '',
};
```

The dialog's on-open effect sets `EMPTY_IDENTITY` where it previously called
`loadIdentity()`, and the submit handler no longer calls `saveIdentity`. With nothing ever
loaded from storage, there is no untrusted value to coerce, so no normaliser is needed.

## Part 5 — Server validation

`server/src/leaderboard.ts` currently accepts any cleaned string of 2–20 characters. Since
the column is now sized and styled for five glyphs, tighten it:

```ts
const displayName = cleanString(body.displayName, 20).toUpperCase();
if (!/^[A-Z]{5}$/.test(displayName)) {
  res.status(400).json({ error: 'display name must be five letters A-Z' });
  return;
}
```

The count is written out rather than shared with the client's `INITIALS_LENGTH` — the two
workspaces don't import from each other — so both sides carry a comment saying they have to
change together.

The 20-character cap stays on the `cleanString` call rather than dropping to 5, so an
over-long name is rejected outright instead of being silently truncated and quietly accepted
as something the player never typed. `toUpperCase()` runs before the test, so a lowercase
`anjoe` is stored as `ANJOE` rather than rejected.

Rows already in `leaderboard.json` are not touched or re-validated; they keep rendering,
and the table's `word-break: break-word` already handles a longer legacy name. Only new
submissions are held to the rule.

## Part 6 — Strings

Everything user-visible goes in `content.json` under `ui.leaderboard.form`, matching how the
rest of the dialog already works. Added or changed:

| Key | Value |
| --- | --- |
| `displayName` | `ARCADE NAME` (was `DISPLAY NAME`) — five letters is a name, not initials |
| `initialsHint` | `↑↓ LETTER · ←→ MOVE · OR TYPE` |
| `previewHeading` | `ON THE BOARD` |
| `previewRank` | `#?` |
| `nameRequired` | `Enter five letters.` |
| `initialsAriaLabel` | `Your five-letter arcade name` |
| `slotAriaLabel` | `Letter {n} of {of}` — both tokens filled from the reel count |
| `letterUpAriaLabel` | `Next letter` |
| `letterDownAriaLabel` | `Previous letter` |

`displayNamePlaceholder` is removed — a reel has no placeholder.

## Error handling

The reel cannot produce an invalid value, so the client-side `nameRequired` check is
unreachable in practice. It stays in `onSubmit` as an `INITIALS_PATTERN` guard anyway —
cheap insurance against the value ever being set from somewhere other than the reel, and it
fails at the form rather than as a server round-trip.

Submit failures, rate-limit responses, and load errors keep their existing handling — the
server's message is shown verbatim, which now includes the new five-letter rejection.

While `submitting` is true the reel takes `disabled`: keys are ignored and the chevrons are
disabled, so the value can't drift out from under an in-flight request.

## Testing

The repo has no test runner — `client` builds with `tsc -b` and lints with `oxlint`.
Verification is therefore:

1. `npm run build` — type-checks client and server.
2. `npm run lint --workspace client` — clean.
3. Manual pass in the browser: die in the climb, confirm the reel is focused and reads
   `AAAAA` with the optional fields blank, scroll each slot with `↑↓`, move with `←→`
   including the wrap, type five letters and watch the slot advance, confirm the page never
   scrolls, confirm the preview row tracks both the reel and the company field, submit, then
   reopen the board and confirm it is back to `AAAAA` rather than the name just used.
4. Manual touch pass at 480px and 320px: chevrons tap correctly and the reel stays
   five-across without overflowing the panel.
5. `curl` POSTs against a locally built server: a 3-letter, a 9-letter and a digit-bearing
   name all 400; a lowercase 5-letter name 200s and is stored uppercased.

## Out of scope

- Migrating existing long names in `leaderboard.json`.
- A profanity filter on five-letter combinations. Five letters spell considerably more than
  three, so this is worth revisiting; it is a separate decision from the input control.
- Remembering the player's company between runs. Deliberately dropped — see Part 4.
- Changing the board table's columns, ranking, or the barrel/level systems.
