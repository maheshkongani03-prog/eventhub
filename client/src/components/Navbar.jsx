import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">EventHub</Link>
      <nav>
        <NavLink to="/" end>Events</NavLink>
        {user && <NavLink to="/my-bookings">My bookings</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        {user ? (
          <>
            <span className="nav-user">{user.name.split(' ')[0]}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <Link to="/register" className="btn btn-marigold btn-sm">Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}