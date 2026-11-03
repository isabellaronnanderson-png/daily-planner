import { localDateKey } from './officeDays';

export function isChoreOverdue(chore) {
  const totalGoalMs = chore.freqVal * (chore.freqUnit === 'weeks' ? 7 : chore.freqUnit === 'months' ? 30 : 1) * 24 * 60 * 60 * 1000;
  return Date.now() - chore.lastDone >= totalGoalMs;
}
export function choreDaysOverdue(chore) {
  const totalGoalMs = chore.freqVal * (chore.freqUnit === 'weeks' ? 7 : chore.freqUnit === 'months' ? 30 : 1) * 24 * 60 * 60 * 1000;
  const passed = Date.now() - chore.lastDone;
  return Math.floor((passed - totalGoalMs) / (24 * 60 * 60 * 1000));
}

// Overdue chores and tasks with a deadline that nobody has dealt with yet.
// Anything already in Today or planned onto a day of the week counts as dealt
// with, so choosing (Focus, or plan it for a day) is what clears this list.
export function needsAttention({ chores, todos, isHolidayMode }) {
  const todayKey = localDateKey(new Date().toISOString());
  const isSnoozed = (x) => !!x.snoozeUntil && x.snoozeUntil > todayKey;
  const handled = (t) => !!(t.isFocus || t.weekFocus);
  const overdueChores = chores.filter(
    (c) =>
      isChoreOverdue(c) &&
      !(isHolidayMode && c.skipOnHoliday) &&
      !isSnoozed(c) &&
      !todos.some((t) => t.choreId === c.id && !t.completed && handled(t))
  );
  const urgentTodos = todos
    .filter((t) => !t.completed && t.name.trim() && t.dueDate && !isSnoozed(t) && !handled(t))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return { overdueChores, urgentTodos };
}
