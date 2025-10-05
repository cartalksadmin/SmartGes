import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type Props = {
  children: ReactNode;
};

export default function RequireAuth({ children }: Props) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // while we check auth, avoid flashing protected UI
  if (isLoading) return null;

  if (!isAuthenticated) {
    // redirect to login and keep the attempted location in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
