import { useState } from 'react';
import { Plus } from 'lucide-react';

// A quiet "+ Add for today" line at the bottom of a group. Click it, type,
// and press Enter (or Tab) to add one-off items — they look like any other
// habit in the group but don't come back tomorrow. Leave it empty and it
// folds back into a single faint line.
export default function OneOffAdd({ onAdd, label = 'Add for today' }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  function commit(keepOpen) {
    const t = text.trim();
    if (t) onAdd(t);
    setText('');
    if (!keepOpen) setOpen(false);
  }

  if (!open) {
    return (
      <button className="oneoff-add" onClick={() => setOpen(true)}>
        <Plus size={12} /> {label}
      </button>
    );
  }
  return (
    <div className="day-row">
      <input
        type="text"
        className="today-line-input"
        placeholder={`${label}…`}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey && text.trim())) {
            e.preventDefault();
            commit(true);
          } else if (e.key === 'Escape') {
            setText('');
            setOpen(false);
          }
        }}
        onBlur={() => commit(false)}
      />
    </div>
  );
}
