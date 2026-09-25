import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Empty, Stat, fmtDate } from '../components/ui.jsx';

const download = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click();
};

export default function Impact() {
  const { user, tick } = useAuth();
  const [sum, setSum] = useState(null); const [hot, setHot] = useState([]); const [tax, setTax] = useState(null);
  useEffect(() => {
    api.get('/impact/summary').then((r) => setSum(r.data));
    if (['admin', 'donor'].includes(user.role)) api.get('/impact/hotspots').then((r) => setHot(r.data));
  }, [tick, user.role]);
  if (!sum) return <main className="page"><p>Loading…</p></main>;
  const t = sum.totals, max = Math.max(1, ...sum.monthly.map((m) => m.weightKg));

  const esgCsv = () => download('esg-report.csv', ['Metric,Value', `Total meals rescued,${t.meals}`, `Food diverted (kg),${t.weightKg}`, `CO2e avoided (kg),${t.co2eKg}`, `Food not rescued (kg),${t.wastedKg}`, '', 'Month,Weight kg,Meals', ...sum.monthly.map((m) => `${m.month},${m.weightKg},${m.meals}`)].join('\n'));
  const loadTax = () => api.get('/impact/tax-receipt').then((r) => setTax(r.data));

  return (
    <main className="page">
      <h1>Impact</h1>
      <section className="stats">
        <Stat value={t.meals.toLocaleString()} name="Meals rescued" />
        <Stat value={t.weightKg.toLocaleString()} unit=" kg" name="Food diverted from waste" />
        <Stat value={t.co2eKg.toLocaleString()} unit=" kg" name="CO₂e avoided" />
        <Stat value={t.wastedKg.toLocaleString()} unit=" kg" name="Could not be placed" />
      </section>

      <section className="card">
        <h2>Food rescued per month</h2>
        {sum.monthly.length === 0 ? <Empty>No completed deliveries yet.</Empty> :
          <div className="bars">{sum.monthly.map((m) => <div key={m.month} className="bar"><div style={{ height: `${(m.weightKg / max) * 100}%` }} title={`${m.weightKg} kg`} /><span>{m.month.slice(2)}</span></div>)}</div>}
        {sum.byType.length > 0 && <p className="muted">By type: {sum.byType.map((b) => `${b.type} ${b.weightKg} kg`).join(' · ')}</p>}
        <div className="row"><button className="ghost" onClick={esgCsv}>Download ESG report (CSV)</button></div>
      </section>

      {hot.length > 0 && (
        <section className="card">
          <h2>Waste hotspots</h2>
          <p className="muted">Areas (about 1 km grid) ranked by food that was posted but never reached a shelter.</p>
          <div className="scroll"><table><thead><tr><th>Area (lat, lng)</th><th>Donations</th><th>Rescued kg</th><th>Wasted kg</th></tr></thead>
            <tbody>{hot.map((c, i) => <tr key={i}><td>{c.lat}, {c.lng}</td><td>{c.donations}</td><td>{c.rescuedKg.toFixed(1)}</td><td className={c.wastedKg ? 'err' : ''}>{c.wastedKg.toFixed(1)}</td></tr>)}</tbody></table></div>
        </section>)}

      {user.role === 'donor' && (
        <section className="card">
          <h2>Donor tax documentation</h2>
          {!tax ? <button className="ghost" onClick={loadTax}>Generate {new Date().getFullYear()} receipt</button> : (
            <div className="receipt">
              <h3>Donation receipt, {tax.year}</h3>
              <p>{tax.donor.orgName || tax.donor.name}{tax.donor.address ? `, ${tax.donor.address}` : ''}</p>
              <table><thead><tr><th>Date</th><th>Item</th><th>Recipient</th><th>kg</th><th>Est. value</th></tr></thead>
                <tbody>{tax.rows.map((r) => <tr key={r.id}><td>{fmtDate(r.date)}</td><td>{r.item}</td><td>{r.shelter}</td><td>{r.weightKg}</td><td>${r.valueUsd}</td></tr>)}</tbody>
                <tfoot><tr><td colSpan="3">Total</td><td>{tax.totalKg}</td><td>${tax.totalUsd}</td></tr></tfoot></table>
              <p className="muted small">Values are estimates at ${tax.ratePerKg}/kg. Confirm the deductible amount with your tax adviser.</p>
              <button className="primary no-print" onClick={() => window.print()}>Print or save as PDF</button>
            </div>)}
        </section>)}
    </main>
  );
}
