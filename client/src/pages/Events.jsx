import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page, limit: 6, upcoming: 'true' });
    if (search) params.set('search', search);

    api(`/events?${params}`)
      .then((data) => {
        if (cancelled) return;
        setEvents(data.data);
        setTotalPages(data.totalPages || 1);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, search]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <h1>Upcoming events</h1>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          placeholder="Search by title or venue..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button className="btn" type="submit">Search</button>
      </form>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading events...</p>}
      {!loading && !error && events.length === 0 && <p className="muted">No events found.</p>}

      <div className="grid">
        {events.map((ev) => {
          const soldOut = ev.available_seats === 0;
          const free = Number(ev.price) === 0;
          return (
            <div className="card event-card" key={ev.id}>
              <h3>{ev.title}</h3>
              <span className="muted">{ev.venue}</span>
              <span className="muted">{formatDate(ev.starts_at)}</span>
              <div>
                <span className="badge">{free ? 'Free' : `₹${Number(ev.price)}`}</span>{' '}
                <span className={`badge ${soldOut ? 'badge-red' : 'badge-green'}`}>
                  {soldOut ? 'Sold out' : `${ev.available_seats} seats left`}
                </span>
              </div>
              <Link to={`/events/${ev.id}`} className="btn btn-outline">View details</Link>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="muted">Page {page} of {totalPages}</span>
          <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}