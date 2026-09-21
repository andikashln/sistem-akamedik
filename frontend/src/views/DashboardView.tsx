import React, { useEffect, useState } from 'react';
import {
  Users,
  Layers,
  CalendarCheck,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  School,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { SchoolLogo } from '../components/SchoolLogo';
import type { DashboardStatsGuru, DashboardStatsSiswa } from '@sistem-akamedik/shared';

export const DashboardView: React.FC = () => {
  const { user, setActiveTab, tahunAjaran, semester } = useAuth();
  const [dataGuru, setDataGuru] = useState<DashboardStatsGuru | null>(null);
  const [dataSiswa, setDataSiswa] = useState<DashboardStatsSiswa | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [user, tahunAjaran, semester]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard();
      if (user?.role === 'guru') {
        setDataGuru(res as DashboardStatsGuru);
      } else {
        setDataSiswa(res as DashboardStatsSiswa);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat ringkasan dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500 font-medium">Memuat data monitoring akademik...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <p className="font-semibold mb-1">Terjadi Gangguan</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#07551d] via-[#0B7725] to-[#0D8430] px-5 py-8 sm:px-8 lg:px-10 lg:py-10 border-b border-emerald-950/15 flex flex-col md:flex-row md:items-center justify-between gap-7">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/8" />
        <div className="absolute right-40 -bottom-28 h-56 w-56 rounded-full bg-amber-300/8" />
        <div className="relative z-10 flex items-center gap-5">
          <SchoolLogo className="hidden sm:flex w-24 h-24 lg:w-28 lg:h-28 flex-shrink-0 drop-shadow-[0_10px_18px_rgba(0,0,0,0.24)]" />
          <div>
          <SchoolLogo className="sm:hidden w-16 h-16 mb-3 drop-shadow-[0_8px_14px_rgba(0,0,0,0.2)]" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/12 text-white text-xs font-semibold mb-3 border border-white/15">
            <School className="w-4 h-4 text-amber-300" />
            <span>SMP Negeri 1 Pangkalan Kerinci</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Selamat Datang, {user?.nama}
          </h1>
          <p className="text-sm text-white/75 mt-2 max-w-3xl leading-6">
            {user?.role === 'guru'
              ? `Pengelolaan akademik Tahun Ajaran ${tahunAjaran} (${semester}). Pantau kehadiran dan input capaian belajar siswa.`
              : `Portofolio akademik siswa kelas ${user?.kelasNama || '7A'} Tahun Ajaran ${tahunAjaran} (${semester}).`}
          </p>
          </div>
        </div>

        {/* Quick actions for Guru */}
        {user?.role === 'guru' && (
          <div className="relative z-10 flex flex-wrap items-center gap-3 md:justify-end">
            <button
              id="dash-btn-quick-absensi"
              onClick={() => setActiveTab('absensi')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-emerald-50 text-[#0B7725] text-sm font-semibold shadow-md transition-colors"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Isi Absensi</span>
            </button>
            <button
              id="dash-btn-quick-nilai"
              onClick={() => setActiveTab('nilai-tugas')}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/25 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
            >
              <BookOpen className="w-4 h-4 text-amber-300" />
              <span>Input Nilai</span>
            </button>
          </div>
        )}
      </section>

      {/* DASHBOARD GURU */}
      {user?.role === 'guru' && dataGuru && (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Total Kelas */}
            <div className="bg-white rounded-2xl p-6 min-h-36 border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#0B7725] flex items-center justify-center flex-shrink-0">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Jumlah Kelas Diampu</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">{dataGuru.totalKelas}</p>
                <p className="text-[11px] text-gray-400">Kelas aktif semester ini</p>
              </div>
            </div>

            {/* Total Siswa */}
            <div className="bg-white rounded-2xl p-6 min-h-36 border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Siswa yang Diajar</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">{dataGuru.totalSiswa}</p>
                <p className="text-[11px] text-gray-400">Terdaftar di rombel</p>
              </div>
            </div>

            {/* Rata-rata Kehadiran */}
            <div className="bg-white rounded-2xl p-6 min-h-36 border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0">
                <CalendarCheck className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Kehadiran Rata-rata</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">
                  {dataGuru.rataRataKehadiran !== null ? `${dataGuru.rataRataKehadiran}%` : '—'}
                </p>
                <p className="text-[11px] text-gray-400">Pertemuan tercatat</p>
              </div>
            </div>

            {/* Penilaian Belum Lengkap */}
            <div className="bg-white rounded-2xl p-6 min-h-36 border border-gray-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Tugas Belum Lengkap</p>
                <p className="text-4xl font-bold text-amber-700 mt-1">{dataGuru.penilaianBelumLengkap}</p>
                <p className="text-[11px] text-gray-400">Perlu kelengkapan nilai</p>
              </div>
            </div>
          </div>

          {/* Ringkasan Per Kelas */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Ringkasan Beban & Capaian Per Kelas</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Daftar kelas dan mata pelajaran yang ditugaskan kepada Anda pada semester ini.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('rekap-absensi')}
                className="text-xs font-semibold text-[#0B7725] hover:underline flex items-center gap-1"
              >
                <span>Lihat Rekap Absensi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F6F8FA] text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Mata Pelajaran</th>
                    <th className="px-4 py-3 text-center">Jumlah Siswa</th>
                    <th className="px-4 py-3 text-center">Pertemuan Terlaksana</th>
                    <th className="px-4 py-3 text-center">Rasio Kehadiran</th>
                    <th className="px-4 py-3 text-right">Tindakan Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {dataGuru.ringkasanKelas.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-gray-900">Kelas {row.kelasNama}</td>
                      <td className="px-4 py-3.5 font-medium">{row.mapelNama}</td>
                      <td className="px-4 py-3.5 text-center">{row.totalSiswa} Siswa</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800">
                          {row.pertemuanSelesai} Pertemuan
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {row.kehadiranPersen !== null ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              row.kehadiranPersen >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : row.kehadiranPersen >= 75
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {row.kehadiranPersen}% Hadir
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setActiveTab('absensi')}
                          className="px-2.5 py-1 rounded bg-[#EAF5ED] text-[#0B7725] font-semibold text-[11px] hover:bg-[#0B7725] hover:text-white transition-colors"
                        >
                          Absensi
                        </button>
                        <button
                          onClick={() => setActiveTab('nilai-tugas')}
                          className="px-2.5 py-1 rounded bg-gray-100 text-gray-700 font-semibold text-[11px] hover:bg-gray-200 transition-colors"
                        >
                          Nilai
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD SISWA */}
      {user?.role === 'siswa' && dataSiswa && (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Student Identity & Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Identity Card */}
            <div className="bg-white rounded-2xl p-6 min-h-64 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-xs text-gray-500 font-medium">Informasi Siswa Terdaftar</p>
                <h3 className="text-lg font-bold text-gray-900 mt-1">{dataSiswa.siswa.nama}</h3>
                <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                  <p>
                    <span className="text-gray-400">NIS:</span> <span className="font-semibold text-gray-800">{dataSiswa.siswa.nis}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Rombel Kelas:</span> <span className="font-semibold text-gray-800">{dataSiswa.kelasNama}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Nama Wali:</span> <span className="text-gray-800">{dataSiswa.siswa.namaOrangTua}</span>
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-[#0B7725] font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Akun Terverifikasi Sekolah</span>
              </div>
            </div>

            {/* Attendance Stat Card */}
            <div className="bg-white rounded-2xl p-6 min-h-64 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-xs text-gray-500 font-medium">Tingkat Kehadiran Saya</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {dataSiswa.persentaseKehadiran !== null ? `${dataSiswa.persentaseKehadiran}%` : '—'}
                  </span>
                  <span className="text-xs text-gray-500">dari pertemuan terisi</span>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center mt-3 pt-3 border-t border-gray-100">
                  <div className="p-1.5 bg-emerald-50 rounded">
                    <p className="text-[10px] text-emerald-800 font-medium">Hadir</p>
                    <p className="text-xs font-bold text-emerald-900">{dataSiswa.totalHadir}</p>
                  </div>
                  <div className="p-1.5 bg-blue-50 rounded">
                    <p className="text-[10px] text-blue-800 font-medium">Izin</p>
                    <p className="text-xs font-bold text-blue-900">{dataSiswa.totalIzin}</p>
                  </div>
                  <div className="p-1.5 bg-amber-50 rounded">
                    <p className="text-[10px] text-amber-800 font-medium">Sakit</p>
                    <p className="text-xs font-bold text-amber-900">{dataSiswa.totalSakit}</p>
                  </div>
                  <div className="p-1.5 bg-red-50 rounded">
                    <p className="text-[10px] text-red-800 font-medium">Alpa</p>
                    <p className="text-xs font-bold text-red-900">{dataSiswa.totalAlpa}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('absensi-saya')}
                className="mt-4 text-xs font-semibold text-[#0B7725] hover:underline flex items-center gap-1"
              >
                <span>Buka Rincian Absensi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Assessment Stat Card */}
            <div className="bg-white rounded-2xl p-6 min-h-64 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <p className="text-xs text-gray-500 font-medium">Penilaian Terbaru</p>
                <div className="mt-2 space-y-2">
                  {dataSiswa.penilaianTerbaru.length > 0 ? (
                    dataSiswa.penilaianTerbaru.map((pt, idx) => (
                      <div key={idx} className="p-2 rounded bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-gray-800 truncate">{pt.judul}</p>
                          <p className="text-[10px] text-gray-500 truncate">{pt.mapelNama}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded font-bold text-xs bg-white border border-gray-200 text-gray-900">
                          {pt.nilai !== null ? pt.nilai : '—'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 py-3 text-center">Belum ada riwayat penilaian.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('rekap-nilai')}
                className="mt-4 text-xs font-semibold text-[#0B7725] hover:underline flex items-center gap-1"
              >
                <span>Lihat Rekap Nilai Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Academic Report Card Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Daftar Capaian Nilai per Mata Pelajaran</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Rekapitulasi nilai tugas, UTS, UAS, dan status capaian KKM (KKM = 75).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F6F8FA] text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Mata Pelajaran</th>
                    <th className="px-4 py-3">Guru Pengampu</th>
                    <th className="px-4 py-3 text-center">Rata-rata Tugas</th>
                    <th className="px-4 py-3 text-center">Nilai UTS</th>
                    <th className="px-4 py-3 text-center">Nilai UAS</th>
                    <th className="px-4 py-3 text-center">Nilai Akhir</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {dataSiswa.ringkasanNilai.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.mapelNama}</td>
                      <td className="px-4 py-3 text-gray-600">{item.guruNama}</td>
                      <td className="px-4 py-3 text-center font-medium">
                        {item.rataTugas !== null ? item.rataTugas : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {item.nilaiUTS !== null ? item.nilaiUTS : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {item.nilaiUAS !== null ? item.nilaiUAS : '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">
                        {item.nilaiAkhir !== null ? item.nilaiAkhir : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.status === 'Tuntas KKM'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Remedial'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
