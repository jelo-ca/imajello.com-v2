// Client side of the arcade leaderboard: the wire types, the two calls, and the small
// helpers the dialog needs. Kept out of the component so the dialog stays presentation
// plus local state, and so the shape of an entry is stated once.

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
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

// The submitter's own details, so a second run doesn't make them type their name again.
// Names only — scores live on the server, and there is nothing here worth reconciling if
// the two ever disagree.
const IDENTITY_KEY = 'imajello-leaderboard-identity';

export interface Identity {
  displayName: string;
  firstName: string;
  lastName: string;
  company: string;
}

// The reel can only represent three A-Z letters, so anything else has to be coerced before
// it reaches the component — including the longer nickname a returning player may already
// have cached from the previous free-text form.
export function normalizeInitials(value: string): string {
  const letters = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return letters.padEnd(3, 'A');
}

export const EMPTY_IDENTITY: Identity = {
  displayName: 'AAA', firstName: '', lastName: '', company: '',
};

export function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return EMPTY_IDENTITY;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    return {
      displayName: normalizeInitials(parsed.displayName ?? ''),
      firstName: parsed.firstName ?? '',
      lastName: parsed.lastName ?? '',
      company: parsed.company ?? '',
    };
  } catch {
    // Private browsing, or a stored value that isn't JSON any more. Either way an empty
    // form is a fine outcome — this is a convenience, not state anything depends on.
    return EMPTY_IDENTITY;
  }
}

export function saveIdentity(identity: Identity): void {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch { /* ignore */ }
}
