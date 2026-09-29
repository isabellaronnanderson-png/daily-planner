import { useRef, useEffect } from 'react';
import { Square, Check, X, GripVertical } from 'lucide-react';

// Rows here come in two kinds, interleaved in one editable, draggable order:
//  - "todo" entries: tasks pulled in from the To-do tab (check off / remove
//    sends them back or completes them there — no text to edit here)
//  - "line" entries: freeform scratch lines typed directly in this box,
//    which never become to-do items
function entryKey(entry) {
  return entry.kind === 'todo' ? 'todo_' + entry.todoId : entry.id;
}
function makeBlankLine() {
  return { kind: 'line', id: 'pl_' + Date.now() + Math.random().toString(36).slice(2, 6), text: '', done: false };
}

export default function TopPriorities({ focusItems, toggleTodo, removeFromFocus, priorityOrder, setPriorityOrder }) {
  const inputRefs = useRef({});
  const pendingFocusKey = useRef(null);
  const dragKeyRef = useRef(null);

  const focusById = {};
  focusItems.forEach((t) => { focusById[t.id] = t; });

  // Self-heal: a newly-focused todo gets its own row (inserted just above any
  // trailing blank lines), and a row whose todo is no longer focused is
  // dropped — so this stays in sync with the To-do tab without extra wiring.
  useEffect(() => {
    // Only the trailing run of blanks is "padding" that can be repositioned —
    // a blank placed mid-list on purpose (via Enter) stays exactly there.
    let splitIdx = priorityOrder.length;
    while (splitIdx > 0 && priorityOrder[splitIdx - 1].kind === 'line' && priorityOrder[splitIdx - 1].text.trim() === '') {
      splitIdx -= 1;
    }
    const body = priorityOrder.slice(0, splitIdx);
    const trailingBlanks = priorityOrder.slice(splitIdx);

    const cleanedBody = body.filter((e) => e.kind === 'line' || focusById[e.todoId]);
    const known = new Set(cleanedBody.filter((e) => e.kind === 'todo').map((e) => e.todoId));
    const missing = focusItems.filter((t) => !known.has(t.id)).map((t) => ({ kind: 'todo', todoId: t.id }));

    if (missing.length > 0 || cleanedBody.length !== body.length) {
      setPriorityOrder([...cleanedBody, ...missing, ...trailingBlanks]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusItems.map((t) => t.id).join(',')]);

  // Keep at least 3 rows total by default — pad with blank lines up to 3.
  // Once you're at 3 or more, no forced blank appears; use "+ Add line" for more.
  useEffect(() => {
    const filledCount = priorityOrder.filter((e) => e.kind === 'todo' || (e.kind === 'line' && e.text.trim() !== '')).length;
    const blankCount = priorityOrder.filter((e) => e.kind === 'line' && e.text.trim() === '').length;
    const needed = Math.max(0, 3 - filledCount) - blankCount;
    if (needed > 0) {
      setPriorityOrder([...priorityOrder, ...Array.from({ length: needed }, makeBlankLine)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorityOrder]);

  useEffect(() => {
    if (pendingFocusKey.current && inputRefs.current[pendingFocusKey.current]) {
      inputRefs.current[pendingFocusKey.current].focus();
      pendingFocusKey.current = null;
    }
  });

  function updateLineText(id, text) {
    setPriorityOrder(priorityOrder.map((e) => (e.kind === 'line' && e.id === id ? { ...e, text } : e)));
  }
  function toggleLineDone(id) {
    setPriorityOrder(priorityOrder.map((e) => (e.kind === 'line' && e.id === id ? { ...e, done: !e.done } : e)));
  }
  function removeLine(id) {
    setPriorityOrder(priorityOrder.filter((e) => !(e.kind === 'line' && e.id === id)));
  }
  function insertBlankAfter(afterKey) {
    const newEntry = makeBlankLine();
    const idx = priorityOrder.findIndex((e) => entryKey(e) === afterKey);
    const next = [...priorityOrder];
    if (idx === -1) next.push(newEntry);
    else next.splice(idx + 1, 0, newEntry);
    setPriorityOrder(next);
    pendingFocusKey.current = entryKey(newEntry);
  }

  function handleLineKeyDown(e, entry, index) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!entry.text.trim()) return;
      insertBlankAfter(entryKey(entry));
    } else if (e.key === 'Backspace' && entry.text === '' && priorityOrder.length > 1) {
      e.preventDefault();
      const prevEntry = priorityOrder[index - 1];
      removeLine(entry.id);
      if (prevEntry) pendingFocusKey.current = entryKey(prevEntry);
    }
  }

  function reorder(draggedKey, targetKey) {
    if (!draggedKey || draggedKey === targetKey) return;
    const from = priorityOrder.findIndex((e) => entryKey(e) === draggedKey);
    const to = priorityOrder.findIndex((e) => entryKey(e) === targetKey);
    if (from < 0 || to < 0) return;
    const next = [...priorityOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPriorityOrder(next);
  }

  return (
    <div className="priorities-box">
      <h4 className="priorities-title">Daily priorities</h4>

      {priorityOrder.map((entry, index) => {
        const key = entryKey(entry);
        const rowDropProps = {
          onDragOver: (e) => e.preventDefault(),
          onDrop: (e) => { e.preventDefault(); reorder(dragKeyRef.current, key); dragKeyRef.current = null; },
        };
        const handleProps = {
          draggable: true,
          onDragStart: () => { dragKeyRef.current = key; },
        };
        const handle = (
          <span className="priorities-drag-handle" {...handleProps} aria-hidden="true">
            <GripVertical size={14} />
          </span>
        );

        if (entry.kind === 'todo') {
          const todo = focusById[entry.todoId];
          if (!todo) return null;
          return (
            <div className="priorities-row" key={key} {...rowDropProps}>
              {handle}
              <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark done">
                <Square size={17} />
              </button>
              <span style={{ flex: 1, fontSize: 14.5, minWidth: 0 }}>{todo.name}</span>
              {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
              <button className="btn-ghost btn-danger" style={{ fontSize: 11 }} onClick={() => removeFromFocus(todo.id)}>Remove</button>
            </div>
          );
        }

        return (
          <div className="priorities-row" key={key} {...rowDropProps}>
            {handle}
            <button
              className={`check-btn ${entry.done ? '' : 'unchecked'}`}
              onClick={() => toggleLineDone(entry.id)}
              aria-label={entry.done ? 'Mark not done' : 'Mark done'}
            >
              {entry.done ? <Check size={17} /> : <Square size={17} />}
            </button>
            <input
              ref={(el) => { if (el) inputRefs.current[key] = el; else delete inputRefs.current[key]; }}
              type="text"
              className="priorities-input"
              placeholder="Jot something down…"
              value={entry.text}
              onChange={(e) => updateLineText(entry.id, e.target.value)}
              onKeyDown={(e) => handleLineKeyDown(e, entry, index)}
              style={entry.done ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
            />
            {entry.text && (
              <button className="chore-remove" onClick={() => removeLine(entry.id)} aria-label="Remove">
                <X size={15} />
              </button>
            )}
          </div>
        );
      })}

      <button
        className="btn-ghost priorities-add-btn"
        onClick={() => {
          const newEntry = makeBlankLine();
          setPriorityOrder([...priorityOrder, newEntry]);
          pendingFocusKey.current = entryKey(newEntry);
        }}
      >
        + Add line
      </button>
    </div>
  );
}
