import { useState } from 'react';
import { Check, Square } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';

const REALMS = [
  { key: 'morning', label: 'Morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
];

export default function HabitsView({ habits, setHabits, habitHistory, onBeginNewDay }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null);
  const [name, setName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('morning');

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
