// Tabs on the Today view (and in Manage). "Today" and "This week" each have
// their own to-do list; every other tab is just a place for habits.
//   period: 'day'  -> its habits are reset by "New day"
//           'week' -> its habits are reset by "Begin a new week" (Mon–Sun)
//   todos:  which to-do list the tab shows ('today' | 'week' | null)
export const DEFAULT_TODAY_TABS = [
  { id: 'today', name: 'Today', period: 'day', todos: 'today' },
  { id: 'week', name: 'This week', period: 'week', todos: 'week' },
  { id: 'other', name: 'Other', period: 'day', todos: null },
];

// These two own a to-do list, so they can be renamed but not deleted.
export const PROTECTED_TAB_IDS = ['today', 'week'];

export function periodOfTab(tabs, id) {
  const t = tabs.find((x) => x.id === id);
  return t ? t.period : 'day';
}

// The Monday–Sunday week containing a date.
export function weekRange(iso) {
  const d = new Date(iso);
  const sinceMonday = (d.getDay() + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - sinceMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start, end };
}

export function formatWeekRange(iso) {
  const { start, end } = weekRange(iso);
  const f = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${f(start)} – ${f(end)}`;
}
