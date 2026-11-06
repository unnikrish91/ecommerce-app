'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '../lib/store';

export default function Navbar() {
  const { user, logout, cartCount } = useStore();
  const router = useRouter();

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand">MyShop</Link>
        <nav className="nav-links">
          <Link href="/">Products</Link>
          <Link href="/cart">Cart{cartCount > 0 && <span className="badge">{cartCount}</span>}</Link>
          {user ? (
            <>
              <Link href="/orders">Orders</Link>
              {user.role === 'admin' && <Link href="/admin">Admin</Link>}
              <span className="muted">Hi, {user.name.split(' ')[0]}</span>
              <button className="btn btn-ghost" onClick={() => { logout(); router.push('/'); }}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/register" className="btn">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
