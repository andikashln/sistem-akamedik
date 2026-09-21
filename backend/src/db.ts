import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';
import type {
  Role,
  Kelas,
  MataPelajaran,
  PenugasanGuru,
  Siswa,
  Guru,
  Pertemuan,
  AbsensiRecord,
  RiwayatKoreksi,
  Tugas,
  NilaiTugas,
  NilaiUjian,
  BobotNilai,
  NotifikasiOrangTua
} from '@sistem-akamedik/shared';

export interface UserAccount {
  id: string;
  role: Role;
  identifier: string; // NIP or NIS
  nama: string;
  email?: string;
  kelasId?: string;
  salt: string;
  passwordHash: string;
}

export interface Session {
  token: string;
  userId: string;
  role: Role;
  identifier: string;
  nama: string;
  kelasId?: string;
  createdAt: number;
}

export interface AcademicDB {
  users: UserAccount[];
  guru: Guru[];
  siswa: Siswa[];
  kelas: Kelas[];
  mapel: MataPelajaran[];
  penugasan: PenugasanGuru[];
  pertemuan: Pertemuan[];
  absensi: AbsensiRecord[];
  riwayatKoreksi: RiwayatKoreksi[];
  tugas: Tugas[];
  nilaiTugas: NilaiTugas[];
  nilaiUjian: NilaiUjian[];
  bobotNilai: BobotNilai[];
  notifikasiOrangTua: NotifikasiOrangTua[];
}

const DB_DIR = config.dataDir;
const DB_FILE = path.join(DB_DIR, 'academic_db.json');

// Memory sessions
const activeSessions = new Map<string, Session>();

// Password hashing utility using crypto PBKDF2
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSession(user: UserAccount): Session {
  const token = generateToken();
  const session: Session = {
    token,
    userId: user.id,
    role: user.role,
    identifier: user.identifier,
    nama: user.nama,
    kelasId: user.kelasId,
    createdAt: Date.now(),
  };
  activeSessions.set(token, session);
  return session;
}

export function getSession(token: string): Session | undefined {
  const session = activeSessions.get(token);
  if (!session) return undefined;
  // Session expires in 7 days
  if (Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) {
    activeSessions.delete(token);
    return undefined;
  }
  return session;
}

export function removeSession(token: string): void {
  activeSessions.delete(token);
}

