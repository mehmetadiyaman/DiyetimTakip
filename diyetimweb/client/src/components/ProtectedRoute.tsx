import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Kullanıcı bilgisi yüklenirken gösterilecek spinner
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Giriş yapmamış kullanıcıları login sayfasına yönlendir
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Kullanıcı giriş yapmışsa, korumalı içeriği göster
  return <>{children}</>;
};

export default ProtectedRoute; 