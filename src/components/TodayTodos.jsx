import { useState, useRef } from 'react';
import { Square, GripVertical } from 'lucide-react';

// The to-do section on the Today tab. It shows whatever is "in Today" from the
// To-do tab (the auto-pulled three plus anything you've added or pulled in),
// and the blank line at the bottom adds new tasks — Enter saves one and
// opens the next. Tasks added here are real to-dos, so they also show up in
// the To-do tab and carry over from day to day until they're done.
export default function TodayTodos({ focusItems, toggleTodo, removeFromFocus, updateTodoName, deleteTodo, addFocusTodo, reorderFocusTodos }) {
  const [draft, setDraft] = useState('');
  const draftRef = useRef(null);
  const rowRefs = useRef({});
  const dragIdRef = useRef(null);

  function commitDraft(keepFocus) {
    const name = draft.trim();
    if (name) {
      addFocusTodo(name);
      setDraft('');
    }
    if (keepFocus) draftRef.current?.focus();
  }

  function handleRowKeyDown(e, todo, index) {
    if (e.key === 'Enter') {
      e.preventDefault();
      draftRef.current?.focus();
    } else if (e.key === 'Backspace' && todo.name === '') {
      // Emptied row: step back to the previous line; leaving it removes it.
      e.preventDefault();
      const prev = focusItems[index - 1];
      if (prev && rowRefs.current[prev.id]) rowRefs.current[prev.id].focus();
      else draftRef.current?.focus();
    }
  }

  return (
    <div className="priorities-box">
      <h4 className="priorities-title">To-do</h4>

      {focusItems.map((todo, index) => (
        <div
          className="priorities-row"
          key={todo.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIdRef.current && dragIdRef.current !== todo.id) reorderFocusTodos(dragIdRef.current, todo.id);
            dragIdRef.current = null;
          }}
        >
          <span
            className="priorities-drag-handle"
            draggable
            onDragStart={() => { dragIdRef.current = todo.id; }}
            aria-hidden="true"
          >
            <GripVertical size={14} />
          </span>
          <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark done">
            <Square size={17} />
          </button>
          <input
            ref={(el) => { if (el) rowRefs.current[todo.id] = el; else delete rowRefs.current[todo.id]; }}
            type="text"
            className="priorities-input"
            value={todo.name}
            onChange={(e) => updateTodoName(todo.id, e.target.value)}
            onKeyDown={(e) => handleRowKeyDown(e, todo, index)}
            onBlur={() => { if (todo.name.trim() === '') deleteTodo(todo.id); }}
          />
          {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
          <button className="btn-ghost btn-danger" style={{ fontSize: 11 }} onClick={() => removeFromFocus(todo.id)}>Remove</button>
        </div>
      ))}

      <div className="priorities-row">
        <span className="priorities-drag-handle" style={{ visibility: 'hidden' }} aria-hidden="true"><GripVertical size={14} /></span>
        <span className="check-btn unchecked" style={{ opacity: 0.45 }} aria-hidden="true"><Square size={17} /></span>
        <input
          ref={draftRef}
          type="text"
          className="priorities-input"
          placeholder="Add a to-do…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitDraft(true); }
          }}
          onBlur={() => commitDraft(false)}
        />
      </div>
    </div>
  );
}
