import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Plane } from 'lucide-react';
import ActionMenu from '../components/ActionMenu';
import { childrenOf, descendantIds, flattenGroups, tabOfGroup, tabOfItem } from '../lib/groupTree';
import { PROTECTED_TAB_IDS, periodOfTab } from '../lib/todayTabs';

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
  resetDay: 1,
  resetEvery: 1,
  groupId: '',
  tabId: 'today',
  skipOnHoliday: false,
};

function regularBadges(habit) {
  const badges = [];
  if (habit.cadence === 'week') {
    const every = habit.resetEvery || 1;
    badges.push(`${every > 1 ? `Every ${every} weeks` : 'Weekly'} · resets ${WEEKDAY_NAMES[habit.resetDay ?? 1]}`);
  }
  if (habit.cadence === 'month') {
    const every = habit.resetEvery || 1;
    badges.push(`${every > 1 ? `Every ${every} months` : 'Monthly'} · resets the ${ordinal(habit.resetDay ?? 1)}`);
  }
  if ((habit.targetCount || 1) > 1) badges.push(`${habit.targetCount}x`);
  return badges;
}
function daySpecificBadges(w) {
  const badges = [...dayBadges(w.days)];
  if ((w.everyNth || 1) > 1) badges.push(`every ${w.everyNth}`);
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
  habits, addHabit, editHabit, deleteHabit, removeHabitOnly, removeInjectedInstances, reorderHabits,
  groups, todayTabs, setTodayTabs, deleteTab, moveHabitToTab, addGroup, toggleGroupCollapsed, deleteGroup, moveGroup, renameGroup, reorderGroups,
  weeklyHabits, setWeeklyHabits,
}) {
  // Tabs organise habits the same way as on the Today view; each tab shows only its own.
  const [tabId, setTabId] = useState('today');
  const [editingTabs, setEditingTabs] = useState(false);
  const [addingTab, setAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const activeTab = todayTabs.find((t) => t.id === tabId) || todayTabs[0];
  const tabIdSet = new Set(todayTabs.map((t) => t.id));
  const [tabDropId, setTabDropId] = useState(null); // tab pill currently hovered while dragging

  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDragId, setGroupDragId] = useState(null);
  const [groupDragOverId, setGroupDragOverId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [groupEditName, setGroupEditName] = useState('');
  const [addingSubFor, setAddingSubFor] = useState(null); // id of the group a new subgroup is being added to
  const [subName, setSubName] = useState('');

  const [habitModal, setHabitModal] = useState(null); // { mode: 'create'|'edit', type?: 'regular'|'dayspecific', id? }
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  function openCreateModal() {
    setDraft({ ...EMPTY_DRAFT, tabId: activeTab.id });
    setHabitModal({ mode: 'create' });
  }
  function openEditRegular(habit) {
    setDraft({
      name: habit.name,
      repeats: habit.cadence || 'day',
      targetCount: habit.targetCount || 1,
      days: [],
      everyNth: 1,
      resetDay: habit.resetDay ?? 1,
      resetEvery: habit.resetEvery || 1,
      groupId: habit.groupId || '',
      tabId: tabOfItem(habit, groups, tabIdSet),
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
      resetDay: 1,
      resetEvery: 1,
      groupId: w.groupId || '',
      tabId: tabOfItem(w, groups, tabIdSet),
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

    const isEdit = habitModal.mode === 'edit';
    const originalType = habitModal.type; // 'regular' | 'dayspecific' (edit only)

    if (draft.repeats === 'dayspecific') {
      if (draft.days.length === 0) return;
      const everyNth = parseInt(draft.everyNth, 10) || 1;
      if (isEdit && originalType === 'dayspecific') {
        setWeeklyHabits(
          weeklyHabits.map((w) =>
            w.id === habitModal.id
              ? { ...w, name: draft.name.trim(), days: draft.days, everyNth, groupId: draft.groupId || null, tabId: draft.tabId, skipOnHoliday: draft.skipOnHoliday }
              : w
          )
        );
      } else {
        // Creating new, or converting a regular habit into a day-specific one:
        // in the latter case, remove the original so it isn't duplicated.
        if (isEdit && originalType === 'regular') removeHabitOnly(habitModal.id);
        setWeeklyHabits([
          ...weeklyHabits,
          {
            id: Date.now(),
            name: draft.name.trim(),
            days: draft.days,
            everyNth,
            groupId: draft.groupId || null,
            tabId: draft.tabId,
            skipOnHoliday: draft.skipOnHoliday,
            occurrenceCount: 0,
          },
        ]);
      }
    } else {
      const targetCount = parseInt(draft.targetCount, 10) || 1;
      // A habit on a weekly tab is a weekly goal (reset by "Begin a new week").
      if (periodOfTab(todayTabs, draft.tabId) === 'week' && draft.repeats === 'day') draft.repeats = 'week';
      const parsedReset = parseInt(draft.resetDay, 10);
      const resetDay = Number.isNaN(parsedReset) ? 1 : parsedReset;
      const resetEvery = parseInt(draft.resetEvery, 10) || 1;
      if (isEdit && originalType === 'regular') {
        editHabit(habitModal.id, { name: draft.name, targetCount, groupId: draft.groupId || null, tabId: draft.tabId, cadence: draft.repeats, skipOnHoliday: draft.skipOnHoliday, resetDay, resetEvery });
      } else {
        // Creating new, or converting a day-specific habit into a regular one:
        // in the latter case, remove the original (and any of today's copies).
        if (isEdit && originalType === 'dayspecific') {
          setWeeklyHabits(weeklyHabits.filter((w) => w.id !== habitModal.id));
          removeInjectedInstances(habitModal.id);
        }
        addHabit({ name: draft.name.trim(), targetCount, cadence: draft.repeats, groupId: draft.groupId || null, tabId: draft.tabId, skipOnHoliday: draft.skipOnHoliday, resetDay, resetEvery });
      }
    }
    setHabitModal(null);
  }

  function submitGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    addGroup(groupName.trim(), null, activeTab.id);
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
      onDragStart: (e) => { e.stopPropagation(); setDragId(h.id); setGroupDragId(null); },
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

  // A habit pointing at a group that no longer exists counts as ungrouped.
  const knownGroupIds = new Set(groups.map((g) => g.id));
  const groupKeyOf = (x) => (x.groupId && knownGroupIds.has(x.groupId) ? x.groupId : null);
  function itemsForGroup(groupId) {
    const regular = habits.filter((h) => groupKeyOf(h) === groupId);
    const daySpecific = weeklyHabits.filter((w) => groupKeyOf(w) === groupId);
    return { regular, daySpecific };
  }
  function subtreeTotal(groupId) {
    const { regular, daySpecific } = itemsForGroup(groupId);
    return regular.length + daySpecific.length + childrenOf(groups, groupId).reduce((n, k) => n + subtreeTotal(k.id), 0);
  }

  function handleGroupDrop(group) {
    if (groupDragId) {
      // Groups reorder among their siblings; use "Move" to put one inside another.
      const dragged = groups.find((g) => g.id === groupDragId);
      if (dragged && (dragged.parentId || null) === (group.parentId || null)) reorderGroups(groupDragId, group.id);
      setGroupDragId(null);
    } else if (dragId) {
      reorderHabits(dragId, null, group.id);
      setDragId(null);
      setDragOverId(null);
    }
    setGroupDragOverId(null);
  }

  function submitSubgroup(e, parentId) {
    e.preventDefault();
    if (!subName.trim()) return;
    addGroup(subName.trim(), parentId);
    setSubName('');
    setAddingSubFor(null);
  }

  function renderGroup(group, depth) {
    const { regular, daySpecific } = itemsForGroup(group.id);
    const kids = childrenOf(groups, group.id);
    const total = subtreeTotal(group.id);
    const blockedParents = descendantIds(groups, group.id);
    return (
      <div
        className={`day-section ${depth > 0 ? 'day-subsection' : ''} ${groupDragOverId === group.id ? 'group-drag-over' : ''}`}
        key={group.id}
        draggable={editingGroupId !== group.id}
        onDragStart={(e) => { e.stopPropagation(); setGroupDragId(group.id); setDragId(null); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setGroupDragOverId(group.id); }}
        onDragLeave={() => setGroupDragOverId(null)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleGroupDrop(group); }}
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span role="button" tabIndex={0} className="btn-ghost" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); startEditGroup(group); }}>Rename</span>
            <span
              role="button"
              tabIndex={0}
              className="btn-ghost"
              style={{ fontSize: 11 }}
              onClick={(e) => { e.stopPropagation(); setAddingSubFor(group.id); setSubName(''); }}
            >
              Add subgroup
            </span>
            <span className="icon-tooltip-wrap" onClick={(e) => e.stopPropagation()}>
              <span className="btn-ghost" style={{ fontSize: 11 }}>Move</span>
              <select
                className="move-select"
                aria-label={`Move ${group.name} inside another group`}
                value={group.parentId && knownGroupIds.has(group.parentId) ? group.parentId : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.startsWith('tab:')) moveGroup(group.id, null, v.slice(4));
                  else moveGroup(group.id, v || null);
                }}
              >
                <option value="">Top level</option>
                {todayTabs
                  .filter((t) => t.id !== activeTab.id)
                  .map((t) => (
                    <option key={t.id} value={`tab:${t.id}`}>Move to tab: {t.name}</option>
                  ))}
                {flattenGroups(groups)
                  .filter(({ group: g }) => g.id !== group.id && !blockedParents.has(g.id) && tabOfGroup(groups, g.id, tabIdSet) === activeTab.id)
                  .map(({ group: g, path }) => (
                    <option key={g.id} value={g.id}>Inside: {path}</option>
                  ))}
              </select>
            </span>
            <span role="button" tabIndex={0} className="btn-ghost btn-danger" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}>Remove group</span>
          </span>
        </div>
        {!group.collapsed && (
          <div className="day-section-body">
            {regular.length + daySpecific.length === 0 && kids.length === 0 && addingSubFor !== group.id && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 16px' }}>Nothing in this group yet — drag a habit here, or add a subgroup.</p>
            )}
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
            {addingSubFor === group.id && (
              <form className="form-row subgroup-form" onSubmit={(e) => submitSubgroup(e, group.id)}>
                <input type="text" placeholder={`Subgroup inside ${group.name}`} value={subName} onChange={(e) => setSubName(e.target.value)} autoFocus />
                <button type="submit" className="btn btn-primary">Add</button>
                <button type="button" className="btn" onClick={() => setAddingSubFor(null)}>Cancel</button>
              </form>
            )}
            {kids.map((child) => renderGroup(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  const ungroupedAll = itemsForGroup(null);
  const ungrouped = {
    regular: ungroupedAll.regular.filter((h) => tabOfItem(h, groups, tabIdSet) === activeTab.id),
    daySpecific: ungroupedAll.daySpecific.filter((w) => tabOfItem(w, groups, tabIdSet) === activeTab.id),
  };
  const tabRoots = childrenOf(groups, null).filter((g) => tabOfGroup(groups, g.id, tabIdSet) === activeTab.id);

  function addTab(name) {
    const n = name.trim();
    if (!n) return;
    const id = 'tab_' + Date.now();
    setTodayTabs((prev) => [...prev, { id, name: n, period: 'day', todos: null }]);
    setTabId(id);
  }
  function renameTab(id, name) {
    setTodayTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  return (
    <div className="view">
      <div className="section-row">
        <h2 className="section-title">Manage habits</h2>
        <button className="btn btn-primary" onClick={openCreateModal}><Plus size={13} /> New habit</button>
      </div>

      <div className="todo-tabs">
        {todayTabs.map((tab) => (
          <button
            key={tab.id}
            className={`todo-tab ${tab.id === activeTab.id ? 'active' : ''} ${tabDropId === tab.id ? 'drop-target' : ''}`}
            onClick={() => setTabId(tab.id)}
            // Drag a group (or a loose habit) onto a tab to move it there.
            onDragOver={(e) => { if (groupDragId || dragId) { e.preventDefault(); setTabDropId(tab.id); } }}
            onDragLeave={() => setTabDropId(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (groupDragId) moveGroup(groupDragId, null, tab.id);
              else if (dragId) moveHabitToTab(dragId, tab.id);
              setGroupDragId(null);
              setDragId(null);
              setGroupDragOverId(null);
              setDragOverId(null);
              setTabDropId(null);
            }}
          >
            {tab.name}
          </button>
        ))}
        {addingTab ? (
          <input
            autoFocus
            className="todo-tab-input"
            placeholder="Tab name…"
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { addTab(newTabName); setNewTabName(''); setAddingTab(false); }
              if (e.key === 'Escape') { setNewTabName(''); setAddingTab(false); }
            }}
            onBlur={() => { if (newTabName.trim()) addTab(newTabName); setNewTabName(''); setAddingTab(false); }}
          />
        ) : (
          <button className="todo-tab todo-tab-add" onClick={() => setAddingTab(true)} aria-label="Add a tab" title="Add a tab">
            <Plus size={13} />
          </button>
        )}
        <button className="btn-ghost todo-edit-toggle" onClick={() => setEditingTabs((e) => !e)}>
          {editingTabs ? 'Done' : 'Edit tabs'}
        </button>
      </div>

      {editingTabs && (
        <div className="todo-edit-panel">
          <div className="todo-edit-row">
            <input
              className="todo-edit-input"
              value={activeTab.name}
              onChange={(e) => renameTab(activeTab.id, e.target.value)}
              onBlur={() => { if (!activeTab.name.trim()) renameTab(activeTab.id, 'Untitled'); }}
              aria-label="Tab name"
            />
            {!PROTECTED_TAB_IDS.includes(activeTab.id) && (
              <button
                className="btn-ghost btn-danger"
                onClick={() => {
                  if (confirm(`Delete the "${activeTab.name}" tab? Everything on it moves to Today — nothing is lost.`)) {
                    deleteTab(activeTab.id);
                    setTabId('today');
                  }
                }}
              >
                Delete tab
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {activeTab.period === 'week'
              ? 'Habits on this tab reset when you press "Begin a new week" (Monday–Sunday), and it has its own to-do list.'
              : activeTab.todos === 'today'
                ? 'Habits on this tab reset with "New day", and it has its own to-do list.'
                : 'Habits on this tab reset with "New day".'}
            {!PROTECTED_TAB_IDS.includes(activeTab.id) ? '' : ' This tab can be renamed but not deleted.'}
          </p>
        </div>
      )}

      <div className="day-list-outer">
        {tabRoots.map((group) => renderGroup(group, 0))}

        <div className="day-section" {...groupContainerDropProps(null)}>
          {tabRoots.length > 0 && (ungrouped.regular.length + ungrouped.daySpecific.length > 0) && (
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
            {ungrouped.regular.length === 0 && ungrouped.daySpecific.length === 0 && tabRoots.length === 0 && (
              <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-muted)' }}>Nothing on this tab yet — add a habit or a group.</div>
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
                </>
              ) : (
                <>
                  <div className="modal-row">
                    <label>
                      {draft.repeats === 'day'
                        ? 'Times per day'
                        : (draft.repeats === 'week' || draft.repeats === 'month') && (parseInt(draft.resetEvery, 10) || 1) > 1
                        ? `Times per ${parseInt(draft.resetEvery, 10)} ${draft.repeats === 'week' ? 'weeks' : 'months'}`
                        : `Times per ${draft.repeats}`}
                    </label>
                    <input type="number" min="1" value={draft.targetCount} onChange={(e) => setDraft({ ...draft, targetCount: e.target.value })} />
                  </div>
                  {draft.repeats === 'week' && (
                    <>
                      <div className="modal-row">
                        <label>Resets on</label>
                        <select value={draft.resetDay} onChange={(e) => setDraft({ ...draft, resetDay: parseInt(e.target.value, 10) })}>
                          {WEEKDAY_NAMES.map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="modal-row">
                        <label>Every</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="number" min="1" value={draft.resetEvery} onChange={(e) => setDraft({ ...draft, resetEvery: e.target.value })} style={{ width: 70 }} />
                          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>week(s) — e.g. 2 = only resets every other week</span>
                        </div>
                      </div>
                    </>
                  )}
                  {draft.repeats === 'month' && (
                    <>
                      <div className="modal-row">
                        <label>Resets on the</label>
                        <select value={draft.resetDay} onChange={(e) => setDraft({ ...draft, resetDay: parseInt(e.target.value, 10) })}>
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>{ordinal(d)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="modal-row">
                        <label>Every</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="number" min="1" value={draft.resetEvery} onChange={(e) => setDraft({ ...draft, resetEvery: e.target.value })} style={{ width: 70 }} />
                          <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>month(s) — e.g. 3 = only resets every 3rd month</span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="modal-row">
                <label>Tab</label>
                <select
                  value={draft.tabId}
                  onChange={(e) => {
                    const nextTab = e.target.value;
                    // The group has to be on the same tab, so clear it if it isn't.
                    const keepGroup = draft.groupId && tabOfGroup(groups, draft.groupId, tabIdSet) === nextTab;
                    setDraft({ ...draft, tabId: nextTab, groupId: keepGroup ? draft.groupId : '' });
                  }}
                >
                  {todayTabs.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-row">
                <label>Group</label>
                <select value={draft.groupId || ''} onChange={(e) => setDraft({ ...draft, groupId: e.target.value })}>
                  <option value="">No group</option>
                  {flattenGroups(groups)
                    .filter(({ group: g }) => tabOfGroup(groups, g.id, tabIdSet) === draft.tabId)
                    .map(({ group: g, path }) => (
                      <option key={g.id} value={g.id}>{path}</option>
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
