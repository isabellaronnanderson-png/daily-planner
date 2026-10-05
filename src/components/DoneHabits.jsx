import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { nextResetText } from '../lib/resetInfo';

// Habits that have been ticked off live here instead of cluttering the main
// list — collapsed by default, each with when it will come back.
export default function DoneHabits({ habits, weeklyHabits, currentDate, setHabitCount, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (habits.length === 0) return null;

  return (
    <div className="collapsible done-box">
      <button className="collapsible-header" onClick={() => setOpen((o) => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          Done
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({habits.length})</span>
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
        </div>
      )}
    </div>
  );
}
