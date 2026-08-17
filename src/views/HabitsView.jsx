import { useState } from 'react';
import { Check, Square, ChevronDown, ChevronRight, X } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';

const REALMS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'S' },
];

export default function HabitsView({ habits, setHabits, habitHistory, onBeginNewDay, weeklyHabits, setWeeklyHabits }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null);
  const [name, setName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('morning');

  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [wName, setWName] = useState('');
  const [wTimeOfDay, setWTimeOfDay] = useState('morning');
  const [wDays, setWDays] = useState([]);

  function toggleWDay(day) {
    setWDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function addWeeklyHabit(e) {
    e.preventDefault();
    if (!wName.trim() || wDays.length === 0) return;
    setWeeklyHabits([...weeklyHabits, { id: Date.now(), name: wName.trim(), timeOfDay: wTimeOfDay, days: wDays }]);
    setWName('');
    setWDays([]);
  }

  function deleteWeeklyHabit(id) {
    setWeeklyHabits(weeklyHabits.filter((w) => w.id !== id));
  }

  function addHabit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setHabits([...habits, { id: 'h_' + Date.now(), name: name.trim(), timeOfDay, completed: false }]);
    setName('');
  }

  function toggleHabit(id) {
    setHabits(habits.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h)));
  }

  function editHabit(id) {
    const habit = habits.find((h) => h.id === id);
    const newName = prompt('Edit habit', habit.name);
    if (newName && newName.trim()) {
      setHabits(habits.map((h) => (h.id === id ? { ...h, name: newName.trim() } : h)));
    }
  }

  function deleteHabit(id) {
    setHabits(habits.filter((h) => h.id !== id));
  }

  function dropOnZone(realm) {
    if (!dragId) return;
    setHabits(habits.map((h) => (h.id === dragId ? { ...h, timeOfDay: realm } : h)));
    setDragOverZone(null);
    setDragId(null);
  }

  function dropOnCard(targetId) {
    if (!dragId || dragId === targetId) return;
    const list = [...habits];
    const sourceIdx = list.findIndex((h) => h.id === dragId);
    const targetIdx = list.findIndex((h) => h.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    list[sourceIdx].timeOfDay = list[targetIdx].timeOfDay;
    const [moved] = list.splice(sourceIdx, 1);
    list.splice(targetIdx, 0, moved);
    setHabits(list);
    setDragOverCard(null);
    setDragId(null);
  }

  const stats = {};
  habits.forEach((h) => {
    stats[h.name] = { completed: 0, total: 0, timeOfDay: h.timeOfDay };
  });
  habitHistory.forEach((entry) => {
    (entry.snapshot || []).forEach((item) => {
      if (!stats[item.name]) stats[item.name] = { completed: 0, total: 0, timeOfDay: item.timeOfDay || 'morning' };
      stats[item.name].total += 1;
      if (item.completed) stats[item.name].completed += 1;
    });
  });

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">Daily habits</h2>
        <button className="btn" onClick={onBeginNewDay}>Begin a new day</button>
      </div>

      <div className="col-grid-3">
        {REALMS.map((realm) => (
          <div className="column" key={realm.key}>
            <div className="column-title">{realm.label}</div>
            <div
              className={`drop-zone ${dragOverZone === realm.key ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverZone(realm.key);
              }}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={() => dropOnZone(realm.key)}
            >
              {habits
                .filter((h) => h.timeOfDay === realm.key)
                .map((habit) => (
                  <div
                    key={habit.id}
                    className={`card ${habit.completed ? 'completed' : ''} ${dragOverCard === habit.id ? 'drag-over-card' : ''}`}
                    draggable
                    onDragStart={() => setDragId(habit.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragId && dragId !== habit.id) setDragOverCard(habit.id);
                    }}
                    onDragLeave={() => setDragOverCard(null)}
                    onDrop={(e) => {
                      e.stopPropagation();
                      dropOnCard(habit.id);
                    }}
                  >
                    <div className="card-left">
                      <button
                        className={`check-btn ${habit.completed ? '' : 'unchecked'}`}
                        onClick={() => toggleHabit(habit.id)}
                        aria-label={habit.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {habit.completed ? <Check size={16} /> : <Square size={16} />}
                      </button>
                      <span className="card-label">{habit.name}</span>
                    </div>
                    <ActionMenu onEdit={() => editHabit(habit.id)} onDelete={() => deleteHabit(habit.id)} />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <form className="form-row" onSubmit={addHabit}>
        <input type="text" placeholder="Add a habit" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)}>
          {REALMS.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">Add habit</button>
      </form>

      <div className="collapsible">
        <button className="collapsible-header" onClick={() => setWeeklyOpen((o) => !o)}>
          Day-specific habits
          <span className="chev">{weeklyOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
        </button>
        {weeklyOpen && (
          <div className="collapsible-body">
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              These appear automatically in the list above on the days you choose, whenever you click "Begin a new day."
            </p>
            <form onSubmit={addWeeklyHabit} style={{ marginBottom: 14 }}>
              <div className="form-row" style={{ marginBottom: 8 }}>
                <input type="text" placeholder="Habit name" value={wName} onChange={(e) => setWName(e.target.value)} />
                <select value={wTimeOfDay} onChange={(e) => setWTimeOfDay(e.target.value)}>
                  {REALMS.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="weekday-row">
                {WEEKDAYS.map((d) => (
                  <button
                    type="button"
                    key={d.key}
                    className={`weekday-chip ${wDays.includes(d.key) ? 'selected' : ''}`}
                    onClick={() => toggleWDay(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
                <button type="submit" className="btn btn-primary" style={{ marginLeft: 8 }}>Add</button>
              </div>
            </form>

            {weeklyHabits.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No day-specific habits yet.</p>
            ) : (
              weeklyHabits.map((w) => (
                <div className="weekly-habit-row" key={w.id}>
                  <div className="weekly-habit-info">
                    <span style={{ fontSize: 13 }}>{w.name}</span>
                    <span className="tag">{REALMS.find((r) => r.key === w.timeOfDay)?.label}</span>
                    <div className="weekly-habit-days">
                      {WEEKDAYS.filter((d) => w.days.includes(d.key)).map((d) => (
                        <span key={d.key}>{d.label}</span>
                      ))}
                    </div>
                  </div>
                  <button className="chore-remove" onClick={() => deleteWeeklyHabit(w.id)} aria-label="Delete">
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="history-box">
        <div className="eyebrow" style={{ marginBottom: 0 }}>Consistency</div>
        {habitHistory.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>
            Click "Begin a new day" each morning to start tracking your consistency over time.
          </p>
        ) : (
          REALMS.map((realm) => {
            const names = Object.keys(stats).filter((n) => stats[n].timeOfDay === realm.key);
            if (names.length === 0) return null;
            return (
              <div key={realm.key}>
                <div className="history-subhead">{realm.label}</div>
                <div className="history-grid">
                  {names.map((n) => {
                    const s = stats[n];
                    const pct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
                    return (
                      <div className="history-row" key={n}>
                        <div className="history-label-row">
                          <span>{n}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                        </div>
                        <div className="history-bar-bg">
                          <div className="history-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
