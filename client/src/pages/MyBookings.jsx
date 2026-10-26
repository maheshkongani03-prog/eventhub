import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MyBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api('/bookings/me', { token });
      setBookings(data.bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(id) {
    if (!window.confirm('Cancel this booking?')) return;
    setError('');
    try {
      await api(`/bookings/${id}/cancel`, { method: 'POST', token });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>My bookings</h1>
      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}
      {!loading && bookings.length === 0 && (
        <p className="muted">No bookings yet. <Link to="/">Browse events</Link></p>
      )}

      <div className="card">
        {bookings.map((b) => (
          <div className="list-item" key={b.id}>
            <div>
              <strong>{b.title}</strong>
              <div className="muted">{b.venue} · {formatDate(b.starts_at)}</div>
              <div className="muted">
                {b.quantity} ticket(s) · {Number(b.total_amount) === 0 ? 'Free' : `₹${Number(b.total_amount)}`}
              </div>
            </div>
            <div className="actions">
              <span className={`badge ${b.status === 'confirmed' ? 'badge-green' : 'badge-gray'}`}>
                {b.status}
              </span>
              {b.status === 'confirmed' && (
                <button className="btn btn-outline" onClick={() => handleCancel(b.id)}>Cancel</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}