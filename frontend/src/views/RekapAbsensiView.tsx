import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Download,
  Printer,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PrintModal } from '../components/PrintModal';
import type { Kelas, MataPelajaran, RekapAbsensiRow, Pertemuan } from '@sistem-akamedik/shared';

interface RekapAbsensiViewProps {
  isStudentOnly?: boolean;
}

export const RekapAbsensiView: React.FC<RekapAbsensiViewProps> = ({ isStudentOnly = false }) => {
  const { user, tahunAjaran, semester } = useAuth();

  const [classes, setClasses] = useState<Kelas[]>([]);
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [totalMeetings, setTotalMeetings] = useState<number>(0);
  const [meetings, setMeetings] = useState<Pertemuan[]>([]);
  const [recapData, setRecapData] = useState<RekapAbsensiRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Print modal
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

  // Load Attendance Recap
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    fetchRecap();
  }, [selectedClassId, selectedSubjectId, tahunAjaran, semester]);

  const fetchRecap = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getAttendanceRecap({
        kelasId: selectedClassId,
        mapelId: selectedSubjectId,
        tahunAjaran,
        semester,
      });
      setTotalMeetings(res.totalMeetings);
      setMeetings(res.meetings);
      setRecapData(res.recap);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat rekapitulasi absensi.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return recapData.filter((row) => {
      const q = searchQuery.toLowerCase();
      return row.nama.toLowerCase().includes(q) || row.nis.toLowerCase().includes(q);
    });
  }, [recapData, searchQuery]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;

    const className = classes.find((c) => c.id === selectedClassId)?.nama || '';
    const subjectName = subjects.find((s) => s.id === selectedSubjectId)?.nama || '';

    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Total Terisi', 'Persentase Kehadiran (%)'];
    const rows = filteredRows.map((r, i) => [
      i + 1,
      `="${r.nis}"`, // preserve leading zeros in Excel
      `"${r.nama}"`,
      `"${r.kelasNama}"`,
      r.hadir,
      r.izin,
      r.sakit,
      r.alpa,
      r.totalPertemuanTerisi,
      r.persentaseKehadiran !== null ? `${r.persentaseKehadiran}%` : '—',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Absensi_${className}_${subjectName.replace(/\s+/g, '_')}_${tahunAjaran.replace('/', '-')}_${semester}.csv`);
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
              {isStudentOnly || user?.role === 'siswa' ? 'Rekapitulasi Kehadiran Siswa' : 'Rekapitulasi Absensi Per Mata Pelajaran'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Persentase kehadiran dihitung dari jumlah <b>Hadir</b> dibagi jumlah pertemuan yang telah terisi statusnya.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
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
              <span>Cetak / PDF</span>
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
            <label className="block font-semibold text-gray-700 mb-1">Cari Siswa</label>
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
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Recap Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-bold text-gray-900">
              Kelas {selectedClassName} • {selectedSubjectName}
            </span>
            <span className="text-gray-500 ml-2">
              (Total {totalMeetings} Pertemuan Tercatat)
            </span>
          </div>
          <div className="text-gray-500">
            Menampilkan {filteredRows.length} dari {recapData.length} siswa
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="w-7 h-7 border-2 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Menghitung rekapitulasi kehadiran...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Tidak ditemukan data rekap kehadiran untuk filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F6F8FA] text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">No</th>
                  <th className="px-4 py-3 w-28">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 text-center">Kelas</th>
                  <th className="px-4 py-3 text-center font-bold text-emerald-700">Hadir</th>
                  <th className="px-4 py-3 text-center font-bold text-blue-700">Izin</th>
                  <th className="px-4 py-3 text-center font-bold text-amber-700">Sakit</th>
                  <th className="px-4 py-3 text-center font-bold text-red-700">Alpa</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Terisi</th>
                  <th className="px-4 py-3 text-center font-bold text-gray-900 min-w-[140px]">
                    % Kehadiran
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredRows.map((row, index) => (
                  <tr key={row.siswaId} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-center text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-700">{row.nis}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{row.nama}</td>
                    <td className="px-4 py-3.5 text-center text-gray-600">{row.kelasNama}</td>
                    <td className="px-4 py-3.5 text-center font-bold text-emerald-800 bg-emerald-50/40">
                      {row.hadir}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-blue-800 bg-blue-50/40">
                      {row.izin}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-amber-800 bg-amber-50/40">
                      {row.sakit}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-red-800 bg-red-50/40">
                      {row.alpa}
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-gray-700">
                      {row.totalPertemuanTerisi}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {row.persentaseKehadiran !== null ? (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            row.persentaseKehadiran >= 85
                              ? 'bg-emerald-100 text-emerald-900'
                              : row.persentaseKehadiran >= 75
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-red-100 text-red-900'
                          }`}
                        >
                          {row.persentaseKehadiran}%
                        </span>
                      ) : (
                        <span className="text-gray-400 font-semibold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Document Modal */}
      <PrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        title="Cetak Rekapitulasi Absensi Siswa"
        subtitle={`SMP Negeri 1 Pangkalan Kerinci • Tahun Ajaran ${tahunAjaran} (${semester})`}
        onExportCsv={handleExportCsv}
      >
        <div className="space-y-4">
          <div className="text-center font-bold text-base underline uppercase text-gray-900">
            REKAPITULASI KEHADIRAN SISWA
          </div>
          <div className="grid grid-cols-2 text-xs text-gray-700">
            <div>
              <p>Mata Pelajaran: <b>{selectedSubjectName}</b></p>
              <p>Kelas: <b>{selectedClassName}</b></p>
            </div>
            <div className="text-right">
              <p>Tahun Ajaran: <b>{tahunAjaran}</b></p>
              <p>Semester: <b>{semester}</b></p>
            </div>
          </div>

          <table className="w-full text-xs border border-black border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-black text-center font-bold">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2 w-24">NIS</th>
                <th className="border border-black p-2 text-left">Nama Siswa</th>
                <th className="border border-black p-2 w-16">Hadir</th>
                <th className="border border-black p-2 w-16">Izin</th>
                <th className="border border-black p-2 w-16">Sakit</th>
                <th className="border border-black p-2 w-16">Alpa</th>
                <th className="border border-black p-2 w-24">% Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, i) => (
                <tr key={r.siswaId} className="border-b border-black">
                  <td className="border border-black p-1.5 text-center">{i + 1}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{r.nis}</td>
                  <td className="border border-black p-1.5 font-medium">{r.nama}</td>
                  <td className="border border-black p-1.5 text-center">{r.hadir}</td>
                  <td className="border border-black p-1.5 text-center">{r.izin}</td>
                  <td className="border border-black p-1.5 text-center">{r.sakit}</td>
                  <td className="border border-black p-1.5 text-center">{r.alpa}</td>
                  <td className="border border-black p-1.5 text-center font-bold">
                    {r.persentaseKehadiran !== null ? `${r.persentaseKehadiran}%` : '—'}
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
