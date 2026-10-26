import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const emptyForm = { title: '', venue: '', description: '', starts_at: '', price: 0, total_seats: 50 };

function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Admin() {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/events?limit=50');
      setEvents(data.data);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(ev) {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      venue: ev.venue,
      description: ev.description || '',
      starts_at: toLocalInput(ev.starts_at),
      price: Number(ev.price),
      total_seats: ev.total_seats,
    });
    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const body = {
        title: form.title,
        venue: form.venue,
        description: form.description,
        starts_at: new Date(form.starts_at).toISOString(),
        price: Number(form.price),
        total_seats: Number(form.total_seats),
      };
      if (editingId) {
        await api(`/events/${editingId}`, { method: 'PUT', token, body });
        setMessage('Event updated.');
      } else {
        await api('/events', { method: 'POST', token, body });
        setMessage('Event created.');
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this event?')) return;
    setError('');
    setMessage('');
    try {
      await api(`/events/${id}`, { method: 'DELETE', token });
      setMessage('Event deleted.');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <h1>Admin: manage events</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <div className="card">
        <h2>{editingId ? 'Edit event' : 'Create event'}</h2>
        <form onSubmit={handleSubmit}>
          <label>Title</label>
          <input value={form.title} onChange={(e) => updateField('title', e.target.value)} required minLength={3} />
          <label>Venue</label>
          <input value={form.venue} onChange={(e) => updateField('venue', e.target.value)} required />
          <label>Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          <div className="row">
            <div>
              <label>Date and time</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => updateField('starts_at', e.target.value)} required />
            </div>
            <div>
              <label>Price (₹)</label>
              <input type="number" min="0" value={form.price} onChange={(e) => updateField('price', e.target.value)} required />
            </div>
            <div>
              <label>Total seats</label>
              <input type="number" min="1" value={form.total_seats} onChange={(e) => updateField('total_seats', e.target.value)} required />
            </div>
          </div>
          <br />
          <div className="actions">
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create event'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={cancelEdit}>Cancel edit</button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2>All events</h2>
        {events.length === 0 && <p className="muted">No events yet.</p>}
        {events.map((ev) => (
          <div className="list-item" key={ev.id}>
            <div>
              <strong>{ev.title}</strong>
              <div className="muted">
                {ev.venue} · {formatDate(ev.starts_at)} · {ev.available_seats}/{ev.total_seats} seats left
              </div>
            </div>
            <div className="actions">
              <button className="btn btn-outline" onClick={() => startEdit(ev)}>Edit</button>
              <button className="btn btn-danger" onClick={() => handleDelete(ev.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}