import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { publicAuth, session } from '../api/client';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    session.onLost(() => setUser(null));
    session.load().then(setUser).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await publicAuth('POST', '/auth/login', { body: { email, password } });
    await session.save(r.data);
    setUser(r.data.user);
  }, []);

  const register = useCallback(async (data) => {
    await publicAuth('POST', '/auth/register', { body: data });
    await login(data.email, data.password);
  }, [login]);

  const logout = useCallback(async () => {
    try { if (session.refreshToken) await publicAuth('POST', '/auth/logout', { body: { refresh_token: session.refreshToken } }); } catch (_) { /* abaikan */ }
    await session.clear();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (u) => { await session.setUser(u); setUser(u); }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, updateUser }), [user, ready, login, register, logout, updateUser]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
