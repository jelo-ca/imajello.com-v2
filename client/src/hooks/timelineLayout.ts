import type { TimelineBar } from '../content';
import { ui } from '../content';

export interface TimelineLabel {
  top: number;
  text: string;
  now?: boolean;
}

export interface LaidOutBar {
  tag?: string;
  title: string;
  titleSize: number;
  org?: string;
  top: number;
  left: number;
  width: number;
  height: number;
  padding: string;
  variant: TimelineBar['variant'];
}

export interface TimelineLayout {
  trackHeight: number;
  labels: TimelineLabel[];
  bars: LaidOutBar[];
}

/** Inclusive end: YYYY-MM-DD is that day; YYYY-MM is the last day of the month. */
function parseDateEnd(raw: string): Date {
  const parts = raw.split('-').map(Number);
  if (parts.length >= 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(parts[0], parts[1], 0);
}

/** Inclusive start: YYYY-MM-DD is that day; YYYY-MM is the first of the month. */
function parseDateStart(raw: string): Date {
  const parts = raw.split('-').map(Number);
  if (parts.length >= 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(parts[0], parts[1] - 1, 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && b0 < a1;
}

/**
 * Keep authored `left` when possible; if two bars would collide vertically in the
 * same horizontal band, shift the later one right into the next free column.
 */
function packColumns(bars: LaidOutBar[], columnGap: number): LaidOutBar[] {
  const order = bars
    .map((bar, index) => ({ bar, index }))
    .sort((a, b) => a.bar.top - b.bar.top || a.bar.left - b.bar.left || a.index - b.index);

  const placed: LaidOutBar[] = new Array(bars.length);

  for (const { bar, index } of order) {
    const conflicts = (left: number) =>
      placed.some(
        p =>
          p != null &&
          rangesOverlap(left, left + bar.width, p.left, p.left + p.width) &&
          rangesOverlap(bar.top, bar.top + bar.height, p.top, p.top + p.height),
      );

    let left = bar.left;
    if (conflicts(left)) {
      const starts = new Set<number>([bar.left]);
      for (const p of placed) {
        if (!p) continue;
        starts.add(p.left);
        starts.add(p.left + p.width + columnGap);
      }
      const sorted = [...starts].sort((a, b) => a - b);
      left = sorted.find(s => !conflicts(s)) ?? left;
      while (conflicts(left)) left += columnGap;
    }

    placed[index] = { ...bar, left };
  }

  return placed;
}

/**
 * Map authored start/end dates onto the vertical track. Recent time is at the top;
 * `now` drives the NOW line and the open end of ongoing bars.
 */
export function layoutTimeline(bars: TimelineBar[], now = new Date()): TimelineLayout {
  const trackHeight = ui.timeline.trackHeight;
  const futurePadMonths = ui.timeline.futurePadMonths;
  const minBarHeight = ui.timeline.minBarHeight;
  const columnGap = ui.timeline.columnGap;

  const starts = bars.map(b => parseDateStart(b.start).getTime());
  const domainStart = Math.min(...starts);
  const domainEnd = addMonths(now, futurePadMonths).getTime();
  const span = Math.max(1, domainEnd - domainStart);

  const y = (ms: number) => ((domainEnd - ms) / span) * trackHeight;

  const labels: TimelineLabel[] = [];
  const startYear = new Date(domainStart).getFullYear();
  const endYear = new Date(domainEnd).getFullYear();
  for (let year = startYear; year <= endYear + 1; year++) {
    const jan = new Date(year, 0, 1).getTime();
    if (jan < domainStart || jan > domainEnd) continue;
    labels.push({ top: y(jan), text: String(year) });
  }
  labels.push({ top: y(now.getTime()), text: ui.timeline.nowLabel, now: true });
  labels.sort((a, b) => a.top - b.top);

  const nowMs = now.getTime();
  const laidOut: LaidOutBar[] = bars.map(bar => {
    const startMs = parseDateStart(bar.start).getTime();
    // Ongoing: run through now. If start is still in the future, park a short
    // marker from start into the future pad — never invert end below start.
    let endMs = bar.end == null ? Math.max(nowMs, startMs) : parseDateEnd(bar.end).getTime();
    if (endMs < startMs) {
      endMs = addMonths(new Date(startMs), 1).getTime();
    }
    if (bar.end == null && startMs > nowMs) {
      endMs = Math.min(domainEnd, addMonths(new Date(startMs), 1).getTime());
    }
    const endClamped = Math.min(Math.max(endMs, domainStart), domainEnd);
    const startClamped = Math.min(Math.max(startMs, domainStart), domainEnd);
    // Recent at top: end sits above start.
    let top = y(Math.max(endClamped, startClamped));
    const bottom = y(Math.min(endClamped, startClamped));
    let height = bottom - top;
    // Short bars grow upward (into more recent time) so they don't spill over
    // earlier roles — e.g. UCI Sep must not cover Unimode's Aug end.
    if (height < minBarHeight) {
      top = Math.max(0, bottom - minBarHeight);
      height = bottom - top;
    }
    return {
      tag: bar.tag,
      title: bar.title,
      titleSize: bar.titleSize,
      org: bar.org,
      top,
      left: bar.left,
      width: bar.width,
      height,
      padding: bar.padding,
      variant: bar.variant,
    };
  });

  return { trackHeight, labels, bars: packColumns(laidOut, columnGap) };
}
