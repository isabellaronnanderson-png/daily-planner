// Habit groups can sit inside other groups. Each group has an optional
// parentId (none = top level); habits and day-specific habits point at
// whichever group they belong to, at any depth. Order among siblings is the
// order of the flat groups array.

// A parent that no longer exists counts as "top level", so nothing is lost.
export function childrenOf(groups, parentId) {
  const ids = new Set(groups.map((g) => g.id));
  return groups.filter((g) => (parentId == null ? !g.parentId || !ids.has(g.parentId) : g.parentId === parentId));
}

// Every group nested anywhere below this one.
export function descendantIds(groups, id) {
  const out = new Set();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop();
    groups.forEach((g) => {
      if (g.parentId === cur && !out.has(g.id) && g.id !== id) {
        out.add(g.id);
        stack.push(g.id);
      }
    });
  }
  return out;
}

// Depth-first list: [{ group, depth, path: 'Weekly › Health' }]
export function flattenGroups(groups) {
  const out = [];
  const seen = new Set();
  function walk(parentId, depth, trail) {
    childrenOf(groups, parentId).forEach((g) => {
      if (seen.has(g.id)) return;
      seen.add(g.id);
      const names = [...trail, g.name];
      out.push({ group: g, depth, path: names.join(' › ') });
      walk(g.id, depth + 1, names);
    });
  }
  walk(null, 0, []);
  return out;
}

// ---- Which tab a group / habit lives on ----
// Only top-level groups carry a tabId; subgroups (and the habits in any
// group) belong to whichever tab their top-level group is on. Anything
// pointing at a tab that no longer exists falls back to "today".
export function tabOfGroup(groups, id, tabIds) {
  let cur = groups.find((g) => g.id === id);
  const seen = new Set();
  while (cur && cur.parentId && !seen.has(cur.id)) {
    seen.add(cur.id);
    const parent = groups.find((g) => g.id === cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur && cur.tabId && tabIds.has(cur.tabId) ? cur.tabId : 'today';
}

// Works for habits, day-specific habits and one-off lines alike.
export function tabOfItem(item, groups, tabIds) {
  if (item.groupId && groups.some((g) => g.id === item.groupId)) return tabOfGroup(groups, item.groupId, tabIds);
  return item.tabId && tabIds.has(item.tabId) ? item.tabId : 'today';
}
