'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, money } from '../../../lib/api';
import { useStore } from '../../../lib/store';

function Inner() {
  const params = useSearchParams();
  const orderId = params.get('order');
  const { ready, token, clearCart } = useStore();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready || !token || !orderId) return;
    api(`/orders/${orderId}/verify`, { method: 'POST', token })
      .then((o) => {
        setOrder(o);
        if (o.status === 'paid') clearCart();
      })
      .catch((e) => setError(e.message));
  }, [ready, token, orderId]); // eslint-disable-line

  if (error) return <div className="error">{error}</div>;
  if (!order) return <p className="muted">Confirming your payment...</p>;

  return (
    <>
      <h1>{order.status === 'paid' ? 'Thank you for your order!' : 'Payment not completed'}</h1>
      <div className={order.status === 'paid' ? 'success' : 'error'}>
        Order #{order.id} — status: <strong>{order.status}</strong> — total {money(order.total)}
      </div>
      <p><Link href="/orders" style={{ color: '#2563eb' }}>View my orders</Link></p>
    </>
  );
}

export default function Success() {
  return <Suspense fallback={<p className="muted">Loading...</p>}><Inner /></Suspense>;
}
