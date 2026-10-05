// "When will this come back?" text for a habit that's been ticked off.
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const withDay = (d) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const noDay = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function nextResetText(habit, weeklyHabits, currentDateIso, now = new Date()) {
  const base = startOfDay(new Date(currentDateIso));
  const today = startOfDay(now);

  // Day-specific habit: walk forward to its next scheduled occurrence,
  // honouring "every Nth" (the instance existing today means today counted).
  if (habit.fromWeekly) {
    const w = (weeklyHabits || []).find((x) => x.id === habit.weeklyHabitId);
    if (!w || !w.days || w.days.length === 0) return 'Back on its next scheduled day';
    const every = w.everyNth || 1;
    let occurrences = w.occurrenceCount || 0;
    for (let i = 1; i <= 7 * every + 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      if (w.days.includes(WEEKDAY_KEYS[d.getDay()])) {
        occurrences += 1;
        if (occurrences % every === 0) return `Back ${withDay(d)}`;
      }
    }
    return 'Back on its next scheduled day';
  }

  // Weekly goal: resets N weeks after its current cycle began.
  if (habit.cadence === 'week') {
    const every = habit.resetEvery || 1;
    const resetDay = habit.resetDay ?? 1;
    let next;
    if (habit.cycleKey != null) {
      const k = new Date(habit.cycleKey);
      next = new Date(k.getFullYear(), k.getMonth(), k.getDate() + 7 * every);
    } else {
      const diff = ((resetDay - base.getDay() + 7) % 7) || 7;
      next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
    }
    return next <= today ? 'Resets on your next new day' : `Resets ${withDay(next)}`;
  }

  // Monthly goal: resets N months after its current cycle began.
  if (habit.cadence === 'month') {
    const every = habit.resetEvery || 1;
    const resetDay = habit.resetDay ?? 1;
    let next;
    if (habit.cycleKey != null) {
      const idx = habit.cycleKey + every;
      next = new Date(Math.floor(idx / 12), idx % 12, resetDay);
    } else {
      next = new Date(base.getFullYear(), base.getMonth(), resetDay);
      if (next <= base) next = new Date(base.getFullYear(), base.getMonth() + 1, resetDay);
    }
    return next <= today ? 'Resets on your next new day' : `Resets ${noDay(next)}`;
  }

  return 'Back tomorrow';
}
