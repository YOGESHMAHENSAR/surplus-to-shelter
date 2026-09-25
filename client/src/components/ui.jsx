const RANK = { submitted: 0, matched: 1, dispatching: 1, accepted: 2, at_donor: 2, picked_up: 3, at_shelter: 3, delivered: 4 };
const STEPS = ['Submitted', 'Matched', 'Driver assigned', 'Picked up', 'Delivered'];
const BAD = ['rejected', 'expired', 'unassigned'];

export const label = (s) => s.replace('_', ' ');

export function StatusBadge({ status }) {
  return <span className={`badge ${BAD.includes(status) ? 'bad' : status === 'delivered' ? 'good' : 'info'}`}>{label(status)}</span>;
}

// Shows how far a donation has moved through the five-stage workflow
export function Progress({ status }) {
  if (BAD.includes(status)) return null;
  const at = RANK[status] ?? 0;
  return (
    <ol className="progress" aria-label="Donation progress">
      {STEPS.map((s, i) => <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''}>{s}</li>)}
    </ol>
  );
}

export const Empty = ({ children }) => <p className="empty">{children}</p>;
export const Stat = ({ value, unit, name }) => (
  <div className="stat"><div className="stat-v">{value}<small>{unit}</small></div><div className="stat-n">{name}</div></div>
);
export const fmtDate = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
