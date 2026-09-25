import { Check, Square } from 'lucide-react';

export default function TopPriorities({ priorities, setPriorities, focusItems, toggleTodo, removeFromFocus }) {
  function updateText(i, text) {
    setPriorities(priorities.map((p, idx) => (idx === i ? { ...p, text } : p)));
  }
  function toggleDone(i) {
    setPriorities(priorities.map((p, idx) => (idx === i ? { ...p, done: !p.done } : p)));
  }

  return (
    <div className="priorities-box">
      <h4 className="priorities-title">If nothing else today…</h4>
      {priorities.map((p, i) => (
        <div className="priorities-row" key={i}>
          <button
            className={`check-btn ${p.done ? '' : 'unchecked'}`}
            onClick={() => toggleDone(i)}
            aria-label={p.done ? 'Mark incomplete' : 'Mark complete'}
          >
            {p.done ? <Check size={17} /> : <Square size={17} />}
          </button>
          <input
            type="text"
            className="priorities-input"
            placeholder={`Priority ${i + 1}`}
            value={p.text}
            onChange={(e) => updateText(i, e.target.value)}
            style={p.done ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
          />
        </div>
      ))}

      {focusItems && focusItems.length > 0 && focusItems.map((todo) => (
        <div className="priorities-row" key={todo.id}>
          <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark done">
            <Square size={17} />
          </button>
          <span style={{ flex: 1, fontSize: 14.5, minWidth: 0 }}>{todo.name}</span>
          {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
          <button className="btn-ghost btn-danger" style={{ fontSize: 11 }} onClick={() => removeFromFocus(todo.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
