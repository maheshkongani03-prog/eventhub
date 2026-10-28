import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Choose a new password</h1>
        {!token ? (
          <p className="error">This link is missing its token. Request a new reset link.</p>
        ) : done ? (
          <>
            <p className="success">Password updated. You can log in now.</p>
            <Link to="/login" className="btn">Go to log in</Link>
          </>
        ) : (
          <>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <label htmlFor="password">New password</label>
              <input id="password" type="password" autoComplete="new-password" minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="muted hint">At least 8 characters.</p>
              <label htmlFor="confirm">Confirm new password</label>
              <input id="confirm" type="password" autoComplete="new-password" minLength={8}
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update password'}
              </button>
            </form>
          </>
        )}
        {!done && <p className="muted hint"><Link to="/forgot-password">Request a new link</Link></p>}
      </div>
    </div>
  );
}