// To-do lists ("tabs") and their sections. Each task carries a categoryId and
// an optional subId; tasks from before this existed have neither, so they're
// placed by their old Personal/Work flag instead — nothing needs migrating.

export const DEFAULT_TODO_CATEGORIES = [
  { id: 'personal', name: 'Personal', isWork: false, subs: [] },
  { id: 'work', name: 'Work', isWork: true, subs: [] },
];

export function catIdOf(todo, categories) {
  if (todo.categoryId && categories.some((c) => c.id === todo.categoryId)) return todo.categoryId;
  const fallback = todo.isWork ? categories.find((c) => c.isWork) : categories.find((c) => !c.isWork);
  return (fallback || categories[0]).id;
}

export function subIdOf(todo, categories) {
  const cat = categories.find((c) => c.id === catIdOf(todo, categories));
  return cat && todo.subId && cat.subs.some((s) => s.id === todo.subId) ? todo.subId : null;
}

// Where brand-new tasks typed on the Today tab land.
export function defaultCategory(categories) {
  return categories.find((c) => !c.isWork) || categories[0];
}
