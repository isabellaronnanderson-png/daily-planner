import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCloudSync } from './hooks/useCloudSync';
import Header from './components/Header';
import TodayView from './views/TodayView';
import ScheduleView from './views/ScheduleView';
import TodoView from './views/TodoView';
import ChoresView from './views/ChoresView';
import InsightsView from './views/InsightsView';
import './App.css';

const DEFAULT_TAB_ORDER = ['habits', 'todo', 'chores', 'schedule', 'insights'];

const DEFAULT_WEEKLY_HABITS = [];

const DEFAULT_HABITS = [
  { id: 'h1', name: 'Walk in the garden', completed: false, count: 0, targetCount: 1, groupId: null },
  { id: 'h2', name: 'Sip tea', completed: false, count: 0, targetCount: 1, groupId: null },
  { id: 'h3', name: 'Read a chapter', completed: false, count: 0, targetCount: 1, groupId: null },
];

const DEFAULT_TODOS = [
  { id: 't1', name: 'Submit project proposal', dueDate: '', isFocus: true, completed: false, completedAt: null, skipOnHoliday: false, weekendOnly: false, isWork: true },
  { id: 't2', name: 'Send follow-up email', dueDate: '', isFocus: false, completed: false, completedAt: null, skipOnHoliday: false, weekendOnly: false, isWork: true },
  { id: 't3', name: 'Pick up dry-cleaning', dueDate: '', isFocus: false, completed: false, completedAt: null, skipOnHoliday: false, weekendOnly: false, isWork: false },
];

