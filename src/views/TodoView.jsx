import { useState, useRef, useEffect } from 'react';
import { Check, X, Sparkles, Plane, Sun, CalendarDays, Flag } from 'lucide-react';
import CalendarPopover from '../components/CalendarPopover';

function IconToggle({ active, onClick, icon: Icon, label, activeColor = 'var(--navy)' }) {
  return (
    <span className="icon-tooltip-wrap">
      <button className="chore-remove" style={active ? { color: activeColor } : undefined} onClick={onClick}>
        <Icon size={14} />
      </button>
      <span className="icon-tooltip-bubble">{label}</span>
    </span>
  );
}

function DeadlineButton({ dueDate, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <span className="icon-tooltip-wrap" ref={wrapRef} style={{ position: 'relative' }}>
      <button
        className="chore-remove"
        style={dueDate ? { color: 'var(--red-light)' } : undefined}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <CalendarDays size={14} />
      </button>
      <span className="icon-tooltip-bubble">{dueDate ? `Due ${dueDate} — click to change` : 'Add a deadline'}</span>
      {open && <CalendarPopover value={dueDate} onSelect={onSelect} onClear={onClear} onClose={() => setOpen(false)} />}
    </span>
  );
}

function TodoRow({ todo, index, items, toggleTodo, updateName, setDueDate, toggleSkipHoliday, toggleWeekendOnly, toggleLongTerm, deleteTodo, makeFocus, removeFromFocus, insertAfter, focusPrevious, inputRefs, onFocusRow, onBlurRow }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!todo.name.trim()) return;
      insertAfter(todo.id);
    } else if (e.key === 'Backspace' && todo.name === '' && items.length > 1) {
      e.preventDefault();
      const prevItem = items[index - 1];
      deleteTodo(todo.id);
      if (prevItem) focusPrevious(prevItem.id);
    }
  }

  return (
    <div className={`card todo-checklist-row ${todo.isFocus ? 'todo-in-today' : ''}`}>
      <div className="card-left" style={{ flex: 1 }}>
        <button className="chore-done-btn" onClick={() => toggleTodo(todo.id)} aria-label="Mark done" title="Mark done">
          <Check size={14} />
        </button>
        <input
          ref={(el) => { if (el) inputRefs.current[todo.id] = el; else delete inputRefs.current[todo.id]; }}
          type="text"
          className="todo-inline-input"
          placeholder="Add a task…"
          value={todo.name}
          onChange={(e) => updateName(todo.id, e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusRow(todo.id)}
          onBlur={() => onBlurRow(todo.id)}
        />
        {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
        {todo.isFocus && <span className="pill pill-muted">In Today</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <IconToggle active={todo.longTerm} onClick={() => toggleLongTerm(todo.id)} icon={Flag} label={todo.longTerm ? "Long-term — won't be pulled into Today automatically" : 'Mark as long-term (kept out of daily pulls)'} />
        <IconToggle active={todo.skipOnHoliday} onClick={() => toggleSkipHoliday(todo.id)} icon={Plane} label={todo.skipOnHoliday ? 'Pauses on holiday — click to unpause' : 'Pause this task during holiday mode'} />
        <IconToggle active={todo.weekendOnly} onClick={() => toggleWeekendOnly(todo.id)} icon={Sun} label={todo.weekendOnly ? 'Only pulled in on weekends — click to allow any day' : 'Only relevant on weekends'} />
        <DeadlineButton dueDate={todo.dueDate} onSelect={(d) => setDueDate(todo.id, d)} onClear={() => setDueDate(todo.id, '')} />
        {todo.isFocus ? (
          <button className="btn-ghost btn-danger" onClick={() => removeFromFocus(todo.id)}>Remove from Today</button>
        ) : (
          <IconToggle active={false} onClick={() => makeFocus(todo.id)} icon={Sparkles} label="Pull into Today" activeColor="var(--navy)" />
        )}
        <button className="chore-remove" onClick={() => deleteTodo(todo.id)} aria-label="Delete">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function TodoSection({ title, items, toggleTodo, updateName, setDueDate, toggleSkipHoliday, toggleWeekendOnly, toggleLongTerm, deleteTodo, makeFocus, removeFromFocus, appendBlank }) {
  const inputRefs = useRef({});
  const pendingFocusId = useRef(null);
  // The row currently being typed in stays put, so clearing a task's text to
  // retype it doesn't make it jump to the bottom mid-edit.
  const [editingId, setEditingId] = useState(null);

  // Display order: Today items first, then everything else, then blank slots.
  // Within each group the saved order is kept (so Today items match the
  // order on the Today tab). This is display-only — stored order is untouched.
  const isBlank = (t) => t.name.trim() === '' && t.id !== editingId;
  const groupOf = (t) => (isBlank(t) ? 2 : t.isFocus ? 0 : 1);
  const sorted = items
    .map((t, i) => ({ t, i }))
    .sort((a, b) => groupOf(a.t) - groupOf(b.t) || a.i - b.i)
    .map(({ t }) => t);

  // Always keep exactly one blank row at the end, ready to type into —
  // like a notes app rather than a form you have to submit.
  useEffect(() => {
    const hasBlank = items.some((t) => t.name.trim() === '');
    if (!hasBlank) appendBlank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  useEffect(() => {
    if (pendingFocusId.current && inputRefs.current[pendingFocusId.current]) {
      inputRefs.current[pendingFocusId.current].focus();
      pendingFocusId.current = null;
    }
  }, [items]);

  // Enter jumps to the blank slot at the bottom (creating one if needed),
  // since blanks always live there now.
  function handleInsertAfter() {
    const blank = items.find((t) => t.name.trim() === '' && t.id !== editingId);
    if (blank) {
      inputRefs.current[blank.id]?.focus();
    } else {
      pendingFocusId.current = appendBlank();
    }
  }

  function handleFocusPrevious(id) {
    pendingFocusId.current = id;
  }

  function handleBlurRow(id) {
    setEditingId((cur) => (cur === id ? null : cur));
    // Tidy up: if a task was emptied out and there's already a blank slot,
    // drop the extra one rather than leaving two blanks.
    const row = items.find((t) => t.id === id);
    if (row && row.name.trim() === '') {
      const otherBlanks = items.filter((t) => t.id !== id && t.name.trim() === '');
      if (otherBlanks.length > 0) deleteTodo(id);
    }
  }

  return (
    <div className="bank-box">
      <h3 className="section-title" style={{ marginBottom: 10 }}>{title}</h3>
      <div className="bank-list">
        {sorted.map((todo, i) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            index={i}
            items={sorted}
            toggleTodo={toggleTodo}
            updateName={updateName}
            setDueDate={setDueDate}
            toggleSkipHoliday={toggleSkipHoliday}
            toggleWeekendOnly={toggleWeekendOnly}
            toggleLongTerm={toggleLongTerm}
            deleteTodo={deleteTodo}
            makeFocus={makeFocus}
            removeFromFocus={removeFromFocus}
            insertAfter={handleInsertAfter}
            focusPrevious={handleFocusPrevious}
            inputRefs={inputRefs}
            onFocusRow={setEditingId}
            onBlurRow={handleBlurRow}
          />
        ))}
      </div>
    </div>
  );
}

export default function TodoView({
  todos, setTodos, toggleTodo, deleteTodo, makeFocus, removeFromFocus,
  toggleTodoSkipHoliday, toggleTodoWeekendOnly, toggleTodoIsWork,
}) {
  function blankTodo(isWork) {
    return {
      id: 't_' + Date.now() + Math.random().toString(36).slice(2, 6),
      name: '',
      dueDate: '',
      isFocus: false,
      completed: false,
      completedAt: null,
      skipOnHoliday: false,
      weekendOnly: false,
      longTerm: false,
      isWork,
    };
  }

  function appendBlank(isWork) {
    const newTodo = blankTodo(isWork);
    setTodos((prev) => [...prev, newTodo]);
    return newTodo.id;
  }

  function updateName(id, name) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  function setDueDate(id, dueDate) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate } : t)));
  }

  function toggleLongTerm(id) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, longTerm: !t.longTerm } : t)));
  }

  const workItems = todos.filter((t) => !t.completed && t.isWork);
  const personalItems = todos.filter((t) => !t.completed && !t.isWork);

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">To-do</h2>
      </div>

      <TodoSection
        title="Personal"
        items={personalItems}
        toggleTodo={toggleTodo}
        updateName={updateName}
        setDueDate={setDueDate}
        toggleSkipHoliday={toggleTodoSkipHoliday}
        toggleWeekendOnly={toggleTodoWeekendOnly}
        toggleLongTerm={toggleLongTerm}
        deleteTodo={deleteTodo}
        makeFocus={makeFocus}
        removeFromFocus={removeFromFocus}
        appendBlank={() => appendBlank(false)}
      />

      <TodoSection
        title="Work"
        items={workItems}
        toggleTodo={toggleTodo}
        updateName={updateName}
        setDueDate={setDueDate}
        toggleSkipHoliday={toggleTodoSkipHoliday}
        toggleWeekendOnly={toggleTodoWeekendOnly}
        toggleLongTerm={toggleLongTerm}
        deleteTodo={deleteTodo}
        makeFocus={makeFocus}
        removeFromFocus={removeFromFocus}
        appendBlank={() => appendBlank(true)}
      />
    </div>
  );
}
