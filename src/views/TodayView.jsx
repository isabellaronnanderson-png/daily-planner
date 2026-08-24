import { useState, useRef, useEffect } from 'react';
import { Check, Square, X, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import CategoryTag from '../components/CategoryTag';

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

function isChoreOverdue(chore) {
  const totalGoalMs = chore.freqVal * (chore.freqUnit === 'weeks' ? 7 : chore.freqUnit === 'months' ? 30 : 1) * 24 * 60 * 60 * 1000;
  return Date.now() - chore.lastDone >= totalGoalMs;
}

export default function TodayView({
  habits, addHabit, toggleHabit, editHabit, deleteHabit,
  onBeginNewDay,
  weeklyHabits, setWeeklyHabits,
  dayOrder, setDayOrder,
  todos, toggleTodo, removeFromFocus, promoteToSchedule, makeFocus, focusChore,
  isHolidayMode, toggleHolidayMode,
  chores, resetChore,
  scratchpad, setScratchpad,
}) {
  const [name, setName] = useState('');
  const [dragKey, setDragKey] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [wName, setWName] = useState('');
  const [wDays, setWDays] = useState([]);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [scratchpad]);

  function submitHabit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    addHabit(name.trim());
    setName('');
  }

  function toggleWDay(day) {
    setWDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function addWeeklyHabit(e) {
    e.preventDefault();
    if (!wName.trim() || wDays.length === 0) return;
    setWeeklyHabits([...weeklyHabits, { id: Date.now(), name: wName.trim(), days: wDays }]);
    setWName('');
    setWDays([]);
  }

  function deleteWeeklyHabit(id) {
    setWeeklyHabits(weeklyHabits.filter((w) => w.id !== id));
  }

  function handleScratchpadKeyDown(e) {
    if (e.key === 'Enter') {
      const el = e.target;
      const val = el.value;
      const start = el.selectionStart;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const bulletMatch = currentLine.match(/^(\s*)(\u2022|-|\*)\s+(.*)/);
      if (bulletMatch) {
        e.preventDefault();
        const content = bulletMatch[3].trim();
        if (content === '') {
          setScratchpad(val.substring(0, lineStart) + val.substring(start));
        } else {
          const addition = '\n' + bulletMatch[1] + '\u2022 ';
          setScratchpad(val.substring(0, start) + addition + val.substring(start));
        }
      }
    }
  }

  function dropOn(targetKey) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      setDragOverKey(null);
      return;
    }
    const order = [...dayOrder];
    const fromIdx = order.indexOf(dragKey);
    const toIdx = order.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    order.splice(fromIdx, 1);
    order.splice(toIdx, 0, dragKey);
    setDayOrder(order);
    setDragKey(null);
    setDragOverKey(null);
  }

  const focusItems = todos.filter((t) => t.isFocus && !t.completed);
  const workMins = focusItems.filter((t) => t.category === 'work').reduce((s, i) => s + (i.durationMins || 30), 0);
  const nonWorkMins = focusItems.filter((t) => t.category !== 'work').reduce((s, i) => s + (i.durationMins || 30), 0);
  const overCapacity = workMins > 120 || nonWorkMins > 60;

  const overdueChores = chores.filter(isChoreOverdue);
  const urgentTodos = todos.filter((t) => !t.completed && t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
  const showBanner = overdueChores.length > 0 || urgentTodos.length > 0;

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">Today</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label className="toggle-pill">
            <input type="checkbox" checked={isHolidayMode} onChange={toggleHolidayMode} />
            Holiday mode
          </label>
          <button className="btn" onClick={onBeginNewDay}>Begin a new day</button>
        </div>
      </div>

      {showBanner && (
        <div className="banner">
          <h3>Needs attention</h3>
          {overdueChores.map((chore) => {
            const existing = todos.find((t) => t.choreId === chore.id && !t.completed);
            return (
              <div className="suggestion-pill" key={chore.id}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{chore.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--red)' }}>Chore is due</div>
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
                      resetChore(chore.id);
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

      <div className="day-list">
        {dayOrder.map((key) => {
          const [type, id] = key.split(':');
          if (type === 'habit') {
            const habit = habits.find((h) => h.id === id);
            if (!habit) return null;
            return (
              <div
                key={key}
                className={`day-row ${dragOverKey === key ? 'drag-over' : ''}`}
                draggable
                onDragStart={() => setDragKey(key)}
                onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
                onDragLeave={() => setDragOverKey(null)}
                onDrop={() => dropOn(key)}
              >
                <div className="card-left">
                  <button
                    className={`check-btn ${habit.completed ? '' : 'unchecked'}`}
                    onClick={() => toggleHabit(habit.id)}
                    aria-label={habit.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {habit.completed ? <Check size={16} /> : <Square size={16} />}
                  </button>
                  <span className={`card-label ${habit.completed ? 'completed-text' : ''}`}>{habit.name}</span>
                </div>
                <ActionMenu
                  onEdit={() => editHabit(habit.id, prompt('Edit habit', habit.name) || habit.name)}
                  onDelete={() => deleteHabit(habit.id)}
                />
              </div>
            );
          }

          const todo = todos.find((t) => t.id === id && t.isFocus && !t.completed);
          if (!todo) return null;
          return (
            <div
              key={key}
              className={`day-row day-row-todo ${dragOverKey === key ? 'drag-over' : ''}`}
              draggable
              onDragStart={() => setDragKey(key)}
              onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
              onDragLeave={() => setDragOverKey(null)}
              onDrop={() => dropOn(key)}
            >
              <div className="card-left">
                <span className="card-label" style={{ fontWeight: 500 }}>{todo.name}</span>
                <CategoryTag category={todo.category} />
                <span className="tag">{todo.durationMins || 30}m</span>
                {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button className="btn" onClick={() => promoteToSchedule(todo.id)}>Schedule</button>
                <button className="btn btn-primary" onClick={() => toggleTodo(todo.id)}>Done</button>
                <button className="btn-ghost btn-danger" onClick={() => removeFromFocus(todo.id)}>Remove</button>
              </div>
            </div>
          );
        })}
      </div>

      <p className={`capacity-text ${overCapacity ? 'over' : ''}`}>
        Focus workload: {(workMins / 60).toFixed(1)}h work / 2.0h max &middot; {(nonWorkMins / 60).toFixed(1)}h other / 1.0h max
      </p>

      <form className="form-row" onSubmit={submitHabit}>
        <input type="text" placeholder="Add a habit" value={name} onChange={(e) => setName(e.target.value)} required />
        <button type="submit" className="btn btn-primary">Add habit</button>
      </form>

      <div className="collapsible">
        <button className="collapsible-header" onClick={() => setWeeklyOpen((o) => !o)}>
          Day-specific habits
          <span className="chev">{weeklyOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
        </button>
        {weeklyOpen && (
          <div className="collapsible-body">
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              These appear automatically in the list above on the days you choose, whenever you click "Begin a new day."
            </p>
            <form onSubmit={addWeeklyHabit} style={{ marginBottom: 14 }}>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <input type="text" placeholder="Habit name" value={wName} onChange={(e) => setWName(e.target.value)} />
              </div>
              <div className="weekday-row">
                {WEEKDAYS.map((d) => (
                  <button
                    type="button"
                    key={d.key}
                    className={`weekday-chip ${wDays.includes(d.key) ? 'selected' : ''}`}
                    onClick={() => toggleWDay(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
                <button type="submit" className="btn btn-primary" style={{ marginLeft: 8 }}>Add</button>
              </div>
            </form>

            {weeklyHabits.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No day-specific habits yet.</p>
            ) : (
              weeklyHabits.map((w) => (
                <div className="weekly-habit-row" key={w.id}>
                  <div className="weekly-habit-info">
                    <span style={{ fontSize: 13 }}>{w.name}</span>
                    <div className="weekly-habit-days">
                      {WEEKDAYS.filter((d) => w.days.includes(d.key)).map((d) => (
                        <span key={d.key}>{d.label}</span>
                      ))}
                    </div>
                  </div>
                  <button className="chore-remove" onClick={() => deleteWeeklyHabit(w.id)} aria-label="Delete">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="scratchpad-box">
        <h4>Scratchpad</h4>
        <textarea
          ref={textareaRef}
          className="scratchpad-textarea"
          placeholder="Rough notes for today..."
          value={scratchpad}
          onChange={(e) => setScratchpad(e.target.value)}
          onKeyDown={handleScratchpadKeyDown}
        />
      </div>
    </div>
  );
}
