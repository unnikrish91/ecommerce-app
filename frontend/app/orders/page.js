'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, money } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Orders() {
  const { ready, user, token } = useStore();
  const router = useRouter();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!user) { router.replace('/login?next=/orders'); return; }
    api('/orders', { token }).then((d) => setOrders(d.items)).catch((e) => setError(e.message));
  }, [ready, user]); // eslint-disable-line

  return (
    <>
      <h1>My orders</h1>
      {error && <div className="error">{error}</div>}
      {orders === null && !error && <p className="muted">Loading...</p>}
      {orders && orders.length === 0 && <p className="muted">You have no orders yet.</p>}
      <div style={{ display: 'grid', gap: 14 }}>
        {orders && orders.map((o) => (
          <div className="panel" key={o.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Order #{o.id}</strong>
              <span className={`status ${o.status}`}>{o.status}</span>
            </div>
            <p className="muted">{new Date(o.created_at.replace(' ', 'T')).toLocaleString()}</p>
            {o.items.map((i, idx) => (
              <div key={idx} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{i.name} × {i.quantity}</span><span>{money(i.price * i.quantity)}</span>
              </div>
            ))}
            <hr />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>Total</strong><strong>{money(o.total)}</strong>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
