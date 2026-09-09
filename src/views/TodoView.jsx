import { useState, useRef, useEffect } from 'react';
import { Square, X, Sparkles, Plane, Sun, CalendarDays } from 'lucide-react';
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

function TodoRow({ todo, index, items, toggleTodo, updateName, setDueDate, toggleSkipHoliday, toggleWeekendOnly, deleteTodo, makeFocus, insertAfter, focusPrevious, inputRefs }) {
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
    <div className="card todo-checklist-row">
      <div className="card-left" style={{ flex: 1 }}>
        <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark complete">
          <Square size={16} />
        </button>
        <input
          ref={(el) => { if (el) inputRefs.current[todo.id] = el; else delete inputRefs.current[todo.id]; }}
          type="text"
          className="todo-inline-input"
          placeholder="Add a task…"
          value={todo.name}
          onChange={(e) => updateName(todo.id, e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <IconToggle active={todo.skipOnHoliday} onClick={() => toggleSkipHoliday(todo.id)} icon={Plane} label={todo.skipOnHoliday ? 'Pauses on holiday — click to unpause' : 'Pause this task during holiday mode'} />
        <IconToggle active={todo.weekendOnly} onClick={() => toggleWeekendOnly(todo.id)} icon={Sun} label={todo.weekendOnly ? 'Only pulled in on weekends — click to allow any day' : 'Only relevant on weekends'} />
        <DeadlineButton dueDate={todo.dueDate} onSelect={(d) => setDueDate(todo.id, d)} onClear={() => setDueDate(todo.id, '')} />
        <button className="btn btn-sm" onClick={() => makeFocus(todo.id)}><Sparkles size={12} /> Focus</button>
        <button className="chore-remove" onClick={() => deleteTodo(todo.id)} aria-label="Delete">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function TodoSection({ title, items, toggleTodo, updateName, setDueDate, toggleSkipHoliday, toggleWeekendOnly, deleteTodo, makeFocus, insertAfter, appendBlank }) {
  const inputRefs = useRef({});
  const pendingFocusId = useRef(null);

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

  function handleInsertAfter(afterId) {
    const newId = insertAfter(afterId);
    pendingFocusId.current = newId;
  }

  function handleFocusPrevious(id) {
    pendingFocusId.current = id;
  }

  return (
    <div className="bank-box">
      <h3 className="section-title" style={{ marginBottom: 10 }}>{title}</h3>
      <div className="bank-list">
        {items.map((todo, i) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            index={i}
            items={items}
            toggleTodo={toggleTodo}
            updateName={updateName}
            setDueDate={setDueDate}
            toggleSkipHoliday={toggleSkipHoliday}
            toggleWeekendOnly={toggleWeekendOnly}
            deleteTodo={deleteTodo}
            makeFocus={makeFocus}
            insertAfter={handleInsertAfter}
            focusPrevious={handleFocusPrevious}
            inputRefs={inputRefs}
          />
        ))}
      </div>
    </div>
  );
}

export default function TodoView({
  todos, setTodos, toggleTodo, deleteTodo, makeFocus,
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
      isWork,
    };
  }

  function appendBlank(isWork) {
    setTodos((prev) => [...prev, blankTodo(isWork)]);
  }

  function insertAfter(afterId, isWork) {
    const newTodo = blankTodo(isWork);
    setTodos((prev) => {
      const idx = prev.findIndex((t) => t.id === afterId);
      if (idx === -1) return [...prev, newTodo];
      const next = [...prev];
      next.splice(idx + 1, 0, newTodo);
      return next;
    });
    return newTodo.id;
  }

  function updateName(id, name) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  function setDueDate(id, dueDate) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate } : t)));
  }

  const workItems = todos.filter((t) => !t.isFocus && !t.completed && t.isWork);
  const personalItems = todos.filter((t) => !t.isFocus && !t.completed && !t.isWork);

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
        deleteTodo={deleteTodo}
        makeFocus={makeFocus}
        insertAfter={(afterId) => insertAfter(afterId, false)}
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
        deleteTodo={deleteTodo}
        makeFocus={makeFocus}
        insertAfter={(afterId) => insertAfter(afterId, true)}
        appendBlank={() => appendBlank(true)}
      />
    </div>
  );
}
