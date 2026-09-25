import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';
import { Empty } from '../components/ui.jsx';

export default function DonorDashboard() {
  const { user, tick, toast } = useAuth();
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.get('/donations/mine').then((r) => setItems(r.data)), []);
  useEffect(() => {
    load();
  }, [tick, load]);

  const retry = async (id) => {
    try {
      await api.post(`/donations/${id}/reevaluate`, {});
      toast('Re-evaluating donation with nearby shelters…');
      load();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  return (
    <main className="page">
      <div className="mission-header">
        <div className="row between">
          <div>
            <span className="badge good">🌱 Food Rescue Partner</span>
            <h1 style={{ marginTop: '6px' }}>{user.orgName || user.name}&apos;s Donations</h1>
            <p>Track your surplus food contributions from initial post to driver pickup and shelter delivery.</p>
          </div>
          <Link className="primary btn" to="/donor/new" style={{ padding: '12px 20px' }}>
            + Post Surplus Food
          </Link>
        </div>
      </div>

      {!items ? (
        <p className="muted">Retrieving donation records…</p>
      ) : items.length === 0 ? (
        <Empty>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🍲</div>
          <strong>No surplus donations posted yet.</strong>
          <p style={{ margin: '8px 0 16px' }}>Share surplus food from your kitchen or grocery to prevent waste and nourish local shelters.</p>
          <Link className="primary btn" to="/donor/new">Post Your First Donation</Link>
        </Empty>
      ) : (
        items.map((d) => (
          <DonationCard key={d._id} d={d} showTimeline>
            {['rejected', 'unassigned'].includes(d.status) && (
              <div style={{ marginTop: '12px' }}>
                <button className="ghost" onClick={() => retry(d._id)}>
                  🔄 Re-match with Nearby Shelters
                </button>
              </div>
            )}
          </DonationCard>
        ))
      )}
    </main>
  );
}