const DEFAULT_CHORES = [
  { id: 1, name: 'Vacuum room', group: 'house', freqVal: 3, freqUnit: 'days', lastDone: Date.now() - 1.5 * 24 * 60 * 60 * 1000 },
  { id: 2, name: 'Mop kitchen floor', group: 'house', freqVal: 1, freqUnit: 'weeks', lastDone: Date.now() - 5 * 24 * 60 * 60 * 1000 },
  { id: 3, name: 'Cut hair', group: 'beauty', freqVal: 6, freqUnit: 'months', lastDone: Date.now() - 60 * 24 * 60 * 60 * 1000 },
  { id: 4, name: 'Replace toothbrush head', group: 'health', freqVal: 3, freqUnit: 'months', lastDone: Date.now() - 89 * 24 * 60 * 60 * 1000 },
];

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEK_EPOCH = new Date('2024-01-01T00:00:00Z').getTime(); // a Monday
function weekKeyFor(dateIso) {
  const t = new Date(dateIso).getTime();
  return Math.floor((t - WEEK_EPOCH) / (7 * 24 * 60 * 60 * 1000));
}
function monthKeyFor(dateIso) {
  const d = new Date(dateIso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function reorderById(list, draggedId, targetId) {
  const arr = [...list];
  const fromIdx = arr.findIndex((x) => x.id === draggedId);
  const toIdx = arr.findIndex((x) => x.id === targetId);
  if (fromIdx === -1 || toIdx === -1) return list;
  const [moved] = arr.splice(fromIdx, 1);
  arr.splice(toIdx, 0, moved);
  return arr;
}

export default function PlannerApp({ user, signOut }) {
  const [activeTab, setActiveTab] = useState('habits');
  const [tabOrder, setTabOrder] = useLocalStorage('planner_tab_order', DEFAULT_TAB_ORDER);
  const [coverImage, setCoverImage] = useLocalStorage('planner_cover_image', null);
  const [coverPosition, setCoverPosition] = useLocalStorage('planner_cover_position', { x: 50, y: 50 });
  const [currentDate, setCurrentDate] = useLocalStorage('planner_current_date', new Date().toISOString());
  const [weekKey, setWeekKey] = useLocalStorage('planner_week_key', weekKeyFor(new Date().toISOString()));
  const [monthKey, setMonthKey] = useLocalStorage('planner_month_key', monthKeyFor(new Date().toISOString()));
  const [title, setTitle] = useLocalStorage('planner_title', "isabella's planner");

  const [habits, setHabits] = useLocalStorage('planner_habits', DEFAULT_HABITS);
  const [habitHistory, setHabitHistory] = useLocalStorage('planner_habit_history', []);
  const [weeklyGoalHistory, setWeeklyGoalHistory] = useLocalStorage('planner_weekly_goal_history', []);
  const [monthlyGoalHistory, setMonthlyGoalHistory] = useLocalStorage('planner_monthly_goal_history', []);
  const [weeklyHabits, setWeeklyHabits] = useLocalStorage('planner_weekly_habits', DEFAULT_WEEKLY_HABITS);
  const [groups, setGroups] = useLocalStorage('planner_habit_groups', []);
  const [todoSectionCollapsed, setTodoSectionCollapsed] = useLocalStorage('planner_todo_section_collapsed', false);

  const [scheduleTasks, setScheduleTasks] = useLocalStorage('planner_schedule', []);

  const [todos, setTodos] = useLocalStorage('planner_todos', DEFAULT_TODOS);
  const [isHolidayMode, setIsHolidayMode] = useLocalStorage('planner_holiday_mode', false);
  const [holidayStartedAt, setHolidayStartedAt] = useLocalStorage('planner_holiday_started_at', null);
  const [scratchpad, setScratchpad] = useLocalStorage('planner_scratchpad', '');
  const [dailyNoteText, setDailyNoteText] = useLocalStorage('planner_daily_note_text', '');
  const [dailyNoteImage, setDailyNoteImage] = useLocalStorage('planner_daily_note_image', null);

  const [chores, setChores] = useLocalStorage('planner_chores', DEFAULT_CHORES);

  const safeTabOrder = [...tabOrder, ...DEFAULT_TAB_ORDER.filter((k) => !tabOrder.includes(k))].filter((k) => k !== 'weekend');

  // Every piece of the app's data, collected into one object — this is what
  // gets synced to Supabase and what a backup file contains.
  const appState = {
    tabOrder, coverImage, coverPosition, currentDate, weekKey, monthKey, title,
    habits, habitHistory, weeklyGoalHistory, monthlyGoalHistory, weeklyHabits, groups,
    todoSectionCollapsed, scheduleTasks, todos, isHolidayMode, holidayStartedAt,
    scratchpad, dailyNoteText, dailyNoteImage, chores,
  };

  // Applies a full state blob (from the cloud or a restored backup file) —
  // falls back to each field's current value if a key is missing, so older
  // or partial backups don't wipe out newer fields.
  function applyFullState(data) {
    if (!data || typeof data !== 'object') return;
    if (data.tabOrder !== undefined) setTabOrder(data.tabOrder);
    if (data.coverImage !== undefined) setCoverImage(data.coverImage);
    if (data.coverPosition !== undefined) setCoverPosition(data.coverPosition);
    if (data.currentDate !== undefined) setCurrentDate(data.currentDate);
    if (data.weekKey !== undefined) setWeekKey(data.weekKey);
    if (data.monthKey !== undefined) setMonthKey(data.monthKey);
    if (data.title !== undefined) setTitle(data.title);
    if (data.habits !== undefined) setHabits(data.habits);
    if (data.habitHistory !== undefined) setHabitHistory(data.habitHistory);
    if (data.weeklyGoalHistory !== undefined) setWeeklyGoalHistory(data.weeklyGoalHistory);
    if (data.monthlyGoalHistory !== undefined) setMonthlyGoalHistory(data.monthlyGoalHistory);
    if (data.weeklyHabits !== undefined) setWeeklyHabits(data.weeklyHabits);
    if (data.groups !== undefined) setGroups(data.groups);
    if (data.todoSectionCollapsed !== undefined) setTodoSectionCollapsed(data.todoSectionCollapsed);
    if (data.scheduleTasks !== undefined) setScheduleTasks(data.scheduleTasks);
    if (data.todos !== undefined) setTodos(data.todos);
    if (data.isHolidayMode !== undefined) setIsHolidayMode(data.isHolidayMode);
    if (data.holidayStartedAt !== undefined) setHolidayStartedAt(data.holidayStartedAt);
    if (data.scratchpad !== undefined) setScratchpad(data.scratchpad);
    if (data.dailyNoteText !== undefined) setDailyNoteText(data.dailyNoteText);
    if (data.dailyNoteImage !== undefined) setDailyNoteImage(data.dailyNoteImage);
    if (data.chores !== undefined) setChores(data.chores);
  }

  const { status: syncStatus } = useCloudSync(user, appState, applyFullState);

  function downloadBackup() {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `isabellas-planner-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function restoreFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!confirm('This replaces everything currently in the app with the contents of this backup. Continue?')) return;
        applyFullState(parsed);
      } catch {
        alert("That file couldn't be read — make sure it's a backup exported from this app.");
      }
    };
    reader.readAsText(file);
  }


  // One-time migration: fold any existing separate weekend tasks into
  // day-specific habits tagged for Saturday + Sunday, then retire the old data.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('planner_weekend');
      const alreadyMigrated = localStorage.getItem('planner_weekend_migrated');
      if (raw && !alreadyMigrated) {
        const oldWeekend = JSON.parse(raw);
        if (Array.isArray(oldWeekend) && oldWeekend.length > 0) {
          setWeeklyHabits((prev) => {
            const existingNames = new Set(prev.map((w) => w.name));
            const additions = oldWeekend
              .filter((w) => w && w.name && !existingNames.has(w.name))
              .map((w, i) => ({ id: Date.now() + i, name: w.name, days: ['sat', 'sun'] }));
            return [...prev, ...additions];
          });
        }
        localStorage.setItem('planner_weekend_migrated', 'true');
      }
      // eslint-disable-next-line no-empty
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep habit history clean: if a name no longer belongs to any current
  // habit or day-specific habit definition, it was deleted — drop it from
  // history too (including any stragglers left over from before this existed).
  useEffect(() => {
    const validNames = new Set([...habits.map((h) => h.name), ...weeklyHabits.map((w) => w.name)]);
    function pruneWith(setter) {
      setter((prev) => {
        let changed = false;
        const next = prev.map((entry) => {
          const filtered = (entry.snapshot || []).filter((item) => validNames.has(item.name));
          if (filtered.length !== (entry.snapshot || []).length) changed = true;
          return { ...entry, snapshot: filtered };
        });
        return changed ? next : prev;
      });
    }
    pruneWith(setHabitHistory);
    pruneWith(setWeeklyGoalHistory);
    pruneWith(setMonthlyGoalHistory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, weeklyHabits]);

  function resetChore(id) {
    setChores(chores.map((c) => (c.id === id ? { ...c, lastDone: Date.now() } : c)));
  }

  function isWeekendOrHoliday() {
    const day = new Date().getDay();
    return day === 0 || day === 6 || isHolidayMode;
  }

  function isChoreOverdueLocal(chore) {
    const totalGoalMs = chore.freqVal * (chore.freqUnit === 'weeks' ? 7 : chore.freqUnit === 'months' ? 30 : 1) * 24 * 60 * 60 * 1000;
    return Date.now() - chore.lastDone >= totalGoalMs;
  }

  // Pulls up to 3 tasks from the bank into focus: overdue chores first (auto
  // creating a bank entry for them if needed), then anything with a due
  // date (soonest first), then everything else. Skips holiday-paused tasks
  // while on holiday, and weekend-only tasks except on an actual weekend.
  // Only tops up to 3 total — never removes anything already carried over
  // or added by hand.
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Pulls up to 3 tasks from the bank into focus. Anything with a deadline
  // goes first (soonest due date wins), then overdue chores, then — on
  // weekdays only — work tasks get priority, then everything else is
  // picked at random so it's not always the same tasks resurfacing. Skips
  // holiday-paused tasks while on holiday, and weekend-only tasks except on
  // an actual weekend. Only tops up to 3 total — never removes anything
  // already carried over or added by hand.
  function autoFillFocus(todosList) {
    let list = [...todosList];

    // Make sure overdue chores have a bank entry so they're eligible to be pulled in.
    chores
      .filter((c) => isChoreOverdueLocal(c) && !(isHolidayMode && c.skipOnHoliday))
      .forEach((chore) => {
        const existing = list.find((t) => t.choreId === chore.id && !t.completed);
        if (!existing) {
          list.push({ id: 't_chore_' + chore.id + '_' + Date.now(), choreId: chore.id, name: chore.name, dueDate: '', isFocus: false, completed: false, completedAt: null, skipOnHoliday: false, weekendOnly: false, isWork: false });
        }
      });

    const weekendOrHoliday = isWeekendOrHoliday();
    const isWeekday = !weekendOrHoliday;

    const bankItems = list.filter(
      (t) => t.name.trim() && !t.isFocus && !t.completed && !(isHolidayMode && t.skipOnHoliday) && !(t.weekendOnly && !weekendOrHoliday)
    );

    const withDeadline = bankItems.filter((t) => t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    const overdueChoreItems = shuffle(bankItems.filter((t) => !t.dueDate && t.choreId));
    const workItems = isWeekday ? shuffle(bankItems.filter((t) => !t.dueDate && !t.choreId && t.isWork)) : [];
    const restItems = shuffle(bankItems.filter((t) => !t.dueDate && !t.choreId && !(isWeekday && t.isWork)));

    const ranked = [...withDeadline, ...overdueChoreItems, ...workItems, ...restItems];

    for (const candidate of ranked) {
      const activeCount = list.filter((t) => t.isFocus && !t.completed).length;
      if (activeCount >= 3) break;
      list = list.map((t) => (t.id === candidate.id ? { ...t, isFocus: true } : t));
    }

    return list;
  }

  function beginNewDay() {
    const closingDateKey = currentDate.split('T')[0];

    const newWeekKey = weekKeyFor(new Date().toISOString());
    const isNewWeek = newWeekKey !== weekKey;
    const newMonthKey = monthKeyFor(new Date().toISOString());
    const isNewMonth = newMonthKey !== monthKey;

    // Daily habits are logged every day. Weekly/monthly goals only get a
    // history entry on the day their cycle actually closes, so consistency
    // reflects "how often the whole week/month got done" rather than
    // punishing every day it wasn't finished yet. Each cadence gets its own
    // history stream so weekly/monthly goals can retain a meaningful number
    // of cycles (12 weeks, 12 months) without bloating daily history.
    const toSnapshotItem = (h) => ({ name: h.name, completed: h.completed, count: h.count || 0, target: h.targetCount || 1 });
    const notPaused = (h) => !(isHolidayMode && h.skipOnHoliday);

    const dailySnapshot = habits.filter((h) => notPaused(h) && h.cadence !== 'week' && h.cadence !== 'month').map(toSnapshotItem);
    setHabitHistory([{ date: closingDateKey, snapshot: dailySnapshot }, ...habitHistory].slice(0, 14));

    if (isNewWeek) {
      const weeklySnapshot = habits.filter((h) => notPaused(h) && h.cadence === 'week').map(toSnapshotItem);
      if (weeklySnapshot.length > 0) {
        setWeeklyGoalHistory([{ date: closingDateKey, snapshot: weeklySnapshot }, ...weeklyGoalHistory].slice(0, 12));
      }
    }
    if (isNewMonth) {
      const monthlySnapshot = habits.filter((h) => notPaused(h) && h.cadence === 'month').map(toSnapshotItem);
      if (monthlySnapshot.length > 0) {
        setMonthlyGoalHistory([{ date: closingDateKey, snapshot: monthlySnapshot }, ...monthlyGoalHistory].slice(0, 12));
      }
    }

    const todaysWeekday = WEEKDAY_KEYS[new Date().getDay()];
    const baseHabits = habits
      .filter((h) => !h.fromWeekly)
      .map((h) => {
        if (h.cadence === 'week') {
          // Carry over untouched until a new week begins.
          return isNewWeek ? { ...h, completed: false, count: 0 } : h;
        }
        if (h.cadence === 'month') {
          // Carry over untouched until a new calendar month begins.
          return isNewMonth ? { ...h, completed: false, count: 0 } : h;
        }
        return { ...h, completed: false, count: 0 };
      });
    const injected = weeklyHabits
      .filter((w) => w.days.includes(todaysWeekday))
      .map((w) => ({ id: 'wh_' + w.id, name: w.name, completed: false, count: 0, targetCount: 1, groupId: w.groupId || null, fromWeekly: true, skipOnHoliday: !!w.skipOnHoliday }));
    setHabits([...baseHabits, ...injected]);
    setCurrentDate(new Date().toISOString());
    if (isNewWeek) setWeekKey(newWeekKey);
    if (isNewMonth) setMonthKey(newMonthKey);

    setScheduleTasks([]);

    let nextTodos = todos.map((t) => (t.isFocus && t.completed ? { ...t, isFocus: false } : t));
    if (isHolidayMode) {
      nextTodos = nextTodos.map((t) => (t.isFocus && t.skipOnHoliday ? { ...t, isFocus: false } : t));
    }

    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    nextTodos = nextTodos.filter((t) => !(t.completed && t.completedAt && Date.now() - t.completedAt >= fourteenDays));

    nextTodos = autoFillFocus(nextTodos);

    setTodos(nextTodos);
  }

  // ---- Habit actions ----
  function addHabit({ name, targetCount = 1, groupId = null, cadence = 'day', skipOnHoliday = false }) {
    setHabits([...habits, { id: 'h_' + Date.now(), name, completed: false, count: 0, targetCount: Math.max(1, targetCount), groupId: groupId || null, cadence, skipOnHoliday }]);
  }

  // Click on the Nth mark: if it's already at that count, step back to just
  // before it (uncheck); otherwise jump forward to fill through it.
  function setHabitCount(id, newCount) {
    setHabits(
      habits.map((h) => {
        if (h.id !== id) return h;
        const target = h.targetCount || 1;
        const clamped = Math.max(0, Math.min(target, newCount));
        return { ...h, count: clamped, completed: clamped >= target };
      })
    );
  }

  function editHabit(id, updates) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const trimmedName = (updates.name || '').trim();
    if (!trimmedName) return;
    const nextTarget = Math.max(1, updates.targetCount || 1);
    setHabits(
      habits.map((h) =>
        h.id === id
          ? { ...h, name: trimmedName, targetCount: nextTarget, count: Math.min(h.count || 0, nextTarget), groupId: updates.groupId || null, cadence: updates.cadence || 'day', skipOnHoliday: !!updates.skipOnHoliday }
          : h
      )
    );
    if (trimmedName !== habit.name) {
      const renameIn = (history) =>
        history.map((entry) => ({
          ...entry,
          snapshot: (entry.snapshot || []).map((item) => (item.name === habit.name ? { ...item, name: trimmedName } : item)),
        }));
      setHabitHistory(renameIn(habitHistory));
      setWeeklyGoalHistory(renameIn(weeklyGoalHistory));
      setMonthlyGoalHistory(renameIn(monthlyGoalHistory));
    }
    if (habit.fromWeekly) {
      const weeklyId = id.replace(/^wh_/, '');
      setWeeklyHabits((prev) => prev.map((w) => (String(w.id) === weeklyId ? { ...w, groupId: updates.groupId || null } : w)));
    }
  }

  function deleteHabit(id) {
    const habit = habits.find((h) => h.id === id);
    setHabits(habits.filter((h) => h.id !== id));
    if (habit) {
      const purgeFrom = (history) =>
        history.map((entry) => ({
          ...entry,
          snapshot: (entry.snapshot || []).filter((item) => item.name !== habit.name),
        }));
      setHabitHistory(purgeFrom(habitHistory));
      setWeeklyGoalHistory(purgeFrom(weeklyGoalHistory));
      setMonthlyGoalHistory(purgeFrom(monthlyGoalHistory));
    }
  }

  function reorderHabits(draggedId, targetId, targetGroupId) {
    const dragged = habits.find((h) => h.id === draggedId);

    setHabits((prev) => {
      const draggedIdx = prev.findIndex((h) => h.id === draggedId);
      if (draggedIdx === -1) return prev;
      const list = [...prev];
      const [removed] = list.splice(draggedIdx, 1);
      const updatedDragged = { ...removed, groupId: targetGroupId || null };

      if (targetId) {
        const toIdx = list.findIndex((h) => h.id === targetId);
        if (toIdx === -1) {
          list.push(updatedDragged);
        } else {
          list.splice(toIdx, 0, updatedDragged);
        }
      } else {
        // No specific target row — drop was on the group's empty space, so
        // append after the last habit already in that group.
        let insertAt = list.length;
        for (let i = list.length - 1; i >= 0; i--) {
          if ((list[i].groupId || null) === (targetGroupId || null)) {
            insertAt = i + 1;
            break;
          }
        }
        list.splice(insertAt, 0, updatedDragged);
      }
      return list;
    });

    // Recurring day-specific habits remember whichever group they were last
    // dragged into, so they respawn there each time they're injected.
    if (dragged && dragged.fromWeekly) {
      const weeklyId = draggedId.replace(/^wh_/, '');
      setWeeklyHabits((prev) => prev.map((w) => (String(w.id) === weeklyId ? { ...w, groupId: targetGroupId || null } : w)));
    }
  }

  // ---- Group actions ----
  function addGroup(name) {
    if (!name.trim()) return;
    setGroups([...groups, { id: 'g_' + Date.now(), name: name.trim(), collapsed: false }]);
  }
  function toggleGroupCollapsed(id) {
    setGroups(groups.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)));
  }
  function deleteGroup(id) {
    setGroups(groups.filter((g) => g.id !== id));
    setHabits(habits.map((h) => (h.groupId === id ? { ...h, groupId: null } : h)));
  }
  function renameGroup(id, newName) {
    if (!newName.trim()) return;
    setGroups(groups.map((g) => (g.id === id ? { ...g, name: newName.trim() } : g)));
  }
  function reorderGroups(draggedId, targetId) {
    setGroups((prev) => reorderById(prev, draggedId, targetId));
  }

  // ---- Todo actions (lifted so both Today and To-do tabs share one source of truth) ----
  function toggleTodo(id) {
    setTodos((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextDone = !t.completed;
        if (nextDone && t.choreId) resetChore(t.choreId);
        return { ...t, completed: nextDone, completedAt: nextDone ? Date.now() : null, isFocus: false };
      })
    );
    setScheduleTasks((prev) => prev.map((s) => (s.todoId === id ? { ...s, completed: !s.completed } : s)));
  }

  function editTodo(id, newName) {
    if (!newName || !newName.trim()) return;
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, name: newName.trim() } : t)));
  }

  function deleteTodo(id) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    setScheduleTasks((prev) => prev.filter((s) => s.todoId !== id));
  }

  function toggleTodoSkipHoliday(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, skipOnHoliday: !t.skipOnHoliday } : t)));
  }

  function toggleTodoWeekendOnly(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, weekendOnly: !t.weekendOnly } : t)));
  }

  function toggleTodoIsWork(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, isWork: !t.isWork } : t)));
  }

  // No hard cap — focus is now just "what I've chosen to work on today."
  function makeFocus(id) {
    setTodos((prev) => prev.map((t) => (t.id === id && t.name.trim() ? { ...t, isFocus: true } : t)));
  }

  // Atomically find-or-create a todo for a chore, then focus it — avoids the
  // stale-state bug where creating and focusing in two steps could drop the item.
  function focusChore(chore) {
    setTodos((prev) => {
      const existing = prev.find((t) => t.choreId === chore.id && !t.completed);
      if (existing) {
        if (existing.isFocus) return prev;
        return prev.map((t) => (t.id === existing.id ? { ...t, isFocus: true } : t));
      }
      return [
        ...prev,
        { id: 't_' + Date.now(), choreId: chore.id, name: chore.name, dueDate: '', isFocus: true, completed: false, completedAt: null, skipOnHoliday: false, weekendOnly: false, isWork: false },
      ];
    });
  }

  function removeFromFocus(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, isFocus: false } : t)));
  }

  function reorderFocusTodos(draggedId, targetId) {
    setTodos((prev) => reorderById(prev, draggedId, targetId));
  }

  function promoteToSchedule(id) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    const existing = scheduleTasks.find((s) => s.todoId === id);
    if (!existing) {
      const now = new Date();
      let h = now.getHours();
      let m = now.getMinutes();
      if (m > 0 && m <= 30) m = 30; else { m = 0; h += 1; }
      if (h < 7) { h = 7; m = 0; }
      if (h > 18) { h = 18; m = 0; }
      const topPx = Math.max(0, Math.min(660, (h - 7) * 60 + m));
      setScheduleTasks([
        ...scheduleTasks,
        { id: 's_' + Date.now(), todoId: target.id, name: target.name, topPx, durationMins: target.durationMins || 30, category: target.category || 'personal', completed: target.completed },
      ]);
    }
    setActiveTab('schedule');
  }

  function toggleHolidayMode() {
    const next = !isHolidayMode;
    setIsHolidayMode(next);
    if (next) {
      setTodos(todos.map((t) => (t.isFocus && t.skipOnHoliday ? { ...t, isFocus: false } : t)));
      setHolidayStartedAt(Date.now());
    } else if (holidayStartedAt) {
      // Shift paused chores' clocks forward by however long the holiday
      // lasted, so returning doesn't dump a false backlog of overdue chores.
      const pausedMs = Date.now() - holidayStartedAt;
      setChores((prev) => prev.map((c) => (c.skipOnHoliday ? { ...c, lastDone: c.lastDone + pausedMs } : c)));
      setHolidayStartedAt(null);
    }
  }

  return (
    <div className="app">
      <Header
        coverImage={coverImage}
        setCoverImage={setCoverImage}
        coverPosition={coverPosition}
        setCoverPosition={setCoverPosition}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabOrder={safeTabOrder}
        setTabOrder={setTabOrder}
        currentDate={currentDate}
        title={title}
        setTitle={setTitle}
        user={user}
        signOut={signOut}
        syncStatus={syncStatus}
        downloadBackup={downloadBackup}
        restoreFromFile={restoreFromFile}
      />

      {activeTab === 'habits' && (
        <TodayView
          habits={habits}
          addHabit={addHabit}
          setHabitCount={setHabitCount}
          editHabit={editHabit}
          deleteHabit={deleteHabit}
          reorderHabits={reorderHabits}
          groups={groups}
          addGroup={addGroup}
          toggleGroupCollapsed={toggleGroupCollapsed}
          deleteGroup={deleteGroup}
          renameGroup={renameGroup}
          reorderGroups={reorderGroups}
          onBeginNewDay={beginNewDay}
          weeklyHabits={weeklyHabits}
          setWeeklyHabits={setWeeklyHabits}
          todos={todos}
          toggleTodo={toggleTodo}
          removeFromFocus={removeFromFocus}
          reorderFocusTodos={reorderFocusTodos}
          promoteToSchedule={promoteToSchedule}
          makeFocus={makeFocus}
          focusChore={focusChore}
          todoSectionCollapsed={todoSectionCollapsed}
          setTodoSectionCollapsed={setTodoSectionCollapsed}
          isHolidayMode={isHolidayMode}
          toggleHolidayMode={toggleHolidayMode}
          chores={chores}
          resetChore={resetChore}
          scratchpad={scratchpad}
          setScratchpad={setScratchpad}
          dailyNoteText={dailyNoteText}
          setDailyNoteText={setDailyNoteText}
          dailyNoteImage={dailyNoteImage}
          setDailyNoteImage={setDailyNoteImage}
        />
      )}
      {activeTab === 'schedule' && (
        <ScheduleView tasks={scheduleTasks} setTasks={setScheduleTasks} />
      )}
      {activeTab === 'todo' && (
        <TodoView
          todos={todos}
          setTodos={setTodos}
          toggleTodo={toggleTodo}
          editTodo={editTodo}
          deleteTodo={deleteTodo}
          makeFocus={makeFocus}
          toggleTodoSkipHoliday={toggleTodoSkipHoliday}
          toggleTodoWeekendOnly={toggleTodoWeekendOnly}
          toggleTodoIsWork={toggleTodoIsWork}
          isHolidayMode={isHolidayMode}
        />
      )}
      {activeTab === 'chores' && (
        <ChoresView chores={chores} setChores={setChores} resetChore={resetChore} isHolidayMode={isHolidayMode} />
      )}
      {activeTab === 'insights' && (
        <InsightsView
          habits={habits}
          habitHistory={habitHistory}
          weeklyGoalHistory={weeklyGoalHistory}
          monthlyGoalHistory={monthlyGoalHistory}
          todos={todos}
          groups={groups}
          weeklyHabits={weeklyHabits}
        />
      )}
    </div>
  );
}
