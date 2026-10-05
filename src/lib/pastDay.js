import { weekKeyFor, monthIndexFor, daysBetween } from './cycles';

const isDailyHabit = (h) => h.cadence !== 'week' && h.cadence !== 'month' && !h.fromWeekly;

// Noon local time on a "YYYY-MM-DD" key, as an ISO string (noon dodges
// timezone/DST edge cases).
export function noonIso(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

// ---- Daily habits & day-specific habits ------------------------------------
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Habits made in the app carry their creation time in their id, so we can avoid
// asking about a habit on a day before it existed.
function createdMs(id) {
  const n = typeof id === 'number' ? id : Number(String(id).replace(/^h_/, ''));
  return Number.isFinite(n) && n > 1e12 ? n : null;
}
function existedOn(id, dateKey) {
  const created = createdMs(id);
  if (created == null) return true;
  const [y, m, d] = dateKey.split('-').map(Number);
  return created <= new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

// Day-specific habits that were due on a date, worked out from the calendar
// (a habit set for Sat + Sun was due on Saturdays and Sundays). With "every Nth"
// we can't be certain which occurrence it was, so those rows are marked
// `uncertain` and only saved if you actually tick them.
function derivedDaySpecificRows(weeklyHabits, dateKey, haveNames) {
  const weekday = WEEKDAY_KEYS[new Date(noonIso(dateKey)).getDay()];
  return (weeklyHabits || [])
    .filter((w) => w.days && w.days.includes(weekday) && existedOn(w.id, dateKey) && !haveNames.has(w.name))
    .map((w) => ({
      name: w.name,
      count: 0,
      target: 1,
      completed: false,
      daySpecific: true,
      derived: true,
      uncertain: (w.everyNth || 1) > 1,
      everyNth: w.everyNth || 1,
    }));
}

// A day that was begun and closed has a history entry; a skipped day doesn't,
// so we offer the daily habits that existed then (unticked), plus whichever
// day-specific habits fall on that weekday. Entries closed by recent versions
// are marked `daySpecificTracked` and are the full record of that day.
export function dailyRowsFor(habitHistory, habits, dateKey, weeklyHabits = []) {
  const dsNames = new Set((weeklyHabits || []).map((w) => w.name));
  const entry = habitHistory.find((e) => e.date === dateKey);
  if (entry) {
    const rows = (entry.snapshot || []).map((it) => ({
      name: it.name,
      count: it.count || 0,
      target: it.target || 1,
      completed: !!it.completed,
      daySpecific: dsNames.has(it.name),
    }));
    if (entry.daySpecificTracked) return rows;
    return [...rows, ...derivedDaySpecificRows(weeklyHabits, dateKey, new Set(rows.map((r) => r.name)))];
  }
  const base = habits
    .filter(isDailyHabit)
    .filter((h) => existedOn(h.id, dateKey))
    .map((h) => ({ name: h.name, count: 0, target: h.targetCount || 1, completed: false, daySpecific: false }));
  return [...base, ...derivedDaySpecificRows(weeklyHabits, dateKey, new Set(base.map((r) => r.name)))];
}

export function setDailyCount(prevHistory, habits, dateKey, name, newCount, weeklyHabits = []) {
  const existing = prevHistory.find((e) => e.date === dateKey);
  const rows = dailyRowsFor(prevHistory, habits, dateKey, weeklyHabits).map((r) => {
    if (r.name !== name) return r;
    const count = Math.max(0, Math.min(r.target, newCount));
    return { ...r, count, completed: count >= r.target };
  });
  // Don't record an uncertain row nobody touched — we can't be sure it was due.
  const snapshot = rows
    .filter((r) => !(r.derived && r.uncertain && r.count === 0))
    .map((r) => ({ name: r.name, completed: r.completed, count: r.count, target: r.target }));
  const entry = { date: dateKey, snapshot };
  if (existing && existing.daySpecificTracked) entry.daySpecificTracked = true;
  const others = prevHistory.filter((e) => e.date !== dateKey);
  return [entry, ...others].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
}

// ---- Weekly / monthly goals ------------------------------------------------
// Works out which cycle a date falls in for one goal habit:
//   { where: 'live' }   — the date is inside the cycle that's open right now
//   { where: 'future' } — it's in a later cycle the app hasn't begun yet
//   { where: 'closed' } — it's inside a cycle that has already been closed and
//                         recorded in history (editable)
//   { where: 'none' }   — no record we can safely edit
// `history` is the matching weeklyGoalHistory / monthlyGoalHistory (newest first).
export function locateGoal(habit, dateKey, history) {
  const isWeek = habit.cadence === 'week';
  const iso = noonIso(dateKey);
  const resetDay = habit.resetDay ?? 1;
  const every = habit.resetEvery || 1;
  const anchor = isWeek ? weekKeyFor(iso, resetDay) : monthIndexFor(iso, resetDay);
  // distance between two cycle anchors, in cycle units (weeks or months)
  const units = (later, earlier) => (isWeek ? Math.round(daysBetween(later, earlier) / 7) : later - earlier);

  if (habit.cycleKey == null) return { where: 'live' };
  if (anchor >= habit.cycleKey) {
    // A date in a cycle that hasn't started in the app yet can't be credited to
    // the open one — the new day needs to be begun first.
    return units(anchor, habit.cycleKey) >= every ? { where: 'future' } : { where: 'live' };
  }

  // Exact match: the snapshot recorded which cycle it closed.
  for (const entry of history) {
    for (const it of entry.snapshot || []) {
      if (it.name !== habit.name || it.cycleStart == null) continue;
      const u = units(anchor, it.cycleStart);
      if (u >= 0 && u < every) return { where: 'closed', entryDate: entry.date, cycleStart: it.cycleStart };
    }
  }

  // Older snapshots didn't record their cycle. For the most recent one only,
  // assume it's the cycle immediately before the open one.
  for (const entry of history) {
    const it = (entry.snapshot || []).find((x) => x.name === habit.name);
    if (!it) continue;
    if (it.cycleStart == null) {
      const back = units(habit.cycleKey, anchor);
      if (back > 0 && back <= every) return { where: 'closed', entryDate: entry.date, cycleStart: null };
    }
    break; // only the newest matching entry is eligible for this guess
  }

  return { where: 'none' };
}

function findClosedItem(history, loc, name) {
  for (const entry of history) {
    if (entry.date !== loc.entryDate) continue;
    for (const it of entry.snapshot || []) {
      if (it.name === name && (it.cycleStart ?? null) === (loc.cycleStart ?? null)) return it;
    }
  }
  return null;
}

export function goalState(habit, loc, history) {
  if (loc.where === 'live') {
    return { count: habit.count || 0, target: habit.targetCount || 1 };
  }
  const it = findClosedItem(history, loc, habit.name);
  return { count: it ? it.count || 0 : 0, target: it ? it.target || 1 : habit.targetCount || 1 };
}

export function setClosedGoalCount(prevHistory, loc, name, newCount) {
  let done = false;
  return prevHistory.map((entry) => {
    if (done || entry.date !== loc.entryDate) return entry;
    return {
      ...entry,
      snapshot: (entry.snapshot || []).map((it) => {
        if (done || it.name !== name || (it.cycleStart ?? null) !== (loc.cycleStart ?? null)) return it;
        done = true;
        const target = it.target || 1;
        const count = Math.max(0, Math.min(target, newCount));
        return { ...it, count, completed: count >= target };
      }),
    };
  });
}
