import { useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { nextResetText } from '../lib/resetInfo';

// Habits that have been ticked off live here instead of cluttering the main
// list — collapsed by default, each with when it will come back.
// oneOffs: ticked-off "just for today" items — they can be undone or removed,
// and (unlike habits) don't come back.
export default function DoneHabits({ habits, oneOffs = [], undoOneOff, removeOneOff, weeklyHabits, currentDate, setHabitCount, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const total = habits.length + oneOffs.length;
  if (total === 0) return null;

  return (
    <div className="collapsible done-box">
      <button className="collapsible-header" onClick={() => setOpen((o) => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          Done
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({total})</span>
        </span>
      </button>
      {open && (
        <div className="collapsible-body" style={{ padding: 0 }}>
          {habits.map((h) => (
            <div className="day-row done-row" key={h.id}>
              <span className="card-label" style={{ flex: 1, minWidth: 0 }}>
                {h.name}
                <span className="done-reset">{nextResetText(h, weeklyHabits, currentDate)}</span>
              </span>
              <button
                className="btn-ghost"
                onClick={() => setHabitCount(h.id, Math.max(0, (h.targetCount || 1) - 1))}
              >
                Undo
              </button>
            </div>
          ))}
          {oneOffs.map((l) => (
            <div className="day-row done-row" key={l.id}>
              <span className="card-label" style={{ flex: 1, minWidth: 0 }}>
                {l.text}
                <span className="done-reset">just for today</span>
              </span>
              <button className="btn-ghost" onClick={() => undoOneOff(l.id)}>Undo</button>
              <button className="chore-remove" onClick={() => removeOneOff(l.id)} aria-label="Remove"><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
