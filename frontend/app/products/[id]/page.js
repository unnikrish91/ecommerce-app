'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, money } from '../../../lib/api';
import { useStore } from '../../../lib/store';

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { addToCart } = useStore();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api(`/products/${id}`).then(setP).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="error">{error}</div>;
  if (!p) return <p className="muted">Loading...</p>;

  return (
    <div className="detail">
      <img src={p.image_url || 'https://picsum.photos/seed/placeholder/600/400'} alt={p.name} />
      <div>
        <h1>{p.name}</h1>
        <p className="price" style={{ fontSize: 28 }}>{money(p.price)}</p>
        <p>{p.description}</p>
        <p className="muted">{p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p>
        <div className="row">
          <input
            className="qty" type="number" min="1" max={p.stock} value={qty}
            onChange={(e) => setQty(Math.max(1, Math.min(p.stock, Number(e.target.value) || 1)))}
          />
          <button className="btn" disabled={p.stock < 1} onClick={() => { addToCart(p, qty); setAdded(true); }}>
            Add to cart
          </button>
          {added && <button className="btn btn-ghost" onClick={() => router.push('/cart')}>View cart</button>}
        </div>
      </div>
    </div>
  );
}
