import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  FileText,
  Award,
  GraduationCap,
  BellRing,
  UserCheck,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from './SchoolLogo';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { user, activeTab, setActiveTab, logout } = useAuth();

  if (!user) return null;

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const menuGuru: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'absensi', label: 'Absensi', icon: CalendarCheck },
    { id: 'rekap-absensi', label: 'Rekap Absensi', icon: ClipboardList },
    { id: 'nilai-tugas', label: 'Nilai Tugas', icon: BookOpen },
    { id: 'nilai-uts', label: 'Nilai UTS', icon: FileText },
    { id: 'nilai-uas', label: 'Nilai UAS', icon: Award },
    { id: 'rekap-nilai', label: 'Rekap Nilai Mapel', icon: GraduationCap },
    { id: 'notifikasi-ortu', label: 'Notifikasi Orang Tua', icon: BellRing, badge: 'Auto' },
    { id: 'profil', label: 'Profil Guru', icon: UserCheck },
  ];

  const menuSiswa: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'absensi-saya', label: 'Absensi Saya', icon: CalendarCheck },
    { id: 'nilai-tugas', label: 'Nilai Tugas', icon: BookOpen },
    { id: 'nilai-uts', label: 'Nilai UTS', icon: FileText },
    { id: 'nilai-uas', label: 'Nilai UAS', icon: Award },
    { id: 'rekap-nilai', label: 'Rekap Nilai', icon: GraduationCap },
    { id: 'profil', label: 'Profil Siswa', icon: UserCheck },
  ];


  const currentMenu = user.role === 'guru' ? menuGuru : menuSiswa;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B7725] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header Branding */}
        <div className="p-4 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo className="w-12 h-12 flex-shrink-0 drop-shadow-md" />
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold tracking-tight text-white uppercase leading-tight truncate">
                SISTEM AKAMEDIK
              </h1>
              <p className="text-[11px] text-white/80 leading-tight truncate">
                SMPN 1 Pangkalan Kerinci
              </p>
              <p className="text-[10px] text-[#F59E0B] font-medium leading-tight">
                Kab. Pelalawan, Riau
              </p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-white/80 hover:text-white"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Role Indicator Banner */}
        <div className="px-4 py-2.5 bg-black/15 flex items-center justify-between text-xs">
          <span className="text-white/70">Peran Akses:</span>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F59E0B] text-[#1F2937]">
            {user.role === 'guru' ? 'GURU' : 'SISWA'}
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {currentMenu.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-item-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-[#EAF5ED] text-[#0B7725] shadow-xs font-semibold'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#0B7725]' : 'text-white/80'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      isActive ? 'bg-[#0B7725] text-white' : 'bg-[#F59E0B] text-[#1F2937]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info Footer */}
        <div className="p-3 border-t border-white/15 bg-black/10">
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.nama}</p>
              <p className="text-[11px] text-white/75 truncate">
                {user.role === 'guru' ? `NIP: ${user.identifier}` : `NIS: ${user.identifier} • ${user.kelasNama || ''}`}
              </p>
            </div>
            <button
              id="sidebar-btn-logout"
              onClick={logout}
              title="Keluar dari akun"
              className="p-1.5 rounded-md hover:bg-red-600/80 text-white/80 hover:text-white transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
