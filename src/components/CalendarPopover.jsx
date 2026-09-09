import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function CalendarPopover({ value, onSelect, onClear, onClose }) {
  const initial = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); } else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); } else setViewMonth(viewMonth + 1);
  }

  return (
    <div className="calendar-popover" onClick={(e) => e.stopPropagation()}>
      <div className="calendar-nav">
        <button type="button" onClick={prevMonth} aria-label="Previous month"><ChevronLeft size={14} /></button>
        <span>{monthLabel}</span>
        <button type="button" onClick={nextMonth} aria-label="Next month"><ChevronRight size={14} /></button>
      </div>
      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((w, i) => <span key={i}>{w}</span>)}
      </div>
      <div className="calendar-grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const dateStr = toDateStr(viewYear, viewMonth, d);
          const isSelected = value === dateStr;
          return (
            <button
              type="button"
              key={i}
              className={`calendar-day ${isSelected ? 'selected' : ''}`}
              onClick={() => { onSelect(dateStr); onClose(); }}
            >
              {d}
            </button>
          );
        })}
      </div>
      {value && (
        <button type="button" className="calendar-clear" onClick={() => { onClear(); onClose(); }}>
          Clear deadline
        </button>
      )}
    </div>
  );
}
