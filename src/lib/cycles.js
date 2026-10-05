export const DAY_MS = 24 * 60 * 60 * 1000;

// weekKeyFor returns a stable key (a timestamp) that only changes when the
// configured reset weekday (0=Sun..6=Sat) is crossed, so "week" can be
// anchored to whichever day the person prefers, not just Monday.
export function weekKeyFor(dateIso, resetWeekday) {
  const d = new Date(dateIso);
  const diff = (d.getDay() - resetWeekday + 7) % 7;
  const anchor = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return anchor.getTime();
}

// monthIndexFor returns an absolute month index (year*12+month) for the
// most recent occurrence of the configured reset day-of-month (1-28), so
// gaps of N months can be measured by simple subtraction.
export function monthIndexFor(dateIso, resetDay) {
  const d = new Date(dateIso);
  let year = d.getFullYear();
  let month = d.getMonth();
  if (d.getDate() < resetDay) {
    month -= 1;
    if (month < 0) { month = 11; year -= 1; }
  }
  return year * 12 + month;
}

// Whole days from `earlier` to `later` (both timestamps); rounds so DST
// shifts of an hour don't throw the count off.
export function daysBetween(later, earlier) {
  return Math.round((later - earlier) / DAY_MS);
}
