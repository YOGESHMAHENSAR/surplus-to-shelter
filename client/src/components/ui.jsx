const RANK = {
  submitted: 0,
  matched: 1,
  dispatching: 1,
  accepted: 2,
  at_donor: 2,
  picked_up: 3,
  at_shelter: 3,
  delivered: 4,
};

const STEPS = [
  { key: 'Submitted', label: '1. Logged' },
  { key: 'Matched', label: '2. Matched' },
  { key: 'Driver assigned', label: '3. Assigned' },
  { key: 'Picked up', label: '4. In Transit' },
  { key: 'Delivered', label: '5. Delivered' },
];

const BAD = ['rejected', 'expired', 'unassigned'];

const STATUS_ICONS = {
  submitted: '⏳ Logged',
  matched: '🎯 Matched',
  dispatching: '🚚 Dispatching',
  accepted: '🤝 Assigned',
  at_donor: '📍 At Donor',
  picked_up: '📦 In Transit',
  at_shelter: '🏠 At Shelter',
  delivered: '✓ Delivered',
  rejected: '⚠️ Unmatched',
  expired: '⌛ Expired',
};

export const label = (s) => STATUS_ICONS[s] || s.replace('_', ' ');

export function StatusBadge({ status }) {
  const isBad = BAD.includes(status);
  const isGood = status === 'delivered';
  const isWarn = ['matched', 'dispatching', 'accepted', 'at_donor', 'picked_up'].includes(status);

  return (
    <span className={`badge ${isBad ? 'bad' : isGood ? 'good' : isWarn ? 'warn' : 'info'}`}>
      {label(status)}
    </span>
  );
}

// Shows how far a donation has moved through the five-stage workflow
export function Progress({ status }) {
  if (BAD.includes(status)) return null;
  const at = RANK[status] ?? 0;
  return (
    <ol className="progress" aria-label="Donation progress">
      {STEPS.map((s, i) => (
        <li key={s.key} className={i < at ? 'done' : i === at ? 'now' : ''}>
          {i < at ? `✓ ${s.label}` : s.label}
        </li>
      ))}
    </ol>
  );
}

export const Empty = ({ children }) => <div className="empty">{children}</div>;

export const Stat = ({ value, unit, name }) => (
  <div className="stat">
    <div className="stat-v">
      {value}
      <small>{unit}</small>
    </div>
    <div className="stat-n">{name}</div>
  </div>
);

export const fmtDate = (d) =>
  new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
