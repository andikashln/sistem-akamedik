import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Calendar,
  Keyboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Kelas, MataPelajaran, Tugas } from '@sistem-akamedik/shared';

interface StudentGradeRow {
  siswaId: string;
  nis: string;
  nama: string;
  nilai: string; // string representation for input field: '' means unfilled/null, '0' means score of zero!
  catatan: string;
}

export const NilaiTugasView: React.FC = () => {
  const { user, tahunAjaran, semester } = useAuth();

  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const [tasks, setTasks] = useState<Tugas[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const [grades, setGrades] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New task modal
  const [showNewTaskModal, setShowNewTaskModal] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDesc, setNewTaskDesc] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState<boolean>(false);

  // Refs for keyboard navigation
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Load Classes
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

  // Load Subjects
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

  // Load Tasks
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    fetchTasks();
  }, [selectedClassId, selectedSubjectId, tahunAjaran, semester]);

  const fetchTasks = async () => {
    try {
      const res = await api.getTasks({
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tahunAjaran,
        semester,
      });
      setTasks(res);
      if (res.length > 0) {
        setSelectedTaskId(res[0].id);
      } else {
        setSelectedTaskId('');
        setGrades([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat daftar tugas.');
    }
  };

  // Load Grades for selected Task
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !selectedTaskId) return;
    fetchGrades();
  }, [selectedClassId, selectedSubjectId, selectedTaskId, tahunAjaran, semester]);

  const fetchGrades = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getGrades({
        type: 'tugas',
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tugasId: selectedTaskId,
        tahunAjaran,
        semester,
      });

      setGrades(
        res.grades.map((g) => ({
          siswaId: g.siswaId,
          nis: g.nis,
          nama: g.nama,
          nilai: g.nilai !== null && g.nilai !== undefined ? String(g.nilai) : '',
          catatan: g.catatan || '',
        }))
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat nilai tugas.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (siswaId: string, value: string) => {
    // Only allow numbers 0-100 or empty string
    if (value !== '') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) return;
    }
    setGrades((prev) =>
      prev.map((g) => (g.siswaId === siswaId ? { ...g, nilai: value } : g))
    );
  };

  const handleCatatanChange = (siswaId: string, catatan: string) => {
    setGrades((prev) =>
      prev.map((g) => (g.siswaId === siswaId ? { ...g, catatan } : g))
    );
  };

  // Keyboard navigation support: ArrowDown, ArrowUp, Enter
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = currentIndex + 1;
      if (nextIndex < grades.length) {
        const nextId = grades[nextIndex].siswaId;
        inputRefs.current[nextId]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevId = grades[prevIndex].siswaId;
        inputRefs.current[prevId]?.focus();
      }
    }
  };

  const handleSaveGrades = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload = {
        type: 'tugas' as const,
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tugasId: selectedTaskId,
        tahunAjaran,
        semester,
        grades: grades.map((g) => ({
          siswaId: g.siswaId,
          nilai: g.nilai !== '' ? Number(g.nilai) : null,
          catatan: g.catatan,
        })),
      };

      await api.saveGradesBatch(payload);
      setSuccessMessage('Nilai tugas berhasil disimpan dengan aman.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan nilai.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setCreatingTask(true);
    try {
      const res = await api.createTask({
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tahunAjaran,
        semester,
        judul: newTaskTitle.trim(),
        keterangan: newTaskDesc.trim(),
      });
      setShowNewTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      await fetchTasks();
      setSelectedTaskId(res.task.id);
    } catch (err: any) {
      alert(err.message || 'Gagal menambah tugas.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Yakin ingin menghapus tugas ini beserta nilai siswa di dalamnya?')) return;
    try {
      await api.deleteTask(taskId);
      await fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus tugas.');
    }
  };

  const activeTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Filters Card */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              {user?.role === 'guru' ? 'Pengelolaan & Input Nilai Tugas' : 'Nilai Tugas Mandiri & Kelompok'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Nilai tugas berkisar 0–100. Bedakan nilai 0 (skor nol) dari belum diisi (kosong).
            </p>
          </div>

          {user?.role === 'guru' && (
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tugas Baru</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100 text-xs">
          {user?.role === 'guru' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Pilih Kelas</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.nama} ({c.waliKelas.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Mata Pelajaran</label>
            <select
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

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Pilih Tugas</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={tasks.length === 0}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none disabled:bg-gray-100"
            >
              {tasks.length === 0 ? (
                <option value="">(Belum ada tugas dibuat)</option>
              ) : (
                tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    Tugas {t.nomor}: {t.judul}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Keyboard navigation tip */}
      {user?.role === 'guru' && tasks.length > 0 && (
        <div className="bg-[#F6F8FA] border border-gray-200 rounded-lg px-3.5 py-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#0B7725]" />
            <span>
              <b>Tips Navigasi Cepat:</b> Gunakan tombol panah <b>Atas (&uarr;)</b>, <b>Bawah (&darr;)</b>, atau <b>Enter</b> untuk berpindah antar baris input siswa.
            </span>
          </div>
          {activeTask && (
            <button
              onClick={() => handleDeleteTask(activeTask.id)}
              className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 text-[11px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Tugas Ini</span>
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Grades Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {activeTask ? activeTask.judul : 'Formulir Penilaian Tugas'}
            </h3>
            {activeTask?.keterangan && (
              <p className="text-xs text-gray-500 mt-0.5">{activeTask.keterangan}</p>
            )}
          </div>

          {user?.role === 'guru' && tasks.length > 0 && (
            <button
              onClick={handleSaveGrades}
              disabled={saving || loading || grades.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Nilai'}</span>
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            Belum ada tugas yang dibuat untuk kelas dan mata pelajaran ini.
            {user?.role === 'guru' && (
              <div className="mt-3">
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0B7725] text-white font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Tugas Sekarang</span>
                </button>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="w-7 h-7 border-2 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat daftar nilai...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F6F8FA] text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-28">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 w-36 text-center">Nilai (0–100)</th>
                  <th className="px-4 py-3">Catatan / Umpan Balik Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {grades.map((item, index) => (
                  <tr key={item.siswaId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-500 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-gray-700">{item.nis}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.nama}</td>
                    <td className="px-4 py-3 text-center">
                      {user?.role === 'guru' ? (
                        <input
                          ref={(el) => {
                            inputRefs.current[item.siswaId] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          value={item.nilai}
                          onChange={(e) => handleScoreChange(item.siswaId, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          placeholder="—"
                          className="w-24 px-3 py-1.5 rounded-lg border border-gray-300 text-center font-bold text-sm text-gray-900 focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none transition-colors"
                        />
                      ) : (
                        <span className="px-3 py-1 rounded font-bold text-sm bg-gray-100 text-gray-900">
                          {item.nilai !== '' ? item.nilai : '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user?.role === 'guru' ? (
                        <input
                          type="text"
                          value={item.catatan}
                          onChange={(e) => handleCatatanChange(item.siswaId, e.target.value)}
                          placeholder="Tambahkan catatan pengerjaan..."
                          className="w-full px-3 py-1.5 rounded border border-gray-200 text-xs text-gray-800 focus:ring-1 focus:ring-[#0B7725] outline-none"
                        />
                      ) : (
                        <span className="text-gray-600">{item.catatan || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {user?.role === 'guru' && tasks.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Pastikan nilai yang diinput berada pada rentang 0 hingga 100.
            </p>
            <button
              onClick={handleSaveGrades}
              disabled={saving || loading || grades.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Nilai</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Tambah Tugas */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Buat Tugas Baru</h3>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Judul / Materi Tugas</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Misal: Tugas 1: Persamaan Linear"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-800 outline-none focus:ring-1 focus:ring-[#0B7725]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Keterangan / Instruksi</label>
                <textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Latihan mandiri buku paket halaman..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-800 outline-none focus:ring-1 focus:ring-[#0B7725]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-4 py-2 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white font-semibold shadow-xs"
                >
                  {creatingTask ? 'Membuat...' : 'Tambah Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