// Initial seed generator
function createInitialSeed(): AcademicDB {
  const defaultPasswordGuru = 'Guru123!';
  const defaultPasswordSiswa = 'Siswa123!';

  const { hash: hashGuru1, salt: saltGuru1 } = hashPassword(defaultPasswordGuru);
  const { hash: hashGuru2, salt: saltGuru2 } = hashPassword(defaultPasswordGuru);
  const { hash: hashGuru3, salt: saltGuru3 } = hashPassword(defaultPasswordGuru);

  const { hash: hashSiswa, salt: saltSiswa } = hashPassword(defaultPasswordSiswa);

  const kelas: Kelas[] = [
    { id: 'k-7a', nama: '7A', tingkat: 7, waliKelas: 'Dra. Hj. Nurhayati, M.Pd.', tahunAjaran: '2026/2027', jumlahSiswa: 6 },
    { id: 'k-7b', nama: '7B', tingkat: 7, waliKelas: 'Budi Santoso, S.Pd.', tahunAjaran: '2026/2027', jumlahSiswa: 2 },
    { id: 'k-8a', nama: '8A', tingkat: 8, waliKelas: 'Rina Marlina, S.Pd.', tahunAjaran: '2026/2027', jumlahSiswa: 4 },
    { id: 'k-9a', nama: '9A', tingkat: 9, waliKelas: 'Hendra Saputra, M.Pd.', tahunAjaran: '2026/2027', jumlahSiswa: 4 },
  ];

  const mapel: MataPelajaran[] = [
    { id: 'm-mat', kode: 'MAT-01', nama: 'Matematika', kategori: 'Kelompok A (Wajib)' },
    { id: 'm-ipa', kode: 'IPA-01', nama: 'Ilmu Pengetahuan Alam (IPA)', kategori: 'Kelompok A (Wajib)' },
    { id: 'm-bind', kode: 'BIN-01', nama: 'Bahasa Indonesia', kategori: 'Kelompok A (Wajib)' },
    { id: 'm-bing', kode: 'BIG-01', nama: 'Bahasa Inggris', kategori: 'Kelompok A (Wajib)' },
    { id: 'm-ips', kode: 'IPS-01', nama: 'Ilmu Pengetahuan Sosial (IPS)', kategori: 'Kelompok A (Wajib)' },
    { id: 'm-pai', kode: 'PAI-01', nama: 'Pendidikan Agama Islam & Budi Pekerti', kategori: 'Kelompok A (Wajib)' },
  ];

  const guru: Guru[] = [
    {
      id: 'g-1',
      nip: '197405121998022001',
      nama: 'Dra. Hj. Nurhayati, M.Pd.',
      gelar: 'M.Pd.',
      email: 'nurhayati@smpn1pklkerinci.sch.id',
      noHp: '081275661122',
    },
    {
      id: 'g-2',
      nip: '198203152006041008',
      nama: 'Budi Santoso, S.Pd.',
      gelar: 'S.Pd.',
      email: 'budisantoso@smpn1pklkerinci.sch.id',
      noHp: '081364778899',
    },
    {
      id: 'g-3',
      nip: '198809222011012015',
      nama: 'Rina Marlina, S.Pd.',
      gelar: 'S.Pd.',
      email: 'rinamarlina@smpn1pklkerinci.sch.id',
      noHp: '085271994433',
    },
  ];

  const siswa: Siswa[] = [
    {
      id: 's-1',
      nis: '2407001',
      nama: 'Ahmad Rizky Pratama',
      kelasId: 'k-7a',
      jenisKelamin: 'L',
      namaOrangTua: 'Bapak Hendra Pratama',
      noHpOrangTua: '081275891234',
      alamat: 'Jl. Akasia No. 14, Pangkalan Kerinci',
    },
    {
      id: 's-2',
      nis: '2407002',
      nama: 'Putri Aulia Rahma',
      kelasId: 'k-7a',
      jenisKelamin: 'P',
      namaOrangTua: 'Ibu Siti Rahmawati',
      noHpOrangTua: '081364527890',
      alamat: 'Jl. Pemda Gg. Melati No. 8, Pangkalan Kerinci',
    },
    {
      id: 's-3',
      nis: '2407003',
      nama: 'Dimas Surya Nugraha',
      kelasId: 'k-7a',
      jenisKelamin: 'L',
      namaOrangTua: 'Bapak Agus Nugraha',
      noHpOrangTua: '085271829304',
      alamat: 'Komplek Townsite 1 No. 45, Pangkalan Kerinci',
    },
    {
      id: 's-4',
      nis: '2407004',
      nama: 'Siti Nurhaliza',
      kelasId: 'k-7a',
      jenisKelamin: 'P',
      namaOrangTua: 'Bapak Zulkifli',
      noHpOrangTua: '081276001122',
      alamat: 'Jl. Maharaja Indra No. 22, Pangkalan Kerinci',
    },
    {
      id: 's-5',
      nis: '2407005',
      nama: 'Fajar Kurniawan',
      kelasId: 'k-7a',
      jenisKelamin: 'L',
      namaOrangTua: 'Ibu Maryam',
      noHpOrangTua: '082173456789',
      alamat: 'Jl. Lintas Timur Km. 55, Pangkalan Kerinci',
    },
    {
      id: 's-6',
      nis: '2407006',
      nama: 'Nabila Syifa',
      kelasId: 'k-7a',
      jenisKelamin: 'P',
      namaOrangTua: 'Bapak Syamsul Bahri',
      noHpOrangTua: '081372998811',
      alamat: 'Jl. Seminai No. 12, Pangkalan Kerinci',
    },
    {
      id: 's-7',
      nis: '2407007',
      nama: 'Rian Hidayat',
      kelasId: 'k-7b',
      jenisKelamin: 'L',
      namaOrangTua: 'Bapak Rusli',
      noHpOrangTua: '085361224455',
      alamat: 'Jl. Terusan Baru No. 9, Pangkalan Kerinci',
    },
    {
      id: 's-8',
      nis: '2407008',
      nama: 'Zahra Kamila',
      kelasId: 'k-7b',
      jenisKelamin: 'P',
      namaOrangTua: 'Ibu Salmawati',
      noHpOrangTua: '081270998877',
      alamat: 'Jl. Melur Gg. Cempaka No. 3, Pangkalan Kerinci',
    },
  ];

  const users: UserAccount[] = [
    {
      id: 'u-g-1',
      role: 'guru',
      identifier: '197405121998022001',
      nama: 'Dra. Hj. Nurhayati, M.Pd.',
      email: 'nurhayati@smpn1pklkerinci.sch.id',
      salt: saltGuru1,
      passwordHash: hashGuru1,
    },
    {
      id: 'u-g-2',
      role: 'guru',
      identifier: '198203152006041008',
      nama: 'Budi Santoso, S.Pd.',
      email: 'budisantoso@smpn1pklkerinci.sch.id',
      salt: saltGuru2,
      passwordHash: hashGuru2,
    },
    {
      id: 'u-g-3',
      role: 'guru',
      identifier: '198809222011012015',
      nama: 'Rina Marlina, S.Pd.',
      email: 'rinamarlina@smpn1pklkerinci.sch.id',
      salt: saltGuru3,
      passwordHash: hashGuru3,
    },
    ...siswa.map((s, idx) => ({
      id: `u-s-${idx + 1}`,
      role: 'siswa' as Role,
      identifier: s.nis,
      nama: s.nama,
      kelasId: s.kelasId,
      salt: saltSiswa,
      passwordHash: hashSiswa,
    })),
  ];

  const penugasan: PenugasanGuru[] = [
    // Nurhayati -> Matematika di 7A, 7B, 8A
    { id: 'p-1', guruId: 'g-1', kelasId: 'k-7a', mapelId: 'm-mat', tahunAjaran: '2026/2027', semester: 'Ganjil' },
    { id: 'p-2', guruId: 'g-1', kelasId: 'k-7b', mapelId: 'm-mat', tahunAjaran: '2026/2027', semester: 'Ganjil' },
    { id: 'p-3', guruId: 'g-1', kelasId: 'k-8a', mapelId: 'm-mat', tahunAjaran: '2026/2027', semester: 'Ganjil' },
    // Budi Santoso -> IPA di 7A, 7B
    { id: 'p-4', guruId: 'g-2', kelasId: 'k-7a', mapelId: 'm-ipa', tahunAjaran: '2026/2027', semester: 'Ganjil' },
    { id: 'p-5', guruId: 'g-2', kelasId: 'k-7b', mapelId: 'm-ipa', tahunAjaran: '2026/2027', semester: 'Ganjil' },
    // Rina Marlina -> Bahasa Indonesia di 7A, 8A
    { id: 'p-6', guruId: 'g-3', kelasId: 'k-7a', mapelId: 'm-bind', tahunAjaran: '2026/2027', semester: 'Ganjil' },
  ];

  // Pertemuan
  const pertemuan: Pertemuan[] = [
    {
      id: 'pt-1',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      pertemuanKe: 1,
      tanggal: '2026-08-03',
      materi: 'Operasi Bilangan Bulat dan Pecahan',
      statusPengisian: 'Lengkap',
    },
    {
      id: 'pt-2',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      pertemuanKe: 2,
      tanggal: '2026-08-10',
      materi: 'Sifat-sifat Operasi Hitung dan FPB KPK',
      statusPengisian: 'Lengkap',
    },
    {
      id: 'pt-3',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      pertemuanKe: 3,
      tanggal: '2026-08-17',
      materi: 'Pengenalan Bentuk Aljabar',
      statusPengisian: 'Lengkap',
    },
    {
      id: 'pt-4',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      pertemuanKe: 4,
      tanggal: '2026-08-24',
      materi: 'Operasi Penjumlahan dan Pengurangan Aljabar',
      statusPengisian: 'Lengkap',
    },
    {
      id: 'pt-5',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      pertemuanKe: 5,
      tanggal: '2026-09-07',
      materi: 'Persamaan Linear Satu Variabel (PLSV)',
      statusPengisian: 'Lengkap',
    },
    {
      id: 'pt-6',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      pertemuanKe: 6,
      tanggal: '2026-09-14',
      materi: 'Penyelesaian Masalah Nyata dengan PLSV',
      statusPengisian: 'Lengkap',
    },
  ];

  // Absensi records for class 7A Matematika (s-1 to s-6)
  const absensi: AbsensiRecord[] = [
    // Pertemuan 1 (All Hadir)
    { id: 'ab-1-1', pertemuanId: 'pt-1', siswaId: 's-1', status: 'Hadir', createdAt: '2026-08-03T08:00:00Z', updatedAt: '2026-08-03T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-1-2', pertemuanId: 'pt-1', siswaId: 's-2', status: 'Hadir', createdAt: '2026-08-03T08:00:00Z', updatedAt: '2026-08-03T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-1-3', pertemuanId: 'pt-1', siswaId: 's-3', status: 'Hadir', createdAt: '2026-08-03T08:00:00Z', updatedAt: '2026-08-03T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-1-4', pertemuanId: 'pt-1', siswaId: 's-4', status: 'Hadir', createdAt: '2026-08-03T08:00:00Z', updatedAt: '2026-08-03T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-1-5', pertemuanId: 'pt-1', siswaId: 's-5', status: 'Hadir', createdAt: '2026-08-03T08:00:00Z', updatedAt: '2026-08-03T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-1-6', pertemuanId: 'pt-1', siswaId: 's-6', status: 'Hadir', createdAt: '2026-08-03T08:00:00Z', updatedAt: '2026-08-03T08:00:00Z', updatedBy: 'g-1' },

    // Pertemuan 2 (Dimas Sakit)
    { id: 'ab-2-1', pertemuanId: 'pt-2', siswaId: 's-1', status: 'Hadir', createdAt: '2026-08-10T08:00:00Z', updatedAt: '2026-08-10T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-2-2', pertemuanId: 'pt-2', siswaId: 's-2', status: 'Hadir', createdAt: '2026-08-10T08:00:00Z', updatedAt: '2026-08-10T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-2-3', pertemuanId: 'pt-2', siswaId: 's-3', status: 'Sakit', catatan: 'Surat dokter terlampir', createdAt: '2026-08-10T08:00:00Z', updatedAt: '2026-08-10T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-2-4', pertemuanId: 'pt-2', siswaId: 's-4', status: 'Hadir', createdAt: '2026-08-10T08:00:00Z', updatedAt: '2026-08-10T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-2-5', pertemuanId: 'pt-2', siswaId: 's-5', status: 'Hadir', createdAt: '2026-08-10T08:00:00Z', updatedAt: '2026-08-10T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-2-6', pertemuanId: 'pt-2', siswaId: 's-6', status: 'Hadir', createdAt: '2026-08-10T08:00:00Z', updatedAt: '2026-08-10T08:00:00Z', updatedBy: 'g-1' },

    // Pertemuan 3 (Fajar Alpa)
    { id: 'ab-3-1', pertemuanId: 'pt-3', siswaId: 's-1', status: 'Hadir', createdAt: '2026-08-17T08:00:00Z', updatedAt: '2026-08-17T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-3-2', pertemuanId: 'pt-3', siswaId: 's-2', status: 'Hadir', createdAt: '2026-08-17T08:00:00Z', updatedAt: '2026-08-17T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-3-3', pertemuanId: 'pt-3', siswaId: 's-3', status: 'Hadir', createdAt: '2026-08-17T08:00:00Z', updatedAt: '2026-08-17T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-3-4', pertemuanId: 'pt-3', siswaId: 's-4', status: 'Hadir', createdAt: '2026-08-17T08:00:00Z', updatedAt: '2026-08-17T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-3-5', pertemuanId: 'pt-3', siswaId: 's-5', status: 'Alpa', catatan: 'Tanpa keterangan', createdAt: '2026-08-17T08:00:00Z', updatedAt: '2026-08-17T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-3-6', pertemuanId: 'pt-3', siswaId: 's-6', status: 'Hadir', createdAt: '2026-08-17T08:00:00Z', updatedAt: '2026-08-17T08:00:00Z', updatedBy: 'g-1' },

    // Pertemuan 4 (Putri Izin)
    { id: 'ab-4-1', pertemuanId: 'pt-4', siswaId: 's-1', status: 'Hadir', createdAt: '2026-08-24T08:00:00Z', updatedAt: '2026-08-24T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-4-2', pertemuanId: 'pt-4', siswaId: 's-2', status: 'Izin', catatan: 'Mengikuti lomba OSN Kabupaten', createdAt: '2026-08-24T08:00:00Z', updatedAt: '2026-08-24T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-4-3', pertemuanId: 'pt-4', siswaId: 's-3', status: 'Hadir', createdAt: '2026-08-24T08:00:00Z', updatedAt: '2026-08-24T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-4-4', pertemuanId: 'pt-4', siswaId: 's-4', status: 'Hadir', createdAt: '2026-08-24T08:00:00Z', updatedAt: '2026-08-24T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-4-5', pertemuanId: 'pt-4', siswaId: 's-5', status: 'Hadir', createdAt: '2026-08-24T08:00:00Z', updatedAt: '2026-08-24T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-4-6', pertemuanId: 'pt-4', siswaId: 's-6', status: 'Hadir', createdAt: '2026-08-24T08:00:00Z', updatedAt: '2026-08-24T08:00:00Z', updatedBy: 'g-1' },

    // Pertemuan 5 (All Hadir)
    { id: 'ab-5-1', pertemuanId: 'pt-5', siswaId: 's-1', status: 'Hadir', createdAt: '2026-09-07T08:00:00Z', updatedAt: '2026-09-07T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-5-2', pertemuanId: 'pt-5', siswaId: 's-2', status: 'Hadir', createdAt: '2026-09-07T08:00:00Z', updatedAt: '2026-09-07T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-5-3', pertemuanId: 'pt-5', siswaId: 's-3', status: 'Hadir', createdAt: '2026-09-07T08:00:00Z', updatedAt: '2026-09-07T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-5-4', pertemuanId: 'pt-5', siswaId: 's-4', status: 'Hadir', createdAt: '2026-09-07T08:00:00Z', updatedAt: '2026-09-07T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-5-5', pertemuanId: 'pt-5', siswaId: 's-5', status: 'Hadir', createdAt: '2026-09-07T08:00:00Z', updatedAt: '2026-09-07T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-5-6', pertemuanId: 'pt-5', siswaId: 's-6', status: 'Hadir', createdAt: '2026-09-07T08:00:00Z', updatedAt: '2026-09-07T08:00:00Z', updatedBy: 'g-1' },

    // Pertemuan 6 (Ahmad Hadir, dsb)
    { id: 'ab-6-1', pertemuanId: 'pt-6', siswaId: 's-1', status: 'Hadir', createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-14T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-6-2', pertemuanId: 'pt-6', siswaId: 's-2', status: 'Hadir', createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-14T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-6-3', pertemuanId: 'pt-6', siswaId: 's-3', status: 'Hadir', createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-14T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-6-4', pertemuanId: 'pt-6', siswaId: 's-4', status: 'Hadir', createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-14T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-6-5', pertemuanId: 'pt-6', siswaId: 's-5', status: 'Hadir', createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-14T08:00:00Z', updatedBy: 'g-1' },
    { id: 'ab-6-6', pertemuanId: 'pt-6', siswaId: 's-6', status: 'Hadir', createdAt: '2026-09-14T08:00:00Z', updatedAt: '2026-09-14T08:00:00Z', updatedBy: 'g-1' },
  ];

  const riwayatKoreksi: RiwayatKoreksi[] = [
    {
      id: 'rw-1',
      absensiId: 'ab-4-2',
      siswaId: 's-2',
      namaSiswa: 'Putri Aulia Rahma',
      pertemuanKe: 4,
      tanggal: '2026-08-24',
      statusLama: 'Alpa',
      statusBaru: 'Izin',
      alasan: 'Koreksi: Surat rekomendasi OSN sekolah diserahkan ke wali kelas',
      diubahPada: '2026-08-25T09:15:00Z',
      diubahOleh: 'Dra. Hj. Nurhayati, M.Pd.',
    },
  ];

  // Tugas
  const tugas: Tugas[] = [
    {
      id: 'tg-1',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      nomor: 1,
      judul: 'Tugas 1: Operasi Hitung Campuran',
      keterangan: 'Latihan soal mandiri Bab 1 hal 18',
      tanggalDiberikan: '2026-08-10',
    },
    {
      id: 'tg-2',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      nomor: 2,
      judul: 'Tugas 2: Penyederhanaan Suku Aljabar',
      keterangan: 'Latihan soal kelompok Bab 2',
      tanggalDiberikan: '2026-08-24',
    },
    {
      id: 'tg-3',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      guruId: 'g-1',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      nomor: 3,
      judul: 'Tugas 3: Penerapan PLSV',
      keterangan: 'Studi kasus masalah belanja sehari-hari',
      tanggalDiberikan: '2026-09-14',
    },
  ];

  // Nilai Tugas (0-100 or null)
  const nilaiTugas: NilaiTugas[] = [
    // Tugas 1
    { id: 'nt-1-1', tugasId: 'tg-1', siswaId: 's-1', nilai: 88, updatedAt: '2026-08-15T10:00:00Z' },
    { id: 'nt-1-2', tugasId: 'tg-1', siswaId: 's-2', nilai: 95, updatedAt: '2026-08-15T10:00:00Z' },
    { id: 'nt-1-3', tugasId: 'tg-1', siswaId: 's-3', nilai: 82, updatedAt: '2026-08-15T10:00:00Z' },
    { id: 'nt-1-4', tugasId: 'tg-1', siswaId: 's-4', nilai: 90, updatedAt: '2026-08-15T10:00:00Z' },
    { id: 'nt-1-5', tugasId: 'tg-1', siswaId: 's-5', nilai: 75, updatedAt: '2026-08-15T10:00:00Z' },
    { id: 'nt-1-6', tugasId: 'tg-1', siswaId: 's-6', nilai: 92, updatedAt: '2026-08-15T10:00:00Z' },

    // Tugas 2
    { id: 'nt-2-1', tugasId: 'tg-2', siswaId: 's-1', nilai: 85, updatedAt: '2026-08-30T10:00:00Z' },
    { id: 'nt-2-2', tugasId: 'tg-2', siswaId: 's-2', nilai: 92, updatedAt: '2026-08-30T10:00:00Z' },
    { id: 'nt-2-3', tugasId: 'tg-2', siswaId: 's-3', nilai: 80, updatedAt: '2026-08-30T10:00:00Z' },
    { id: 'nt-2-4', tugasId: 'tg-2', siswaId: 's-4', nilai: 88, updatedAt: '2026-08-30T10:00:00Z' },
    { id: 'nt-2-5', tugasId: 'tg-2', siswaId: 's-5', nilai: 70, updatedAt: '2026-08-30T10:00:00Z' },
    { id: 'nt-2-6', tugasId: 'tg-2', siswaId: 's-6', nilai: 89, updatedAt: '2026-08-30T10:00:00Z' },

    // Tugas 3 (s-5 belum mengumpulkan/belum diisi)
    { id: 'nt-3-1', tugasId: 'tg-3', siswaId: 's-1', nilai: 90, updatedAt: '2026-09-18T10:00:00Z' },
    { id: 'nt-3-2', tugasId: 'tg-3', siswaId: 's-2', nilai: 96, updatedAt: '2026-09-18T10:00:00Z' },
    { id: 'nt-3-3', tugasId: 'tg-3', siswaId: 's-3', nilai: 84, updatedAt: '2026-09-18T10:00:00Z' },
    { id: 'nt-3-4', tugasId: 'tg-3', siswaId: 's-4', nilai: 91, updatedAt: '2026-09-18T10:00:00Z' },
    { id: 'nt-3-5', tugasId: 'tg-3', siswaId: 's-5', nilai: null, catatan: 'Belum mengumpulkan', updatedAt: '2026-09-18T10:00:00Z' },
    { id: 'nt-3-6', tugasId: 'tg-3', siswaId: 's-6', nilai: 94, updatedAt: '2026-09-18T10:00:00Z' },
  ];

  // Nilai UTS (Sudah terlaksana)
  const nilaiUjian: NilaiUjian[] = [
    { id: 'nu-1-1', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-1', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UTS', nilai: 86, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-1-2', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-2', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UTS', nilai: 94, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-1-3', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-3', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UTS', nilai: 82, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-1-4', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-4', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UTS', nilai: 89, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-1-5', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-5', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UTS', nilai: 72, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-1-6', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-6', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UTS', nilai: 91, updatedAt: '2026-09-20T10:00:00Z' },

    // Nilai UAS (Belum terlaksana pada awal semester ganjil, sebagian belum diisi atau null)
    { id: 'nu-2-1', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-1', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UAS', nilai: null, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-2-2', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-2', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UAS', nilai: null, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-2-3', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-3', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UAS', nilai: null, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-2-4', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-4', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UAS', nilai: null, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-2-5', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-5', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UAS', nilai: null, updatedAt: '2026-09-20T10:00:00Z' },
    { id: 'nu-2-6', kelasId: 'k-7a', mapelId: 'm-mat', siswaId: 's-6', tahunAjaran: '2026/2027', semester: 'Ganjil', tipe: 'UAS', nilai: null, updatedAt: '2026-09-20T10:00:00Z' },
  ];

  // Bobot Nilai (Tugas 40%, UTS 30%, UAS 30%)
  const bobotNilai: BobotNilai[] = [
    {
      id: 'bb-1',
      kelasId: 'k-7a',
      mapelId: 'm-mat',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      bobotTugas: 40,
      bobotUTS: 30,
      bobotUAS: 30,
      keterangan: 'Bobot standar kurikulum SMPN 1 Pangkalan Kerinci (40% Tugas, 30% UTS, 30% UAS)',
    },
    {
      id: 'bb-2',
      kelasId: 'k-7a',
      mapelId: 'm-ipa',
      tahunAjaran: '2026/2027',
      semester: 'Ganjil',
      bobotTugas: 40,
      bobotUTS: 30,
      bobotUAS: 30,
    },
  ];

  // Automated notification logs to parents
  const notifikasiOrangTua: NotifikasiOrangTua[] = [
    {
      id: 'notif-1',
      siswaId: 's-5',
      namaSiswa: 'Fajar Kurniawan',
      nis: '2407005',
      kelasNama: '7A',
      mapelNama: 'Matematika',
      namaOrangTua: 'Ibu Maryam',
      noHpOrangTua: '082173456789',
      tanggal: '2026-08-17',
      pertemuanKe: 3,
      statusAbsen: 'Alpa',
      alasan: 'Tidak ada surat atau pemberitahuan',
      pesanNotifikasi: 'Yth. Ibu Maryam (Orang Tua dari Fajar Kurniawan, NIS 2407005, Kelas 7A), kami informasikan bahwa ananda tidak hadir (Alpa) pada mata pelajaran Matematika Pertemuan Ke-3 tanggal 17 Agustus 2026 di SMP Negeri 1 Pangkalan Kerinci. Mohon konfirmasinya melalui pihak sekolah.',
      statusPengiriman: 'Terkirim',
      waktuPengiriman: '2026-08-17T08:15:00Z',
      whatsappDirectUrl: 'https://api.whatsapp.com/send?phone=6282173456789&text=' + encodeURIComponent('Yth. Ibu Maryam (Orang Tua dari Fajar Kurniawan, NIS 2407005, Kelas 7A), kami informasikan bahwa ananda tidak hadir (Alpa) pada mata pelajaran Matematika Pertemuan Ke-3 tanggal 17 Agustus 2026 di SMP Negeri 1 Pangkalan Kerinci.'),
    },
  ];

  return {
    users,
    guru,
    siswa,
    kelas,
    mapel,
    penugasan,
    pertemuan,
    absensi,
    riwayatKoreksi,
    tugas,
    nilaiTugas,
    nilaiUjian,
    bobotNilai,
    notifikasiOrangTua,
  };
}

class AcademicDatabase {
  private db: AcademicDB;

  constructor() {
    this.ensureDirectory();
    this.db = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private loadDatabase(): AcademicDB {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        // Quick verification of critical collections
        const collections: (keyof AcademicDB)[] = [
          'users', 'guru', 'siswa', 'kelas', 'mapel', 'penugasan', 'pertemuan',
          'absensi', 'riwayatKoreksi', 'tugas', 'nilaiTugas', 'nilaiUjian',
          'bobotNilai', 'notifikasiOrangTua',
        ];
        if (parsed && collections.every((key) => Array.isArray(parsed[key]))) {
          return parsed;
        }
        throw new Error('Struktur database tidak lengkap.');
      } catch (cause) {
        throw new Error(`Database tidak dapat dibaca: ${DB_FILE}. File asli dipertahankan.`, { cause });
      }
    }

    const seed = createInitialSeed();
    this.saveDirect(seed);
    return seed;
  }

  private saveDirect(data: AcademicDB) {
    const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_FILE);
  }

  public save() {
    this.saveDirect(this.db);
  }

  public resetDemo() {
    this.db = createInitialSeed();
    this.save();
    return this.db;
  }

  public get data(): AcademicDB {
    return this.db;
  }
}

export const dbInstance = new AcademicDatabase();
