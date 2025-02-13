'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const isDevelopment = process.env.NODE_ENV === 'development';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      if (!API_URL) {
        console.error('API_URL is not defined');
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('Checking auth status...', {
        apiUrl: API_URL,
        isDevelopment,
        currentEnv: process.env.NODE_ENV
      });

      // First check if backend is available
      try {
        const healthCheck = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!healthCheck.ok) {
          throw new Error('Backend health check failed');
        }
        
        const healthData = await healthCheck.json();
        console.log('Backend health check:', healthData);
      } catch (error) {
        console.error('Backend health check failed:', error);
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/status`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Auth status response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Not authenticated');
          setUser(null);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Auth status data:', data);
      
      if (data.isAuthenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = () => {
    if (!API_URL) {
      console.error('API_URL is not defined');
      return;
    }
    const loginUrl = `${API_URL}/api/auth/google`;
    console.log('Redirecting to login:', loginUrl);
    window.location.href = loginUrl;
  };

  const logout = () => {
    if (!API_URL) {
      console.error('API_URL is not defined');
      return;
    }
    const logoutUrl = `${API_URL}/api/auth/logout`;
    console.log('Redirecting to logout:', logoutUrl);
    window.location.href = logoutUrl;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth
      }}
    >
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