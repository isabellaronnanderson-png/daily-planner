import { useState } from 'react';
import { Square, X, Sparkles, ChevronDown, ChevronRight, Plus, Plane, Pencil } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import DailyNote from '../components/DailyNote';
import TopPriorities from '../components/TopPriorities';
import NotesWidget from '../components/NotesWidget';

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
];
const WEEKEND_CHIP = { key: 'weekend', label: 'W' };

function hasWeekend(days) {
  return days.includes('sat') && days.includes('sun');
}
function dayBadges(days) {
  const labels = WEEKDAYS.filter((d) => days.includes(d.key)).map((d) => d.label);
  if (hasWeekend(days)) labels.push('W');
  return labels;
}

const DAY_ORDER_INDEX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 5 };
function firstDayIndex(days) {
  if (!days || days.length === 0) return 6;
  return Math.min(...days.map((d) => DAY_ORDER_INDEX[d] ?? 6));
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

function HabitRow({ habit, dragOver, onDragStart, onDragOver, onDragLeave, onDrop, setHabitCount, onEdit, onDelete }) {
  const target = habit.targetCount || 1;
  const count = habit.count || 0;

  return (
    <div
      className={`day-row ${dragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="card-label" style={{ flex: 1, minWidth: 0 }}>
        {habit.name}
        {target > 1 && <span className="count-text"> {count}/{target}</span>}
        {habit.cadence === 'week' && <span className="pill pill-muted" style={{ marginLeft: 8 }}>Weekly</span>}
        {habit.cadence === 'month' && <span className="pill pill-muted" style={{ marginLeft: 8 }}>Monthly</span>}
        {habit.fromInterval && <span className="pill pill-muted" style={{ marginLeft: 8 }}>Recurring</span>}
        {habit.skipOnHoliday && <Plane size={11} style={{ marginLeft: 8, verticalAlign: -1, color: 'var(--text-muted)' }} aria-label="Paused on holiday" />}
      </span>
      <div className="day-row-actions" draggable={false} onDragStart={(e) => e.stopPropagation()}>
        {target <= 1 ? (
          <button
            className="check-btn unchecked"
            draggable={false}
            onClick={() => setHabitCount(habit.id, 1)}
            aria-label="Mark complete"
          >
            <Square size={16} />
          </button>
        ) : (
          <div className="count-marks" role="group" aria-label={`${count} of ${target} done`}>
            {Array.from({ length: target }).map((_, i) => (
              <button
                key={i}
                className={`count-mark ${i < count ? 'filled' : ''}`}
                draggable={false}
                onClick={() => setHabitCount(habit.id, count === i + 1 ? i : i + 1)}
                aria-label={`Mark ${i + 1} of ${target}`}
              />
            ))}
          </div>
        )}
        <ActionMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function TodayView({
  habits, addHabit, setHabitCount, editHabit, deleteHabit, reorderHabits,
  groups, addGroup, toggleGroupCollapsed, deleteGroup,
  onBeginNewDay,
  weeklyHabits, setWeeklyHabits,
  intervalHabits, setIntervalHabits,
  todos, toggleTodo, removeFromFocus, reorderFocusTodos, makeFocus, focusChore,
  todoSectionCollapsed, setTodoSectionCollapsed,
  isHolidayMode, toggleHolidayMode,
  chores, resetChore,
  notes, setNotes, activeNoteId, setActiveNoteId,
  renameGroup, reorderGroups,
  dailyNoteText, setDailyNoteText, dailyNoteImage, setDailyNoteImage,
  dailyPriorities, setDailyPriorities,
}) {
  const [name, setName] = useState('');
  const [newTarget, setNewTarget] = useState(1);
  const [newCadence, setNewCadence] = useState('day');
  const [newSkipHoliday, setNewSkipHoliday] = useState(false);
  const [newGroupId, setNewGroupId] = useState('');
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDragId, setGroupDragId] = useState(null);
  const [groupDragOverId, setGroupDragOverId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupEditName, setGroupEditName] = useState('');

  const [editingHabit, setEditingHabit] = useState(null);
  const [editDraft, setEditDraft] = useState({ name: '', targetCount: 1, groupId: '', cadence: 'day', skipOnHoliday: false });

  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [wName, setWName] = useState('');
  const [wDays, setWDays] = useState([]);
  const [editingWeekly, setEditingWeekly] = useState(null);
  const [editWeeklyDraft, setEditWeeklyDraft] = useState({ name: '', days: [], skipOnHoliday: false });

  const [intervalOpen, setIntervalOpen] = useState(false);
  const [iName, setIName] = useState('');
  const [iVal, setIVal] = useState(2);
  const [iUnit, setIUnit] = useState('weeks');
  const [editingInterval, setEditingInterval] = useState(null);
  const [editIntervalDraft, setEditIntervalDraft] = useState({ name: '', intervalVal: 2, intervalUnit: 'weeks', skipOnHoliday: false });

  function submitHabit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    addHabit({ name: name.trim(), targetCount: parseInt(newTarget, 10) || 1, cadence: newCadence, skipOnHoliday: newSkipHoliday, groupId: newGroupId || null });
    setName('');
    setNewTarget(1);
    setNewCadence('day');
    setNewSkipHoliday(false);
    setNewGroupId('');
  }

  function submitGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    addGroup(groupName.trim());
    setGroupName('');
    setAddingGroup(false);
  }

  function startEditGroup(group) {
    setGroupEditName(group.name);
    setEditingGroupId(group.id);
  }
  function commitEditGroup(id) {
    if (groupEditName.trim()) renameGroup(id, groupEditName.trim());
    setEditingGroupId(null);
  }

  function openEdit(habit) {
    setEditDraft({ name: habit.name, targetCount: habit.targetCount || 1, groupId: habit.groupId || '', cadence: habit.cadence || 'day', skipOnHoliday: !!habit.skipOnHoliday });
    setEditingHabit(habit);
  }
  function submitEdit(e) {
    e.preventDefault();
    editHabit(editingHabit.id, { name: editDraft.name, targetCount: parseInt(editDraft.targetCount, 10) || 1, groupId: editDraft.groupId || null, cadence: editDraft.cadence, skipOnHoliday: editDraft.skipOnHoliday });
    setEditingHabit(null);
  }

  function toggleWDay(day) {
    if (day === 'weekend') {
      setWDays((prev) => (hasWeekend(prev) ? prev.filter((d) => d !== 'sat' && d !== 'sun') : [...prev, 'sat', 'sun']));
      return;
    }
    setWDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function addWeeklyHabit(e) {
    e.preventDefault();
    if (!wName.trim() || wDays.length === 0) return;
    setWeeklyHabits([...weeklyHabits, { id: Date.now(), name: wName.trim(), days: wDays, skipOnHoliday: false }]);
    setWName('');
    setWDays([]);
  }
  function deleteWeeklyHabit(id) {
    setWeeklyHabits(weeklyHabits.filter((w) => w.id !== id));
  }
  function toggleWeeklySkipHoliday(id) {
    setWeeklyHabits(weeklyHabits.map((w) => (w.id === id ? { ...w, skipOnHoliday: !w.skipOnHoliday } : w)));
  }

  function openEditWeekly(w) {
    setEditWeeklyDraft({ name: w.name, days: [...w.days], skipOnHoliday: !!w.skipOnHoliday });
    setEditingWeekly(w);
  }
  function toggleEditWeeklyDay(day) {
    if (day === 'weekend') {
      setEditWeeklyDraft((prev) => ({
        ...prev,
        days: hasWeekend(prev.days) ? prev.days.filter((d) => d !== 'sat' && d !== 'sun') : [...prev.days, 'sat', 'sun'],
      }));
      return;
    }
    setEditWeeklyDraft((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  }
  function submitEditWeekly(e) {
    e.preventDefault();
    if (!editWeeklyDraft.name.trim() || editWeeklyDraft.days.length === 0) return;
    setWeeklyHabits(
      weeklyHabits.map((w) =>
        w.id === editingWeekly.id ? { ...w, name: editWeeklyDraft.name.trim(), days: editWeeklyDraft.days, skipOnHoliday: editWeeklyDraft.skipOnHoliday } : w
      )
    );
    setEditingWeekly(null);
  }

  function intervalMsFor(ih) {
    return ih.intervalVal * (ih.intervalUnit === 'months' ? 30 : 7) * 24 * 60 * 60 * 1000;
  }
  function intervalStatus(ih) {
    const remaining = intervalMsFor(ih) - (Date.now() - ih.lastShown);
    const daysLeft = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    return daysLeft <= 0 ? 'Ready' : `${daysLeft}d left`;
  }
  function addIntervalHabit(e) {
    e.preventDefault();
    if (!iName.trim() || !iVal) return;
    setIntervalHabits([...intervalHabits, { id: Date.now(), name: iName.trim(), intervalVal: parseInt(iVal, 10) || 1, intervalUnit: iUnit, lastShown: Date.now(), skipOnHoliday: false }]);
    setIName('');
    setIVal(2);
  }
  function deleteIntervalHabit(id) {
    setIntervalHabits(intervalHabits.filter((ih) => ih.id !== id));
  }
  function toggleIntervalSkipHoliday(id) {
    setIntervalHabits(intervalHabits.map((ih) => (ih.id === id ? { ...ih, skipOnHoliday: !ih.skipOnHoliday } : ih)));
  }
  function openEditInterval(ih) {
    setEditIntervalDraft({ name: ih.name, intervalVal: ih.intervalVal, intervalUnit: ih.intervalUnit, skipOnHoliday: !!ih.skipOnHoliday });
    setEditingInterval(ih);
  }
  function submitEditInterval(e) {
    e.preventDefault();
    if (!editIntervalDraft.name.trim()) return;
    setIntervalHabits(
      intervalHabits.map((ih) =>
        ih.id === editingInterval.id
          ? { ...ih, name: editIntervalDraft.name.trim(), intervalVal: parseInt(editIntervalDraft.intervalVal, 10) || 1, intervalUnit: editIntervalDraft.intervalUnit, skipOnHoliday: editIntervalDraft.skipOnHoliday }
          : ih
      )
    );
    setEditingInterval(null);
  }

  const focusItems = todos.filter((t) => t.isFocus && !t.completed);

  // Hide a habit the moment it's completed — it reappears next time its
  // cadence brings it back around, instead of sitting there struck-through.
  const visibleHabits = habits.filter((h) => !h.completed && !(isHolidayMode && h.skipOnHoliday));

  const overdueChores = chores.filter((c) => isChoreOverdue(c) && !(isHolidayMode && c.skipOnHoliday));
  const urgentTodos = todos.filter((t) => !t.completed && t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
  const showBanner = overdueChores.length > 0 || urgentTodos.length > 0;

  const ungroupedHabits = visibleHabits.filter((h) => !h.groupId);

  function habitDragProps(h) {
    return {
      onDragStart: () => setDragId(h.id),
      onDragOver: (e) => { e.preventDefault(); setDragOverId(h.id); },
      onDragLeave: () => setDragOverId(null),
      onDrop: (e) => {
        e.stopPropagation();
        if (dragId) reorderHabits(dragId, h.id, h.groupId || null);
        setDragId(null);
        setDragOverId(null);
      },
    };
  }

  function groupContainerDropProps(groupId) {
    return {
      onDragOver: (e) => e.preventDefault(),
      onDrop: () => {
        if (dragId) reorderHabits(dragId, null, groupId || null);
        setDragId(null);
        setDragOverId(null);
      },
    };
  }

  return (
    <div className="view">
      <DailyNote text={dailyNoteText} setText={setDailyNoteText} image={dailyNoteImage} setImage={setDailyNoteImage} />

      <TopPriorities priorities={dailyPriorities} setPriorities={setDailyPriorities} />

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

      {focusItems.length > 0 && (
        <div className="collapsible">
          <button className="collapsible-header" onClick={() => setTodoSectionCollapsed(!todoSectionCollapsed)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {todoSectionCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              Daily focus
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({focusItems.length})</span>
            </span>
          </button>
          {!todoSectionCollapsed && (
            <div className="collapsible-body" style={{ padding: 0 }}>
              {focusItems.map((todo) => (
                <div
                  key={todo.id}
                  className={`day-row day-row-todo ${dragOverId === todo.id ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={() => setDragId(todo.id)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(todo.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={() => { if (dragId) reorderFocusTodos(dragId, todo.id); setDragId(null); setDragOverId(null); }}
                >
                  <div className="card-left">
                    <span className="card-label" style={{ fontWeight: 500 }}>{todo.name}</span>
                    {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
                    {todo.isWork && <span className="pill pill-muted">Work</span>}
                  </div>
                  <div className="day-row-actions" draggable={false} onDragStart={(e) => e.stopPropagation()}>
                    <button className="btn btn-primary btn-sm" onClick={() => toggleTodo(todo.id)}>Done</button>
                    <button className="btn-ghost btn-danger" onClick={() => removeFromFocus(todo.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
          return (
            <div
              className={`day-section ${groupDragOverId === group.id ? 'group-drag-over' : ''}`}
              key={group.id}
              draggable={editingGroupId !== group.id}
              onDragStart={() => setGroupDragId(group.id)}
              onDragOver={(e) => { e.preventDefault(); setGroupDragOverId(group.id); }}
              onDragLeave={() => setGroupDragOverId(null)}
              onDrop={() => {
                if (groupDragId) {
                  reorderGroups(groupDragId, group.id);
                  setGroupDragId(null);
                  setGroupDragOverId(null);
                } else if (dragId) {
                  reorderHabits(dragId, null, group.id);
                  setDragId(null);
                  setDragOverId(null);
                }
                setGroupDragOverId(null);
              }}
            >
              <div className="day-section-header group-header">
                <span
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => toggleGroupCollapsed(group.id)}
                >
                  {group.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  {editingGroupId === group.id ? (
                    <input
                      type="text"
                      className="group-name-input"
                      value={groupEditName}
                      onChange={(e) => setGroupEditName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => commitEditGroup(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEditGroup(group.id); }
                        if (e.key === 'Escape') { e.preventDefault(); setEditingGroupId(null); }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{group.name}</span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({items.length})</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span
                    role="button"
                    tabIndex={0}
                    className="btn-ghost"
                    style={{ fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); startEditGroup(group); }}
                  >
                    Rename
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    className="btn-ghost btn-danger"
                    style={{ fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                  >
                    Remove group
                  </span>
                </span>
              </div>
              {!group.collapsed && (
                <div className="day-section-body" {...groupContainerDropProps(group.id)}>
                  {items.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 16px' }}>No habits in this group yet — drag one here.</p>
                  ) : (
                    items.map((habit) => (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        dragOver={dragOverId === habit.id}
                        setHabitCount={setHabitCount}
                        onEdit={() => openEdit(habit)}
                        onDelete={() => deleteHabit(habit.id)}
                        {...habitDragProps(habit)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="day-section" {...groupContainerDropProps(null)}>
          {groups.length > 0 && ungroupedHabits.length > 0 && (
            <div className="day-section-label">Ungrouped</div>
          )}
          <div className="day-section-body">
            {ungroupedHabits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                dragOver={dragOverId === habit.id}
                setHabitCount={setHabitCount}
                onEdit={() => openEdit(habit)}
                onDelete={() => deleteHabit(habit.id)}
                {...habitDragProps(habit)}
              />
            ))}
            {ungroupedHabits.length === 0 && groups.length === 0 && (
              <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>No habits yet — add one below.</div>
            )}
          </div>
        </div>
      </div>

      {addingGroup ? (
        <form className="form-row" onSubmit={submitGroup} style={{ marginTop: -6 }}>
          <input type="text" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} autoFocus />
          <button type="submit" className="btn btn-primary">Add group</button>
          <button type="button" className="btn" onClick={() => setAddingGroup(false)}>Cancel</button>
        </form>
      ) : (
        <button className="btn" style={{ marginTop: -6, marginBottom: 20 }} onClick={() => setAddingGroup(true)}>
          <Plus size={13} /> New group
        </button>
      )}

      <form className="form-row" onSubmit={submitHabit}>
        <input type="text" placeholder="Add a habit" value={name} onChange={(e) => setName(e.target.value)} required />
        <input
          type="number"
          min="1"
          value={newTarget}
          onChange={(e) => setNewTarget(e.target.value)}
          style={{ width: 56 }}
          title={newCadence === 'day' ? 'How many times per day (e.g. 3 for 3 glasses of water)' : `How many times per ${newCadence}`}
        />
        <select value={newCadence} onChange={(e) => setNewCadence(e.target.value)}>
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
        <select value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)}>
          <option value="">No group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <label className="toggle-pill">
          <input type="checkbox" checked={newSkipHoliday} onChange={(e) => setNewSkipHoliday(e.target.checked)} />
          <Plane size={12} /> Pause on holiday
        </label>
        <button type="submit" className="btn btn-primary">Add habit</button>
      </form>
      {newCadence !== 'day' && (
        <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: -14, marginBottom: 20 }}>
          A {newCadence}ly goal carries over the whole {newCadence} and only resets once a new {newCadence} starts — missing a day won't count against it.
        </p>
      )}

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
                <button
                  type="button"
                  className={`weekday-chip ${hasWeekend(wDays) ? 'selected' : ''}`}
                  onClick={() => toggleWDay('weekend')}
                  title="Weekend (Saturday & Sunday)"
                >
                  {WEEKEND_CHIP.label}
                </button>
                <button type="submit" className="btn btn-primary" style={{ marginLeft: 8 }}>Add</button>
              </div>
            </form>

            {weeklyHabits.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No day-specific habits yet.</p>
            ) : (
              [...weeklyHabits]
                .sort((a, b) => firstDayIndex(a.days) - firstDayIndex(b.days))
                .map((w) => (
                <div className="weekly-habit-row" key={w.id}>
                  <div className="weekly-habit-info">
                    <span style={{ fontSize: 13 }}>{w.name}</span>
                    <div className="weekly-habit-days">
                      {dayBadges(w.days).map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      className="chore-remove"
                      style={w.skipOnHoliday ? { color: 'var(--navy)' } : undefined}
                      onClick={() => toggleWeeklySkipHoliday(w.id)}
                      title={w.skipOnHoliday ? 'Pauses while holiday mode is on — click to unpause' : 'Pause this habit during holiday mode'}
                    >
                      <Plane size={14} />
                    </button>
                    <button className="chore-remove" onClick={() => openEditWeekly(w)} aria-label="Edit">
                      <Pencil size={13} />
                    </button>
                    <button className="chore-remove" onClick={() => deleteWeeklyHabit(w.id)} aria-label="Delete">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="collapsible">
        <button className="collapsible-header" onClick={() => setIntervalOpen((o) => !o)}>
          Recurring habits
          <span className="chev">{intervalOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
        </button>
        {intervalOpen && (
          <div className="collapsible-body">
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              For things that come up every few weeks or months, like "every 2 weeks" or "every 3 months" — it shows up in the list above once due, then disappears again until it's due next.
            </p>
            <form onSubmit={addIntervalHabit} style={{ marginBottom: 14 }}>
              <div className="form-row">
                <input type="text" placeholder="Habit name" value={iName} onChange={(e) => setIName(e.target.value)} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>every</span>
                <input type="number" min="1" value={iVal} onChange={(e) => setIVal(e.target.value)} style={{ width: 56 }} />
                <select value={iUnit} onChange={(e) => setIUnit(e.target.value)}>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
                <button type="submit" className="btn btn-primary">Add</button>
              </div>
            </form>

            {intervalHabits.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No recurring habits yet.</p>
            ) : (
              [...intervalHabits]
                .sort((a, b) => (intervalMsFor(a) - (Date.now() - a.lastShown)) - (intervalMsFor(b) - (Date.now() - b.lastShown)))
                .map((ih) => (
                  <div className="weekly-habit-row" key={ih.id}>
                    <div className="weekly-habit-info">
                      <span style={{ fontSize: 13 }}>{ih.name}</span>
                      <span className="tag">every {ih.intervalVal} {ih.intervalUnit}</span>
                      <span className={`chore-status ${intervalStatus(ih) === 'Ready' ? 'overdue' : 'ok'}`}>{intervalStatus(ih)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button
                        className="chore-remove"
                        style={ih.skipOnHoliday ? { color: 'var(--navy)' } : undefined}
                        onClick={() => toggleIntervalSkipHoliday(ih.id)}
                        title={ih.skipOnHoliday ? 'Pauses while holiday mode is on — click to unpause' : 'Pause this habit during holiday mode'}
                      >
                        <Plane size={14} />
                      </button>
                      <button className="chore-remove" onClick={() => openEditInterval(ih)} aria-label="Edit">
                        <Pencil size={13} />
                      </button>
                      <button className="chore-remove" onClick={() => deleteIntervalHabit(ih.id)} aria-label="Delete">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      <NotesWidget notes={notes} setNotes={setNotes} activeNoteId={activeNoteId} setActiveNoteId={setActiveNoteId} />

      {editingHabit && (
        <div className="modal-backdrop" onClick={() => setEditingHabit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit habit</h2>
            <form onSubmit={submitEdit}>
              <div className="modal-row">
                <label>Name</label>
                <input
                  type="text"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="modal-row">
                <label>Repeats</label>
                <select
                  value={editDraft.cadence}
                  onChange={(e) => setEditDraft({ ...editDraft, cadence: e.target.value })}
                >
                  <option value="day">Daily</option>
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </div>
              <div className="modal-row">
                <label>{editDraft.cadence === 'day' ? 'Times per day' : `Times per ${editDraft.cadence}`}</label>
                <input
                  type="number"
                  min="1"
                  value={editDraft.targetCount}
                  onChange={(e) => setEditDraft({ ...editDraft, targetCount: e.target.value })}
                />
              </div>
              <div className="modal-row">
                <label>Group</label>
                <select value={editDraft.groupId || ''} onChange={(e) => setEditDraft({ ...editDraft, groupId: e.target.value })}>
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-row">
                <label className="toggle-pill" style={{ width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={editDraft.skipOnHoliday}
                    onChange={(e) => setEditDraft({ ...editDraft, skipOnHoliday: e.target.checked })}
                  />
                  <Plane size={12} /> Pause on holiday
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditingHabit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingWeekly && (
        <div className="modal-backdrop" onClick={() => setEditingWeekly(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit day-specific habit</h2>
            <form onSubmit={submitEditWeekly}>
              <div className="modal-row">
                <label>Name</label>
                <input
                  type="text"
                  value={editWeeklyDraft.name}
                  onChange={(e) => setEditWeeklyDraft({ ...editWeeklyDraft, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="modal-row">
                <label>Days</label>
                <div className="weekday-row">
                  {WEEKDAYS.map((d) => (
                    <button
                      type="button"
                      key={d.key}
                      className={`weekday-chip ${editWeeklyDraft.days.includes(d.key) ? 'selected' : ''}`}
                      onClick={() => toggleEditWeeklyDay(d.key)}
                    >
                      {d.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`weekday-chip ${hasWeekend(editWeeklyDraft.days) ? 'selected' : ''}`}
                    onClick={() => toggleEditWeeklyDay('weekend')}
                    title="Weekend (Saturday & Sunday)"
                  >
                    {WEEKEND_CHIP.label}
                  </button>
                </div>
              </div>
              <div className="modal-row">
                <label className="toggle-pill" style={{ width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={editWeeklyDraft.skipOnHoliday}
                    onChange={(e) => setEditWeeklyDraft({ ...editWeeklyDraft, skipOnHoliday: e.target.checked })}
                  />
                  <Plane size={12} /> Pause on holiday
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditingWeekly(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingInterval && (
        <div className="modal-backdrop" onClick={() => setEditingInterval(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit recurring habit</h2>
            <form onSubmit={submitEditInterval}>
              <div className="modal-row">
                <label>Name</label>
                <input
                  type="text"
                  value={editIntervalDraft.name}
                  onChange={(e) => setEditIntervalDraft({ ...editIntervalDraft, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="modal-row">
                <label>Repeats every</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={editIntervalDraft.intervalVal}
                    onChange={(e) => setEditIntervalDraft({ ...editIntervalDraft, intervalVal: e.target.value })}
                    style={{ width: 80 }}
                  />
                  <select
                    value={editIntervalDraft.intervalUnit}
                    onChange={(e) => setEditIntervalDraft({ ...editIntervalDraft, intervalUnit: e.target.value })}
                  >
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
              <div className="modal-row">
                <label className="toggle-pill" style={{ width: 'fit-content' }}>
                  <input
                    type="checkbox"
                    checked={editIntervalDraft.skipOnHoliday}
                    onChange={(e) => setEditIntervalDraft({ ...editIntervalDraft, skipOnHoliday: e.target.checked })}
                  />
                  <Plane size={12} /> Pause on holiday
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditingInterval(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
