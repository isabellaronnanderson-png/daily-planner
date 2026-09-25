import { useState } from 'react';
import { Square } from 'lucide-react';

export default function TopPriorities({ focusItems, toggleTodo, removeFromFocus, addQuickFocusTodo }) {
  const [extraSlots, setExtraSlots] = useState(0);
  const [blankTexts, setBlankTexts] = useState({});

  const neededBlanks = Math.max(0, 3 - focusItems.length) + extraSlots;

  function commitBlank(index) {
    const text = (blankTexts[index] || '').trim();
    if (!text) return;
    addQuickFocusTodo(text);
    setBlankTexts((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    if (extraSlots > 0) setExtraSlots((n) => Math.max(0, n - 1));
  }

  return (
    <div className="priorities-box">
      <h4 className="priorities-title">If nothing else today…</h4>

      {focusItems.map((todo) => (
        <div className="priorities-row" key={todo.id}>
          <button className="check-btn unchecked" onClick={() => toggleTodo(todo.id)} aria-label="Mark done">
            <Square size={17} />
          </button>
          <span style={{ flex: 1, fontSize: 14.5, minWidth: 0 }}>{todo.name}</span>
          {todo.dueDate && <span className="pill pill-red">Due {todo.dueDate}</span>}
          <button className="btn-ghost btn-danger" style={{ fontSize: 11 }} onClick={() => removeFromFocus(todo.id)}>Remove</button>
        </div>
      ))}

      {Array.from({ length: neededBlanks }).map((_, i) => (
        <div className="priorities-row" key={'blank_' + i}>
          <Square size={17} style={{ color: 'var(--border-strong)', flexShrink: 0 }} />
          <input
            type="text"
            className="priorities-input"
            placeholder="Add a priority…"
            value={blankTexts[i] || ''}
            onChange={(e) => setBlankTexts((prev) => ({ ...prev, [i]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitBlank(i); }
            }}
            onBlur={() => commitBlank(i)}
          />
        </div>
      ))}

      <button className="btn-ghost priorities-add-btn" onClick={() => setExtraSlots((n) => n + 1)}>
        + Add priority
      </button>
    </div>
  );
}
