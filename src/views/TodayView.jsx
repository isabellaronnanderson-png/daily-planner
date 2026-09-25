import { Square, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import DailyNote from '../components/DailyNote';
import TopPriorities from '../components/TopPriorities';
import NotesWidget from '../components/NotesWidget';

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
  isHolidayMode, toggleHolidayMode,
  chores, resetChore,
  notes, setNotes, activeNoteId, setActiveNoteId,
  dailyNoteText, setDailyNoteText, dailyNoteImage, setDailyNoteImage,
  addQuickFocusTodo,
}) {
  const focusItems = todos.filter((t) => t.isFocus && !t.completed);

  // Hide a habit the moment it's completed — it reappears next time its
  // cadence brings it back around, instead of sitting there struck-through.
  const visibleHabits = habits.filter((h) => !h.completed && !(isHolidayMode && h.skipOnHoliday));
  const ungroupedHabits = visibleHabits.filter((h) => !h.groupId);

  const overdueChores = chores.filter((c) => isChoreOverdue(c) && !(isHolidayMode && c.skipOnHoliday));
  const urgentTodos = todos.filter((t) => !t.completed && t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
  const showBanner = overdueChores.length > 0 || urgentTodos.length > 0;

  return (
    <div className="view">
      <DailyNote text={dailyNoteText} setText={setDailyNoteText} image={dailyNoteImage} setImage={setDailyNoteImage} />

      <TopPriorities
        focusItems={focusItems}
        toggleTodo={toggleTodo}
        removeFromFocus={removeFromFocus}
        addQuickFocusTodo={addQuickFocusTodo}
      />

      <div className="section-row">
        <h2 className="section-title">Today</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label className="toggle-pill">
            <input type="checkbox" checked={isHolidayMode} onChange={toggleHolidayMode} />
            Holiday
          </label>
          <button className="btn" onClick={onBeginNewDay}>New day</button>
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
                <button className="btn" onClick={() => makeFocus(task.id)}><Sparkles size={12} /> Focus</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="day-list-outer">
        {groups.map((group) => {
          const items = visibleHabits.filter((h) => h.groupId === group.id);
          if (items.length === 0) return null;
          return (
            <div className="day-section" key={group.id}>
              <button className="day-section-header" onClick={() => toggleGroupCollapsed(group.id)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {group.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  {group.name}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({items.length})</span>
                </span>
              </button>
              {!group.collapsed && (
                <div className="day-section-body">
                  {items.map((habit) => (
                    <TodayHabitRow key={habit.id} habit={habit} setHabitCount={setHabitCount} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {ungroupedHabits.length > 0 && (
          <div className="day-section">
            {groups.some((g) => visibleHabits.some((h) => h.groupId === g.id)) && (
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
      </div>

      <NotesWidget notes={notes} setNotes={setNotes} activeNoteId={activeNoteId} setActiveNoteId={setActiveNoteId} />
    </div>
  );
}
