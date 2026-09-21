import React, { useState } from 'react';
import { School, Eye, EyeOff, UserCheck, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from '../components/SchoolLogo';
import type { Role } from '@sistem-akamedik/shared';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('guru');
  const [identifier, setIdentifier] = useState<string>('197405121998022001');
  const [password, setPassword] = useState<string>('Guru123!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setErrorMessage(null);
    if (newRole === 'guru') {
      setIdentifier('197405121998022001');
      setPassword('Guru123!');
    } else {
      setIdentifier('2407001');
      setPassword('Siswa123!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage(`${role === 'guru' ? 'NIP' : 'NIS'} wajib diisi.`);
      return;
    }
    if (!password) {
      setErrorMessage('Password wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      await login(role, identifier.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kegagalan autentikasi. Silakan periksa kredensial Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (selectedRole: Role, demoId: string, demoPass: string) => {
    setRole(selectedRole);
    setIdentifier(demoId);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#E9F6EC_0,_#F5F7FA_36%,_#EEF1F5_100%)] flex items-center justify-center p-4 sm:p-8 lg:p-12">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-[0_24px_70px_rgba(15,23,42,0.16)] overflow-hidden border border-white/80 grid grid-cols-1 md:grid-cols-12 min-h-[680px]">
        {/* Left Side: Green Identity Panel */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#087329] via-[#0B7725] to-[#07551d] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Background decorative pattern */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full bg-white/7 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-emerald-400/10 pointer-events-none" />

          {/* School Header */}
          <div className="relative z-10">
            <SchoolLogo className="w-28 h-28 sm:w-32 sm:h-32 mb-7 drop-shadow-[0_12px_18px_rgba(0,0,0,0.22)]" />
            <div className="inline-block px-3 py-1.5 rounded-lg bg-black/20 text-amber-300 text-xs font-semibold tracking-wide uppercase mb-4 border border-white/10">
              Portal Akademik Terpadu
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              SISTEM AKAMEDIK
            </h1>
            <p className="text-base font-semibold text-white/95 mt-2">
              SMP Negeri 1 Pangkalan Kerinci
            </p>
            <p className="text-sm text-white/75 mt-1">
              Kabupaten Pelalawan, Provinsi Riau
            </p>
          </div>

          {/* Middle context note */}
          <div className="relative z-10 my-8 bg-white/10 rounded-2xl p-5 border border-white/15 text-sm text-white/90 space-y-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <ShieldCheck className="w-5 h-5" />
              <span>Akses Resmi & Aman</span>
            </div>
            <p className="leading-7 text-white/80">
              Sistem pencatatan absensi harian, penilaian tugas, UTS, UAS, serta notifikasi otomatis orang tua untuk mewujudkan transparansi akademik.
            </p>
          </div>

          {/* Footer Copyright */}
          <div className="relative z-10 pt-5 border-t border-white/15 text-xs text-white/70">
            © 2026 SMP Negeri 1 Pangkalan Kerinci • NPSN: 10402685
          </div>
        </div>

        {/* Right Side: Clean White Login Form */}
        <div className="md:col-span-7 p-7 sm:p-10 lg:p-14 flex flex-col justify-between bg-white">
          <div>
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
                Masuk ke Akun
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-6">
                Silakan pilih peran dan masukkan data akun yang terdaftar di sekolah.
              </p>
            </div>

            {/* Role Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#F6F8FA] rounded-2xl border border-gray-200 mb-7">
              <button
                type="button"
                id="btn-role-guru"
                onClick={() => handleRoleChange('guru')}
                className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
                  role === 'guru'
                    ? 'bg-[#0B7725] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserCheck className="w-5 h-5" />
                <span>Guru / Tenaga Pengajar</span>
              </button>
              <button
                type="button"
                id="btn-role-siswa"
                onClick={() => handleRoleChange('siswa')}
                className={`flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-all ${
                  role === 'siswa'
                    ? 'bg-[#0B7725] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <School className="w-5 h-5" />
                <span>Siswa / Murid</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Identifier (NIP / NIS) */}
              <div>
                <label
                  htmlFor="input-identifier"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  {role === 'guru' ? 'NIP (Nomor Induk Pegawai)' : 'NIS (Nomor Induk Siswa)'}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-identifier"
                    type="text"
                    inputMode="numeric"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      role === 'guru'
                        ? 'Masukkan 18 digit NIP'
                        : 'Masukkan 7 digit NIS'
                    }
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#0B7725]/10 focus:border-[#0B7725] transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Format teks untuk memastikan angka nol di awal tetap tersimpan utuh.
                </p>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="input-password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Kata Sandi (Password)
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun Anda"
                    className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-4 focus:ring-[#0B7725]/10 focus:border-[#0B7725] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-login"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#0B7725] hover:bg-[#09601e] text-white text-sm font-semibold shadow-lg shadow-emerald-900/15 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:hover:translate-y-0 mt-2"
              >
                {loading ? (
                  <span>Memverifikasi kredensial...</span>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo Credentials Assistant (Mode Demo) */}
          <div className="mt-8 pt-5 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                <span>Pilihan Akun Uji Coba (Mode Demo)</span>
              </div>
              <span className="text-[10px] text-gray-500">Klik untuk mengisi</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => handleSelectDemoAccount('guru', '197405121998022001', 'Guru123!')}
                className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-left transition-colors"
              >
                <p className="font-semibold text-emerald-900 truncate">Dra. Hj. Nurhayati (Guru)</p>
                <p className="text-emerald-700 text-[10px]">NIP: 197405121998022001</p>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoAccount('siswa', '2407001', 'Siswa123!')}
                className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-left transition-colors"
              >
                <p className="font-semibold text-blue-900 truncate">Ahmad Rizky (Siswa 7A)</p>
                <p className="text-blue-700 text-[10px]">NIS: 2407001</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
