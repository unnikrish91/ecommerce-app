'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, money } from '../../lib/api';
import { useStore } from '../../lib/store';

const EMPTY = { name: '', description: '', price: '', stock: '', image_url: '' };

export default function Admin() {
  const { ready, user, token } = useStore();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/products?limit=50').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'admin') { router.replace('/login?next=/admin'); return; }
    load();
  }, [ready, user]); // eslint-disable-line

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editingId) await api(`/products/${editingId}`, { method: 'PUT', token, body });
      else await api('/products', { method: 'POST', token, body });
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(p) {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, price: String(p.price), stock: String(p.stock), image_url: p.image_url });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(p) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    try {
      await api(`/products/${p.id}`, { method: 'DELETE', token });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!ready || !user || user.role !== 'admin') return null;

  return (
    <>
      <h1>Product management</h1>
      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

      <form className="panel form wide" onSubmit={save} style={{ marginBottom: 24 }}>
        <h3 style={{ margin: 0 }}>{editingId ? `Edit product #${editingId}` : 'Add product'}</h3>
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        <label>Description<textarea rows={3} value={form.description} onChange={set('description')} /></label>
        <div className="row">
          <label>Price<input required type="number" step="0.01" min="0" value={form.price} onChange={set('price')} /></label>
          <label>Stock<input required type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
          <label style={{ flex: 1 }}>Image URL<input value={form.image_url} onChange={set('image_url')} placeholder="https://..." /></label>
        </div>
        <div className="row">
          <button className="btn" disabled={busy}>{editingId ? 'Update product' : 'Add product'}</button>
          {editingId && <button type="button" className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </form>

      <table>
        <thead><tr><th></th><th>Name</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td><img className="thumb" src={p.image_url || 'https://picsum.photos/seed/placeholder/100/80'} alt="" /></td>
              <td>{p.name}</td>
              <td>{money(p.price)}</td>
              <td>{p.stock}</td>
              <td>
                <div className="row">
                  <button className="btn btn-ghost" onClick={() => edit(p)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => remove(p)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
