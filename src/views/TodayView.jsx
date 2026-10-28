import { useState, useRef, useEffect } from 'react';
import { Square, ChevronDown, ChevronRight, Sparkles, CalendarDays, CalendarClock } from 'lucide-react';
import CalendarPopover from '../components/CalendarPopover';
import PastDaySheet from '../components/PastDaySheet';
import DoneHabits from '../components/DoneHabits';
import DailyNote from '../components/DailyNote';
import TodayTodos from '../components/TodayTodos';
import TodayLines from '../components/TodayLines';
import NotesWidget from '../components/NotesWidget';
import { localDateKey, monthKeyOf, officeCountForMonth } from '../lib/officeDays';
import { childrenOf } from '../lib/groupTree';

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

function isChoreOverdue(chore) {
  const totalGoalMs = chore.freqVal * (chore.freqUnit === 'weeks' ? 7 : chore.freqUnit === 'months' ? 30 : 1) * 24 * 60 * 60 * 1000;
  return Date.now() - chore.lastDone >= totalGoalMs;
}
function choreDaysOverdue(chore) {
  const totalGoalMs = chore.freqVal * (chore.freqUnit === 'weeks' ? 7 : chore.freqUnit === 'months' ? 30 : 1) * 24 * 60 * 60 * 1000;
  const passed = Date.now() - chore.lastDone;
  return Math.floor((passed - totalGoalMs) / (24 * 60 * 60 * 1000));
}

