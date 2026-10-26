const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    let message = data.error || 'Something went wrong';
    if (Array.isArray(data.details) && data.details.length) {
      const d = data.details[0];
      message = `${d.path?.join('.') || 'input'}: ${d.message}`;
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}