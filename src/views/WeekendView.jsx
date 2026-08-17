import { useState } from 'react';
import { Check, Square } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';

const DAYS = [
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function WeekendView({ tasks, setTasks, history, onResetWeekend }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverZone, setDragOverZone] = useState(null);
  const [dragOverCard, setDragOverCard] = useState(null);
  const [name, setName] = useState('');
  const [day, setDay] = useState('saturday');

  function addTask(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setTasks([...tasks, { id: 'w_' + Date.now(), name: name.trim(), day, completed: false }]);
    setName('');
  }

  function toggleTask(id) {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function editTask(id) {
    const task = tasks.find((t) => t.id === id);
    const newName = prompt('Edit task', task.name);
    if (newName && newName.trim()) {
      setTasks(tasks.map((t) => (t.id === id ? { ...t, name: newName.trim() } : t)));
    }
  }

  function deleteTask(id) {
    setTasks(tasks.filter((t) => t.id !== id));
  }

  function dropOnZone(targetDay) {
    if (!dragId) return;
    setTasks(tasks.map((t) => (t.id === dragId ? { ...t, day: targetDay } : t)));
    setDragOverZone(null);
    setDragId(null);
  }

  function dropOnCard(targetId) {
    if (!dragId || dragId === targetId) return;
    const list = [...tasks];
    const sourceIdx = list.findIndex((t) => t.id === dragId);
    const targetIdx = list.findIndex((t) => t.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;
    list[sourceIdx].day = list[targetIdx].day;
    const [moved] = list.splice(sourceIdx, 1);
    list.splice(targetIdx, 0, moved);
    setTasks(list);
    setDragOverCard(null);
    setDragId(null);
  }

  const stats = {};
  tasks.forEach((t) => {
    stats[t.name] = { completed: 0, total: 0, day: t.day };
  });
  history.forEach((entry) => {
    (entry.snapshot || []).forEach((item) => {
      if (!stats[item.name]) stats[item.name] = { completed: 0, total: 0, day: item.day || 'saturday' };
      stats[item.name].total += 1;
      if (item.completed) stats[item.name].completed += 1;
    });
  });

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">Weekend</h2>
        <button className="btn" onClick={onResetWeekend}>Start a new week</button>
      </div>

      <div className="col-grid-2">
        {DAYS.map((d) => (
          <div className="column" key={d.key}>
            <div className="column-title">{d.label}</div>
            <div
              className={`drop-zone ${dragOverZone === d.key ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverZone(d.key);
              }}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={() => dropOnZone(d.key)}
            >
              {tasks
                .filter((t) => t.day === d.key)
                .map((task) => (
                  <div
                    key={task.id}
                    className={`card ${task.completed ? 'completed' : ''} ${dragOverCard === task.id ? 'drag-over-card' : ''}`}
                    draggable
                    onDragStart={() => setDragId(task.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragId && dragId !== task.id) setDragOverCard(task.id);
                    }}
                    onDragLeave={() => setDragOverCard(null)}
                    onDrop={(e) => {
                      e.stopPropagation();
                      dropOnCard(task.id);
                    }}
                  >
                    <div className="card-left">
                      <button
                        className={`check-btn ${task.completed ? '' : 'unchecked'}`}
                        onClick={() => toggleTask(task.id)}
                        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {task.completed ? <Check size={16} /> : <Square size={16} />}
                      </button>
                      <span className="card-label">{task.name}</span>
                    </div>
                    <ActionMenu onEdit={() => editTask(task.id)} onDelete={() => deleteTask(task.id)} />
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <form className="form-row" onSubmit={addTask}>
        <input type="text" placeholder="Add a weekend task" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={day} onChange={(e) => setDay(e.target.value)}>
          {DAYS.map((d) => (
            <option key={d.key} value={d.key}>{d.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary">Add task</button>
      </form>

      <div className="history-box">
        <div className="eyebrow" style={{ marginBottom: 0 }}>Consistency</div>
        {history.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 8 }}>
            Click "Start a new week" to begin tracking your weekend consistency over time.
          </p>
        ) : (
          DAYS.map((d) => {
            const names = Object.keys(stats).filter((n) => stats[n].day === d.key);
            if (names.length === 0) return null;
            return (
              <div key={d.key}>
                <div className="history-subhead">{d.label}</div>
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
