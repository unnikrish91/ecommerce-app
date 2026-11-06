'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { money } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Cart() {
  const { cart, setQty, removeFromCart, cartTotal, user } = useStore();
  const router = useRouter();

  if (cart.length === 0) {
    return (
      <>
        <h1>Your cart</h1>
        <p className="muted">Your cart is empty. <Link href="/" style={{ color: '#2563eb' }}>Continue shopping</Link></p>
      </>
    );
  }

  return (
    <>
      <h1>Your cart</h1>
      <div className="two-col">
        <table>
          <thead>
            <tr><th></th><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr>
          </thead>
          <tbody>
            {cart.map((i) => (
              <tr key={i.id}>
                <td><img className="thumb" src={i.image_url || 'https://picsum.photos/seed/placeholder/100/80'} alt="" /></td>
                <td><Link href={`/products/${i.id}`}>{i.name}</Link></td>
                <td>{money(i.price)}</td>
                <td>
                  <input className="qty" type="number" min="1" max={i.stock} value={i.quantity}
                    onChange={(e) => setQty(i.id, Number(e.target.value) || 1)} />
                </td>
                <td>{money(i.price * i.quantity)}</td>
                <td><button className="btn btn-ghost" onClick={() => removeFromCart(i.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Order summary</h3>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>Total</span><strong className="price">{money(cartTotal)}</strong>
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 16 }}
            onClick={() => router.push(user ? '/checkout' : '/login?next=/checkout')}>
            {user ? 'Proceed to checkout' : 'Login to checkout'}
          </button>
        </div>
      </div>
    </>
  );
}
