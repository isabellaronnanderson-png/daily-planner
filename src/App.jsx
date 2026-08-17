import { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Header from './components/Header';
import HabitsView from './views/HabitsView';
import WeekendView from './views/WeekendView';
import ScheduleView from './views/ScheduleView';
import TodoView from './views/TodoView';
import ChoresView from './views/ChoresView';
import './App.css';

const DEFAULT_TAB_ORDER = ['habits', 'weekend', 'todo', 'chores', 'schedule'];

const DEFAULT_WEEKLY_HABITS = [];

const DEFAULT_HABITS = [
  { id: 'h1', name: 'Walk in the garden', timeOfDay: 'morning', completed: false },
  { id: 'h2', name: 'Sip tea', timeOfDay: 'afternoon', completed: false },
  { id: 'h3', name: 'Read a chapter', timeOfDay: 'evening', completed: false },
];

const DEFAULT_WEEKEND = [
  { id: 'w1', name: 'Visit farmers market', day: 'saturday', completed: false },
  { id: 'w2', name: 'Organize closet', day: 'sunday', completed: false },
];

const DEFAULT_TODOS = [
  { id: 't1', name: 'Submit project proposal', category: 'work', durationMins: 45, dueDate: '', isFocus: true, completed: false, completedAt: null },
  { id: 't2', name: 'Send follow-up email', category: 'admin', durationMins: 30, dueDate: '', isFocus: false, completed: false, completedAt: null },
  { id: 't3', name: 'Pick up dry-cleaning', category: 'errands', durationMins: 30, dueDate: '', isFocus: false, completed: false, completedAt: null },
];

const DEFAULT_CHORES = [
  { id: 1, name: 'Vacuum room', group: 'house', freqVal: 3, freqUnit: 'days', lastDone: Date.now() - 1.5 * 24 * 60 * 60 * 1000 },
  { id: 2, name: 'Mop kitchen floor', group: 'house', freqVal: 1, freqUnit: 'weeks', lastDone: Date.now() - 5 * 24 * 60 * 60 * 1000 },
  { id: 3, name: 'Cut hair', group: 'beauty', freqVal: 6, freqUnit: 'months', lastDone: Date.now() - 60 * 24 * 60 * 60 * 1000 },
  { id: 4, name: 'Replace toothbrush head', group: 'health', freqVal: 3, freqUnit: 'months', lastDone: Date.now() - 89 * 24 * 60 * 60 * 1000 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('habits');
  const [tabOrder, setTabOrder] = useLocalStorage('planner_tab_order', DEFAULT_TAB_ORDER);
  const [coverImage, setCoverImage] = useLocalStorage('planner_cover_image', null);
  const [coverPosition, setCoverPosition] = useLocalStorage('planner_cover_position', { x: 50, y: 50 });

  const [habits, setHabits] = useLocalStorage('planner_habits', DEFAULT_HABITS);
  const [habitHistory, setHabitHistory] = useLocalStorage('planner_habit_history', []);
  const [weeklyHabits, setWeeklyHabits] = useLocalStorage('planner_weekly_habits', DEFAULT_WEEKLY_HABITS);

  const [weekendTasks, setWeekendTasks] = useLocalStorage('planner_weekend', DEFAULT_WEEKEND);
  const [weekendHistory, setWeekendHistory] = useLocalStorage('planner_weekend_history', []);

  const [scheduleTasks, setScheduleTasks] = useLocalStorage('planner_schedule', []);

  const [todos, setTodos] = useLocalStorage('planner_todos', DEFAULT_TODOS);
  const [isHolidayMode, setIsHolidayMode] = useLocalStorage('planner_holiday_mode', false);
  const [scratchpad, setScratchpad] = useLocalStorage('planner_scratchpad', '');

  const [chores, setChores] = useLocalStorage('planner_chores', DEFAULT_CHORES);

  const safeTabOrder = [...tabOrder, ...DEFAULT_TAB_ORDER.filter((k) => !tabOrder.includes(k))];

  function resetChore(id) {
    setChores(chores.map((c) => (c.id === id ? { ...c, lastDone: Date.now() } : c)));
  }

  function isWeekendOrHoliday() {
    const day = new Date().getDay();
    return day === 0 || day === 6 || isHolidayMode;
  }

  const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  function beginNewDay() {
    const todayKey = new Date().toISOString().split('T')[0];
    const snapshot = habits.map((h) => ({ name: h.name, timeOfDay: h.timeOfDay, completed: h.completed }));
    setHabitHistory([{ date: todayKey, snapshot }, ...habitHistory].slice(0, 14));

    const todaysWeekday = WEEKDAY_KEYS[new Date().getDay()];
    const baseHabits = habits.filter((h) => !h.fromWeekly).map((h) => ({ ...h, completed: false }));
    const injected = weeklyHabits
      .filter((w) => w.days.includes(todaysWeekday))
      .map((w) => ({ id: 'wh_' + w.id, name: w.name, timeOfDay: w.timeOfDay, completed: false, fromWeekly: true }));
    setHabits([...baseHabits, ...injected]);

    setScheduleTasks([]);

    let nextTodos = todos.map((t) => (t.isFocus && t.completed ? { ...t, isFocus: false } : t));
    if (isWeekendOrHoliday()) {
      nextTodos = nextTodos.map((t) => (t.isFocus && t.category === 'work' ? { ...t, isFocus: false } : t));
    }

    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    nextTodos = nextTodos.filter((t) => !(t.completed && t.completedAt && Date.now() - t.completedAt >= fourteenDays));

    setTodos(nextTodos);
  }

  function resetWeekend() {
    const todayKey = new Date().toISOString().split('T')[0];
    const snapshot = weekendTasks.map((w) => ({ name: w.name, day: w.day, completed: w.completed }));
    setWeekendHistory([{ date: todayKey, snapshot }, ...weekendHistory].slice(0, 12));
    setWeekendTasks(weekendTasks.map((w) => ({ ...w, completed: false })));
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
      />

      {activeTab === 'habits' && (
        <HabitsView
          habits={habits}
          setHabits={setHabits}
          habitHistory={habitHistory}
          onBeginNewDay={beginNewDay}
          weeklyHabits={weeklyHabits}
          setWeeklyHabits={setWeeklyHabits}
        />
      )}
      {activeTab === 'weekend' && (
        <WeekendView tasks={weekendTasks} setTasks={setWeekendTasks} history={weekendHistory} onResetWeekend={resetWeekend} />
      )}
      {activeTab === 'schedule' && (
        <ScheduleView tasks={scheduleTasks} setTasks={setScheduleTasks} />
      )}
      {activeTab === 'todo' && (
        <TodoView
          todos={todos}
          setTodos={setTodos}
          isHolidayMode={isHolidayMode}
          setIsHolidayMode={setIsHolidayMode}
          scheduleTasks={scheduleTasks}
          setScheduleTasks={setScheduleTasks}
          chores={chores}
          resetChore={resetChore}
          scratchpad={scratchpad}
          setScratchpad={setScratchpad}
          goToSchedule={() => setActiveTab('schedule')}
        />
      )}
      {activeTab === 'chores' && (
        <ChoresView chores={chores} setChores={setChores} resetChore={resetChore} />
      )}
    </div>
  );
}
