import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Loading from './Loading';

export default function RequireAdmin() {
  const { session, isAdmin, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!isAdmin)
    return (
      <div className="card">
        <h1>Admins only</h1>
        <p>
          You&rsquo;re signed in as <strong>{session.user.email}</strong>, but this account doesn&rsquo;t have admin
          access. Ask an owner to add your user to the <code>site_admins</code> table.
        </p>
      </div>
    );
  return <Outlet />;
}
