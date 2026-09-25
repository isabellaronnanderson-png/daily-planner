import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Plane } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';

const WEEKDAYS = [
  { key: 'mon', label: 'M' },
  { key: 'tue', label: 'T' },
  { key: 'wed', label: 'W' },
  { key: 'thu', label: 'T' },
  { key: 'fri', label: 'F' },
];
const WEEKEND_CHIP = { key: 'weekend', label: 'W' };
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function hasWeekend(days) {
  return days.includes('sat') && days.includes('sun');
}
function dayBadges(days) {
  const labels = WEEKDAYS.filter((d) => days.includes(d.key)).map((d) => d.label);
  if (hasWeekend(days)) labels.push('W');
  return labels;
}
function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

const EMPTY_DRAFT = {
  name: '',
  repeats: 'day',
  targetCount: 1,
  days: [],
  everyNth: 1,
  keepUntilDone: false,
  groupId: '',
  skipOnHoliday: false,
};

function regularBadges(habit) {
  const badges = [];
  if (habit.cadence === 'week') badges.push('Weekly');
  if (habit.cadence === 'month') badges.push('Monthly');
  if ((habit.targetCount || 1) > 1) badges.push(`${habit.targetCount}x`);
  return badges;
}
function daySpecificBadges(w) {
  const badges = [...dayBadges(w.days)];
  if ((w.everyNth || 1) > 1) badges.push(`every ${w.everyNth}`);
  if (w.keepUntilDone) badges.push('Keep until done');
  return badges;
}

