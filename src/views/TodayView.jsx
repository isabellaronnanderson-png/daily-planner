import { useState, useRef, useEffect } from 'react';
import { Square, ChevronDown, ChevronRight, CalendarDays, CalendarClock, ArrowDown, X } from 'lucide-react';
import CalendarPopover from '../components/CalendarPopover';
import PastDaySheet from '../components/PastDaySheet';
import DoneHabits from '../components/DoneHabits';
import DailyNote from '../components/DailyNote';
import TodayTodos from '../components/TodayTodos';
import WeekPlan from '../components/WeekPlan';
import OneOffAdd from '../components/OneOffAdd';
import NotesWidget from '../components/NotesWidget';
import { localDateKey, monthKeyOf, officeCountForMonth } from '../lib/officeDays';
import { childrenOf, tabOfGroup, tabOfItem } from '../lib/groupTree';
import { formatWeekRange } from '../lib/todayTabs';
import { weekKeyFor } from '../lib/cycles';
import { needsAttention } from '../lib/needsAttention';
import { planDays, dayKeyOfDate, nextDayKey } from '../lib/weekPlan';
import { useLocalStorage } from '../hooks/useLocalStorage';

// "New day" jumps to the actual current day. The small calendar button beside
// it opens any of the last two weeks (matching the daily history that's kept)
// so you can see that day's full list and tick things off — nothing resets.
function NewDayButton({ onBeginNewDay, onLogPastDay, currentDate }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const currentKey = localDateKey(currentDate);
  const maxDate = localDateKey(new Date().toISOString());
  const earliest = new Date();
  earliest.setDate(earliest.getDate() - 13); // daily history keeps about two weeks
  const minDate = localDateKey(earliest.toISOString());

  return (
    <span className="new-day-wrap" ref={wrapRef}>
      <button className="btn new-day-main" onClick={() => onBeginNewDay()}>New day</button>
      <button
        className="btn new-day-pick"
        title="Look back at a day…"
        aria-label="Look back at a day"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <CalendarDays size={14} />
      </button>
      {open && (
        <CalendarPopover
          minDate={minDate}
          maxDate={maxDate}
          caption="Look back at any of the last two weeks"
          isDateDisabled={(d) => d === currentKey || d === maxDate}
          onSelect={(d) => onLogPastDay(d)}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}

// onRemove is only passed for one-off "just for today" items, which are
// otherwise drawn exactly like habits.
function TodayHabitRow({ habit, setHabitCount, onRemove }) {
  const target = habit.targetCount || 1;
  const count = habit.count || 0;
  return (
    <div className="day-row">
      <span className="card-label" style={{ flex: 1, minWidth: 0 }}>
        {habit.name}
        {target > 1 && <span className="count-text"> {count}/{target}</span>}
      </span>
      {onRemove && (
        <button className="chore-remove oneoff-remove" onClick={onRemove} aria-label="Remove" title="Remove">
          <X size={14} />
        </button>
      )}
      <div className="day-row-actions">
        {target <= 1 ? (
          <button className="check-btn unchecked" onClick={() => setHabitCount(habit.id, 1)} aria-label="Mark complete">
            <Square size={16} />
          </button>
        ) : (
          <div className="count-marks" role="group" aria-label={`${count} of ${target} done`}>
            {Array.from({ length: target }).map((_, i) => (
              <button
                key={i}
                className={`count-mark ${i < count ? 'filled' : ''}`}
                onClick={() => setHabitCount(habit.id, count === i + 1 ? i : i + 1)}
                aria-label={`Mark ${i + 1} of ${target}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TodayView({
  habits, setHabitCount,
  groups, toggleGroupCollapsed,
  onBeginNewDay, onBeginNewWeek,
  todayTabs, weekStartedAt,
  todos, toggleTodo, removeFromFocus, removeFromWeekFocus,
  isHolidayMode, holidayModeOn, holidayEndsAtNewDay, toggleHolidayMode,
  chores,
  notes, setNotes, activeNoteId, setActiveNoteId,
  dailyNoteText, setDailyNoteText, dailyNoteImage, setDailyNoteImage,
  dailyPriorities, setDailyPriorities,
  todayLines, setTodayLines,
  updateTodoName, deleteTodo, addFocusTodo, reorderFocusTodos, sendToDay,
  addPlanTodo, moveToDay, dropOnRow, rerollPlanItem, fillBlankDays, planHolidayDays, togglePlanHoliday, onOpenTodo,
  officeDays, setOfficeDays, toggleOfficeDay, currentDate, weeklyHabits,
  habitHistory, setHabitHistory,
  weeklyGoalHistory, setWeeklyGoalHistory,
  monthlyGoalHistory, setMonthlyGoalHistory,
}) {
  const [pastDate, setPastDate] = useState(null);
  const [tabId, setTabId] = useState('today');
  const [todoCollapsed, setTodoCollapsed] = useLocalStorage('planner_todo_collapsed', {});
  // Days of the week plan you've opened/folded by hand — remembered when you switch tabs.
  const [planOpen, setPlanOpen] = useLocalStorage('planner_plan_open_days', {});
  const inOfficeToday = officeDays.includes(localDateKey(currentDate));
  const officeCount = officeCountForMonth(officeDays, monthKeyOf(currentDate));

  // ---- Tabs ----
  const activeTab = todayTabs.find((t) => t.id === tabId) || todayTabs[0];
  const isMainDay = activeTab.todos === 'today';
  const isWeek = activeTab.period === 'week';
  const tabIdSet = new Set(todayTabs.map((t) => t.id));
  const inTab = (x) => tabOfItem(x, groups, tabIdSet) === activeTab.id;

  const focusItems = todos.filter((t) => t.isFocus && !t.completed);

  // Hide a habit the moment it's completed — it reappears next time its
  // cadence brings it back around, instead of sitting there struck-through.
  const visibleHabits = habits.filter((h) => !h.completed && !(isHolidayMode && h.skipOnHoliday) && inTab(h));
  const doneHabits = habits.filter((h) => h.completed && !(isHolidayMode && h.skipOnHoliday) && inTab(h));
  const groupIds = new Set(groups.map((g) => g.id));
  const ungroupedHabits = visibleHabits.filter((h) => !h.groupId || !groupIds.has(h.groupId));

  // One-off items ("just for today"): added inside any group, drawn like a
  // habit, but never come back — they're cleared when the day (or week) is begun anew.
  const tabLines = todayLines.filter((l) => l.text && inTab(l));
  const visibleLines = tabLines.filter((l) => !l.done);
  const doneLines = tabLines.filter((l) => l.done);
  const ungroupedLines = visibleLines.filter((l) => !l.groupId || !groupIds.has(l.groupId));
  function addLine(text, groupId) {
    setTodayLines((prev) => [
      ...prev,
      { id: 'tl_' + Date.now() + Math.random().toString(36).slice(2, 6), text, done: false, groupId: groupId || null, tabId: activeTab.id },
    ]);
  }
  const toggleLine = (id) => setTodayLines((prev) => prev.map((l) => (l.id === id ? { ...l, done: !l.done } : l)));
  const removeLine = (id) => setTodayLines((prev) => prev.filter((l) => l.id !== id));
  const addLabel = isWeek ? 'Add for this week' : 'Add for today';

  // Groups on this tab always show (so there's always somewhere to jot a
  // one-off), dimmed when nothing's left in them. Subgroups sit indented
  // inside their parent and fold away with it.
  const tabRoots = childrenOf(groups, null).filter((g) => tabOfGroup(groups, g.id, tabIdSet) === activeTab.id);
  const subtreeCount = (id) =>
    visibleHabits.filter((h) => h.groupId === id).length +
    visibleLines.filter((l) => l.groupId === id).length +
    childrenOf(groups, id).reduce((n, k) => n + subtreeCount(k.id), 0);
  function renderGroup(group, depth) {
    const total = subtreeCount(group.id);
    const items = visibleHabits.filter((h) => h.groupId === group.id);
    const lines = visibleLines.filter((l) => l.groupId === group.id);
    return (
      <div className={`day-section ${depth > 0 ? 'day-subsection' : ''}`} key={group.id}>
        <button className={`day-section-header ${total === 0 ? 'is-empty' : ''}`} onClick={() => toggleGroupCollapsed(group.id)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {group.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            {group.name}
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({total})</span>
          </span>
        </button>
        {!group.collapsed && (
          <div className="day-section-body">
            {items.map((habit) => (
              <TodayHabitRow key={habit.id} habit={habit} setHabitCount={setHabitCount} />
            ))}
            {lines.map((line) => (
              <TodayHabitRow
                key={line.id}
                habit={{ id: line.id, name: line.text, count: 0, targetCount: 1 }}
                setHabitCount={() => toggleLine(line.id)}
                onRemove={() => removeLine(line.id)}
              />
            ))}
            <OneOffAdd onAdd={(text) => addLine(text, group.id)} label={addLabel} />
            {childrenOf(groups, group.id).map((child) => renderGroup(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  // ---- Needs attention ----
  // The full panel now lives at the top of the To-do tab. Here there's just a
  // quiet count you can open when you want to look.
  const attention = needsAttention({ chores, todos, isHolidayMode });
  const attentionCount = attention.overdueChores.length + attention.urgentTodos.length;

  // ---- This week ----
  const weekRef = weekStartedAt || currentDate;
  const weekIsStale = weekKeyFor(weekRef, 1) !== weekKeyFor(new Date().toISOString(), 1);
  function handleBeginWeek() {
    const sameWeek = weekStartedAt && !weekIsStale;
    if (sameWeek && !window.confirm("You've already begun this week. Reset this week's habits anyway?")) return;
    onBeginNewWeek();
    setPlanOpen({});
  }

  const nothingLeft = visibleHabits.length === 0 && visibleLines.length === 0;

  // The week plan (This week tab) and its mirror on the Today tab: whatever is
  // planned for today's day of the week shows in Today's to-do group too (same
  // tasks, not copies), as long as the plan is for the current week.
  const days = planDays(weekRef);
  const realTodayKey = localDateKey(new Date().toISOString());
  const todayDay = dayKeyOfDate(new Date());
  const plannedToday = weekIsStale ? [] : todos.filter((t) => t.weekFocus && !t.completed && t.planDay === todayDay);
  const todayTodoItems = [...focusItems, ...plannedToday];
  const canSendToWeekend = !isHolidayMode && ![0, 6].includes(new Date().getDay());
  function todayMoveAction(todo) {
    if (todo.weekFocus) {
      const next = nextDayKey(todo.planDay);
      return next ? { label: 'Tomorrow', Icon: ArrowDown, onClick: () => moveToDay(todo.id, next) } : null;
    }
    return canSendToWeekend ? { label: 'Weekend', Icon: CalendarClock, onClick: () => sendToDay('todo', todo.id, 'weekend') } : null;
  }

  return (
    <div className="view">
      <div className="todo-tabs">
        {todayTabs.map((tab) => (
          <button key={tab.id} className={`todo-tab ${tab.id === activeTab.id ? 'active' : ''}`} onClick={() => setTabId(tab.id)}>
            {tab.name}
          </button>
        ))}
      </div>

      {isMainDay && (
        <DailyNote
          text={dailyNoteText}
          setText={setDailyNoteText}
          image={dailyNoteImage}
          setImage={setDailyNoteImage}
          priorities={dailyPriorities}
          setPriorities={setDailyPriorities}
        />
      )}

      {isMainDay ? (
        <div className="section-row">
          <h2 className="section-title">
            {activeTab.name}
            <span className={`today-date ${localDateKey(currentDate) !== localDateKey(new Date().toISOString()) ? 'stale' : ''}`}>
              {new Date(currentDate).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label className="toggle-pill">
              <input type="checkbox" checked={inOfficeToday} onChange={toggleOfficeDay} />
              In office · {officeCount}
            </label>
            <label
              className="toggle-pill"
              title={holidayEndsAtNewDay ? 'Today still counts as a holiday — this switches off when you begin a new day' : undefined}
            >
              <input type="checkbox" checked={holidayModeOn} onChange={toggleHolidayMode} />
              {holidayEndsAtNewDay ? 'Holiday · ends at new day' : 'Holiday'}
            </label>
            <NewDayButton onBeginNewDay={onBeginNewDay} onLogPastDay={setPastDate} currentDate={currentDate} />
          </div>
        </div>
      ) : isWeek ? (
        <div className="section-row">
          <h2 className="section-title">
            {activeTab.name}
            <span className={`today-date ${weekIsStale ? 'stale' : ''}`}>{formatWeekRange(weekRef)}</span>
          </h2>
          <button className="btn" onClick={handleBeginWeek}>Begin a new week</button>
        </div>
      ) : (
        <div className="section-row">
          <h2 className="section-title">{activeTab.name}</h2>
        </div>
      )}

      {isMainDay && attentionCount > 0 && (
        <button className="attention-chip" onClick={onOpenTodo}>
          {attentionCount} {attentionCount === 1 ? 'thing waits' : 'things wait'} in your to-do list ›
        </button>
      )}

      {activeTab.todos === 'week' && (
        <WeekPlan
          days={days}
          todos={todos}
          todayKey={realTodayKey}
          staleNote={weekIsStale ? 'This plan is for an earlier week — press “Begin a new week” to start a fresh one.' : null}
          toggleTodo={toggleTodo}
          updateTodoName={updateTodoName}
          deleteTodo={deleteTodo}
          addPlanTodo={addPlanTodo}
          moveToDay={moveToDay}
          dropOnRow={dropOnRow}
          removeFromPlan={removeFromWeekFocus}
          rerollPlanItem={rerollPlanItem}
          fillBlankDays={fillBlankDays}
          openMap={planOpen}
          setOpenMap={setPlanOpen}
          holidayDays={planHolidayDays}
          toggleHolidayDay={togglePlanHoliday}
          collapsed={!!todoCollapsed.weekplan}
          onToggleCollapsed={() => setTodoCollapsed((prev) => ({ ...prev, weekplan: !prev.weekplan }))}
        />
      )}

      <div className="day-list-outer">
        {isMainDay && (
          <TodayTodos
            title="To-do"
            items={todayTodoItems}
            collapsed={!!todoCollapsed[activeTab.id]}
            onToggleCollapsed={() => setTodoCollapsed((prev) => ({ ...prev, [activeTab.id]: !prev[activeTab.id] }))}
            toggleTodo={toggleTodo}
            onRemove={(todo) => (todo.weekFocus ? removeFromWeekFocus(todo.id) : removeFromFocus(todo.id))}
            moveAction={todayMoveAction}
            updateTodoName={updateTodoName}
            deleteTodo={deleteTodo}
            addTodo={addFocusTodo}
            reorderFocusTodos={reorderFocusTodos}
          />
        )}

        {tabRoots.map((group) => renderGroup(group, 0))}

        {(ungroupedHabits.length > 0 || ungroupedLines.length > 0 || tabRoots.length === 0) && (
          <div className="day-section">
            {tabRoots.length > 0 && <div className="day-section-label">Ungrouped</div>}
            <div className="day-section-body">
              {ungroupedHabits.map((habit) => (
                <TodayHabitRow key={habit.id} habit={habit} setHabitCount={setHabitCount} />
              ))}
              {ungroupedLines.map((line) => (
                <TodayHabitRow
                  key={line.id}
                  habit={{ id: line.id, name: line.text, count: 0, targetCount: 1 }}
                  setHabitCount={() => toggleLine(line.id)}
                  onRemove={() => removeLine(line.id)}
                />
              ))}
              <OneOffAdd onAdd={(text) => addLine(text, null)} label={addLabel} />
            </div>
          </div>
        )}

        {nothingLeft && (
          <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>
            Nothing left {isWeek ? 'this week' : 'for today'} — nice work.
          </div>
        )}
      </div>

      <DoneHabits
        habits={doneHabits}
        oneOffs={doneLines}
        undoOneOff={toggleLine}
        removeOneOff={removeLine}
        weeklyHabits={weeklyHabits}
        currentDate={currentDate}
        setHabitCount={setHabitCount}
      />

      {isMainDay && <NotesWidget notes={notes} setNotes={setNotes} activeNoteId={activeNoteId} setActiveNoteId={setActiveNoteId} />}

      {pastDate && (
        <PastDaySheet
          dateKey={pastDate}
          habits={habits}
          weeklyHabits={weeklyHabits}
          setHabitCount={setHabitCount}
          habitHistory={habitHistory}
          setHabitHistory={setHabitHistory}
          weeklyGoalHistory={weeklyGoalHistory}
          setWeeklyGoalHistory={setWeeklyGoalHistory}
          monthlyGoalHistory={monthlyGoalHistory}
          setMonthlyGoalHistory={setMonthlyGoalHistory}
          officeDays={officeDays}
          setOfficeDays={setOfficeDays}
          onClose={() => setPastDate(null)}
        />
      )}
    </div>
  );
}
