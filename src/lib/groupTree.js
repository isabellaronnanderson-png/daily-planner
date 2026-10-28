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
