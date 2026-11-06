'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useStore } from '../../lib/store';

function LoginForm() {
  const { login } = useStore();
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      login(await api('/auth/login', { method: 'POST', body: form }));
      router.push(next);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Login</h1>
      <form className="panel form" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Login'}</button>
        <span className="muted">No account? <Link href="/register" style={{ color: '#2563eb' }}>Register</Link></span>
      </form>
    </>
  );
}

export default function Login() {
  return <Suspense fallback={null}><LoginForm /></Suspense>;
}
