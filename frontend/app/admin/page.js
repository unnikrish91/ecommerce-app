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
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');       // page-level errors (load / delete)
  const [formError, setFormError] = useState(''); // errors shown inside the popup
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // product awaiting delete confirmation
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api('/products?limit=50').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user || user.role !== 'admin') { router.replace('/login?next=/admin'); return; }
    load();
  }, [ready, user]); // eslint-disable-line

  // Close popups with the Escape key
  useEffect(() => {
    if (!showModal && !deleteTarget) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (deleteTarget) setDeleteTarget(null);
      else closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal, deleteTarget]); // eslint-disable-line

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      stock: String(p.stock),
      image_url: p.image_url,
    });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const body = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editingId) await api(`/products/${editingId}`, { method: 'PUT', token, body });
      else await api('/products', { method: 'POST', token, body });
      closeModal();
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/products/${deleteTarget.id}`, { method: 'DELETE', token });
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteTarget(null);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (!ready || !user || user.role !== 'admin') return null;

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Product management</h1>
        <button className="btn" onClick={openAdd}>+ Add product</button>
      </div>

      {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

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
                  <button className="btn btn-ghost" onClick={() => openEdit(p)}>Edit</button>
                  <button className="btn btn-danger" onClick={() => setDeleteTarget(p)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={5} className="muted" style={{ textAlign: 'center' }}>No products yet.</td></tr>
          )}
        </tbody>
      </table>

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div
            className="modal modal-sm"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm delete"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-icon">!</div>
            <h3 style={{ margin: '0 0 8px', textAlign: 'center' }}>Delete product?</h3>
            <p className="muted" style={{ textAlign: 'center', margin: '0 0 20px' }}>
              <strong>{deleteTarget.name}</strong> will be permanently removed. This cannot be undone.
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? 'Edit product' : 'Add product'}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{editingId ? `Edit product #${editingId}` : 'Add product'}</h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={closeModal}>×</button>
            </div>

            <form className="form wide" onSubmit={save}>
              {formError && <div className="error">{formError}</div>}
              <label>Name<input required autoFocus value={form.name} onChange={set('name')} /></label>
              <label>Description<textarea rows={3} value={form.description} onChange={set('description')} /></label>
              <div className="row">
                <label style={{ flex: 1 }}>Price<input required type="number" step="0.01" min="0" value={form.price} onChange={set('price')} /></label>
                <label style={{ flex: 1 }}>Stock<input required type="number" min="0" value={form.stock} onChange={set('stock')} /></label>
              </div>
              <label>Image URL<input value={form.image_url} onChange={set('image_url')} placeholder="https://..." /></label>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button className="btn" disabled={busy}>
                  {busy ? 'Saving...' : editingId ? 'Update product' : 'Add product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}