import { Check, Square, X } from 'lucide-react';
import { noonIso, dailyRowsFor, setDailyCount, locateGoal, goalState, setClosedGoalCount } from '../lib/pastDay';

// One tickable row: a single checkbox, or numbered marks for "N times" habits.
function LogRow({ label, hint, count, target, disabled, onSet }) {
  return (
    <div className={`pastday-row ${disabled ? 'disabled' : ''}`}>
      <div className="pastday-label">
        {label}
        {target > 1 && <span className="count-text"> {count}/{target}</span>}
        {hint && <div className="pastday-hint">{hint}</div>}
      </div>
      {!disabled && (target <= 1 ? (
        <button
          className={`check-btn ${count >= 1 ? '' : 'unchecked'}`}
          onClick={() => onSet(count >= 1 ? 0 : 1)}
          aria-label={count >= 1 ? 'Mark not done' : 'Mark done'}
        >
          {count >= 1 ? <Check size={17} /> : <Square size={17} />}
        </button>
      ) : (
        <div className="count-marks" role="group" aria-label={`${count} of ${target} done`}>
          {Array.from({ length: target }).map((_, i) => (
            <button
              key={i}
              className={`count-mark ${i < count ? 'filled' : ''}`}
              onClick={() => onSet(count === i + 1 ? i : i + 1)}
              aria-label={`Mark ${i + 1} of ${target}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Lets you log things on an earlier day without touching today's list: daily
// habits are written to that day's history record, weekly/monthly goals are
// credited to whichever cycle that date belongs to.
export default function PastDaySheet({
  dateKey, habits, weeklyHabits, setHabitCount,
  habitHistory, setHabitHistory,
  weeklyGoalHistory, setWeeklyGoalHistory,
  monthlyGoalHistory, setMonthlyGoalHistory,
  officeDays, setOfficeDays,
  onClose,
}) {
  const title = new Date(noonIso(dateKey)).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const allRows = dailyRowsFor(habitHistory, habits, dateKey, weeklyHabits);
  const dailyRows = allRows.filter((r) => !r.daySpecific);
  const daySpecificRows = allRows.filter((r) => r.daySpecific);
  const doneOf = (rows) => rows.filter((r) => r.completed).length;
  const setRow = (r, n) => setHabitHistory((prev) => setDailyCount(prev, habits, dateKey, r.name, n, weeklyHabits));
  const goals = habits.filter((h) => h.cadence === 'week' || h.cadence === 'month');
  const inOffice = officeDays.includes(dateKey);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal pastday-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pastday-head">
          <h2>{title}</h2>
          <button className="chore-remove" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className="pastday-intro">Log what you did that day. This doesn't change today's list.</p>

        <div className="pastday-scroll">
          <div className="pastday-section-title">
            Habits{dailyRows.length > 0 && ` · ${doneOf(dailyRows)} of ${dailyRows.length} done`}
          </div>
          {dailyRows.length === 0 && <div className="pastday-hint">No daily habits to log.</div>}
          {dailyRows.map((r) => (
            <LogRow key={r.name} label={r.name} count={r.count} target={r.target} onSet={(n) => setRow(r, n)} />
          ))}

          {daySpecificRows.length > 0 && (
            <div className="pastday-section-title">
              Day-specific · {doneOf(daySpecificRows)} of {daySpecificRows.length} done
            </div>
          )}
          {daySpecificRows.map((r) => (
            <LogRow
              key={r.name}
              label={r.name}
              hint={r.uncertain ? `Set for every ${r.everyNth} — only tick it if it was due that day` : undefined}
              count={r.count}
              target={r.target}
              onSet={(n) => setRow(r, n)}
            />
          ))}

          {goals.length > 0 && <div className="pastday-section-title">Weekly &amp; monthly goals</div>}
          {goals.map((h) => {
            const isWeek = h.cadence === 'week';
            const history = isWeek ? weeklyGoalHistory : monthlyGoalHistory;
            const setHistory = isWeek ? setWeeklyGoalHistory : setMonthlyGoalHistory;
            const loc = locateGoal(h, dateKey, history);
            if (loc.where === 'none' || loc.where === 'future') {
              return (
                <LogRow
                  key={h.id}
                  label={h.name}
                  hint={
                    loc.where === 'future'
                      ? `That ${isWeek ? 'week' : 'month'} hasn't started in the app yet — press New day first.`
                      : `That ${isWeek ? 'week' : 'month'}'s record can't be edited.`
                  }
                  count={0}
                  target={1}
                  disabled
                />
              );
            }
            const { count, target } = goalState(h, loc, history);
            return (
              <LogRow
                key={h.id}
                label={h.name}
                hint={loc.where === 'live' ? `Counts toward this ${isWeek ? 'week' : 'month'}` : `Counts toward the ${isWeek ? 'week' : 'month'} that day fell in`}
                count={count}
                target={target}
                onSet={(n) => (loc.where === 'live' ? setHabitCount(h.id, n) : setHistory((prev) => setClosedGoalCount(prev, loc, h.name, n)))}
              />
            );
          })}

          <div className="pastday-section-title">Office</div>
          <LogRow
            label="In office"
            count={inOffice ? 1 : 0}
            target={1}
            onSet={() => setOfficeDays((prev) => (prev.includes(dateKey) ? prev.filter((d) => d !== dateKey) : [...prev, dateKey]))}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
