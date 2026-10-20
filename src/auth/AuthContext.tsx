import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  authApi,
  type AuthUserDto,
  type OnboardingChoice,
  type RegisterBody,
} from '../lib/api';

type AuthContextValue = {
  user: AuthUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUserDto>;
  register: (body: RegisterBody) => Promise<AuthUserDto>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  setOnboardingChoice: (choice: OnboardingChoice) => Promise<AuthUserDto>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      return true;
    } catch {
      try {
        const refreshed = await authApi.refresh();
        setUser(refreshed.user);
        return true;
      } catch {
        setUser(null);
        return false;
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await authApi.login({ identifier, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (body: RegisterBody) => {
    const data = await authApi.register(body);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const setOnboardingChoice = useCallback(async (choice: OnboardingChoice) => {
    const data = await authApi.onboarding(choice);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      refreshSession,
      setOnboardingChoice,
    }),
    [user, isLoading, login, register, logout, refreshSession, setOnboardingChoice]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getAuthErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'INVALID_CREDENTIALS') return 'The email or password is incorrect.';
    if (err.code === 'ACCOUNT_SUSPENDED') return 'This account has been suspended.';
    if (err.code === 'EMAIL_IN_USE') return 'An account with this email already exists.';
    if (err.code === 'PHONE_IN_USE') return 'An account with this phone number already exists.';
    if (err.code === 'VALIDATION_ERROR') return err.message;
    return err.message || 'Something went wrong. Please try again.';
  }
  return 'Unable to reach the server. Please try again.';
}
