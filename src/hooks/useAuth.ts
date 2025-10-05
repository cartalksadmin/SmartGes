import { useState, useEffect } from 'react';
import { api } from '@/lib/apiClient';
import { User } from '@/types/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = api.auth.getCurrentUser();
    // if backend returned a stored user who is inactive, clear tokens and don't set user
    if (currentUser && (currentUser.actif === false || currentUser.actif === 0)) {
      api.auth.logout();
      setUser(null);
    } else {
      setUser(currentUser);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.auth.login(email, password);
    const currentUser = api.auth.getCurrentUser();
    // if the server allowed login but user flagged inactive, immediately logout and throw
    if (currentUser && (currentUser.actif === false || currentUser.actif === 0)) {
      api.auth.logout();
      setUser(null);
      const err: any = new Error("Vous n'êtes pas autorisé à vous connecter");
      err.code = 'USER_INACTIVE';
      throw err;
    }
    setUser(currentUser);
    return response;
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  const role = user?.role || '';
  const isAdmin = role.toUpperCase() === 'ADMIN';
  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
  isAdmin,
  role,
    login,
    logout,
  };
}
