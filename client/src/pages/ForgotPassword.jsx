import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>Reset your password</h1>
        {sent ? (
          <>
            <p className="success">
              If an account exists for {email}, we've sent a reset link. It works for 30 minutes.
            </p>
            <p className="muted hint">Nothing in your inbox? Check your spam folder.</p>
          </>
        ) : (
          <>
            <p className="muted">Enter your email and we'll send you a link to choose a new password.</p>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p className="muted hint"><Link to="/login">Back to log in</Link></p>
      </div>
    </div>
  );
}