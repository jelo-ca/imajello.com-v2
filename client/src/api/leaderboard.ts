// Client side of the arcade leaderboard: the wire types, the two calls, and the small
// helpers the dialog needs. Kept out of the component so the dialog stays presentation
// plus local state, and so the shape of an entry is stated once.

// A row as the server hands it out. First and last name are deliberately absent: they are
// collected on submission and kept server-side, and the board endpoint never returns them
// to anyone. Their absence here is the client-side half of that guarantee — nothing in the
// UI can render a real name, because no real name ever arrives.
export interface LeaderboardEntry {
  id: string;
  displayName: string;
  company: string;
  level: number;
  timeMs: number;
  createdAt: string;
}

export interface ScoreSubmission {
  displayName: string;
  firstName: string;
  lastName: string;
  company: string;
  level: number;
  timeMs: number;
}

export interface SubmitResult {
  entry: LeaderboardEntry;
  // null when the run didn't make the stored board at all.
  rank: number | null;
  entries: LeaderboardEntry[];
}

const ENDPOINT = '/api/leaderboard';

// The server answers errors as { error }, so surface that text when it's there — it's
// written to be shown (which field was wrong, or that the rate limit was hit) and is far
// more use than a bare status code.
async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json() as { error?: string };
    return data.error ?? fallback;
  } catch {
    return fallback;
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await fetch(ENDPOINT);
  if (!response.ok) throw new Error(await readError(response, `board unavailable (${response.status})`));
  const data = await response.json() as { entries?: LeaderboardEntry[] };
  return data.entries ?? [];
}

export async function submitScore(submission: ScoreSubmission): Promise<SubmitResult> {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(submission),
  });
  if (!response.ok) throw new Error(await readError(response, `could not save score (${response.status})`));
  return await response.json() as SubmitResult;
}

// M:SS.d — long enough runs stay readable and the tenth is what separates two players who
// reached the same level, which is exactly the tiebreak the board ranks on.
export function formatRunTime(ms: number): string {
  const totalSeconds = Math.max(0, ms) / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((totalSeconds * 10) % 10);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

// What the claim form collects. Nothing here is persisted: every run starts the form from
// scratch, the way a cabinet resets to AAA for the next player rather than remembering who
// was standing there last.
export interface Identity {
  displayName: string;
  firstName: string;
  lastName: string;
  company: string;
}

// How many letters the name reel holds. The server enforces the same count independently
// (it can't import this), so the two have to be changed together.
export const INITIALS_LENGTH = 5;

export const INITIALS_PATTERN = new RegExp(`^[A-Z]{${INITIALS_LENGTH}}$`);

// All A's rather than an empty string: the reel is always exactly INITIALS_LENGTH A-Z
// letters, so there is no blank state for it to start from.
export const EMPTY_IDENTITY: Identity = {
  displayName: 'A'.repeat(INITIALS_LENGTH), firstName: '', lastName: '', company: '',
};
