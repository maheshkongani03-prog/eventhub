import { NavLink } from 'react-router-dom';

export default function AuthShell({ title, subtitle, children }) {
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
      </div>
    </div>
  );
}