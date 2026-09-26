import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Empty, Stat, fmtDate } from '../components/ui.jsx';

const download = (name, text) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
};

export default function Impact() {
  const { user, tick } = useAuth();
  const [sum, setSum] = useState(null);
  const [hot, setHot] = useState([]);
  const [tax, setTax] = useState(null);

  useEffect(() => {
    api.get('/impact/summary').then((r) => setSum(r.data));
    if (['admin', 'donor'].includes(user.role)) api.get('/impact/hotspots').then((r) => setHot(r.data));
  }, [tick, user.role]);

  if (!sum) return <main className="page"><p className="muted">Calculating collective impact metrics…</p></main>;
  const t = sum.totals;
  const max = Math.max(1, ...sum.monthly.map((m) => m.weightKg));

  const esgCsv = () =>
    download(
      'esg-report.csv',
      [
        'Metric,Value',
        `Total meals rescued,${t.meals}`,
        `Food diverted (kg),${t.weightKg}`,
        `CO2e avoided (kg),${t.co2eKg}`,
        `Food not rescued (kg),${t.wastedKg}`,
        '',
        'Month,Weight kg,Meals',
        ...sum.monthly.map((m) => `${m.month},${m.weightKg},${m.meals}`),
      ].join('\n')
    );

  const loadTax = () => api.get('/impact/tax-receipt').then((r) => setTax(r.data));

  return (
    <main className="page">
      <div className="mission-header">
        <div className="row between">
          <div>
            <span className="badge good">🌍 Environmental & Hunger Relief Metrics</span>
            <h1 style={{ marginTop: '6px' }}>Collective Impact Dashboard</h1>
            <p>Every kilogram diverted feeds families in need and eliminates methane emissions from landfills.</p>
          </div>
          <button className="ghost" onClick={esgCsv}>
            📊 Download ESG Report (CSV)
          </button>
        </div>
      </div>

      <section className="stats">
        <Stat value={t.meals.toLocaleString()} name="Meals Rescued & Served" />
        <Stat value={t.weightKg.toLocaleString()} unit=" kg" name="Surplus Diverted from Waste" />
        <Stat value={t.co2eKg.toLocaleString()} unit=" kg" name="Landfill CO₂e Prevented" />
        <Stat value={t.wastedKg.toLocaleString()} unit=" kg" name="Unmatched Surplus" />
      </section>

      <section className="card">
        <div className="row between">
          <h2>Food Rescued Month-by-Month</h2>
          {sum.byType.length > 0 && (
            <span className="muted small">
              Categories: {sum.byType.map((b) => `${b.type} (${b.weightKg} kg)`).join(' · ')}
            </span>
          )}
        </div>
        {sum.monthly.length === 0 ? (
          <Empty>No completed deliveries recorded yet.</Empty>
        ) : (
          <div className="bars">
            {sum.monthly.map((m) => (
              <div key={m.month} className="bar">
                <div style={{ height: `${(m.weightKg / max) * 100}%` }} title={`${m.weightKg} kg rescued`} />
                <span>{m.month.slice(2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {hot.length > 0 && (
        <section className="card">
          <h2>Surplus Hotspots (Action Areas)</h2>
          <p className="muted small" style={{ marginTop: '-4px', marginBottom: '14px' }}>
            Areas (1 km grid) ranked by food supply volume to target volunteer driver routing.
          </p>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Coordinates (Lat, Lng)</th>
                  <th>Total Donations</th>
                  <th>Rescued (kg)</th>
                  <th>Unplaced (kg)</th>
                </tr>
              </thead>
              <tbody>
                {hot.map((c, i) => (
                  <tr key={i}>
                    <td>📍 {c.lat}, {c.lng}</td>
                    <td>{c.donations}</td>
                    <td><strong>{c.rescuedKg.toFixed(1)} kg</strong></td>
                    <td className={c.wastedKg ? 'err' : 'muted'}>{c.wastedKg.toFixed(1)} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {user.role === 'donor' && (
        <section className="card">
          <h2>Donor Tax Exemption & Documentation</h2>
          {!tax ? (
            <div>
              <p className="muted">Generate your formal charitable surplus food donation documentation for the current tax year.</p>
              <button className="primary" onClick={loadTax}>
                Generate {new Date().getFullYear()} Tax Receipt
              </button>
            </div>
          ) : (
            <div className="receipt">
              <div className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>NGO Donation Tax Receipt ({tax.year})</h3>
                  <p className="muted small" style={{ margin: '4px 0 0' }}>
                    Certified Donor: <strong>{tax.donor.orgName || tax.donor.name}</strong>
                    {tax.donor.address ? ` · ${tax.donor.address}` : ''}
                  </p>
                </div>
                <button className="ghost" onClick={() => window.print()}>
                  🖨️ Print Receipt
                </button>
              </div>
              <table style={{ marginTop: '14px' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item Description</th>
                    <th>Receiving Shelter</th>
                    <th>Weight</th>
                    <th>Est. Fair Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tax.rows.map((r) => (
                    <tr key={r.id}>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.item}</td>
                      <td>{r.shelter}</td>
                      <td>{r.weightKg} kg</td>
                      <td>${r.valueUsd}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">
                      <strong>Total Charitable Relief Contribution</strong>
                    </td>
                    <td>
                      <strong>{tax.totalKg} kg</strong>
                    </td>
                    <td>
                      <strong>${tax.totalUsd}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
              <p className="muted small" style={{ marginTop: '12px' }}>
                * Standard valuation computed at ${tax.ratePerKg}/kg. Please retain this receipt for tax deduction verification.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
