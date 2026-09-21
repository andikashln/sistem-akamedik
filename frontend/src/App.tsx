import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { AbsensiView } from './views/AbsensiView';
import { RekapAbsensiView } from './views/RekapAbsensiView';
import { NilaiTugasView } from './views/NilaiTugasView';
import { NilaiUjianView } from './views/NilaiUjianView';
import { RekapNilaiView } from './views/RekapNilaiView';
import { NotifikasiOrtuView } from './views/NotifikasiOrtuView';
import { ProfileView } from './views/ProfileView';

const MainLayout: React.FC = () => {
  const { user, loading, activeTab } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-700">SISTEM AKAMEDIK</p>
          <p className="text-[11px] text-gray-500">SMP Negeri 1 Pangkalan Kerinci</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'absensi':
        return <AbsensiView />;
      case 'rekap-absensi':
        return <RekapAbsensiView isStudentOnly={false} />;
      case 'absensi-saya':
        return <RekapAbsensiView isStudentOnly={true} />;
      case 'nilai-tugas':
        return <NilaiTugasView />;
      case 'nilai-uts':
        return <NilaiUjianView type="uts" />;
      case 'nilai-uas':
        return <NilaiUjianView type="uas" />;
      case 'rekap-nilai':
        return <RekapNilaiView />;
      case 'notifikasi-ortu':
        return <NotifikasiOrtuView />;
      case 'profil':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex">
      {/* Sidebar */}
      <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onOpenMobileMenu={() => setIsMobileOpen(true)} />
        <main className="flex-1 pb-12">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

