import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import GoogleButton from './GoogleButton.jsx';

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function AuthShell({ title, subtitle, children }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [googleError, setGoogleError] = useState('');

  async function handleGoogle(credential) {
    setGoogleError('');
    try {
      await loginWithGoogle(credential);
      navigate('/');
    } catch (err) {
      setGoogleError(err.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        <div className="tabs">
          <NavLink to="/login">Log in</NavLink>
          <NavLink to="/register">Sign up</NavLink>
        </div>
        {children}
        {GOOGLE_ENABLED && (
          <>
            <div className="or"><span>or</span></div>
            {googleError && <p className="error">{googleError}</p>}
            <GoogleButton onCredential={handleGoogle} />
          </>
        )}
      </div>
    </div>
  );
}