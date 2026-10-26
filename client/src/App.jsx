import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/my-bookings"
            element={<ProtectedRoute><MyBookings /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>}
          />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </>
  );
}