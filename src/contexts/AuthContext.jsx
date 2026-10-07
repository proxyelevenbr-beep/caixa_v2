import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../config';
import authService from '../services/authService';

export const AuthContext = createContext(null);

/**
 * Provider de autenticação.
 * - Restaura a sessão do localStorage de forma síncrona (sem "piscar" o login)
 * - Expõe login/logout para as telas
 * - Sincroniza logout/login entre abas do navegador
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  const login = useCallback(async (matricula, senha) => {
    const u = await authService.login(matricula, senha);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEYS.AUTH || e.key === null) setUser(authService.getCurrentUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ user, isAuthenticated: !!user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
