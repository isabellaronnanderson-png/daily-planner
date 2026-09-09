import { useRef, useState } from 'react';
import { Check, Square, Sparkles, Plane, Sun, Briefcase } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';

function TodoSection({ title, items, addTodo, toggleTodo, toggleTodoSkipHoliday, toggleTodoWeekendOnly, toggleTodoIsWork, onEdit, deleteTodo, makeFocus, moveLabel }) {
  const nameRef = useRef(null);
  const dateRef = useRef(null);

  function submit(e) {
    e.preventDefault();
    const name = nameRef.current.value.trim();
    if (!name) return;
    addTodo(name, dateRef.current.value);
    nameRef.current.value = '';
    dateRef.current.value = '';
  }

  return (
    <div className="bank-box">
      <h3 className="section-title" style={{ marginBottom: 10 }}>{title}</h3>

      <form className="form-row" onSubmit={submit}>
        <input type="text" placeholder={`Add to ${title.toLowerCase()}`} ref={nameRef} required />
        <input type="date" ref={dateRef} />
        <button type="submit" className="btn btn-primary">Add</button>
      </form>

      <div className="bank-list">
        {items.length === 0 && <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>Nothing here right now.</div>}
        {items.map((todo) => (
          <div key={todo.id} className="card">
            <div className="card-left">
              <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark complete">
                <Square size={16} />
              </button>
              <span className="card-label">{todo.name}</span>
              {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
              {todo.weekendOnly && <span className="pill pill-muted">Weekend only</span>}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
              <button
                className="chore-remove"
                style={todo.skipOnHoliday ? { color: 'var(--navy)' } : undefined}
                onClick={() => toggleTodoSkipHoliday(todo.id)}
                title={todo.skipOnHoliday ? 'Pauses while holiday mode is on — click to unpause' : 'Pause this task during holiday mode'}
              >
                <Plane size={14} />
              </button>
              <button
                className="chore-remove"
                style={todo.weekendOnly ? { color: 'var(--navy)' } : undefined}
                onClick={() => toggleTodoWeekendOnly(todo.id)}
                title={todo.weekendOnly ? 'Only pulled into Today on weekends — click to allow any day' : 'Only relevant on weekends'}
              >
                <Sun size={14} />
              </button>
              <button
                className="chore-remove"
                style={todo.isWork ? { color: 'var(--navy)' } : undefined}
                onClick={() => toggleTodoIsWork(todo.id)}
                title={moveLabel}
              >
                <Briefcase size={14} />
              </button>
              <button className="btn btn-sm" onClick={() => makeFocus(todo.id)}><Sparkles size={12} /> Focus</button>
              <ActionMenu onEdit={() => onEdit(todo)} onDelete={() => deleteTodo(todo.id)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TodoView({
  todos, setTodos, toggleTodo, editTodo, deleteTodo, makeFocus,
  toggleTodoSkipHoliday, toggleTodoWeekendOnly, toggleTodoIsWork,
}) {
  const [editingTodo, setEditingTodo] = useState(null);
  const [editName, setEditName] = useState('');

  function addTodo(name, dueDate, isWork) {
    setTodos([
      ...todos,
      {
        id: 't_' + Date.now() + Math.random().toString(36).slice(2, 6),
        name,
        dueDate,
        isFocus: false,
        completed: false,
        completedAt: null,
        skipOnHoliday: false,
        weekendOnly: false,
        isWork,
      },
    ]);
  }

  const sortByDate = (a, b) => {
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    return 0;
  };

  const workItems = todos.filter((t) => !t.isFocus && !t.completed && t.isWork).sort(sortByDate);
  const personalItems = todos.filter((t) => !t.isFocus && !t.completed && !t.isWork).sort(sortByDate);

  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  const vaultItems = todos.filter((t) => t.completed && t.completedAt && Date.now() - t.completedAt <= fourteenDays);

  function openEdit(todo) {
    setEditingTodo(todo);
    setEditName(todo.name);
  }

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">To-do</h2>
      </div>

      <TodoSection
        title="Work"
        items={workItems}
        addTodo={(name, dueDate) => addTodo(name, dueDate, true)}
        toggleTodo={toggleTodo}
        toggleTodoSkipHoliday={toggleTodoSkipHoliday}
        toggleTodoWeekendOnly={toggleTodoWeekendOnly}
        toggleTodoIsWork={toggleTodoIsWork}
        onEdit={openEdit}
        deleteTodo={deleteTodo}
        makeFocus={makeFocus}
        moveLabel="Move to your personal to-do list"
      />

      <TodoSection
        title="To-do"
        items={personalItems}
        addTodo={(name, dueDate) => addTodo(name, dueDate, false)}
        toggleTodo={toggleTodo}
        toggleTodoSkipHoliday={toggleTodoSkipHoliday}
        toggleTodoWeekendOnly={toggleTodoWeekendOnly}
        toggleTodoIsWork={toggleTodoIsWork}
        onEdit={openEdit}
        deleteTodo={deleteTodo}
        makeFocus={makeFocus}
        moveLabel="Move to your work list"
      />

      <div className="vault-box">
        <h3 className="section-title" style={{ marginBottom: 10 }}>Recently completed</h3>
        <div className="vault-list">
          {vaultItems.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Nothing completed in the last two weeks yet.</div>}
          {vaultItems.map((todo) => (
            <div className="card completed" key={todo.id}>
              <div className="card-left">
                <Check size={15} style={{ flexShrink: 0 }} />
                <span className="card-label">{todo.name}</span>
                {todo.isWork && <span className="pill pill-muted">Work</span>}
              </div>
              <button className="btn-ghost" onClick={() => toggleTodo(todo.id)}>Reopen</button>
            </div>
          ))}
        </div>
      </div>

      {editingTodo && (
        <div className="modal-backdrop" onClick={() => setEditingTodo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit task</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                editTodo(editingTodo.id, editName);
                setEditingTodo(null);
              }}
            >
              <div className="modal-row">
                <label>Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setEditingTodo(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
