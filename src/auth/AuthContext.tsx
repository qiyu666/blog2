import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type { User } from '../types';
import * as api from '../api';

interface AuthState {
  user: User | null;
  loading: boolean;
  unreadCount: number;
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUnread: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const count = await api.getUnreadCount();
    setUnreadCount(count);
  }, [user]);

  useEffect(() => {
    let active = true;
    api
      .getCurrentUser()
      .then((u) => {
        if (!active) return;
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    refreshUnread();
    if (user) {
      const t = setInterval(refreshUnread, 60000);
      return () => clearInterval(t);
    }
  }, [user, refreshUnread]);

  const login = useCallback(async (identifier: string, password: string) => {
    const { user: u } = await api.login(identifier, password);
    setUser(u);
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const { user: u } = await api.register(username, email, password);
      setUser(u);
    },
    []
  );

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setUnreadCount(0);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, unreadCount, login, register, logout, refreshUnread }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
