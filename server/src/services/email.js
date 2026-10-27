const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Stops user-provided text from injecting HTML into the email
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEmail({ to, toName, subject, html }) {
  if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
    console.warn('Email is not configured, skipping email.');
    return;
  }

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'EventHub',
        email: process.env.EMAIL_FROM,
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email API error ${res.status}: ${text}`);
  }
}

export async function sendBookingConfirmation({
  to, name, title, venue, startsAt, quantity, total, bookingId,
}) {
  const when = new Date(startsAt).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
  const amount = Number(total) === 0 ? 'Free' : `₹${Number(total)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1c2333;">
      <h2 style="color: #4f46e5;">Booking confirmed</h2>
      <p>Hi ${escapeHtml(name)}, your booking is confirmed.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7385;">Event</td><td><strong>${escapeHtml(title)}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Venue</td><td>${escapeHtml(venue)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">When</td><td>${escapeHtml(when)} (IST)</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Tickets</td><td>${Number(quantity)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Total</td><td>${escapeHtml(amount)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Booking ID</td><td>#${Number(bookingId)}</td></tr>
      </table>
      <p style="color: #6b7385; font-size: 13px;">You can view or cancel this booking under "My bookings" on EventHub.</p>
    </div>`;

  await sendEmail({
    to,
    toName: name,
    subject: `Booking confirmed: ${title}`,
    html,
  });
}

export async function sendBookingCancellation({
  to, name, title, venue, startsAt, quantity, total, bookingId,
}) {
  const when = new Date(startsAt).toLocaleString('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
  const amount = Number(total) === 0 ? 'Free' : `₹${Number(total)}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1c2333;">
      <h2 style="color: #dc2626;">Booking cancelled</h2>
      <p>Hi ${escapeHtml(name)}, your booking has been cancelled and your seats have been released.</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #6b7385;">Event</td><td><strong>${escapeHtml(title)}</strong></td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Venue</td><td>${escapeHtml(venue)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">When</td><td>${escapeHtml(when)} (IST)</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Tickets</td><td>${Number(quantity)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Amount</td><td>${escapeHtml(amount)}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b7385;">Booking ID</td><td>#${Number(bookingId)}</td></tr>
      </table>
      <p style="color: #6b7385; font-size: 13px;">You can book again any time on EventHub.</p>
    </div>`;

  await sendEmail({
    to,
    toName: name,
    subject: `Booking cancelled: ${title}`,
    html,
  });
}