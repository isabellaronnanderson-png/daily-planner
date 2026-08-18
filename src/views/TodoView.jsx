import { useState, useRef, useEffect } from 'react';
import { Check, Square, X, Sparkles } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import CategoryTag from '../components/CategoryTag';
import { CATEGORIES, CATEGORY_ORDER } from '../data/categories';

function isChoreOverdue(chore) {
  const totalGoalMs = chore.freqVal * (chore.freqUnit === 'weeks' ? 7 : chore.freqUnit === 'months' ? 30 : 1) * 24 * 60 * 60 * 1000;
  return Date.now() - chore.lastDone >= totalGoalMs;
}

export default function TodoView({
  todos, setTodos,
  isHolidayMode, setIsHolidayMode,
  scheduleTasks, setScheduleTasks,
  chores, resetChore,
  scratchpad, setScratchpad,
  goToSchedule,
}) {
  const [dragId, setDragId] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const nameRef = useRef(null);
  const catRef = useRef(null);
  const durRef = useRef(null);
  const dateRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [scratchpad]);

  function isWeekendOrHoliday() {
    const day = new Date().getDay();
    return day === 0 || day === 6 || isHolidayMode;
  }

  function addTodo(e) {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) return;
    setTodos([
      ...todos,
      {
        id: 't_' + Date.now(),
        name,
        category: catRef.current.value,
        durationMins: parseInt(durRef.current.value, 10) || 30,
        dueDate: dateRef.current.value,
        isFocus: false,
        completed: false,
        completedAt: null,
      },
    ]);
    nameRef.current.value = '';
    dateRef.current.value = '';
  }

  function toggleTodo(id) {
    setTodos(
      todos.map((t) => {
        if (t.id !== id) return t;
        const nextDone = !t.completed;
        if (nextDone && t.choreId) resetChore(t.choreId);
        return { ...t, completed: nextDone, completedAt: nextDone ? Date.now() : null, isFocus: false };
      })
    );
    setScheduleTasks(scheduleTasks.map((s) => (s.todoId === id ? { ...s, completed: !s.completed } : s)));
  }

  function editTodo(id) {
    const todo = todos.find((t) => t.id === id);
    const newName = prompt('Edit task', todo.name);
    if (newName && newName.trim()) {
      setTodos(todos.map((t) => (t.id === id ? { ...t, name: newName.trim() } : t)));
    }
  }

  function deleteTodo(id) {
    setTodos(todos.filter((t) => t.id !== id));
    setScheduleTasks(scheduleTasks.filter((s) => s.todoId !== id));
  }

  function makeFocus(id) {
    const active = todos.filter((t) => t.isFocus && !t.completed);
    if (active.length >= 3) {
      alert('Your three focus slots are full. Complete or remove one first.');
      return;
    }
    setTodos(todos.map((t) => (t.id === id ? { ...t, isFocus: true } : t)));
  }

  function removeFromFocus(id) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, isFocus: false } : t)));
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
        {
          id: 's_' + Date.now(),
          todoId: target.id,
          name: target.name,
          topPx,
          durationMins: target.durationMins || 30,
          category: target.category || 'personal',
          completed: target.completed,
        },
      ]);
    }
    goToSchedule();
  }

  function handleDropFocus(slotIndex) {
    if (!dragId) return;
    const target = todos.find((t) => t.id === dragId);
    if (target && !target.completed) makeFocus(dragId);
    setDragOverSlot(null);
    setDragId(null);
  }

  function toggleHolidayMode() {
    const next = !isHolidayMode;
    setIsHolidayMode(next);
    if (next) {
      setTodos(todos.map((t) => (t.isFocus && t.category === 'work' ? { ...t, isFocus: false } : t)));
    }
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

  const focusItems = todos.filter((t) => t.isFocus && !t.completed);
  const workMins = focusItems.filter((t) => t.category === 'work').reduce((s, i) => s + (i.durationMins || 30), 0);
  const nonWorkMins = focusItems.filter((t) => t.category !== 'work').reduce((s, i) => s + (i.durationMins || 30), 0);
  const overCapacity = workMins > 120 || nonWorkMins > 60;

  const weekendOrHoliday = isWeekendOrHoliday();
  let bankItems = todos.filter((t) => !t.isFocus && !t.completed);
  if (weekendOrHoliday) bankItems = bankItems.filter((t) => t.category !== 'work');
  bankItems = [...bankItems].sort((a, b) => {
    if (CATEGORY_ORDER[a.category] !== CATEGORY_ORDER[b.category]) return CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return 0;
  });

  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const vaultItems = todos.filter((t) => t.completed && t.completedAt && Date.now() - t.completedAt <= fourteenDays);

  const overdueChores = chores.filter(isChoreOverdue);
  const urgentTodos = todos.filter((t) => !t.completed && t.dueDate).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 3);
  const showBanner = overdueChores.length > 0 || urgentTodos.length > 0;

  const completedTodos = todos.filter((t) => t.completed);
  const catCounts = { work: 0, admin: 0, errands: 0, chores: 0, personal: 0 };
  completedTodos.forEach((t) => { if (catCounts[t.category] !== undefined) catCounts[t.category]++; });
  const total = completedTodos.length || 1;
  const maxCat = Object.keys(catCounts).reduce((a, b) => (catCounts[a] > catCounts[b] ? a : b));

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">Today's focus</h2>
        <label className="toggle-pill">
          <input type="checkbox" checked={isHolidayMode} onChange={toggleHolidayMode} />
          Holiday mode
        </label>
      </div>

      <div className="focus-list">
        {[0, 1, 2].map((i) => {
          const item = focusItems[i];
          return (
            <div
              key={i}
              className={`focus-row ${!item ? 'empty' : ''} ${dragOverSlot === i ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverSlot(i); }}
              onDragLeave={() => setDragOverSlot(null)}
              onDrop={() => handleDropFocus(i)}
            >
              {item ? (
                <>
                  <div className="focus-row-left">
                    <span className="focus-row-title">{item.name}</span>
                    <CategoryTag category={item.category} />
                    <span className="tag">{item.durationMins || 30}m</span>
                    {item.dueDate && <span className="pill pill-red">Due {item.dueDate}</span>}
                  </div>
                  <div className="focus-row-actions">
                    <button className="btn" onClick={() => promoteToSchedule(item.id)}>Schedule</button>
                    <button className="btn btn-primary" onClick={() => toggleTodo(item.id)}>Done</button>
                    <button className="btn-ghost btn-danger" onClick={() => removeFromFocus(item.id)}>Remove</button>
                  </div>
                </>
              ) : (
                <span className="focus-row-empty-text">Drag a task here</span>
              )}
            </div>
          );
        })}
      </div>
      <p className={`capacity-text ${overCapacity ? 'over' : ''}`}>
        Focus workload: {(workMins / 60).toFixed(1)}h work / 2.0h max &middot; {(nonWorkMins / 60).toFixed(1)}h other / 1.0h max
      </p>

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
                    <button
                      className="btn"
                      onClick={() => {
                        let todo = existing;
                        if (!todo) {
                          todo = { id: 't_' + Date.now(), choreId: chore.id, name: chore.name, category: 'chores', durationMins: 30, dueDate: '', isFocus: false, completed: false, completedAt: null };
                          setTodos((prev) => [...prev, todo]);
                        }
                        setTimeout(() => makeFocus(todo.id), 0);
                      }}
                    >
                      <Sparkles size={12} /> Focus
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={() => {
                      resetChore(chore.id);
                      setTodos(todos.map((t) => (t.choreId === chore.id ? { ...t, completed: true, completedAt: Date.now(), isFocus: false } : t)));
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

      <form className="form-row" onSubmit={addTodo} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8 }}>
        <input type="text" placeholder="Add a task" ref={nameRef} required style={{ minWidth: 0 }} />
        <select ref={catRef} defaultValue="work">
          {Object.entries(CATEGORIES).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        <select ref={durRef} defaultValue="30">
          <option value="15">15 min</option>
          <option value="30">30 min</option>
          <option value="45">45 min</option>
          <option value="60">1 hour</option>
          <option value="90">1.5 hours</option>
          <option value="120">2 hours</option>
        </select>
        <input type="date" ref={dateRef} />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      <div className="bank-box">
        <h3 className="section-title" style={{ marginBottom: 10 }}>Task bank</h3>
        <div className="bank-list">
          {bankItems.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>Nothing waiting right now.</div>}
          {bankItems.map((todo) => (
            <div
              key={todo.id}
              className="card"
              draggable
              onDragStart={() => setDragId(todo.id)}
            >
              <div className="card-left">
                <span className="card-label" style={{ fontWeight: 500 }}>{todo.name}</span>
                <CategoryTag category={todo.category} />
                <span className="tag">{todo.durationMins || 30}m</span>
                {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button className="btn" onClick={() => makeFocus(todo.id)}><Sparkles size={12} /> Focus</button>
                <button className="btn btn-primary" onClick={() => toggleTodo(todo.id)}>Done</button>
                <ActionMenu onEdit={() => editTodo(todo.id)} onDelete={() => deleteTodo(todo.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="balance-box">
        <h4>Completed task balance</h4>
        <div className="balance-bar">
          {Object.keys(catCounts).map((cat) => (
            <div key={cat} style={{ width: `${(catCounts[cat] / total) * 100}%`, background: CATEGORIES[cat].color }} title={CATEGORIES[cat].label} />
          ))}
        </div>
        <p className="balance-warning">
          {completedTodos.length === 0
            ? 'Complete tasks to see your category balance.'
            : catCounts[maxCat] / total > 0.5
            ? `Completed tasks lean heavily toward ${CATEGORIES[maxCat].label.toLowerCase()}. Worth shifting focus.`
            : 'Completed tasks are fairly balanced across categories.'}
        </p>
      </div>

      <div className="vault-box">
        <h3 className="section-title" style={{ marginBottom: 10 }}>Recently completed</h3>
        <div className="vault-list">
          {vaultItems.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Nothing completed in the last two weeks yet.</div>}
          {vaultItems.map((todo) => (
            <div className="card completed" key={todo.id}>
              <div className="card-left">
                <span className="card-label">{todo.name}</span>
                <CategoryTag category={todo.category} />
              </div>
              <button className="btn-ghost" onClick={() => toggleTodo(todo.id)}>Reopen</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
