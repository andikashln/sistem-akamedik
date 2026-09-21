import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Download,
  Printer,
  Search,
  Settings,
  AlertCircle,
  HelpCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PrintModal } from '../components/PrintModal';
import type { Kelas, MataPelajaran, RekapNilaiRow } from '@sistem-akamedik/shared';

export const RekapNilaiView: React.FC = () => {
  const { user, tahunAjaran, semester } = useAuth();

  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Weights configuration
  const [bobotTugas, setBobotTugas] = useState<number>(40);
  const [bobotUTS, setBobotUTS] = useState<number>(30);
  const [bobotUAS, setBobotUAS] = useState<number>(30);
  const [kkm, setKkm] = useState<number>(75);
  const [showWeightConfig, setShowWeightConfig] = useState<boolean>(false);

  const [recapData, setRecapData] = useState<RekapNilaiRow[]>([]);
  const [totalTugasCount, setTotalTugasCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);

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

  // Load Grades Recap
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    fetchRecap();
  }, [selectedClassId, selectedSubjectId, tahunAjaran, semester]);

  const fetchRecap = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getGradesRecap({
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tahunAjaran,
        semester,
      });
      setRecapData(res.recap);
      setTotalTugasCount(res.tasks?.length || 0);
      if (res.weights) {
        setBobotTugas(res.weights.bobotTugas);
        setBobotUTS(res.weights.bobotUTS);
        setBobotUAS(res.weights.bobotUAS);
        setKkm(75);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat rekapitulasi nilai.');
    } finally {
      setLoading(false);
    }
  };

  // Re-calculate scores dynamically based on user weights
  const processedRecap = useMemo(() => {
    const totalWeight = bobotTugas + bobotUTS + bobotUAS;

    return recapData.map((row) => {
      // Check if all components exist
      const hasTugas = row.rataRataTugas !== null;
      const hasUTS = row.nilaiUTS !== null;
      const hasUAS = row.nilaiUAS !== null;

      let finalScore: number | null = null;
      let status: 'Tuntas KKM' | 'Remedial' | 'Belum Lengkap' = 'Belum Lengkap';

      if (hasTugas && hasUTS && hasUAS && totalWeight > 0) {
        const weightedSum =
          (row.rataRataTugas! * bobotTugas + row.nilaiUTS! * bobotUTS + row.nilaiUAS! * bobotUAS) / totalWeight;
        finalScore = Math.round(weightedSum * 10) / 10;
        status = finalScore >= kkm ? 'Tuntas KKM' : 'Remedial';
      }

      return {
        ...row,
        nilaiAkhir: finalScore,
        status,
      };
    });
  }, [recapData, bobotTugas, bobotUTS, bobotUAS, kkm]);


  // Filter
  const filteredRows = useMemo(() => {
    return processedRecap.filter((row) => {
      const q = searchQuery.toLowerCase();
      return row.nama.toLowerCase().includes(q) || row.nis.toLowerCase().includes(q);
    });
  }, [processedRecap, searchQuery]);

  // Export CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;

    const className = classes.find((c) => c.id === selectedClassId)?.nama || '';
    const subjectName = subjects.find((s) => s.id === selectedSubjectId)?.nama || '';

    const headers = [
      'No',
      'NIS',
      'Nama Siswa',
      'Kelas',
      'Rata-rata Tugas',
      'Nilai UTS',
      'Nilai UAS',
      'Nilai Akhir',
      'Status Kelulusan',
    ];

    const rows = filteredRows.map((r, i) => [
      i + 1,
      `="${r.nis}"`,
      `"${r.nama}"`,
      `"${r.kelasNama}"`,
      r.rataRataTugas !== null ? r.rataRataTugas : '—',
      r.nilaiUTS !== null ? r.nilaiUTS : '—',
      r.nilaiUAS !== null ? r.nilaiUAS : '—',
      r.nilaiAkhir !== null ? r.nilaiAkhir : '—',
      `"${r.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Nilai_${className}_${subjectName.replace(/\s+/g, '_')}_${tahunAjaran.replace('/', '-')}_${semester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedClassName = classes.find((c) => c.id === selectedClassId)?.nama || '';
  const selectedSubjectName = subjects.find((s) => s.id === selectedSubjectId)?.nama || '';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Filter Card */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              Rekapitulasi Nilai & Nilai Akhir Siswa
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Perhitungan nilai akhir transparan berbasis bobot: {bobotTugas}% Tugas + {bobotUTS}% UTS + {bobotUAS}% UAS.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {user?.role === 'guru' && (
              <button
                onClick={() => setShowWeightConfig(!showWeightConfig)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5 text-gray-600" />
                <span>Atur Bobot & KKM</span>
              </button>
            )}
            <button
              onClick={handleExportCsv}
              disabled={loading || filteredRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-gray-600" />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={() => setIsPrintOpen(true)}
              disabled={loading || filteredRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
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
            <label className="block font-semibold text-gray-700 mb-1">Pencarian Siswa</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berdasarkan NIS atau Nama..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
              />
            </div>
          </div>
        </div>

        {/* Weights & Formula Banner / Drawer */}
        {showWeightConfig && (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900">
                Konfigurasi Penilaian & Standar KKM Mata Pelajaran
              </span>
              <button
                onClick={() => setShowWeightConfig(false)}
                className="text-emerald-700 hover:text-emerald-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-700 font-medium mb-1">Bobot Tugas (%)</label>
                <input
                  type="number"
                  value={bobotTugas}
                  onChange={(e) => setBobotTugas(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-emerald-300 bg-white text-gray-800 font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Bobot UTS (%)</label>
                <input
                  type="number"
                  value={bobotUTS}
                  onChange={(e) => setBobotUTS(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-emerald-300 bg-white text-gray-800 font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Bobot UAS (%)</label>
                <input
                  type="number"
                  value={bobotUAS}
                  onChange={(e) => setBobotUAS(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-emerald-300 bg-white text-gray-800 font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-1">Kriteria Ketuntasan (KKM)</label>
                <input
                  type="number"
                  value={kkm}
                  onChange={(e) => setKkm(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-emerald-300 bg-white text-gray-800 font-bold"
                />
              </div>
            </div>
            <p className="text-[11px] text-emerald-800">
              Total Bobot: <b>{bobotTugas + bobotUTS + bobotUAS}%</b> • Formula: <i>((Rata_Tugas &times; {bobotTugas}) + (UTS &times; {bobotUTS}) + (UAS &times; {bobotUAS})) / 100</i>
            </p>
          </div>
        )}
      </div>

      {/* Formula summary badge */}
      <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#0B7725]" />
          <span>
            <b>Formula Nilai Akhir:</b> (Tugas &times; {bobotTugas}%) + (UTS &times; {bobotUTS}%) + (UAS &times; {bobotUAS}%) • <b>Standar KKM:</b> {kkm}
          </span>
        </div>
        <span className="text-[11px] text-gray-500">
          Jumlah Tugas Aktif: {totalTugasCount} tugas
        </span>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-gray-900">
              Kelas {selectedClassName} • {selectedSubjectName}
            </span>
            <span className="text-gray-500 ml-2">({filteredRows.length} Siswa Terdaftar)</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="w-7 h-7 border-2 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Menghitung rekapitulasi nilai akhir...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Tidak ditemukan data penilaian untuk kombinasi kelas dan mapel ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F6F8FA] text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-28">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 text-center">Rata-rata Tugas ({bobotTugas}%)</th>
                  <th className="px-4 py-3 text-center">Nilai UTS ({bobotUTS}%)</th>
                  <th className="px-4 py-3 text-center">Nilai UAS ({bobotUAS}%)</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 bg-gray-100/70">
                    Nilai Akhir
                  </th>
                  <th className="px-4 py-3 text-center">Status Kelulusan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredRows.map((row, index) => (
                  <tr key={row.siswaId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-center text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-700">{row.nis}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{row.nama}</td>
                    <td className="px-4 py-3.5 text-center font-medium">
                      {row.rataRataTugas !== null ? row.rataRataTugas : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium">
                      {row.nilaiUTS !== null ? row.nilaiUTS : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium">
                      {row.nilaiUAS !== null ? row.nilaiUAS : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-sm bg-gray-50/80 text-gray-900">
                      {row.nilaiAkhir !== null ? row.nilaiAkhir : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.status === 'Tuntas KKM'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.status === 'Remedial'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Print Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="Daftar Nilai Akhir Peserta Didik"
        subtitle={`SMP Negeri 1 Pangkalan Kerinci • Tahun Ajaran ${tahunAjaran} (${semester})`}
        onExportCsv={handleExportCsv}
      >
        <div className="space-y-4">
          <div className="text-center font-bold text-base underline uppercase text-gray-900">
            LEMBAR HASIL PENILAIAN AKADEMIK
          </div>
          <div className="grid grid-cols-2 text-xs text-gray-700">
            <div>
              <p>Mata Pelajaran: <b>{selectedSubjectName}</b></p>
              <p>Kelas: <b>{selectedClassName}</b></p>
            </div>
            <div className="text-right">
              <p>Tahun Ajaran: <b>{tahunAjaran}</b></p>
              <p>Semester: <b>{semester}</b></p>
              <p className="text-[10px] text-gray-500">
                Formula: Tugas ({bobotTugas}%) + UTS ({bobotUTS}%) + UAS ({bobotUAS}%) | KKM: {kkm}
              </p>
            </div>
          </div>

          <table className="w-full text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-center font-bold">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2 w-24">NIS</th>
                <th className="border border-black p-2 text-left">Nama Siswa</th>
                <th className="border border-black p-2 w-20">Rata Tugas</th>
                <th className="border border-black p-2 w-16">UTS</th>
                <th className="border border-black p-2 w-16">UAS</th>
                <th className="border border-black p-2 w-20">Nilai Akhir</th>
                <th className="border border-black p-2 w-24">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={r.siswaId} className="border-b border-black">
                  <td className="border border-black p-1.5 text-center">{i + 1}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{r.nis}</td>
                  <td className="border border-black p-1.5 font-medium">{r.nama}</td>
                  <td className="border border-black p-1.5 text-center">{r.rataRataTugas !== null ? r.rataRataTugas : '—'}</td>
                  <td className="border border-black p-1.5 text-center">{r.nilaiUTS !== null ? r.nilaiUTS : '—'}</td>
                  <td className="border border-black p-1.5 text-center">{r.nilaiUAS !== null ? r.nilaiUAS : '—'}</td>
                  <td className="border border-black p-1.5 text-center font-bold">
                    {r.nilaiAkhir !== null ? r.nilaiAkhir : '—'}
                  </td>
                  <td className="border border-black p-1.5 text-center text-[10px]">
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PrintModal>
    </div>
  );
};
