import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { API_URL, getToken, clearToken } from "../services/api";

interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
}

interface Org {
  id: string;
  name: string;
  is_personal: boolean;
}

interface AuthState {
  user: User | null;
  org: Org | null;
  needsSetup: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setOrg(null);
      setNeedsSetup(false);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        clearToken();
        setUser(null);
        setOrg(null);
        setNeedsSetup(false);
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setOrg(data.org);
      setNeedsSetup(data.needsSetup);
    } catch {
      setUser(null);
      setOrg(null);
      setNeedsSetup(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(async () => {
    clearToken();
    setUser(null);
    setOrg(null);
    setNeedsSetup(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, org, needsSetup, loading, logout, refreshAuth: checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
