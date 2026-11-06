'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money } from '../lib/api';
import { useStore } from '../lib/store';

export default function Home() {
  const { addToCart } = useStore();
  const [data, setData] = useState({ items: [], pages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      api(`/products?page=${page}&limit=12&search=${encodeURIComponent(search)}`)
        .then((d) => { setData(d); setError(''); })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, page]);

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Products</h1>
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ minWidth: 240 }}
        />
      </div>

      {error && <div className="error">{error} — is the PHP API running?</div>}
      {loading && <p className="muted">Loading...</p>}
      {!loading && !error && data.items.length === 0 && <p className="muted">No products found.</p>}

      <div className="grid">
        {data.items.map((p) => (
          <div className="card" key={p.id}>
            <Link href={`/products/${p.id}`}>
              <img src={p.image_url || 'https://picsum.photos/seed/placeholder/600/400'} alt={p.name} />
            </Link>
            <div className="card-body">
              <Link href={`/products/${p.id}`}><strong>{p.name}</strong></Link>
              <span className="price">{money(p.price)}</span>
              <span className="muted">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</span>
              <button className="btn" style={{ marginTop: 'auto' }} disabled={p.stock < 1} onClick={() => addToCart(p)}>
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </div>

      {data.pages > 1 && (
        <div className="pager">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span className="muted" style={{ alignSelf: 'center' }}>Page {page} of {data.pages}</span>
          <button className="btn btn-ghost" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </>
  );
}
