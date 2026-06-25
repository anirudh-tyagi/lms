'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';
import api from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Ensure cookie is in sync for middleware
      document.cookie = `token=${storedToken}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    }
    setIsLoading(false);
  }, []);

  function persistAuth(t: string, u: User) {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    // Also set a cookie so Next.js middleware can read it
    document.cookie = `token=${t}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
    setToken(t);
    setUser(u);
  }

  async function login(email: string, password: string): Promise<void> {
    const res = await api.post('/auth/login', { email, password });
    persistAuth(res.data.token, res.data.user);
  }

  async function register(email: string, password: string): Promise<void> {
    const res = await api.post('/auth/register', { email, password });
    persistAuth(res.data.token, res.data.user);
  }

  function logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; max-age=0';
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
