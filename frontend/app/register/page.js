'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useStore } from '../../lib/store';

export default function Register() {
  const { login } = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      login(await api('/auth/register', { method: 'POST', body: form }));
      router.push('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>Create account</h1>
      <form className="panel form" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>Name<input required value={form.name} onChange={set('name')} /></label>
        <label>Email<input type="email" required value={form.email} onChange={set('email')} /></label>
        <label>Password (min 8 characters)<input type="password" required minLength={8} value={form.password} onChange={set('password')} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Creating...' : 'Register'}</button>
        <span className="muted">Already registered? <Link href="/login" style={{ color: '#2563eb' }}>Login</Link></span>
      </form>
    </>
  );
}
