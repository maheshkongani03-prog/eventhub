import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
}

export default function EventDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadEvent = useCallback(async () => {
    try {
      const data = await api(`/events/${id}`);
      setEvent(data.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  async function handleBook(e) {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setError('');
    setMessage('');
    setBooking(true);
    try {
      await api('/bookings', {
        method: 'POST',
        token,
        body: { event_id: event.id, quantity: Number(quantity) },
      });
      setMessage('Booking confirmed! You can see it under "My bookings".');
      setQuantity(1);
    } catch (err) {
      setError(err.message);
    } finally {
      await loadEvent();
      setBooking(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (!event) return <p className="error">{error || 'Event not found'}</p>;

  const started = new Date(event.starts_at) <= new Date();
  const soldOut = event.available_seats === 0;
  const free = Number(event.price) === 0;
  const maxQty = Math.min(10, event.available_seats);

  return (
    <div className="card detail stack">
      <h1>{event.title}</h1>
      <div className="muted">{event.venue}</div>
      <div className="muted">{formatDate(event.starts_at)}</div>
      <div>
        <span className="badge">{free ? 'Free' : `₹${Number(event.price)} per ticket`}</span>{' '}
        <span className={`badge ${soldOut ? 'badge-red' : 'badge-green'}`}>
          {soldOut ? 'Sold out' : `${event.available_seats} of ${event.total_seats} seats left`}
        </span>
      </div>
      {event.description && <p>{event.description}</p>}

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {started ? (
        <p className="muted">This event has already started.</p>
      ) : soldOut ? (
        <p className="muted">Sorry, this event is sold out.</p>
      ) : (
        <form onSubmit={handleBook}>
          <label>Number of tickets</label>
          <select value={quantity} onChange={(e) => setQuantity(e.target.value)}>
            {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p className="muted">Total: {free ? 'Free' : `₹${Number(event.price) * Number(quantity)}`}</p>
          <button className="btn" type="submit" disabled={booking}>
            {booking ? 'Booking...' : user ? 'Book now' : 'Log in to book'}
          </button>
        </form>
      )}
    </div>
  );
}