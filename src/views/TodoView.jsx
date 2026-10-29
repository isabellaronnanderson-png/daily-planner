import { useState, useRef, useEffect } from 'react';
import { Check, X, Sparkles, Plane, Sun, CalendarDays, CalendarRange, Flag, FolderInput, Plus } from 'lucide-react';
import CalendarPopover from '../components/CalendarPopover';
import { localDateKey } from '../lib/officeDays';
import { catIdOf, subIdOf } from '../lib/todoCategories';

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

// Native <select> laid invisibly over an icon: tapping the icon opens the
// system picker (nice on a phone), listing every list and section.
function MoveControl({ todo, categories, moveTodo }) {
  const current = `${catIdOf(todo, categories)}|${subIdOf(todo, categories) || ''}`;
  return (
    <span className="icon-tooltip-wrap">
      <button className="chore-remove" tabIndex={-1} aria-hidden="true"><FolderInput size={14} /></button>
      <select
        className="move-select"
        value={current}
        aria-label="Move to another list"
        onChange={(e) => {
          const [catId, subId] = e.target.value.split('|');
          moveTodo(todo.id, catId, subId || null);
        }}
      >
        {categories.map((cat) =>
          cat.subs.length === 0 ? (
            <option key={cat.id} value={`${cat.id}|`}>{cat.name}</option>
          ) : (
            <optgroup key={cat.id} label={cat.name}>
              <option value={`${cat.id}|`}>General</option>
              {cat.subs.map((sub) => (
                <option key={sub.id} value={`${cat.id}|${sub.id}`}>{sub.name}</option>
              ))}
            </optgroup>
          )
        )}
      </select>
      <span className="icon-tooltip-bubble">Move to another list</span>
    </span>
  );
}

function TodoRow({ todo, index, items, toggleTodo, updateName, setDueDate, toggleSkipHoliday, toggleWeekendOnly, toggleLongTerm, deleteTodo, makeFocus, removeFromFocus, insertAfter, focusPrevious, inputRefs, onFocusRow, onBlurRow, categories, moveTodo, toggleWeekFocus }) {
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
        {todo.weekFocus && !todo.isFocus && <span className="pill pill-muted">This week</span>}
        {todo.snoozeUntil && todo.snoozeUntil > localDateKey(new Date().toISOString()) && !todo.isFocus && (
          <span className="pill pill-muted">Saved for the weekend</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
        <IconToggle active={todo.longTerm} onClick={() => toggleLongTerm(todo.id)} icon={Flag} label={todo.longTerm ? "Long-term — won't be pulled into Today automatically" : 'Mark as long-term (kept out of daily pulls)'} />
        <IconToggle active={todo.skipOnHoliday} onClick={() => toggleSkipHoliday(todo.id)} icon={Plane} label={todo.skipOnHoliday ? 'Pauses on holiday — click to unpause' : 'Pause this task during holiday mode'} />
        <IconToggle active={todo.weekendOnly} onClick={() => toggleWeekendOnly(todo.id)} icon={Sun} label={todo.weekendOnly ? 'Only pulled in on weekends — click to allow any day' : 'Only relevant on weekends'} />
        <IconToggle active={todo.weekFocus} onClick={() => toggleWeekFocus(todo.id)} icon={CalendarRange} label={todo.weekFocus ? 'On the This week list — click to remove' : 'Add to the This week list'} activeColor="var(--navy)" />
        <MoveControl todo={todo} categories={categories} moveTodo={moveTodo} />
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

function TodoSection({ title, items, toggleTodo, updateName, setDueDate, toggleSkipHoliday, toggleWeekendOnly, toggleLongTerm, deleteTodo, makeFocus, removeFromFocus, appendBlank, ensureBlank, categories, moveTodo, toggleWeekFocus }) {
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

  // Always keep a blank row at the bottom, ready to type into — like a notes
  // app rather than a form you have to submit. The moment you start typing in
  // the last blank slot, a fresh one appears underneath it.
  const hasBlank = items.some((t) => t.name.trim() === '');
  useEffect(() => {
    if (!hasBlank) ensureBlank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBlank]);

  // Remembers which rows have ever held text, so that tidy-up (below) only
  // removes a row you emptied out — never a blank slot you made on purpose.
  const everHadText = useRef(new Set());
  useEffect(() => {
    items.forEach((t) => { if (t.name.trim()) everHadText.current.add(t.id); });
  }, [items]);

  useEffect(() => {
    if (pendingFocusId.current && inputRefs.current[pendingFocusId.current]) {
      inputRefs.current[pendingFocusId.current].focus();
      pendingFocusId.current = null;
    }
  }, [items]);

  // Enter always makes one more blank slot (at the bottom) and jumps to it,
  // so you can line up several if you want to.
  function handleInsertAfter() {
    pendingFocusId.current = appendBlank();
  }

  function handleFocusPrevious(id) {
    pendingFocusId.current = id;
  }

  function handleBlurRow(id) {
    setEditingId((cur) => (cur === id ? null : cur));
    // Tidy up: if a task was emptied out and there's already another blank
    // slot, drop the emptied row rather than leaving a stray gap. Blank slots
    // you created with Enter and haven't typed in are left alone.
    const row = items.find((t) => t.id === id);
    if (row && row.name.trim() === '' && everHadText.current.has(id)) {
      const otherBlanks = items.filter((t) => t.id !== id && t.name.trim() === '');
      if (otherBlanks.length > 0) deleteTodo(id);
    }
  }

  return (
    <div className="bank-box">
      {title && <h3 className="section-title" style={{ marginBottom: 10 }}>{title}</h3>}
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
            categories={categories}
            moveTodo={moveTodo}
            toggleWeekFocus={toggleWeekFocus}
          />
        ))}
      </div>
    </div>
  );
}

