export type Role = 'guru' | 'siswa';

export type StatusKehadiran = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Belum diisi';

export interface UserSession {
  id: string;
  role: Role;
  identifier: string; // NIP for guru, NIS for siswa
  nama: string;
  email?: string;
  kelasId?: string; // for student
  kelasNama?: string;
  nip?: string;
  nis?: string;
  namaOrangTua?: string;
  noHpOrangTua?: string;
}

export interface Kelas {
  id: string;
  nama: string; // e.g., '7A', '7B', '8A', '9A'
  tingkat: number; // 7, 8, 9
  waliKelas: string;
  tahunAjaran: string;
  jumlahSiswa: number;
}

export interface MataPelajaran {
  id: string;
  kode: string;
  nama: string;
  kategori: string; // e.g. 'Kelompok A (Wajib)', 'Kelompok B'
}

export interface PenugasanGuru {
  id: string;
  guruId: string;
  kelasId: string;
  mapelId: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
}

export interface Siswa {
  id: string;
  nis: string;
  nama: string;
  kelasId: string;
  jenisKelamin: 'L' | 'P';
  namaOrangTua: string;
  noHpOrangTua: string;
  alamat: string;
}

export interface Guru {
  id: string;
  nip: string;
  nama: string;
  gelar?: string;
  email: string;
  noHp: string;
}

export interface Pertemuan {
  id: string;
  kelasId: string;
  mapelId: string;
  guruId: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  pertemuanKe: number;
  tanggal: string; // YYYY-MM-DD
  materi: string;
  statusPengisian?: 'Lengkap' | 'Sebagian' | 'Belum diisi';
}

export interface AbsensiRecord {
  id: string;
  pertemuanId: string;
  siswaId: string;
  status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';
  catatan?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface RiwayatKoreksi {
  id: string;
  absensiId: string;
  siswaId: string;
  namaSiswa: string;
  pertemuanKe: number;
  tanggal: string;
  statusLama: string;
  statusBaru: string;
  alasan?: string;
  diubahPada: string;
  diubahOleh: string;
}

export interface Tugas {
  id: string;
  kelasId: string;
  mapelId: string;
  guruId: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  nomor: number; // 1, 2, 3...
  judul: string;
  keterangan?: string;
  tanggalDiberikan: string;
}

export interface NilaiTugas {
  id: string;
  tugasId: string;
  siswaId: string;
  nilai: number | null; // 0-100, null if not filled
  catatan?: string;
  updatedAt: string;
}

export interface NilaiUjian {
  id: string;
  kelasId: string;
  mapelId: string;
  siswaId: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  tipe: 'UTS' | 'UAS';
  nilai: number | null; // 0-100, null if not filled
  updatedAt: string;
}

export interface BobotNilai {
  id: string;
  kelasId: string;
  mapelId: string;
  tahunAjaran: string;
  semester: 'Ganjil' | 'Genap';
  bobotTugas: number; // default 40%
  bobotUTS: number;   // default 30%
  bobotUAS: number;   // default 30%
  keterangan?: string;
}

export interface RekapNilaiRow {
  siswaId: string;
  nis: string;
  nama: string;
  kelasNama: string;
  mapelNama: string;
  nilaiTugas: { [tugasId: string]: number | null };
  rataRataTugas: number | null;
  nilaiUTS: number | null;
  nilaiUAS: number | null;
  nilaiAkhir: number | null;
  statusKelulusan: 'Lulus' | 'Remedial' | 'Belum Lengkap';
  keterangan: string;
}

export interface RekapAbsensiRow {
  siswaId: string;
  nis: string;
  nama: string;
  kelasNama: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  totalPertemuanTerisi: number;
  persentaseKehadiran: number | null; // null if 0 recorded meetings
}

export interface NotifikasiOrangTua {
  id: string;
  siswaId: string;
  namaSiswa: string;
  nis: string;
  kelasNama: string;
  mapelNama: string;
  namaOrangTua: string;
  noHpOrangTua: string;
  tanggal: string;
  pertemuanKe: number;
  statusAbsen: 'Alpa' | 'Sakit' | 'Izin';
  alasan?: string;
  pesanNotifikasi: string;
  statusPengiriman: 'Terkirim' | 'Diproses';
  waktuPengiriman: string;
  whatsappDirectUrl: string;
}

export interface DashboardStatsGuru {
  totalKelas: number;
  totalSiswa: number;
  rataRataKehadiran: number | null;
  penilaianBelumLengkap: number;
  ringkasanKelas: {
    kelasId: string;
    kelasNama: string;
    mapelNama: string;
    totalSiswa: number;
    pertemuanSelesai: number;
    kehadiranPersen: number | null;
  }[];
}

export interface DashboardStatsSiswa {
  siswa: Siswa;
  kelasNama: string;
  persentaseKehadiran: number | null;
  totalHadir: number;
  totalIzin: number;
  totalSakit: number;
  totalAlpa: number;
  ringkasanNilai: {
    mapelId: string;
    mapelNama: string;
    guruNama: string;
    rataTugas: number | null;
    nilaiUTS: number | null;
    nilaiUAS: number | null;
    nilaiAkhir: number | null;
    status: string;
  }[];
  penilaianTerbaru: {
    judul: string;
    mapelNama: string;
    tanggal: string;
    nilai: number | null;
    tipe: 'Tugas' | 'UTS' | 'UAS';
  }[];
}
