import { Sparkles, CalendarClock } from 'lucide-react';
import { localDateKey } from '../lib/officeDays';
import { choreDaysOverdue } from '../lib/needsAttention';

// The "Needs attention" panel: overdue chores and tasks with a deadline. It sits
// at the top of the To-do tab. You clear an item by choosing what to do with
// it — Focus (do it today), plan it for a day of the week, or mark it done.
export default function NeedsAttention({ data, todos, focusChore, makeFocus, toggleTodo, resetChore, sendToDay, planDays }) {
  const { overdueChores, urgentTodos } = data;
  if (overdueChores.length === 0 && urgentTodos.length === 0) return null;

  const todayKey = localDateKey(new Date().toISOString());
  const upcoming = planDays.filter((d) => d.dateKey >= todayKey);

  // A native picker laid over a button: pick a day and it's planned there.
  function PlanForMenu({ onPick }) {
    if (upcoming.length === 0) return null;
    return (
      <span className="icon-tooltip-wrap">
        <span className="btn"><CalendarClock size={12} /> Plan for…</span>
        <select className="move-select" aria-label="Plan for a day" value="" onChange={(e) => e.target.value && onPick(e.target.value)}>
          <option value="">Plan for…</option>
          {upcoming.map((d) => (
            <option key={d.key} value={d.key}>{d.dateKey === todayKey ? `Today · ${d.label}` : d.label}</option>
          ))}
        </select>
      </span>
    );
  }

  return (
    <div className="banner">
      <h3>Needs attention</h3>
      {overdueChores.map((chore) => {
        const existing = todos.find((t) => t.choreId === chore.id && !t.completed);
        const daysOverdue = choreDaysOverdue(chore);
        return (
          <div className="suggestion-pill" key={chore.id}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{chore.name}</div>
              <div style={{ fontSize: 11, color: 'var(--red-light)' }}>{daysOverdue >= 1 ? `${daysOverdue}d overdue` : 'Chore is due'}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => focusChore(chore)}><Sparkles size={12} /> Focus</button>
              <PlanForMenu onPick={(day) => sendToDay('chore', chore.id, day)} />
              <button className="btn" onClick={() => (existing ? toggleTodo(existing.id) : resetChore(chore.id))}>Mark done</button>
            </div>
          </div>
        );
      })}
      {urgentTodos.map((task) => (
        <div className="suggestion-pill" key={task.id}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{task.name}</div>
            <div style={{ fontSize: 11, color: 'var(--red)' }}>Due {task.dueDate}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => makeFocus(task.id)}><Sparkles size={12} /> Focus</button>
            <PlanForMenu onPick={(day) => sendToDay('todo', task.id, day)} />
            <button className="btn" onClick={() => toggleTodo(task.id)}>Mark done</button>
          </div>
        </div>
      ))}
    </div>
  );
}