function ManageRow({ name, badges, skipOnHoliday, dragOver, draggable, onEdit, onDelete, onDragStart, onDragOver, onDragLeave, onDrop }) {
  return (
    <div
      className={`day-row ${dragOver ? 'drag-over' : ''}`}
      draggable={!!draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className="card-label" style={{ flex: 1, minWidth: 0 }}>
        {name}
        {badges.map((b, i) => (
          <span key={i} className="pill pill-muted" style={{ marginLeft: 8 }}>{b}</span>
        ))}
        {skipOnHoliday && <Plane size={11} style={{ marginLeft: 8, verticalAlign: -1, color: 'var(--text-muted)' }} aria-label="Paused on holiday" />}
      </span>
      <div className="day-row-actions">
        <ActionMenu onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function ManageHabitsView({
  habits, addHabit, editHabit, deleteHabit, reorderHabits,
  groups, addGroup, toggleGroupCollapsed, deleteGroup, renameGroup, reorderGroups,
  weeklyHabits, setWeeklyHabits,
  weeklyResetDay, setWeeklyResetDay, monthlyResetDay, setMonthlyResetDay,
}) {
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDragId, setGroupDragId] = useState(null);
  const [groupDragOverId, setGroupDragOverId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupEditName, setGroupEditName] = useState('');

  const [habitModal, setHabitModal] = useState(null); // { mode: 'create'|'edit', type?: 'regular'|'dayspecific', id? }
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  function openCreateModal() {
    setDraft(EMPTY_DRAFT);
    setHabitModal({ mode: 'create' });
  }
  function openEditRegular(habit) {
    setDraft({
      name: habit.name,
      repeats: habit.cadence || 'day',
      targetCount: habit.targetCount || 1,
      days: [],
      everyNth: 1,
      keepUntilDone: false,
      groupId: habit.groupId || '',
      skipOnHoliday: !!habit.skipOnHoliday,
    });
    setHabitModal({ mode: 'edit', type: 'regular', id: habit.id });
  }
  function openEditDaySpecific(w) {
    setDraft({
      name: w.name,
      repeats: 'dayspecific',
      targetCount: 1,
      days: [...w.days],
      everyNth: w.everyNth || 1,
      keepUntilDone: !!w.keepUntilDone,
      groupId: w.groupId || '',
      skipOnHoliday: !!w.skipOnHoliday,
    });
    setHabitModal({ mode: 'edit', type: 'dayspecific', id: w.id });
  }

  function toggleDraftDay(day) {
    if (day === 'weekend') {
      setDraft((prev) => ({
        ...prev,
        days: hasWeekend(prev.days) ? prev.days.filter((d) => d !== 'sat' && d !== 'sun') : [...prev.days, 'sat', 'sun'],
      }));
      return;
    }
    setDraft((prev) => ({ ...prev, days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day] }));
  }

  function submitHabitModal(e) {
    e.preventDefault();
    if (!draft.name.trim()) return;

    if (draft.repeats === 'dayspecific') {
      if (draft.days.length === 0) return;
      const everyNth = parseInt(draft.everyNth, 10) || 1;
      if (habitModal.mode === 'edit' && habitModal.type === 'dayspecific') {
        setWeeklyHabits(
          weeklyHabits.map((w) =>
            w.id === habitModal.id
              ? { ...w, name: draft.name.trim(), days: draft.days, everyNth, keepUntilDone: draft.keepUntilDone, groupId: draft.groupId || null, skipOnHoliday: draft.skipOnHoliday }
              : w
          )
        );
      } else {
        setWeeklyHabits([
          ...weeklyHabits,
          {
            id: Date.now(),
            name: draft.name.trim(),
            days: draft.days,
            everyNth,
            keepUntilDone: draft.keepUntilDone,
            groupId: draft.groupId || null,
            skipOnHoliday: draft.skipOnHoliday,
            occurrenceCount: 0,
          },
        ]);
      }
    } else {
      const targetCount = parseInt(draft.targetCount, 10) || 1;
      if (habitModal.mode === 'edit' && habitModal.type === 'regular') {
        editHabit(habitModal.id, { name: draft.name, targetCount, groupId: draft.groupId || null, cadence: draft.repeats, skipOnHoliday: draft.skipOnHoliday });
      } else {
        addHabit({ name: draft.name.trim(), targetCount, cadence: draft.repeats, groupId: draft.groupId || null, skipOnHoliday: draft.skipOnHoliday });
      }
    }
    setHabitModal(null);
  }

  function submitGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    addGroup(groupName.trim());
    setGroupName('');
    setAddingGroup(false);
  }
  function startEditGroup(group) {
    setGroupEditName(group.name);
    setEditingGroupId(group.id);
  }
  function commitEditGroup(id) {
    if (groupEditName.trim()) renameGroup(id, groupEditName.trim());
    setEditingGroupId(null);
  }

  function habitDragProps(h) {
    return {
      onDragStart: () => setDragId(h.id),
      onDragOver: (e) => { e.preventDefault(); setDragOverId(h.id); },
      onDragLeave: () => setDragOverId(null),
      onDrop: (e) => {
        e.stopPropagation();
        if (dragId) reorderHabits(dragId, h.id, h.groupId || null);
        setDragId(null);
        setDragOverId(null);
      },
    };
  }
  function groupContainerDropProps(groupId) {
    return {
      onDragOver: (e) => e.preventDefault(),
      onDrop: () => {
        if (dragId) reorderHabits(dragId, null, groupId || null);
        setDragId(null);
        setDragOverId(null);
      },
    };
  }

  function itemsForGroup(groupId) {
    const regular = habits.filter((h) => (h.groupId || null) === groupId);
    const daySpecific = weeklyHabits.filter((w) => (w.groupId || null) === groupId);
    return { regular, daySpecific };
  }

  const ungrouped = itemsForGroup(null);

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">Manage habits</h2>
        <button className="btn btn-primary" onClick={openCreateModal}><Plus size={13} /> New habit</button>
      </div>

      <div className="collapsible" style={{ marginBottom: '1.5rem' }}>
        <div className="collapsible-header" style={{ cursor: 'default' }}>Reset schedule</div>
        <div className="collapsible-body">
          <div className="modal-row" style={{ marginBottom: 10 }}>
            <label>Weekly goals reset on</label>
            <select value={weeklyResetDay} onChange={(e) => setWeeklyResetDay(parseInt(e.target.value, 10))}>
              {WEEKDAY_NAMES.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div className="modal-row" style={{ marginBottom: 0 }}>
            <label>Monthly goals reset on</label>
            <select value={monthlyResetDay} onChange={(e) => setMonthlyResetDay(parseInt(e.target.value, 10))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{ordinal(d)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="day-list-outer">
        {groups.map((group) => {
          const { regular, daySpecific } = itemsForGroup(group.id);
          const total = regular.length + daySpecific.length;
          return (
            <div
              className={`day-section ${groupDragOverId === group.id ? 'group-drag-over' : ''}`}
              key={group.id}
              draggable={editingGroupId !== group.id}
              onDragStart={() => setGroupDragId(group.id)}
              onDragOver={(e) => { e.preventDefault(); setGroupDragOverId(group.id); }}
              onDragLeave={() => setGroupDragOverId(null)}
              onDrop={() => {
                if (groupDragId) {
                  reorderGroups(groupDragId, group.id);
                  setGroupDragId(null);
                } else if (dragId) {
                  reorderHabits(dragId, null, group.id);
                  setDragId(null);
                  setDragOverId(null);
                }
                setGroupDragOverId(null);
              }}
            >
              <div className="day-section-header group-header">
                <span
                  style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => toggleGroupCollapsed(group.id)}
                >
                  {group.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                  {editingGroupId === group.id ? (
                    <input
                      type="text"
                      className="group-name-input"
                      value={groupEditName}
                      onChange={(e) => setGroupEditName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => commitEditGroup(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commitEditGroup(group.id); }
                        if (e.key === 'Escape') { e.preventDefault(); setEditingGroupId(null); }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{group.name}</span>
                  )}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({total})</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span role="button" tabIndex={0} className="btn-ghost" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEditGroup(group); }}>Rename</span>
                  <span role="button" tabIndex={0} className="btn-ghost btn-danger" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}>Remove group</span>
                </span>
              </div>
              {!group.collapsed && (
                <div className="day-section-body" {...groupContainerDropProps(group.id)}>
                  {total === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 16px' }}>No habits in this group yet — drag one here, or add one above.</p>
                  ) : (
                    <>
                      {regular.map((habit) => (
                        <ManageRow
                          key={habit.id}
                          name={habit.name}
                          badges={regularBadges(habit)}
                          skipOnHoliday={habit.skipOnHoliday}
                          draggable
                          dragOver={dragOverId === habit.id}
                          onEdit={() => openEditRegular(habit)}
                          onDelete={() => deleteHabit(habit.id)}
                          {...habitDragProps(habit)}
                        />
                      ))}
                      {daySpecific.map((w) => (
                        <ManageRow
                          key={'ds_' + w.id}
                          name={w.name}
                          badges={daySpecificBadges(w)}
                          skipOnHoliday={w.skipOnHoliday}
                          onEdit={() => openEditDaySpecific(w)}
                          onDelete={() => setWeeklyHabits(weeklyHabits.filter((x) => x.id !== w.id))}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="day-section" {...groupContainerDropProps(null)}>
          {groups.length > 0 && (ungrouped.regular.length + ungrouped.daySpecific.length > 0) && (
            <div className="day-section-label">Ungrouped</div>
          )}
          <div className="day-section-body">
            {ungrouped.regular.map((habit) => (
              <ManageRow
                key={habit.id}
                name={habit.name}
                badges={regularBadges(habit)}
                skipOnHoliday={habit.skipOnHoliday}
                draggable
                dragOver={dragOverId === habit.id}
                onEdit={() => openEditRegular(habit)}
                onDelete={() => deleteHabit(habit.id)}
                {...habitDragProps(habit)}
              />
            ))}
            {ungrouped.daySpecific.map((w) => (
              <ManageRow
                key={'ds_' + w.id}
                name={w.name}
                badges={daySpecificBadges(w)}
                skipOnHoliday={w.skipOnHoliday}
                onEdit={() => openEditDaySpecific(w)}
                onDelete={() => setWeeklyHabits(weeklyHabits.filter((x) => x.id !== w.id))}
              />
            ))}
            {ungrouped.regular.length === 0 && ungrouped.daySpecific.length === 0 && groups.length === 0 && (
              <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>No habits yet — add one above.</div>
            )}
          </div>
        </div>
      </div>

      {addingGroup ? (
        <form className="form-row" onSubmit={submitGroup} style={{ marginTop: -6 }}>
          <input type="text" placeholder="Group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} autoFocus />
          <button type="submit" className="btn btn-primary">Add group</button>
          <button type="button" className="btn" onClick={() => setAddingGroup(false)}>Cancel</button>
        </form>
      ) : (
        <button className="btn" onClick={() => setAddingGroup(true)}>
          <Plus size={13} /> New group
        </button>
      )}

      {habitModal && (
        <div className="modal-backdrop" onClick={() => setHabitModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{habitModal.mode === 'edit' ? 'Edit habit' : 'New habit'}</h2>
            <form onSubmit={submitHabitModal}>
              <div className="modal-row">
                <label>Name</label>
                <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus />
              </div>
              <div className="modal-row">
                <label>Repeats</label>
                <select value={draft.repeats} onChange={(e) => setDraft({ ...draft, repeats: e.target.value })}>
                  <option value="day">Daily</option>
                  <option value="week">Weekly goal</option>
                  <option value="month">Monthly goal</option>
                  <option value="dayspecific">Day-specific</option>
                </select>
              </div>

              {draft.repeats === 'dayspecific' ? (
                <>
                  <div className="modal-row">
                    <label>Days</label>
                    <div className="weekday-row">
                      {WEEKDAYS.map((d) => (
                        <button type="button" key={d.key} className={`weekday-chip ${draft.days.includes(d.key) ? 'selected' : ''}`} onClick={() => toggleDraftDay(d.key)}>{d.label}</button>
                      ))}
                      <button
                        type="button"
                        className={`weekday-chip ${hasWeekend(draft.days) ? 'selected' : ''}`}
                        onClick={() => toggleDraftDay('weekend')}
                        title="Weekend (Saturday & Sunday)"
                      >
                        {WEEKEND_CHIP.label}
                      </button>
                    </div>
                  </div>
                  <div className="modal-row">
                    <label>Every</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="number" min="1" value={draft.everyNth} onChange={(e) => setDraft({ ...draft, everyNth: e.target.value })} style={{ width: 70 }} />
                      <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>occurrence(s) — e.g. 2 = every other selected day</span>
                    </div>
                  </div>
                  <div className="modal-row">
                    <label className="toggle-pill" style={{ width: 'fit-content' }}>
                      <input type="checkbox" checked={draft.keepUntilDone} onChange={(e) => setDraft({ ...draft, keepUntilDone: e.target.checked })} />
                      Keep until done
                    </label>
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                      Stays on your list until you check it off, or until its next scheduled day comes around — whichever is first. Otherwise it only appears on the day itself.
                    </p>
                  </div>
                </>
              ) : (
                <div className="modal-row">
                  <label>{draft.repeats === 'day' ? 'Times per day' : `Times per ${draft.repeats}`}</label>
                  <input type="number" min="1" value={draft.targetCount} onChange={(e) => setDraft({ ...draft, targetCount: e.target.value })} />
                </div>
              )}

              <div className="modal-row">
                <label>Group</label>
                <select value={draft.groupId || ''} onChange={(e) => setDraft({ ...draft, groupId: e.target.value })}>
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-row">
                <label className="toggle-pill" style={{ width: 'fit-content' }}>
                  <input type="checkbox" checked={draft.skipOnHoliday} onChange={(e) => setDraft({ ...draft, skipOnHoliday: e.target.checked })} />
                  <Plane size={12} /> Pause on holiday
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setHabitModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{habitModal.mode === 'edit' ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
