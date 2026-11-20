import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { AuthContext } from "./context.js";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = on vérifie la session

  useEffect(() => {
    api.get("/auth/session/").then((r) => setUser(r.user)).catch(() => setUser(null));
    const expire = () => setUser(null);
    window.addEventListener("auth:expired", expire);
    return () => window.removeEventListener("auth:expired", expire);
  }, []);

  const login = useCallback(async (username, password) => {
    const u = await api.post("/auth/login/", { username, password });
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const u = await api.post("/auth/register/", data);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout/");
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, setUser, login, register, logout }), [user, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
