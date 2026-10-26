import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;

  return children;
}