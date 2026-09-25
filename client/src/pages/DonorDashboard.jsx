import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';
import { Empty } from '../components/ui.jsx';

export default function DonorDashboard() {
  const { tick, toast } = useAuth();
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.get('/donations/mine').then((r) => setItems(r.data)), []);
  useEffect(() => { load(); }, [tick, load]);

  const retry = async (id) => {
    try { await api.post(`/donations/${id}/reevaluate`, {}); toast('Re-evaluating your donation'); load(); } catch (e) { toast(errMsg(e)); }
  };
  return (
    <main className="page">
      <div className="row between"><h1>My donations</h1><Link className="primary btn" to="/donor/new">Post surplus food</Link></div>
      {!items ? <p>Loading…</p> : items.length === 0 ? <Empty>You haven't posted anything yet. Post your first surplus item and we'll find it a home.</Empty> :
        items.map((d) => (
          <DonationCard key={d._id} d={d} showTimeline>
            {['rejected', 'unassigned'].includes(d.status) && <button className="ghost" onClick={() => retry(d._id)}>Try matching again</button>}
          </DonationCard>))}
    </main>
  );
}