export default function TodoView({
  todos, setTodos, toggleTodo, deleteTodo, makeFocus, removeFromFocus,
  toggleTodoSkipHoliday, toggleTodoWeekendOnly, toggleWeekFocus,
  todoCategories: categories, setTodoCategories,
}) {
  const [activeCatId, setActiveCatId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const activeCat = categories.find((c) => c.id === activeCatId) || categories[0];

  function blankTodo(catId, subId) {
    const cat = categories.find((c) => c.id === catId);
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
      isWork: !!(cat && cat.isWork),
      categoryId: catId,
      subId: subId || null,
    };
  }

  function appendBlank(catId, subId) {
    const newTodo = blankTodo(catId, subId);
    setTodos((prev) => [...prev, newTodo]);
    return newTodo.id;
  }

  // Adds a blank row only if this section doesn't already have one. Checking
  // inside the state update means a double call can never create two.
  function ensureBlank(catId, subId) {
    setTodos((prev) => {
      const has = prev.some(
        (t) => !t.completed && catIdOf(t, categories) === catId && subIdOf(t, categories) === (subId || null) && t.name.trim() === ''
      );
      return has ? prev : [...prev, blankTodo(catId, subId)];
    });
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

  function moveTodo(id, catId, subId) {
    const cat = categories.find((c) => c.id === catId);
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, categoryId: catId, subId: subId || null, isWork: !!(cat && cat.isWork) } : t)));
  }

  // ---- Lists (tabs) and sections ----
  function addCategory(name) {
    const n = name.trim();
    if (!n) return;
    const id = 'c_' + Date.now();
    setTodoCategories((prev) => [...prev, { id, name: n, isWork: false, subs: [] }]);
    setActiveCatId(id);
  }

  function updateCategory(id, patch) {
    setTodoCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    if ('isWork' in patch) {
      setTodos((prev) => prev.map((t) => (catIdOf(t, categories) === id ? { ...t, isWork: patch.isWork } : t)));
    }
  }

  // Deleting a list never deletes tasks — they move to the first other list.
  function deleteCategory(id) {
    if (categories.length <= 1) return;
    const target = categories.find((c) => c.id !== id);
    setTodos((prev) =>
      prev.map((t) => (catIdOf(t, categories) === id ? { ...t, categoryId: target.id, subId: null, isWork: !!target.isWork } : t))
    );
    setTodoCategories((prev) => prev.filter((c) => c.id !== id));
    setActiveCatId(target.id);
  }

  function addSub(catId, name) {
    const n = name.trim();
    if (!n) return;
    setTodoCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, subs: [...c.subs, { id: 's_' + Date.now(), name: n }] } : c))
    );
  }

  function renameSub(catId, subId, name) {
    setTodoCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, subs: c.subs.map((s) => (s.id === subId ? { ...s, name } : s)) } : c))
    );
  }

  // Deleting a section keeps its tasks — they drop into the list's General section.
  function deleteSub(catId, subId) {
    setTodos((prev) =>
      prev.map((t) => (catIdOf(t, categories) === catId && subIdOf(t, categories) === subId ? { ...t, subId: null } : t))
    );
    setTodoCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, subs: c.subs.filter((s) => s.id !== subId) } : c))
    );
  }

  const openItemsFor = (catId, subId) =>
    todos.filter((t) => !t.completed && catIdOf(t, categories) === catId && subIdOf(t, categories) === subId);
  const countFor = (catId) =>
    todos.filter((t) => !t.completed && t.name.trim() && catIdOf(t, categories) === catId).length;

  const sections = [
    { subId: null, title: activeCat.subs.length > 0 ? 'General' : null },
    ...activeCat.subs.map((s) => ({ subId: s.id, title: s.name })),
  ];

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">To-do</h2>
      </div>

      <div className="todo-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`todo-tab ${cat.id === activeCat.id ? 'active' : ''}`}
            onClick={() => setActiveCatId(cat.id)}
          >
            {cat.name}
            <span className="todo-tab-count">{countFor(cat.id)}</span>
          </button>
        ))}
        {addingCat ? (
          <input
            autoFocus
            className="todo-tab-input"
            placeholder="List name…"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { addCategory(newCatName); setNewCatName(''); setAddingCat(false); }
              if (e.key === 'Escape') { setNewCatName(''); setAddingCat(false); }
            }}
            onBlur={() => { if (newCatName.trim()) addCategory(newCatName); setNewCatName(''); setAddingCat(false); }}
          />
        ) : (
          <button className="todo-tab todo-tab-add" onClick={() => setAddingCat(true)} aria-label="Add a list" title="Add a list">
            <Plus size={13} />
          </button>
        )}
        <button className="btn-ghost todo-edit-toggle" onClick={() => setEditing((e) => !e)}>
          {editing ? 'Done' : 'Edit lists'}
        </button>
      </div>

      {editing && (
        <div className="todo-edit-panel">
          <div className="todo-edit-row">
            <input
              className="todo-edit-input"
              value={activeCat.name}
              onChange={(e) => updateCategory(activeCat.id, { name: e.target.value })}
              onBlur={() => { if (!activeCat.name.trim()) updateCategory(activeCat.id, { name: 'Untitled' }); }}
              aria-label="List name"
            />
            <label className="toggle-pill" title="Work lists get priority on weekdays when tasks are pulled into Today">
              <input type="checkbox" checked={!!activeCat.isWork} onChange={(e) => updateCategory(activeCat.id, { isWork: e.target.checked })} />
              Work list
            </label>
            {categories.length > 1 && (
              <button
                className="btn-ghost btn-danger"
                onClick={() => {
                  if (confirm(`Delete the "${activeCat.name}" list? Its tasks move to another list — nothing is lost.`)) deleteCategory(activeCat.id);
                }}
              >
                Delete list
              </button>
            )}
          </div>
          <div className="todo-edit-subtitle">Sections in this list</div>
          {activeCat.subs.map((sub) => (
            <div className="todo-edit-row" key={sub.id}>
              <input
                className="todo-edit-input"
                value={sub.name}
                onChange={(e) => renameSub(activeCat.id, sub.id, e.target.value)}
                onBlur={() => { if (!sub.name.trim()) renameSub(activeCat.id, sub.id, 'Untitled'); }}
                aria-label="Section name"
              />
              <button className="chore-remove" onClick={() => deleteSub(activeCat.id, sub.id)} aria-label="Delete section"><X size={14} /></button>
            </div>
          ))}
          <div className="todo-edit-row">
            <input
              className="todo-edit-input"
              placeholder="+ Add a section (press Enter)"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addSub(activeCat.id, newSubName); setNewSubName(''); }
              }}
            />
          </div>
        </div>
      )}

      {sections.map((sec) => (
        <TodoSection
          key={`${activeCat.id}|${sec.subId || ''}`}
          title={sec.title}
          items={openItemsFor(activeCat.id, sec.subId)}
          toggleTodo={toggleTodo}
          updateName={updateName}
          setDueDate={setDueDate}
          toggleSkipHoliday={toggleTodoSkipHoliday}
          toggleWeekendOnly={toggleTodoWeekendOnly}
          toggleLongTerm={toggleLongTerm}
          deleteTodo={deleteTodo}
          makeFocus={makeFocus}
          removeFromFocus={removeFromFocus}
          appendBlank={() => appendBlank(activeCat.id, sec.subId)}
          ensureBlank={() => ensureBlank(activeCat.id, sec.subId)}
          categories={categories}
          moveTodo={moveTodo}
          toggleWeekFocus={toggleWeekFocus}
        />
      ))}
    </div>
  );
}
