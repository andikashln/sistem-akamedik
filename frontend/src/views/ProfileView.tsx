import React, { useState } from 'react';
import {
  UserCheck,
  School,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export const ProfileView: React.FC = () => {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [changingPass, setChangingPass] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Kata sandi saat ini wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setSuccessMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah kata sandi.');
    } finally {
      setChangingPass(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-[#0B7725] text-white flex items-center justify-center font-bold text-2xl shadow-sm flex-shrink-0">
            {user.nama.charAt(0)}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#EAF5ED] text-[#0B7725] uppercase tracking-wide mb-1">
              Peran: {user.role === 'guru' ? 'Tenaga Pengajar (Guru)' : 'Peserta Didik (Siswa)'}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{user.nama}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.role === 'guru' ? `NIP. ${user.identifier}` : `NIS. ${user.identifier} • Kelas ${user.kelasNama}`}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600 sm:text-right">
          <p className="font-semibold text-gray-900">SMP Negeri 1 Pangkalan Kerinci</p>
          <p className="text-[11px] text-gray-500">Kabupaten Pelalawan, Riau</p>
          <p className="text-[11px] text-[#0B7725] font-medium mt-0.5">Status Akun: Aktif</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <UserCheck className="w-4 h-4 text-[#0B7725]" />
            <h3 className="text-sm font-bold text-gray-900">Informasi Biodata Resmi</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Nama Lengkap</span>
              <span className="font-semibold text-gray-900 text-sm">{user.nama}</span>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">
                {user.role === 'guru' ? 'Nomor Induk Pegawai (NIP)' : 'Nomor Induk Siswa (NIS)'}
              </span>
              <span className="font-mono font-bold text-gray-800 text-sm">{user.identifier}</span>
            </div>

            <div>
              <span className="text-gray-400 block mb-0.5">Alamat Surel (Email)</span>
              <span className="font-medium text-gray-800">{user.email || '—'}</span>
            </div>

            {user.role === 'guru' ? (
              <>
                <div>
                  <span className="text-gray-400 block mb-0.5">Mata Pelajaran Utama</span>
                  <span className="font-medium text-gray-800">Matematika & IPA Terpadu</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Rombel Penugasan</span>
                  <span className="font-medium text-gray-800">Kelas 7A, 7B, 8A</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-gray-400 block mb-0.5">Rombongan Belajar (Rombel)</span>
                  <span className="font-semibold text-gray-800">Kelas {user.kelasNama || '7A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Wali Kelas</span>
                  <span className="font-medium text-gray-800">Dra. Hj. Nurhayati, M.Pd.</span>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-gray-100">
              <span className="text-gray-400 block mb-0.5">Unit Kerja / Sekolah</span>
              <span className="font-semibold text-[#0B7725]">
                SMP Negeri 1 Pangkalan Kerinci (NPSN: 10402685)
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Lock className="w-4 h-4 text-[#0B7725]" />
            <h3 className="text-sm font-bold text-gray-900">Keamanan & Ganti Kata Sandi</h3>
          </div>

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Kata Sandi Lama / Saat Ini
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 text-gray-900 outline-none focus:ring-2 focus:ring-[#0B7725]"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Kata Sandi Baru (Minimal 6 karakter)
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan kata sandi baru"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 outline-none focus:ring-2 focus:ring-[#0B7725]"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang kata sandi baru"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 outline-none focus:ring-2 focus:ring-[#0B7725]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPass}
                className="w-full py-2.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {changingPass ? 'Menyimpan Kata Sandi...' : 'Perbarui Kata Sandi'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
