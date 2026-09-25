import { Progress, StatusBadge, fmtDate } from './ui.jsx';

export default function DonationCard({ d, children, showTimeline }) {
  return (
    <article className="card donation">
      {d.photoUrl && <img src={d.photoUrl} alt={d.itemName} className="thumb" />}
      <div className="grow">
        <div className="row between">
          <h3>{d.itemName}</h3><StatusBadge status={d.status} />
        </div>
        <p className="muted">{d.foodType} · {d.weightKg} kg{d.quantity ? ` · ${d.quantity}` : ''} · expires {fmtDate(d.expiresAt)}</p>
        {d.match?.shelter && <p>Shelter: <strong>{d.match.shelter.name || 'Assigned'}</strong>{d.match.distanceKm != null && ` (${d.match.distanceKm} km, risk ${d.match.riskScore})`}</p>}
        {d.driver?.name && <p>Driver: <strong>{d.driver.name}</strong></p>}
        {d.rejectReason && <p className="err">{d.rejectReason}</p>}
        <Progress status={d.status} />
        {showTimeline && <ul className="timeline">{d.timeline.map((t, i) => <li key={i}><b>{t.status.replace('_', ' ')}</b> {t.note} <em>{fmtDate(t.at)}</em></li>)}</ul>}
        {children}
      </div>
    </article>
  );
}
