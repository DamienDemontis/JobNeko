'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, userToken: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log('AuthContext: useEffect initializing...');
    
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      console.log('AuthContext: Found stored data:', { token: !!storedToken, user: !!storedUser });

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          console.log('AuthContext: Restored user from localStorage');
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setIsLoading(false);
    console.log('AuthContext: Initialization complete');
  }, []);

  const login = (userData: User, userToken: string) => {
    console.log('AuthContext: Login called with user:', userData);
    
    // Set state first
    setUser(userData);
    setToken(userToken);
    
    // Then update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('AuthContext: LocalStorage updated');
    }
  };

  const logout = async () => {
    // Call logout API if token exists
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error('Logout API error:', error);
      }
    }

    setUser(null);
    setToken(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}