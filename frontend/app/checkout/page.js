'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, money } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Checkout() {
  const { ready, user, token, cart, cartTotal } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ shipping_name: '', address: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login?next=/checkout');
    else if (cart.length === 0) router.replace('/cart');
    else setForm((f) => ({ ...f, shipping_name: f.shipping_name || user.name }));
  }, [ready, user]); // eslint-disable-line

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/orders', {
        method: 'POST',
        token,
        body: { ...form, items: cart.map((i) => ({ product_id: i.id, quantity: i.quantity })) },
      });
      // Redirect to Stripe Checkout (or the mock payment success page in dev)
      window.location.href = res.payment_url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!ready || !user) return null;

  return (
    <>
      <h1>Checkout</h1>
      <div className="two-col">
        <form className="panel form wide" onSubmit={submit}>
          <h3 style={{ margin: 0 }}>Shipping details</h3>
          {error && <div className="error">{error}</div>}
          <label>Full name<input required value={form.shipping_name} onChange={set('shipping_name')} /></label>
          <label>Address<textarea required rows={3} value={form.address} onChange={set('address')} /></label>
          <label>Phone<input required value={form.phone} onChange={set('phone')} /></label>
          <button className="btn" disabled={busy}>{busy ? 'Redirecting to payment...' : `Pay ${money(cartTotal)}`}</button>
        </form>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Your items</h3>
          {cart.map((i) => (
            <div key={i.id} className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{i.name} × {i.quantity}</span><span>{money(i.price * i.quantity)}</span>
            </div>
          ))}
          <hr />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Total</strong><strong>{money(cartTotal)}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
