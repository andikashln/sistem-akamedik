import React, { useState } from 'react';
import { Menu, Calendar, RotateCcw, User, LogOut, CheckCircle2, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, activeTab, tahunAjaran, setTahunAjaran, semester, setSemester, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Dashboard Monitoring';
      case 'absensi':
        return 'Pencatatan Absensi Pertemuan';
      case 'rekap-absensi':
        return 'Rekapitulasi Kehadiran Siswa';
      case 'absensi-saya':
        return 'Kehadiran Akademik Saya';
      case 'nilai-tugas':
        return 'Pengelolaan Nilai Tugas Siswa';
      case 'nilai-uts':
        return 'Input & Pembaruan Nilai UTS';
      case 'nilai-uas':
        return 'Input & Pembaruan Nilai UAS';
      case 'rekap-nilai':
        return 'Rekapitulasi Nilai & Nilai Akhir';
      case 'notifikasi-ortu':
        return 'Monitoring & Notifikasi Otomatis Orang Tua';
      case 'profil':
        return 'Profil Pengguna & Keamanan Akun';
      default:
        return 'SISTEM AKAMEDIK';
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Kembalikan seluruh data demo ke kondisi awal standar SMPN 1 Pangkalan Kerinci?')) {
      return;
    }
    setResetting(true);
    try {
      await api.resetDemo();
      setToastMessage('Data demo berhasil diatur ulang!');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Gagal mengatur ulang data demo.');
      setResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Hamburger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            id="btn-mobile-menu"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 tracking-tight leading-tight">
                {getPageTitle(activeTab)}
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                Mode Demo
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">
              SMP Negeri 1 Pangkalan Kerinci • Kab. Pelalawan, Riau
            </p>
          </div>
        </div>

        {/* Right: Academic Context & User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Academic Year Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#F6F8FA] px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-[#0B7725]" />
            <select
              id="select-tahun-ajaran"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="bg-transparent font-medium text-xs text-gray-800 outline-none cursor-pointer"
            >
              <option value="2026/2027">T.A 2026/2027</option>
              <option value="2025/2026">T.A 2025/2026 (Arsip)</option>
            </select>
            <span className="text-gray-300">|</span>
            <select
              id="select-semester"
              value={semester}
              onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="bg-transparent font-medium text-xs text-gray-800 outline-none cursor-pointer"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* Reset data hanya tersedia untuk guru. */}
          {user?.role === 'guru' && <button
            id="btn-reset-demo"
            onClick={handleResetDemo}
            disabled={resetting}
            title="Reset ke data awal"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors shadow-2xs"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-gray-500 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Mereset...' : 'Reset Data'}</span>
          </button>}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              id="btn-user-profile-menu"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-colors shadow-2xs text-left"
            >
              <div className="w-7 h-7 rounded-full bg-[#EAF5ED] text-[#0B7725] font-bold text-xs flex items-center justify-center border border-[#0B7725]/20">
                {user?.nama.charAt(0) || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-none truncate max-w-[130px]">
                  {user?.nama}
                </p>
                <p className="text-[10px] text-gray-500 leading-none mt-1 uppercase font-medium">
                  {user?.role}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden lg:block" />
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 truncate">{user?.nama}</p>
                    <p className="text-gray-500 text-[11px] truncate">
                      {user?.role === 'guru' ? `NIP: ${user?.identifier}` : `NIS: ${user?.identifier}`}
                    </p>
                  </div>
                  <div className="px-1.5 py-1">
                    <div className="px-2 py-1 text-gray-500 text-[11px]">
                      T.A: <span className="font-semibold text-gray-700">{tahunAjaran}</span> ({semester})
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-1">
                    <button
                      id="dropdown-item-logout"
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Keluar (Logout)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#0B7725] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#F59E0B]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </header>
  );
};
