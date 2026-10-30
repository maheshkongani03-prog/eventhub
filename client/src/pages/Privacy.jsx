export default function Privacy() {
  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      <h1>Privacy policy</h1>
      <p className="muted">Last updated: October 2026</p>

      <h2>What EventHub is</h2>
      <p>EventHub is a small project for browsing events and booking seats. This policy explains what information it keeps.</p>

      <h2>What we collect</h2>
      <p>
        Your name and email address, a securely hashed password if you sign up with one, the ID of your
        Google account if you sign in with Google, and the bookings you make. Password reset links are stored
        in hashed form and expire after 30 minutes.
      </p>

      <h2>How we use it</h2>
      <p>
        To create your account, sign you in, manage your bookings, and send emails about them (booking
        confirmations, cancellations and password resets). We do not sell your data, share it for advertising,
        or use it for anything else.
      </p>

      <h2>Google sign-in</h2>
      <p>
        If you choose Continue with Google, we receive your name, email address and Google account ID. We use
        them only to create and sign in to your EventHub account. EventHub's use of information received from
        Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements.
      </p>

      <h2>Who processes the data</h2>
      <p>
        The site is hosted on Vercel, the server runs on Render, the database is on Supabase, and emails are
        sent through Brevo. These services handle data only to run EventHub.
      </p>

      <h2>Deleting your data</h2>
      <p>Email YOUR_EMAIL from the address on your account and we will delete your account and bookings.</p>

      <h2>Contact</h2>
      <p>YOUR_EMAIL</p>
    </div>
  );
}