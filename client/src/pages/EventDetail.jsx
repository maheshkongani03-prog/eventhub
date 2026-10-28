import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { eventImage, hideBroken } from '../images.js';

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
      setMessage('Booked. A confirmation email is on its way.');
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

  const d = new Date(event.starts_at);
  const dateText = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeText = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  const started = d <= new Date();
  const soldOut = event.available_seats === 0;
  const free = Number(event.price) === 0;
  const maxQty = Math.min(10, event.available_seats);
  const qty = Number(quantity);
  const total = Number(event.price) * qty;

  return (
    <div>
      <Link to="/" className="back">Back to events</Link>

      <div className="detail-hero">
        <img src={eventImage(event, 1400, 600)} alt="" onError={hideBroken} />
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <h1>{event.title}</h1>
          <dl className="facts">
            <div><dt>Venue</dt><dd>{event.venue}</dd></div>
            <div><dt>Date</dt><dd>{dateText}</dd></div>
            <div><dt>Time</dt><dd>{timeText}</dd></div>
            <div><dt>Seats</dt><dd>{soldOut ? 'Sold out' : `${event.available_seats} of ${event.total_seats} left`}</dd></div>
          </dl>
          {event.description && <p>{event.description}</p>}
        </div>

        <aside className="book-panel">
          <h2>{free ? 'Free entry' : `₹${Number(event.price)} per ticket`}</h2>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}

          {started ? (
            <p className="muted">This event has already started.</p>
          ) : soldOut ? (
            <p className="muted">This event is sold out.</p>
          ) : (
            <form onSubmit={handleBook}>
              <label htmlFor="qty">Tickets</label>
              <select id="qty" value={quantity} onChange={(e) => setQuantity(e.target.value)}>
                {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <div className="total">
                <span>Total</span>
                <span>{free ? 'Free' : `₹${total}`}</span>
              </div>
              <button className="btn" type="submit" disabled={booking}>
                {booking
                  ? 'Booking...'
                  : user
                    ? `Book ${qty} ${qty === 1 ? 'ticket' : 'tickets'}`
                    : 'Log in to book'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}