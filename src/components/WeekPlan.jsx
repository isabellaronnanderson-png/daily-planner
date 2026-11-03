import { useRef } from 'react';
import { Square, Check, GripVertical, ChevronDown, ChevronRight, X, ArrowDown, Shuffle } from 'lucide-react';
import OneOffAdd from './OneOffAdd';
import { nextDayKey } from '../lib/weekPlan';

// The week plan on the "This week" tab: a banner you can fold away, and under it
// one section per day — Monday to Friday, then the Weekend. Write your own lines
// into a day (Enter keeps going), or press "Fill blank days" to get one random
// task from the to-do bank for every empty day still ahead. Drag a task onto
// another day to carry it forward. Tasks pulled from the bank are solid coloured
// rows; the ones you write look like habit rows.
export default function WeekPlan({
  days, todos, todayKey, staleNote, collapsed, onToggleCollapsed,
  toggleTodo, updateTodoName, deleteTodo, addPlanTodo,
  moveToDay, dropOnRow, removeFromPlan, rerollPlanItem, fillBlankDays,
}) {
  const dragIdRef = useRef(null);

  const planItems = todos.filter((t) => t.weekFocus);
  const dayKeys = new Set(days.map((d) => d.key));
  const unplaced = planItems.filter((t) => !t.planDay || !dayKeys.has(t.planDay));
  const pendingCount = planItems.filter((t) => !t.completed).length;

  const handle = (todo) => (
    <span className="todo-group-handle" draggable onDragStart={() => { dragIdRef.current = todo.id; }} aria-hidden="true">
      <GripVertical size={13} />
    </span>
  );
  const rowDrop = (todo) => ({
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragIdRef.current && dragIdRef.current !== todo.id) dropOnRow(dragIdRef.current, todo.id);
      dragIdRef.current = null;
    },
  });

  function DayPicker({ todo }) {
    return (
      <span className="icon-tooltip-wrap">
        <span className="btn-ghost todo-pulled-btn">Place…</span>
        <select className="move-select" aria-label="Place on a day" value="" onChange={(e) => e.target.value && moveToDay(todo.id, e.target.value)}>
          <option value="">Place on…</option>
          {days.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </span>
    );
  }

  function renderRow(todo) {
    const done = todo.completed;
    const next = nextDayKey(todo.planDay);
    const doneStyle = done ? { textDecoration: 'line-through', opacity: 0.5 } : undefined;
    const check = (
      <div className="day-row-actions">
        <button className={`check-btn ${done ? '' : 'unchecked'}`} onClick={() => toggleTodo(todo.id)} aria-label={done ? 'Mark not done' : 'Mark done'}>
          {done ? <Check size={16} /> : <Square size={16} />}
        </button>
      </div>
    );

    if (todo.addedHere) {
      return (
        <div className="day-row todo-group-row" key={todo.id} {...rowDrop(todo)}>
          {handle(todo)}
          <input
            type="text"
            className="today-line-input"
            value={todo.name}
            style={doneStyle}
            onChange={(e) => updateTodoName(todo.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            onBlur={() => { if (todo.name.trim() === '') deleteTodo(todo.id); }}
          />
          {!done && next && (
            <button className="chore-remove oneoff-remove" onClick={() => moveToDay(todo.id, next)} aria-label="Move to the next day" title="Move to the next day">
              <ArrowDown size={14} />
            </button>
          )}
          <button className="chore-remove oneoff-remove" onClick={() => deleteTodo(todo.id)} aria-label="Delete" title="Delete">
            <X size={14} />
          </button>
          {check}
        </div>
      );
    }
    const canReroll = !done && !todo.dueDate && !todo.choreId && !!todo.planDay;
    return (
      <div className="day-row todo-pulled-row" key={todo.id} {...rowDrop(todo)}>
        {handle(todo)}
        <span className="card-label todo-pulled-name" style={{ flex: 1, minWidth: 0, ...doneStyle }}>{todo.name}</span>
        {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
        {!todo.planDay && !done && <DayPicker todo={todo} />}
        {canReroll && (
          <button className="btn-ghost todo-pulled-btn" onClick={() => rerollPlanItem(todo.id)} title="Swap for a different random task" aria-label="Swap for a different random task">
            <Shuffle size={12} />
          </button>
        )}
        {!done && next && (
          <button className="btn-ghost todo-pulled-btn" onClick={() => moveToDay(todo.id, next)} title="Move to the next day">
            <ArrowDown size={12} /> Next day
          </button>
        )}
        {!done && (
          <button className="btn-ghost btn-danger todo-pulled-btn" onClick={() => removeFromPlan(todo.id)} title="Put back in the to-do list">Remove</button>
        )}
        {check}
      </div>
    );
  }

  return (
    <div className="week-plan">
      <div className="day-list-outer">
        {/* The banner: one fold for the whole plan */}
        <div className="day-section">
          <div className="day-section-header group-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onToggleCollapsed} role="button" tabIndex={0}>
              {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              Week plan
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pendingCount})</span>
            </span>
            {!collapsed && (
              <button className="btn" onClick={fillBlankDays} title="Pick one random task from your to-do list for each blank day still ahead">
                <Shuffle size={12} /> Fill blank days
              </button>
            )}
          </div>
        </div>

        {!collapsed && (
          <>
            <div className="week-plan-hint">{staleNote || 'Write into any day, or drag tasks between days to carry them forward.'}</div>

            {unplaced.length > 0 && (
              <div className="day-section">
                <div className="day-section-label">Not placed yet</div>
                <div className="day-section-body">{unplaced.map(renderRow)}</div>
              </div>
            )}

            {days.map((day) => {
              const items = planItems.filter((t) => t.planDay === day.key);
              const pending = items.filter((t) => !t.completed).length;
              const isToday = day.dateKeys.includes(todayKey);
              const isPast = day.lastDateKey < todayKey;
              return (
                <div
                  className="day-section"
                  key={day.key}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdRef.current) moveToDay(dragIdRef.current, day.key);
                    dragIdRef.current = null;
                  }}
                >
                  <div className={`day-section-header day-static ${isPast && pending === 0 ? 'is-empty' : ''}`}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {day.label}
                      {isToday && <span className="pill pill-navy">Today</span>}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pending})</span>
                    </span>
                  </div>
                  {/* Days that have gone by with nothing on them stay as a quiet header */}
                  {(!isPast || items.length > 0) && (
                    <div className="day-section-body">
                      {items.map(renderRow)}
                      {!isPast && <OneOffAdd onAdd={(text) => addPlanTodo(text, day.key)} label={day.addLabel} />}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
