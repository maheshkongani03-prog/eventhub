import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { eventImage, hideBroken } from '../images.js';

function formatParts(iso) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
  };
}

export default function Events() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page, limit: 9, upcoming: 'true' });
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

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setSlow(true), 4000);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [loading]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <section className="hero">
        <h1>What's on</h1>
        <p>Meetups, workshops and talks. Pick one and grab your seats.</p>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            placeholder="Search by event or venue"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search events"
          />
          <button className="btn" type="submit">Search</button>
        </form>
      </section>

      {error && <p className="error">{error}</p>}
      {loading && (
        <p className="muted">
          {slow
            ? 'Waking up the server. The first load can take up to a minute.'
            : 'Loading events...'}
        </p>
      )}
      {!loading && !error && events.length === 0 && (
        <p className="muted">No events match that search. Try a shorter keyword.</p>
      )}

      <div className="grid">
        {events.map((ev) => {
          const { date, time } = formatParts(ev.starts_at);
          const soldOut = ev.available_seats === 0;
          const low = !soldOut && ev.available_seats / ev.total_seats <= 0.2;
          const free = Number(ev.price) === 0;

          return (
            <Link to={`/events/${ev.id}`} className={`poster ${soldOut ? 'soldout' : ''}`} key={ev.id}>
              <img src={eventImage(ev)} alt="" loading="lazy" onError={hideBroken} />
              <span className="chip chip-date">{date}</span>
              <span className={`chip chip-seats ${low || soldOut ? 'low' : ''}`}>
                {soldOut ? 'Sold out' : low ? `Only ${ev.available_seats} left` : `${ev.available_seats} seats left`}
              </span>
              <div className="poster-panel">
                <h3>{ev.title}</h3>
                <span className="line">{ev.venue}</span>
                <span className="line">{time}</span>
                <span className="price">{free ? 'Free' : `₹${Number(ev.price)}`}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="muted">Page {page} of {totalPages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}