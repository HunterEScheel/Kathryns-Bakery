import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { session, isAdmin, loading } = useAuth();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && session) {
    const from = (loc.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? (isAdmin ? '/admin' : '/')} replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res =
      mode === 'password'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/admin' } });
    setBusy(false);
    if (res.error) setErr(res.error.message);
    else if (mode === 'magic') setMsg('Check your email for a sign-in link.');
  }

  return (
    <div className="card narrow">
      <h1>Staff sign in</h1>
      <form onSubmit={submit} className="form">
        <label>
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === 'password' && (
          <label>
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <button className="btn" disabled={busy}>
          {busy ? 'Signing in…' : mode === 'password' ? 'Sign in' : 'Email me a link'}
        </button>
        <button type="button" className="link" onClick={() => setMode((m) => (m === 'password' ? 'magic' : 'password'))}>
          {mode === 'password' ? 'Use a magic link instead' : 'Use a password instead'}
        </button>
        {err && <p className="alert error">{err}</p>}
        {msg && <p className="alert ok">{msg}</p>}
      </form>
    </div>
  );
}
