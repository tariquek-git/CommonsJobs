import { Navigate, Outlet } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import LoginPage from '../components/admin/LoginPage';
import { useAdminAuthProvider, AuthContext } from '../hooks/useAdminAuth';

export default function AdminPage() {
  const auth = useAdminAuthProvider();

  if (!auth.token) {
    return (
      <AuthContext.Provider value={auth}>
        <LoginPage />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={auth}>
      <AdminLayout />
    </AuthContext.Provider>
  );
}

// Re-export for route-level redirect
export function AdminRedirect() {
  return <Navigate to="/admin" replace />;
}
