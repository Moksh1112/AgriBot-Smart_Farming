import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getCurrentUser, loginRequest, signupRequest } from '@/services/auth-service';

export const AUTH_TOKEN_KEY = 'AGRIBOT_AUTH_TOKEN';

type AuthContextValue = {
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.token);
    setIsAuthenticated(true);
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    await signupRequest(name, email, password);
    const response = await loginRequest(email, password);
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, response.token);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    async function restoreAuthentication() {
      try {
        const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (!token) return;

        await getCurrentUser(token);
        setIsAuthenticated(true);
      } catch {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
        setIsAuthenticated(false);
      } finally {
        setIsRestoring(false);
      }
    }

    restoreAuthentication();
  }, []);

  const value = useMemo(() => ({
    isAuthenticated,
    isRestoring,
    login,
    signup,
    logout,
  }), [isAuthenticated, isRestoring, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}