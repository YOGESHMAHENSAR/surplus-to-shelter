import { Progress, StatusBadge, fmtDate } from './ui.jsx';

export default function DonationCard({ d, children, showTimeline }) {
  return (
    <article className="card donation">
      {d.photoUrl && <img src={d.photoUrl} alt={d.itemName} className="thumb" />}
      <div className="grow">
        <div className="row between">
          <h3 style={{ margin: 0 }}>{d.itemName}</h3>
          <StatusBadge status={d.status} />
        </div>
        <p className="muted small" style={{ margin: '6px 0 10px' }}>
          <strong style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{d.foodType}</strong> · <strong>{d.weightKg} kg</strong>
          {d.quantity ? ` · ${d.quantity}` : ''} · ⌛ Expires {fmtDate(d.expiresAt)}
        </p>

        {d.match?.shelter && (
          <p style={{ margin: '4px 0', fontSize: '0.92rem' }}>
            🏠 Matched Shelter: <strong>{d.match.shelter.name || 'Assigned Shelter'}</strong>
            {d.match.distanceKm != null && (
              <span className="muted small"> ({d.match.distanceKm} km away, Risk Score: {d.match.riskScore})</span>
            )}
          </p>
        )}

        {d.driver?.name && (
          <p style={{ margin: '4px 0', fontSize: '0.92rem' }}>
            🚚 Volunteer Driver: <strong>{d.driver.name}</strong>
          </p>
        )}

        {d.rejectReason && (
          <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bad-soft)', borderRadius: 'var(--radius-md)' }}>
            <p className="err" style={{ margin: 0, fontSize: '0.88rem' }}>
              ⚠️ Reason: {d.rejectReason}
            </p>
          </div>
        )}

        <Progress status={d.status} />

        {showTimeline && d.timeline && d.timeline.length > 0 && (
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>
              View Mission Audit Timeline ({d.timeline.length} events)
            </summary>
            <ul className="timeline" style={{ marginTop: '8px' }}>
              {d.timeline.map((t, i) => (
                <li key={i}>
                  <b style={{ textTransform: 'capitalize' }}>{t.status.replace('_', ' ')}</b> {t.note}{' '}
                  <em>{fmtDate(t.at)}</em>
                </li>
              ))}
            </ul>
          </details>
        )}

        {children}
      </div>
    </article>
  );
}
