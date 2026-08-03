import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMe, type AuthUser } from "./lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  setUser: (u: AuthUser | null) => void;
}

const AuthCtx = createContext<AuthState>({ user: null, loading: true, setUser: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("sb:unauthorized", onUnauthorized);
    return () => window.removeEventListener("sb:unauthorized", onUnauthorized);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, setUser }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
