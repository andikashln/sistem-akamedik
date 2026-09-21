import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  FileText,
  Save,
  AlertCircle,
  CheckCircle2,
  Keyboard,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { Kelas, MataPelajaran } from '@sistem-akamedik/shared';

interface NilaiUjianViewProps {
  type: 'uts' | 'uas';
}

interface StudentExamRow {
  siswaId: string;
  nis: string;
  nama: string;
  nilai: string;
  catatan: string;
}

export const NilaiUjianView: React.FC<NilaiUjianViewProps> = ({ type }) => {
  const { user, tahunAjaran, semester } = useAuth();
  const labelUpper = type.toUpperCase();

  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const [grades, setGrades] = useState<StudentExamRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setErrorMessage(err.message || 'Gagal memuat kelas.');
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

  // Load Grades
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    fetchGrades();
  }, [selectedClassId, selectedSubjectId, type, tahunAjaran, semester]);

  const fetchGrades = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getGrades({
        type,
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
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
      setErrorMessage(err.message || `Gagal memuat nilai ${labelUpper}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (siswaId: string, value: string) => {
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

  // Keyboard navigation
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
        type,
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tahunAjaran,
        semester,
        grades: grades.map((g) => ({
          siswaId: g.siswaId,
          nilai: g.nilai !== '' ? Number(g.nilai) : null,
          catatan: g.catatan,
        })),
      };

      await api.saveGradesBatch(payload);
      setSuccessMessage(`Nilai ${labelUpper} berhasil disimpan.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || `Gagal menyimpan nilai ${labelUpper}.`);
    } finally {
      setSaving(false);
    }
  };

  const IconComponent = type === 'uts' ? FileText : Award;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0B7725] flex items-center justify-center flex-shrink-0">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                {user?.role === 'guru'
                  ? `Pengelolaan & Input Nilai ${labelUpper}`
                  : `Capaian Nilai Evaluasi ${labelUpper}`}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {type === 'uts'
                  ? 'Ujian Tengah Semester (bobot 30% pada nilai akhir mata pelajaran).'
                  : 'Ujian Akhir Semester (bobot 30% pada nilai akhir mata pelajaran).'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-xs">
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
        </div>
      </div>

      {/* Keyboard navigation helper */}
      {user?.role === 'guru' && (
        <div className="bg-[#F6F8FA] border border-gray-200 rounded-lg px-3.5 py-2 flex items-center gap-2 text-xs text-gray-600">
          <Keyboard className="w-4 h-4 text-[#0B7725]" />
          <span>
            <b>Navigasi Keyboard:</b> Tekan <b>Enter</b> atau panah <b>Bawah</b> untuk berpindah ke baris siswa berikutnya. Nilai kosong tidak akan diubah menjadi nol.
          </span>
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

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Formulir Penilaian {labelUpper}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Skala nilai resmi 0 hingga 100 dengan batas KKM 75.
            </p>
          </div>

          {user?.role === 'guru' && (
            <button
              onClick={handleSaveGrades}
              disabled={saving || loading || grades.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : `Simpan Nilai ${labelUpper}`}</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="w-7 h-7 border-2 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat daftar nilai {labelUpper}...
          </div>
        ) : grades.length === 0 ? (
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
                  <th className="px-4 py-3 w-36 text-center">Nilai {labelUpper} (0–100)</th>
                  <th className="px-4 py-3 text-center w-28">Status KKM (75)</th>
                  <th className="px-4 py-3">Catatan Khusus Ujian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {grades.map((item, index) => {
                  const numVal = item.nilai !== '' ? Number(item.nilai) : null;
                  const isTuntas = numVal !== null && numVal >= 75;

                  return (
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
                      <td className="px-4 py-3 text-center">
                        {numVal !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isTuntas
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isTuntas ? 'Tuntas' : 'Remedial'}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-medium text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user?.role === 'guru' ? (
                          <input
                            type="text"
                            value={item.catatan}
                            onChange={(e) => handleCatatanChange(item.siswaId, e.target.value)}
                            placeholder="Catatan pelaksanaan ujian..."
                            className="w-full px-2.5 py-1.5 rounded border border-gray-200 text-xs text-gray-800 focus:ring-1 focus:ring-[#0B7725] outline-none"
                          />
                        ) : (
                          <span className="text-gray-600">{item.catatan || '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {user?.role === 'guru' && grades.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Tekan &ldquo;Simpan Semua Nilai&rdquo; untuk memperbarui pangkalan data nilai {labelUpper}.
            </p>
            <button
              onClick={handleSaveGrades}
              disabled={saving || loading || grades.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Semua Nilai {labelUpper}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
