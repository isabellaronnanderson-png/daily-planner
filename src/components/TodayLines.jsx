import { useState, useRef, useEffect } from 'react';
import { Square, Check, X } from 'lucide-react';

// "Just today" lines at the bottom of the habit list. They behave like the
// to-do list (a blank line is always waiting; Enter or Tab on a filled line
// opens another), but they aren't habits: they never recur, never count in
// Insights, and are cleared when you begin a new day.
function newLine() {
  return { id: 'tl_' + Date.now() + Math.random().toString(36).slice(2, 6), text: '', done: false };
}

export default function TodayLines({ lines, setLines }) {
  const refs = useRef({});
  const pendingFocusId = useRef(null);
  const everHadText = useRef(new Set());
  // The row being typed in stays where it is, even if it's momentarily empty.
  const [editingId, setEditingId] = useState(null);

  const isBlank = (l) => l.text.trim() === '' && l.id !== editingId;
  const sorted = lines
    .map((l, i) => ({ l, i }))
    .sort((a, b) => (isBlank(a.l) ? 1 : 0) - (isBlank(b.l) ? 1 : 0) || a.i - b.i)
    .map(({ l }) => l);

  // Always keep a blank line ready at the bottom.
  const hasBlank = lines.some((l) => l.text.trim() === '');
  useEffect(() => {
    if (!hasBlank) setLines((prev) => (prev.some((l) => l.text.trim() === '') ? prev : [...prev, newLine()]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBlank]);

  useEffect(() => {
    lines.forEach((l) => { if (l.text.trim()) everHadText.current.add(l.id); });
    if (pendingFocusId.current && refs.current[pendingFocusId.current]) {
      refs.current[pendingFocusId.current].focus();
      pendingFocusId.current = null;
    }
  }, [lines]);

  function addLine() {
    const l = newLine();
    setLines((prev) => [...prev, l]);
    pendingFocusId.current = l.id;
  }
  function updateText(id, text) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)));
  }
  function toggleDone(id) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, done: !l.done } : l)));
  }
  function removeLine(id) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  function handleKeyDown(e, line, index) {
    const filled = line.text.trim() !== '';
    if ((e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) && filled) {
      e.preventDefault();
      addLine();
    } else if (e.key === 'Enter') {
      e.preventDefault();
    } else if (e.key === 'Backspace' && line.text === '' && sorted.length > 1) {
      e.preventDefault();
      const prev = sorted[index - 1];
      removeLine(line.id);
      if (prev) pendingFocusId.current = prev.id;
    }
  }

  function handleBlur(line) {
    setEditingId((cur) => (cur === line.id ? null : cur));
    // A line you typed in and then emptied is removed if another blank is ready.
    if (line.text.trim() === '' && everHadText.current.has(line.id)) {
      if (lines.some((l) => l.id !== line.id && l.text.trim() === '')) removeLine(line.id);
    }
  }

  return (
    <>
      {sorted.map((line, index) => (
        <div className="day-row" key={line.id}>
          <button
            className={`check-btn ${line.done ? '' : 'unchecked'}`}
            onClick={() => toggleDone(line.id)}
            aria-label={line.done ? 'Mark not done' : 'Mark done'}
          >
            {line.done ? <Check size={16} /> : <Square size={16} />}
          </button>
          <input
            ref={(el) => { if (el) refs.current[line.id] = el; else delete refs.current[line.id]; }}
            type="text"
            className="today-line-input"
            placeholder="Something just for today…"
            value={line.text}
            onChange={(e) => updateText(line.id, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, line, index)}
            onFocus={() => setEditingId(line.id)}
            onBlur={() => handleBlur(line)}
            style={line.done ? { textDecoration: 'line-through', opacity: 0.5 } : undefined}
          />
          {line.text && (
            <button className="chore-remove" onClick={() => removeLine(line.id)} aria-label="Remove"><X size={14} /></button>
          )}
        </div>
      ))}
    </>
  );
}