function TodayHabitRow({ habit, setHabitCount }) {
  const target = habit.targetCount || 1;
  const count = habit.count || 0;
  return (
    <div className="day-row">
      <span className="card-label" style={{ flex: 1, minWidth: 0 }}>
        {habit.name}
        {target > 1 && <span className="count-text"> {count}/{target}</span>}
      </span>
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
  onBeginNewDay,
  todos, toggleTodo, removeFromFocus, makeFocus, focusChore,
  isHolidayMode, holidayModeOn, holidayEndsAtNewDay, toggleHolidayMode,
  chores, resetChore,
  notes, setNotes, activeNoteId, setActiveNoteId,
  dailyNoteText, setDailyNoteText, dailyNoteImage, setDailyNoteImage,
  dailyPriorities, setDailyPriorities,
  todayLines, setTodayLines,
  updateTodoName, deleteTodo, addFocusTodo, reorderFocusTodos, snoozeToWeekend,
  officeDays, setOfficeDays, toggleOfficeDay, currentDate, weeklyHabits,
  habitHistory, setHabitHistory,
  weeklyGoalHistory, setWeeklyGoalHistory,
  monthlyGoalHistory, setMonthlyGoalHistory,
}) {
  const [pastDate, setPastDate] = useState(null);
  const inOfficeToday = officeDays.includes(localDateKey(currentDate));
  const officeCount = officeCountForMonth(officeDays, monthKeyOf(currentDate));

  const focusItems = todos.filter((t) => t.isFocus && !t.completed);

  // Hide a habit the moment it's completed — it reappears next time its
  // cadence brings it back around, instead of sitting there struck-through.
  const visibleHabits = habits.filter((h) => !h.completed && !(isHolidayMode && h.skipOnHoliday));
  const groupIds = new Set(groups.map((g) => g.id));
  const ungroupedHabits = visibleHabits.filter((h) => !h.groupId || !groupIds.has(h.groupId));

  // A group (and anything nested in it) only shows while it has something left
  // to do. Subgroups sit indented inside their parent and fold away with it.
  const subtreeCount = (id) =>
    visibleHabits.filter((h) => h.groupId === id).length + childrenOf(groups, id).reduce((n, k) => n + subtreeCount(k.id), 0);
  function renderGroup(group, depth) {
    const total = subtreeCount(group.id);
    if (total === 0) return null;
    const items = visibleHabits.filter((h) => h.groupId === group.id);
    return (
      <div className={`day-section ${depth > 0 ? 'day-subsection' : ''}`} key={group.id}>
        <button className="day-section-header" onClick={() => toggleGroupCollapsed(group.id)}>
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
            {childrenOf(groups, group.id).map((child) => renderGroup(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }
  // Ticked-off habits sit in their own collapsed group, with when they return.
  const doneHabits = habits.filter((h) => h.completed && !(isHolidayMode && h.skipOnHoliday));

  // Items sent to "this weekend" stay out of Needs attention until that
  // Saturday. The button only shows Mon–Fri (on a weekend or holiday they're
  // simply due).
  const todayKey = localDateKey(new Date().toISOString());
  const isSnoozed = (item) => !!item.snoozeUntil && item.snoozeUntil > todayKey;
  const canSnooze = !isHolidayMode && ![0, 6].includes(new Date().getDay());

  const overdueChores = chores.filter((c) => isChoreOverdue(c) && !(isHolidayMode && c.skipOnHoliday) && !isSnoozed(c));
  const urgentTodos = todos.filter((t) => !t.completed && t.dueDate && !isSnoozed(t)).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
  const showBanner = overdueChores.length > 0 || urgentTodos.length > 0;

  return (
    <div className="view">
      <DailyNote
        text={dailyNoteText}
        setText={setDailyNoteText}
        image={dailyNoteImage}
        setImage={setDailyNoteImage}
        priorities={dailyPriorities}
        setPriorities={setDailyPriorities}
      />

      <TodayTodos
        focusItems={focusItems}
        toggleTodo={toggleTodo}
        removeFromFocus={removeFromFocus}
        updateTodoName={updateTodoName}
        deleteTodo={deleteTodo}
        addFocusTodo={addFocusTodo}
        reorderFocusTodos={reorderFocusTodos}
      />

      <div className="section-row">
        <h2 className="section-title">
          Today
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

      {showBanner && (
        <div className="banner">
          <h3>Needs attention</h3>
          {overdueChores.map((chore) => {
            const existing = todos.find((t) => t.choreId === chore.id && !t.completed);
            const daysOverdue = choreDaysOverdue(chore);
            return (
              <div className="suggestion-pill" key={chore.id}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{chore.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--red-light)' }}>
                    {daysOverdue >= 1 ? `${daysOverdue}d overdue` : 'Chore is due'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {existing && existing.isFocus ? (
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>In focus</span>
                  ) : (
                    <button className="btn" onClick={() => focusChore(chore)}>
                      <Sparkles size={12} /> Focus
                    </button>
                  )}
                  {canSnooze && !(existing && existing.isFocus) && (
                    <button className="btn" onClick={() => snoozeToWeekend('chore', chore.id)} title="Hide this until the weekend">
                      <CalendarClock size={12} /> This weekend
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={() => {
                      if (existing) toggleTodo(existing.id);
                      else resetChore(chore.id);
                    }}
                  >
                    Mark done
                  </button>
                </div>
              </div>
            );
          })}
          {urgentTodos.map((task) => (
            <div className="suggestion-pill" key={task.id}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{task.name}</div>
                <div style={{ fontSize: 11, color: 'var(--red)' }}>Due {task.dueDate}</div>
              </div>
              {task.isFocus ? (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>In focus</span>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  {canSnooze && (
                    <button className="btn" onClick={() => snoozeToWeekend('todo', task.id)} title="Hide this until the weekend">
                      <CalendarClock size={12} /> This weekend
                    </button>
                  )}
                  <button className="btn" onClick={() => makeFocus(task.id)}><Sparkles size={12} /> Focus</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="day-list-outer">
        {childrenOf(groups, null).map((group) => renderGroup(group, 0))}

        {ungroupedHabits.length > 0 && (
          <div className="day-section">
            {groups.some((g) => subtreeCount(g.id) > 0) && (
              <div className="day-section-label">Ungrouped</div>
            )}
            <div className="day-section-body">
              {ungroupedHabits.map((habit) => (
                <TodayHabitRow key={habit.id} habit={habit} setHabitCount={setHabitCount} />
              ))}
            </div>
          </div>
        )}

        {visibleHabits.length === 0 && (
          <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>Nothing left for today — nice work.</div>
        )}

        <div className="day-section">
          <div className="day-section-label">Just today</div>
          <div className="day-section-body">
            <TodayLines lines={todayLines} setLines={setTodayLines} />
          </div>
        </div>
      </div>

      <DoneHabits habits={doneHabits} weeklyHabits={weeklyHabits} currentDate={currentDate} setHabitCount={setHabitCount} />

      <NotesWidget notes={notes} setNotes={setNotes} activeNoteId={activeNoteId} setActiveNoteId={setActiveNoteId} />

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
