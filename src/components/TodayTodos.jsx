import { useState, useRef } from 'react';
import { Square, GripVertical, ChevronDown, ChevronRight, X } from 'lucide-react';

// The to-do list on the Today / This week tabs. It sits at the top of the
// list as a collapsible group, just like a habit group. Rows are the tasks
// pulled in from the To-do tab; the blank line at the bottom adds new ones
// (Enter saves one and opens the next). Tasks added here are real to-dos, so
// they also show up on the To-do tab and carry over until they're done.
export default function TodayTodos({
  title = 'To-do', items, collapsed, onToggleCollapsed,
  toggleTodo, onRemove, updateTodoName, deleteTodo, addTodo, reorderFocusTodos,
}) {
  const [draft, setDraft] = useState('');
  const draftRef = useRef(null);
  const rowRefs = useRef({});
  const dragIdRef = useRef(null);

  function commitDraft(keepFocus) {
    const name = draft.trim();
    if (name) {
      addTodo(name);
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
      const prev = items[index - 1];
      if (prev && rowRefs.current[prev.id]) rowRefs.current[prev.id].focus();
      else draftRef.current?.focus();
    }
  }

  return (
    <div className="day-section">
      <button className="day-section-header" onClick={onToggleCollapsed}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          {title}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({items.length})</span>
        </span>
      </button>

      {!collapsed && (
        <div className="day-section-body">
          {items.map((todo, index) => (
            <div
              className="day-row todo-group-row"
              key={todo.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIdRef.current && dragIdRef.current !== todo.id) reorderFocusTodos(dragIdRef.current, todo.id);
                dragIdRef.current = null;
              }}
            >
              <span className="todo-group-handle" draggable onDragStart={() => { dragIdRef.current = todo.id; }} aria-hidden="true">
                <GripVertical size={13} />
              </span>
              <input
                ref={(el) => { if (el) rowRefs.current[todo.id] = el; else delete rowRefs.current[todo.id]; }}
                type="text"
                className="today-line-input"
                value={todo.name}
                onChange={(e) => updateTodoName(todo.id, e.target.value)}
                onKeyDown={(e) => handleRowKeyDown(e, todo, index)}
                onBlur={() => { if (todo.name.trim() === '') deleteTodo(todo.id); }}
              />
              {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
              <button className="chore-remove oneoff-remove" onClick={() => onRemove(todo.id)} aria-label="Send back to the to-do list" title="Send back to the to-do list">
                <X size={14} />
              </button>
              <div className="day-row-actions">
                <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark done">
                  <Square size={16} />
                </button>
              </div>
            </div>
          ))}

          <div className="day-row">
            <input
              ref={draftRef}
              type="text"
              className="today-line-input"
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
      )}
    </div>
  );
}
