import { useState } from 'react';
import { Square, Check } from 'lucide-react';

// Two kinds of rows live here:
//  - tasks pulled in from the To-do tab (real to-dos: check off / remove
//    sends them back or completes them there), and
//  - freeform lines you type yourself — plain scratch notes that stay in this
//    box and never turn into to-do items.
export default function TopPriorities({ focusItems, toggleTodo, removeFromFocus, priorityLines, setPriorityLines }) {
  const [extraSlots, setExtraSlots] = useState(0);
  const [blankTexts, setBlankTexts] = useState({});

  const filledRows = focusItems.length + priorityLines.length;
  const neededBlanks = Math.max(0, 3 - filledRows) + extraSlots;

  function commitBlank(index) {
    const text = (blankTexts[index] || '').trim();
    if (!text) return;
    setPriorityLines((prev) => [
      ...prev,
      { id: 'pl_' + Date.now() + Math.random().toString(36).slice(2, 6), text, done: false },
    ]);
    setBlankTexts((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    if (extraSlots > 0) setExtraSlots((n) => Math.max(0, n - 1));
  }

  function updateLine(id, text) {
    setPriorityLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)));
  }
  function toggleLine(id) {
    setPriorityLines((prev) => prev.map((l) => (l.id === id ? { ...l, done: !l.done } : l)));
  }
  function removeLine(id) {
    setPriorityLines((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="priorities-box">
      <h4 className="priorities-title">Daily priorities</h4>

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

      {priorityLines.map((line) => (
        <div className="priorities-row" key={line.id}>
          <button
            className={`check-btn ${line.done ? '' : 'unchecked'}`}
            onClick={() => toggleLine(line.id)}
            aria-label={line.done ? 'Mark not done' : 'Mark done'}
          >
            {line.done ? <Check size={17} /> : <Square size={17} />}
          </button>
          <input
            type="text"
            className="priorities-input"
            value={line.text}
            onChange={(e) => updateLine(line.id, e.target.value)}
            onBlur={() => { if (!line.text.trim()) removeLine(line.id); }}
            style={line.done ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
          />
          <button className="btn-ghost btn-danger" style={{ fontSize: 11 }} onClick={() => removeLine(line.id)}>Remove</button>
        </div>
      ))}

      {Array.from({ length: neededBlanks }).map((_, i) => (
        <div className="priorities-row" key={'blank_' + i}>
          <Square size={17} style={{ color: 'var(--border-strong)', flexShrink: 0 }} />
          <input
            type="text"
            className="priorities-input"
            placeholder="Jot something down…"
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
        + Add line
      </button>
    </div>
  );
}
