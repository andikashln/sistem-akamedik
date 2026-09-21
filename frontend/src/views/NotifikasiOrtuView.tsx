import React, { useState, useEffect, useMemo } from 'react';
import {
  BellRing,
  Send,
  MessageSquare,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Phone,
  Calendar,
  Filter,
} from 'lucide-react';
import { api } from '../lib/api';
import type { NotifikasiOrangTua } from '@sistem-akamedik/shared';

export const NotifikasiOrtuView: React.FC = () => {
  const [notifications, setNotifications] = useState<NotifikasiOrangTua[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [selectedNotif, setSelectedNotif] = useState<NotifikasiOrangTua | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat daftar notifikasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (id: string) => {
    setSendingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.sendNotification(id);
      setSuccessMessage(res.message);
      await fetchNotifications();
      if (selectedNotif?.id === id) {
        setSelectedNotif((prev) => (prev ? { ...prev, statusPengiriman: 'Terkirim', waktuPengiriman: new Date().toISOString() } : null));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim notifikasi.');
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAllPending = async () => {
    const pendingList = notifications.filter((n) => n.statusPengiriman === 'Diproses');
    if (pendingList.length === 0) return;

    if (!window.confirm(`Kirim sekarang seluruh ${pendingList.length} pesan notifikasi tertunda kepada orang tua/wali?`)) {
      return;
    }

    setLoading(true);
    try {
      for (const n of pendingList) {
        await api.sendNotification(n.id);
      }
      setSuccessMessage(`Berhasil mengirim ${pendingList.length} notifikasi ke nomor orang tua.`);
      await fetchNotifications();
    } catch (err: any) {
      setErrorMessage('Terjadi kendala saat pengiriman massal.');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const matchStatus = filterStatus === 'all' || n.statusPengiriman.toLowerCase() === filterStatus.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch =
        n.namaSiswa.toLowerCase().includes(q) ||
        n.namaOrangTua.toLowerCase().includes(q) ||
        n.noHpOrangTua.includes(q) ||
        n.kelasNama.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [notifications, filterStatus, searchQuery]);

  const countPending = notifications.filter((n) => n.statusPengiriman === 'Diproses').length;
  const countSent = notifications.filter((n) => n.statusPengiriman === 'Terkirim').length;


  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#0B7725] flex items-center justify-center flex-shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Layanan Notifikasi Otomatis Orang Tua / Wali
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Integrasi otomatis setiap ada siswa berstatus Alpa, Sakit, atau Izin pada pencatatan absensi sekolah.
              </p>
            </div>
          </div>

          {countPending > 0 && (
            <button
              onClick={handleSendAllPending}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Kirim Semua Tertunda ({countPending})</span>
            </button>
          )}
        </div>

        {/* Counter Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200/60">
            <p className="text-emerald-800 font-medium">Berhasil Terkirim</p>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">{countSent} Pesan</p>
          </div>
          <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/60">
            <p className="text-amber-800 font-medium">Tertunda / Siap Kirim</p>
            <p className="text-xl font-bold text-amber-900 mt-0.5">{countPending} Pesan</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 col-span-2 sm:col-span-1">
            <p className="text-gray-600 font-medium">Kanal Pengiriman</p>
            <p className="text-xs font-semibold text-gray-800 mt-1">
              WhatsApp Gateway & SMS Gateway Resmi
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="sm:col-span-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa, orang tua, atau nomor telepon..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
              />
            </div>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-medium focus:ring-2 focus:ring-[#0B7725] focus:border-[#0B7725] outline-none"
            >
              <option value="all">Semua Status Notifikasi</option>
              <option value="Tertunda">Hanya Status Tertunda</option>
              <option value="Terkirim">Hanya Status Terkirim</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Content: Table & Preview Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table List */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between text-xs">
            <span className="font-bold text-gray-900">
              Antrean Log Notifikasi ({filteredNotifications.length} Data)
            </span>
            <span className="text-gray-500">Klik baris untuk melihat pratinjau pesan</span>
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 text-center text-xs text-gray-500">
                <div className="w-7 h-7 border-2 border-[#0B7725] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat antrean notifikasi...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Tidak ada riwayat notifikasi orang tua sesuai kriteria filter.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F6F8FA] text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Siswa & Orang Tua</th>
                    <th className="px-4 py-3">Pemicu</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {filteredNotifications.map((n) => {
                    const isSelected = selectedNotif?.id === n.id;
                    const isAlpa = n.statusAbsen === 'Alpa';

                    return (
                      <tr
                        key={n.id}
                        onClick={() => setSelectedNotif(n)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/70 font-medium' : 'hover:bg-gray-50/70'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-gray-900">{n.namaSiswa}</p>
                          <p className="text-[11px] text-gray-500">
                            Wali: {n.namaOrangTua} ({n.noHpOrangTua})
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Kelas {n.kelasNama} • {n.tanggal}
                          </p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              isAlpa
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {n.statusAbsen}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              n.statusPengiriman === 'Terkirim'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {n.statusPengiriman === 'Terkirim' ? 'Terkirim' : 'Tertunda'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {n.statusPengiriman === 'Diproses' ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendNow(n.id);
                              }}
                              disabled={sendingId === n.id}
                              className="px-2.5 py-1 rounded bg-[#0B7725] text-white hover:bg-[#09601e] text-[11px] font-semibold shadow-2xs transition-colors inline-flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>{sendingId === n.id ? 'Mengirim...' : 'Kirim'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-medium">Selesai</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Selected Notification Preview Pane */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0B7725]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Pratinjau Pesan Resmi Sekolah
                </h3>
              </div>
              {selectedNotif && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    selectedNotif.statusPengiriman === 'Terkirim'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedNotif.statusPengiriman}
                </span>
              )}
            </div>

            {selectedNotif ? (
              <div className="mt-4 space-y-4 text-xs">
                {/* Meta details */}
                <div className="bg-[#F6F8FA] p-3 rounded-lg border border-gray-200 space-y-1 text-gray-700 text-[11px]">
                  <p>
                    <span className="text-gray-400">Penerima:</span> <b>{selectedNotif.namaOrangTua}</b> (Wali dari {selectedNotif.namaSiswa})
                  </p>
                  <p>
                    <span className="text-gray-400">Nomor Tujuan:</span> <b className="font-mono text-[#0B7725]">{selectedNotif.noHpOrangTua}</b>
                  </p>
                  <p>
                    <span className="text-gray-400">Waktu Pengiriman:</span> {new Date(selectedNotif.waktuPengiriman).toLocaleString('id-ID')}
                  </p>
                </div>

                {/* WhatsApp styled bubble */}
                <div className="p-4 rounded-xl bg-[#EAF5ED]/70 border border-[#0B7725]/30 text-gray-800 font-sans shadow-2xs whitespace-pre-line leading-relaxed text-xs">
                  {selectedNotif.pesanNotifikasi}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-400">
                Pilih salah satu baris notifikasi di sebelah kiri untuk melihat draf pesan resmi.
              </div>
            )}
          </div>

          {/* Action button in preview */}
          {selectedNotif && selectedNotif.statusPengiriman === 'Diproses' && (
            <div className="pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={() => handleSendNow(selectedNotif.id)}
                disabled={sendingId === selectedNotif.id}
                className="w-full py-2.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{sendingId === selectedNotif.id ? 'Mengirimkan pesan...' : 'Kirim Pesan Notifikasi Sekarang'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
