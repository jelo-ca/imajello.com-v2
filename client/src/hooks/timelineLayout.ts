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

/**
 * Map authored start/end dates onto the vertical track. Recent time is at the top;
 * `now` drives the NOW line and the open end of ongoing bars.
 */
export function layoutTimeline(bars: TimelineBar[], now = new Date()): TimelineLayout {
  const trackHeight = ui.timeline.trackHeight;
  const futurePadMonths = ui.timeline.futurePadMonths;
  const minBarHeight = ui.timeline.minBarHeight;

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

  const laidOut: LaidOutBar[] = bars.map(bar => {
    const startMs = parseDateStart(bar.start).getTime();
    const endMs = bar.end == null ? now.getTime() : parseDateEnd(bar.end).getTime();
    const endClamped = Math.min(Math.max(endMs, domainStart), domainEnd);
    const startClamped = Math.min(Math.max(startMs, domainStart), domainEnd);
    // Recent at top: end sits above start.
    const top = y(endClamped);
    const bottom = y(startClamped);
    const height = Math.max(minBarHeight, bottom - top);
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

  return { trackHeight, labels, bars: laidOut };
}
