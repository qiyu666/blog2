import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface Props {
  children: ReactNode;
  /** When set to 'admin', non-admin users are also redirected away. */
  requireRole?: 'admin';
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="loading">加载中</div>;
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  // Defense-in-depth for /admin: reject non-admin users on the client side too.
  // (The server still verifies role on every /api/admin/* call, so this is only UX.)
  if (requireRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
