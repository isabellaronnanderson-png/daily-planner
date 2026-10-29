import { useRef } from 'react';
import { Square, GripVertical, ChevronDown, ChevronRight, X } from 'lucide-react';
import OneOffAdd from './OneOffAdd';

// The to-do list on the Today / This week tabs, drawn as a collapsible group
// at the top of the list. Two kinds of row:
//  - tasks pulled in from the To-do tab are solid coloured rows with a name
//    plus clear buttons (send to the other list / put back);
//  - tasks typed straight in here look like any other habit row.
// The quiet "+ Add a to-do" line at the bottom adds more (Enter keeps going).
export default function TodayTodos({
  title = 'To-do', items, collapsed, onToggleCollapsed,
  toggleTodo, onRemove, onMoveAcross, moveAcrossLabel, MoveAcrossIcon, canMoveAcross,
  updateTodoName, deleteTodo, addTodo, reorderFocusTodos, addLabel = 'Add a to-do',
}) {
  const rowRefs = useRef({});
  const dragIdRef = useRef(null);

  const dropProps = (todo) => ({
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault();
      if (dragIdRef.current && dragIdRef.current !== todo.id) reorderFocusTodos(dragIdRef.current, todo.id);
      dragIdRef.current = null;
    },
  });
  const handle = (todo) => (
    <span className="todo-group-handle" draggable onDragStart={() => { dragIdRef.current = todo.id; }} aria-hidden="true">
      <GripVertical size={13} />
    </span>
  );
  const checkBtn = (todo) => (
    <div className="day-row-actions">
      <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark done">
        <Square size={16} />
      </button>
    </div>
  );

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
          {items.map((todo, index) =>
            todo.addedHere ? (
              // Typed in here: a plain, habit-style row you can edit in place.
              <div className="day-row todo-group-row" key={todo.id} {...dropProps(todo)}>
                {handle(todo)}
                <input
                  ref={(el) => { if (el) rowRefs.current[todo.id] = el; else delete rowRefs.current[todo.id]; }}
                  type="text"
                  className="today-line-input"
                  value={todo.name}
                  onChange={(e) => updateTodoName(todo.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.target.blur();
                    else if (e.key === 'Backspace' && todo.name === '') {
                      e.preventDefault();
                      const prev = items[index - 1];
                      if (prev && rowRefs.current[prev.id]) rowRefs.current[prev.id].focus();
                      else e.target.blur();
                    }
                  }}
                  onBlur={() => { if (todo.name.trim() === '') deleteTodo(todo.id); }}
                />
                {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
                {canMoveAcross && (
                  <button className="chore-remove oneoff-remove" onClick={() => onMoveAcross(todo.id)} aria-label={moveAcrossLabel} title={moveAcrossLabel}>
                    <MoveAcrossIcon size={14} />
                  </button>
                )}
                <button className="chore-remove oneoff-remove" onClick={() => onRemove(todo.id)} aria-label="Put back in the to-do list" title="Put back in the to-do list">
                  <X size={14} />
                </button>
                {checkBtn(todo)}
              </div>
            ) : (
              // Pulled in from the list: a solid, coloured row with clear buttons.
              <div className="day-row todo-pulled-row" key={todo.id} {...dropProps(todo)}>
                {handle(todo)}
                <span className="card-label todo-pulled-name" style={{ flex: 1, minWidth: 0 }}>{todo.name}</span>
                {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
                {canMoveAcross && (
                  <button className="btn-ghost todo-pulled-btn" onClick={() => onMoveAcross(todo.id)} title={moveAcrossLabel}>
                    <MoveAcrossIcon size={12} /> {moveAcrossLabel}
                  </button>
                )}
                <button className="btn-ghost btn-danger todo-pulled-btn" onClick={() => onRemove(todo.id)} title="Put back in the to-do list">
                  Remove
                </button>
                {checkBtn(todo)}
              </div>
            )
          )}

          <OneOffAdd onAdd={addTodo} label={addLabel} />
        </div>
      )}
    </div>
  );
}
