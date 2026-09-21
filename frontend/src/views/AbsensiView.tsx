import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCheck,
  AlertCircle,
  Save,
  Clock,
  History,
  Info,
  CheckCircle2,
  X,
  Send,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Kelas, MataPelajaran, StatusKehadiran, RiwayatKoreksi } from '@sistem-akamedik/shared';

interface StudentRowState {
  siswaId: string;
  nis: string;
  nama: string;
  namaOrangTua: string;
  noHpOrangTua: string;
  status: StatusKehadiran;
  catatan: string;
}

export const AbsensiView: React.FC = () => {
  const { user, tahunAjaran, semester } = useAuth();

  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [pertemuanKe, setPertemuanKe] = useState<number>(1);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [materi, setMateri] = useState<string>('');

  const [students, setStudents] = useState<StudentRowState[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [alasanKoreksi, setAlasanKoreksi] = useState<string>('');
  const [hasExistingMeeting, setHasExistingMeeting] = useState<boolean>(false);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<RiwayatKoreksi[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Load teacher assigned classes & subjects
  useEffect(() => {
    async function loadMaster() {
      try {
        const cls = await api.getClasses();
        setClasses(cls);
        if (cls.length > 0) {
          setSelectedClassId(cls[0].id);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal memuat daftar kelas.');
      }
    }
    loadMaster();
  }, []);

  // When class changes, load subjects
  useEffect(() => {
    if (!selectedClassId) return;
    async function loadSubjects() {
      try {
        const subs = await api.getSubjects(selectedClassId);
        setSubjects(subs);
        if (subs.length > 0) {
          setSelectedSubjectId(subs[0].id);
        } else {
          setSelectedSubjectId('');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Gagal memuat mata pelajaran.');
      }
    }
    loadSubjects();
  }, [selectedClassId]);

  // Load attendance data
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    fetchAttendance();
  }, [selectedClassId, selectedSubjectId, pertemuanKe, tahunAjaran, semester]);

  const fetchAttendance = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getAttendance({
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tahunAjaran,
        semester,
        pertemuanKe,
      });

      if (data.meeting) {
        setHasExistingMeeting(true);
        setTanggal(data.meeting.tanggal);
        setMateri(data.meeting.materi || `Pertemuan Ke-${pertemuanKe}`);
      } else {
        setHasExistingMeeting(false);
        setMateri(`Materi Pertemuan Ke-${pertemuanKe}`);
      }

      setStudents(
        data.students.map((s) => ({
          siswaId: s.siswaId,
          nis: s.nis,
          nama: s.nama,
          namaOrangTua: s.namaOrangTua,
          noHpOrangTua: s.noHpOrangTua,
          status: s.status,
          catatan: s.catatan || '',
        }))
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengambil data absensi.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllHadir = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'Hadir' as StatusKehadiran,
      }))
    );
  };

  const handleStatusChange = (siswaId: string, status: StatusKehadiran) => {
    setStudents((prev) =>
      prev.map((s) => (s.siswaId === siswaId ? { ...s, status } : s))
    );
  };

  const handleCatatanChange = (siswaId: string, catatan: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.siswaId === siswaId ? { ...s, catatan } : s))
    );
  };

  const handleOpenConfirm = () => {
    setErrorMessage(null);
    setShowConfirmModal(true);
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tahunAjaran,
        semester,
        pertemuanKe,
        tanggal,
        materi,
        records: students.map((s) => ({
          siswaId: s.siswaId,
          status: s.status,
          catatan: s.catatan,
        })),
        alasanKoreksi: hasExistingMeeting ? alasanKoreksi : undefined,
      };

      const res = await api.saveAttendance(payload);
      setShowConfirmModal(false);
      setAlasanKoreksi('');
      setHasExistingMeeting(true);

      let msg = res.message;
      if (res.notifikasiDibuat > 0) {
        msg += ` ${res.notifikasiDibuat} notifikasi otomatis ke orang tua berhasil dibuat.`;
      }
      setSuccessMessage(msg);

      // Refresh
      fetchAttendance();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan absensi.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewHistory = async () => {
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.getAttendanceHistory();
      setHistoryList(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Status counts
  const hadirCount = students.filter((s) => s.status === 'Hadir').length;
  const izinCount = students.filter((s) => s.status === 'Izin').length;
  const sakitCount = students.filter((s) => s.status === 'Sakit').length;
  const alpaCount = students.filter((s) => s.status === 'Alpa').length;
  const belumDiisiCount = students.filter((s) => s.status === 'Belum diisi').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Pencatatan Absensi Harian Siswa
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tentukan parameter kelas, pertemuan, dan tanggal sebelum melakukan pengisian kehadiran.
            </p>
          </div>
          <button
            onClick={handleViewHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <History className="w-3.5 h-3.5 text-gray-600" />
            <span>Riwayat Koreksi Absensi</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-gray-100 text-xs">
          {/* Kelas */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Pilih Kelas</label>
            <select
              id="absensi-select-kelas"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.nama} (Wali: {c.waliKelas.split(',')[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Mata Pelajaran */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Mata Pelajaran</label>
            <select
              id="absensi-select-mapel"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Pertemuan Ke- */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Pertemuan Ke-</label>
            <select
              id="absensi-select-pertemuan"
              value={pertemuanKe}
              onChange={(e) => setPertemuanKe(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Pertemuan Ke-{n}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Tanggal Pelaksanaan</label>
            <input
              id="absensi-input-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
            />
          </div>

          {/* Materi Pembahasan */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Topik / Materi Pokok</label>
            <input
              id="absensi-input-materi"
              type="text"
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
              placeholder="Contoh: Operasi Aljabar"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Automated Parental Notification Guarantee Notice */}
      <div className="bg-[#EAF5ED] border border-[#0B7725]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#1F2937]">
        <div className="flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-[#0B7725] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#0B7725]">Fitur Notifikasi Otomatis Orang Tua Aktif: </span>
            <span>
              Siswa dengan status <b>Alpa</b> (atau <b>Sakit</b>/<b>Izin</b>) akan langsung dicatat dalam antrean notifikasi resmi sekolah ke nomor WhatsApp/SMS orang tua yang terdaftar.
            </span>
          </div>
        </div>
        <button
          onClick={handleMarkAllHadir}
          id="btn-mark-all-hadir"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold whitespace-nowrap shadow-xs transition-colors self-end sm:self-auto"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Tandai Semua Hadir</span>
        </button>
      </div>

      {/* Status Counters Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex items-center justify-between">
          <span className="text-emerald-700 font-medium">Hadir</span>
          <span className="text-base font-bold text-emerald-800">{hadirCount}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex items-center justify-between">
          <span className="text-blue-700 font-medium">Izin</span>
          <span className="text-base font-bold text-blue-800">{izinCount}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex items-center justify-between">
          <span className="text-amber-700 font-medium">Sakit</span>
          <span className="text-base font-bold text-amber-800">{sakitCount}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex items-center justify-between">
          <span className="text-red-700 font-medium">Alpa</span>
          <span className="text-base font-bold text-red-800">{alpaCount}</span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
          <span className="text-gray-500 font-medium">Belum Diisi</span>
          <span className="text-base font-bold text-gray-700">{belumDiisiCount}</span>
        </div>
      </div>

      {/* Students Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Daftar Kehadiran Siswa ({students.length} Siswa)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Kondisi default adalah &ldquo;Belum diisi&rdquo;. Pastikan setiap siswa telah memiliki status kehadiran.
            </p>
          </div>
          <button
            onClick={handleOpenConfirm}
            disabled={saving || loading || students.length === 0}
            id="btn-save-attendance-top"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Absensi</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="w-7 h-7 border-2 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat daftar kehadiran siswa...
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Tidak ada siswa terdaftar pada kelas yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F6F8FA] text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-28">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 text-center min-w-[320px]">Status Kehadiran</th>
                  <th className="px-4 py-3 min-w-[200px]">Catatan / Keterangan Surat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {students.map((student, index) => (
                  <tr key={student.siswaId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-500 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-700">{student.nis}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <div>{student.nama}</div>
                      <div className="text-[10px] text-gray-400 font-normal">
                        Wali: {student.namaOrangTua} ({student.noHpOrangTua})
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Hadir */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.siswaId, 'Hadir')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            student.status === 'Hadir'
                              ? 'bg-[#0B7725] text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
                          }`}
                        >
                          Hadir
                        </button>

                        {/* Izin */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.siswaId, 'Izin')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            student.status === 'Izin'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-800'
                          }`}
                        >
                          Izin
                        </button>

                        {/* Sakit */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.siswaId, 'Sakit')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            student.status === 'Sakit'
                              ? 'bg-[#F59E0B] text-[#1F2937] shadow-2xs font-bold'
                              : 'bg-gray-100 text-gray-700 hover:bg-amber-50 hover:text-amber-800'
                          }`}
                        >
                          Sakit
                        </button>

                        {/* Alpa */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(student.siswaId, 'Alpa')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            student.status === 'Alpa'
                              ? 'bg-[#DC2626] text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-800'
                          }`}
                        >
                          Alpa
                        </button>

                        {/* Belum Diisi */}
                        {student.status === 'Belum diisi' && (
                          <span className="text-[11px] px-2 py-1 rounded bg-gray-200 text-gray-600 font-medium">
                            Belum Diisi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={student.catatan}
                        onChange={(e) => handleCatatanChange(student.siswaId, e.target.value)}
                        placeholder="Catatan surat sakit/izin (opsional)"
                        className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-xs text-gray-800 focus:ring-1 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Save Action */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {belumDiisiCount > 0 ? (
              <span className="text-amber-700 font-medium">
                Peringatan: Masih terdapat {belumDiisiCount} siswa dengan status &ldquo;Belum diisi&rdquo;.
              </span>
            ) : (
              <span className="text-emerald-700 font-medium">
                Seluruh siswa ({students.length}) telah memiliki status absensi.
              </span>
            )}
          </div>
          <button
            onClick={handleOpenConfirm}
            disabled={saving || loading || students.length === 0}
            id="btn-save-attendance-bottom"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Data Absensi</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">
                Konfirmasi Penyimpanan Absensi
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Anda akan menyimpan absensi untuk <b>Kelas {classes.find((c) => c.id === selectedClassId)?.nama}</b>, Pertemuan Ke-{pertemuanKe} (Tanggal {tanggal}).
            </p>

            <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-gray-700">Ringkasan Data:</p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-600">
                <div>• Hadir: {hadirCount} siswa</div>
                <div>• Izin: {izinCount} siswa</div>
                <div>• Sakit: {sakitCount} siswa</div>
                <div>• Alpa: {alpaCount} siswa</div>
              </div>
            </div>

            {hasExistingMeeting && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Alasan Koreksi / Pembaruan Data (Opsional):
                </label>
                <input
                  type="text"
                  value={alasanKoreksi}
                  onChange={(e) => setAlasanKoreksi(e.target.value)}
                  placeholder="Misal: Perubahan status Putri Aulia karena surat susulan"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs outline-none focus:ring-1 focus:ring-[#0B7725]"
                />
                <p className="text-[10px] text-gray-500">
                  Perubahan akan otomatis tercatat pada Riwayat Audit Koreksi.
                </p>
              </div>
            )}

            {alpaCount > 0 && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>
                  Terdapat {alpaCount} siswa berstatus <b>Alpa</b>. Sistem akan otomatis memicu log notifikasi kepada orang tua.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-[#0B7725] text-white text-xs font-semibold hover:bg-[#09601e] transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Ya, Simpan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Riwayat Koreksi & Audit Perubahan Absensi
                </h3>
                <p className="text-xs text-gray-500">
                  Catatan historis setiap perubahan data kehadiran untuk mencegah kecurangan dan memastikan akuntabilitas.
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingHistory ? (
                <div className="p-8 text-center text-xs text-gray-500">Memuat riwayat koreksi...</div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">Belum ada riwayat koreksi data absensi.</div>
              ) : (
                <div className="space-y-3">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg border border-gray-200 bg-[#F6F8FA] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900">{item.namaSiswa}</span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(item.diubahPada).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">
                          Pertemuan Ke-{item.pertemuanKe} (Tanggal {item.tanggal})
                        </span>
                        <span>•</span>
                        <span className="text-red-700 line-through font-medium">{item.statusLama}</span>
                        <span>&rarr;</span>
                        <span className="text-emerald-700 font-bold">{item.statusBaru}</span>
                      </div>
                      <div className="text-gray-600 text-[11px]">
                        <span className="font-medium text-gray-700">Alasan:</span> {item.alasan || '—'}
                      </div>
                      <div className="text-gray-500 text-[10px]">
                        Diubah oleh: <span className="font-semibold text-gray-700">{item.diubahOleh}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
