// Office days are stored as a list of local dates ("YYYY-MM-DD"). The count
// for a month is just how many of those dates fall in it, so it "resets" on
// the 1st automatically — and past months stay on record for Insights.

export function localDateKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function monthKeyOf(iso) {
  return localDateKey(iso).slice(0, 7); // "YYYY-MM"
}

export function officeCountForMonth(officeDays, monthKey) {
  return officeDays.filter((d) => d.startsWith(monthKey)).length;
}

export function formatMonthKey(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
