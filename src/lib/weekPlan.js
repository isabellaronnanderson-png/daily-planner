import { weekRange } from './todayTabs';
import { localDateKey } from './officeDays';

// The week plan: seven day sections, Monday to Sunday.
export const PLAN_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const JS_DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const dayKeyOfDate = (date) => JS_DAY_KEYS[date.getDay()];
export const isWeekendKey = (key) => key === 'sat' || key === 'sun';

// The next day in the plan, or null after Sunday.
export function nextDayKey(key) {
  const i = PLAN_DAY_KEYS.indexOf(key);
  return i >= 0 && i < PLAN_DAY_KEYS.length - 1 ? PLAN_DAY_KEYS[i + 1] : null;
}

// Monday–Sunday of the week containing weekRefIso, with real dates.
export function planDays(weekRefIso) {
  const { start } = weekRange(weekRefIso);
  return PLAN_DAY_KEYS.map((key, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return {
      key,
      date,
      dateKey: localDateKey(date.toISOString()),
      label: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
      weekday: date.toLocaleDateString(undefined, { weekday: 'long' }),
    };
  });
}
