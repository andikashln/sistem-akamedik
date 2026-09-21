import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../lib/api';
import type { UserSession, Role } from '@sistem-akamedik/shared';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  tahunAjaran: string;
  setTahunAjaran: (val: string) => void;
  semester: 'Ganjil' | 'Genap';
  setSemester: (val: 'Ganjil' | 'Genap') => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  login: (role: Role, identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tahunAjaran, setTahunAjaran] = useState<string>('2026/2027');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const checkAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser({
        id: data.id,
        role: data.role,
        identifier: data.identifier,
        nama: data.nama,
        email: data.email,
        kelasId: data.kelasId,
        kelasNama: data.kelasNama,
        nip: data.role === 'guru' ? data.identifier : undefined,
        nis: data.role === 'siswa' ? data.identifier : undefined,
      });
    } catch {
      clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (role: Role, identifier: string, pass: string) => {
    const res = await api.login(role, identifier, pass);
    setAuthToken(res.token);
    setUser({
      id: res.user.id,
      role: res.user.role,
      identifier: res.user.identifier,
      nama: res.user.nama,
      email: res.user.email,
      kelasId: res.user.kelasId,
      kelasNama: res.user.kelasNama,
      nip: res.user.role === 'guru' ? res.user.identifier : undefined,
      nis: res.user.role === 'siswa' ? res.user.identifier : undefined,
    });
    setActiveTab('dashboard');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      clearAuthToken();
      setUser(null);
      setActiveTab('dashboard');
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        tahunAjaran,
        setTahunAjaran,
        semester,
        setSemester,
        activeTab,
        setActiveTab,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
