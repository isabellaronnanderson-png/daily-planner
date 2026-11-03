import { weekRange } from './todayTabs';
import { localDateKey } from './officeDays';

// The week plan: five weekdays plus one "Weekend" (Saturday and Sunday together).
export const PLAN_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'weekend'];
const JS_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Plans made before Saturday and Sunday were merged used 'sat' / 'sun'.
export const normalizeDayKey = (key) => (key === 'sat' || key === 'sun' ? 'weekend' : key);
export const dayKeyOfDate = (date) => normalizeDayKey(JS_DAY_KEYS[date.getDay()]);
export const isWeekendKey = (key) => normalizeDayKey(key) === 'weekend';

// The next day in the plan, or null after the weekend.
export function nextDayKey(key) {
  const i = PLAN_DAY_KEYS.indexOf(normalizeDayKey(key));
  return i >= 0 && i < PLAN_DAY_KEYS.length - 1 ? PLAN_DAY_KEYS[i + 1] : null;
}

const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);

// Monday–Sunday of the week containing weekRefIso, as six plan days. Each has
// the real dates it covers (the weekend covers two): dateKey is the first,
// lastDateKey the last, dateKeys all of them.
export function planDays(weekRefIso) {
  const { start } = weekRange(weekRefIso);
  const at = (i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
  const keyOf = (d) => localDateKey(d.toISOString());
  const days = [0, 1, 2, 3, 4].map((i) => {
    const date = at(i);
    return {
      key: PLAN_DAY_KEYS[i],
      date,
      dateKey: keyOf(date),
      dateKeys: [keyOf(date)],
      lastDateKey: keyOf(date),
      label: fmt(date, { weekday: 'short', day: 'numeric', month: 'short' }),
      addLabel: `Add for ${fmt(date, { weekday: 'long' })}`,
    };
  });
  const sat = at(5);
  const sun = at(6);
  const range =
    sat.getMonth() === sun.getMonth()
      ? `${sat.getDate()}–${sun.getDate()} ${fmt(sun, { month: 'short' })}`
      : `${sat.getDate()} ${fmt(sat, { month: 'short' })} – ${sun.getDate()} ${fmt(sun, { month: 'short' })}`;
  days.push({
    key: 'weekend',
    date: sat,
    dateKey: keyOf(sat),
    dateKeys: [keyOf(sat), keyOf(sun)],
    lastDateKey: keyOf(sun),
    label: `Weekend ${range}`,
    addLabel: 'Add for the weekend',
  });
  return days;
}
