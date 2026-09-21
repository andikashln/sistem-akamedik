import type {
  Role,
  Kelas,
  MataPelajaran,
  Siswa,
  Pertemuan,
  Tugas,
  BobotNilai,
  RekapNilaiRow,
  RekapAbsensiRow,
  NotifikasiOrangTua,
  RiwayatKoreksi,
  DashboardStatsGuru,
  DashboardStatsSiswa,
} from '@sistem-akamedik/shared';

const TOKEN_KEY = 'akamedik_token';
const API_BASE_URL = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/+$/, '');

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Pastikan backend berjalan dan alamat API benar.');
  }

  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Respons API tidak valid. Periksa alamat API dan koneksi backend.');
  }
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Terjadi kesalahan pada server.');
  }

  return data as T;
}

// API methods
export const api = {
  // Auth
  login: (role: Role, identifier: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, identifier, password }),
    }),

  getMe: () => request<any>('/auth/me'),

  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Master Data
  getClasses: () => request<Kelas[]>('/classes'),

  getSubjects: (kelasId?: string) => {
    const query = kelasId ? `?kelasId=${encodeURIComponent(kelasId)}` : '';
    return request<MataPelajaran[]>(`/subjects${query}`);
  },

  getStudents: (kelasId?: string) => {
    const query = kelasId ? `?kelasId=${encodeURIComponent(kelasId)}` : '';
    return request<Siswa[]>(`/students${query}`);
  },

  // Attendance
  getAttendance: (params: {
    kelasId: string;
    mapelId: string;
    tahunAjaran: string;
    semester: string;
    pertemuanKe: number;
    tanggal?: string;
  }) => {
    const q = new URLSearchParams({
      kelasId: params.kelasId,
      mapelId: params.mapelId,
      tahunAjaran: params.tahunAjaran,
      semester: params.semester,
      pertemuanKe: String(params.pertemuanKe),
      ...(params.tanggal ? { tanggal: params.tanggal } : {}),
    });
    return request<{
      meeting: Pertemuan | null;
      students: {
        siswaId: string;
        nis: string;
        nama: string;
        namaOrangTua: string;
        noHpOrangTua: string;
        status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Belum diisi';
        catatan: string;
      }[];
    }>(`/attendance?${q.toString()}`);
  },

  saveAttendance: (payload: {
    kelasId: string;
    mapelId: string;
    tahunAjaran: string;
    semester: string;
    pertemuanKe: number;
    tanggal: string;
    materi: string;
    records: { siswaId: string; status: string; catatan?: string }[];
    alasanKoreksi?: string;
  }) =>
    request<{ message: string; meeting: Pertemuan; notifikasiDibuat: number }>('/attendance/save', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAttendanceRecap: (params: { kelasId: string; mapelId: string; tahunAjaran: string; semester: string }) => {
    const q = new URLSearchParams(params);
    return request<{ totalMeetings: number; meetings: Pertemuan[]; recap: RekapAbsensiRow[] }>(
      `/attendance/recap?${q.toString()}`
    );
  },

  getAttendanceHistory: () => request<RiwayatKoreksi[]>('/attendance/history'),

  // Tasks & Grades
  getTasks: (params: { kelasId: string; mapelId: string; tahunAjaran: string; semester: string }) => {
    const q = new URLSearchParams(params);
    return request<Tugas[]>(`/tasks?${q.toString()}`);
  },

  createTask: (payload: {
    kelasId: string;
    mapelId: string;
    tahunAjaran: string;
    semester: string;
    judul: string;
    keterangan?: string;
    tanggalDiberikan?: string;
  }) =>
    request<{ message: string; task: Tugas }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTask: (id: string) => request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),

  getGrades: (params: {
    type: 'tugas' | 'uts' | 'uas';
    kelasId: string;
    mapelId: string;
    tugasId?: string;
    tahunAjaran: string;
    semester: string;
  }) => {
    const q = new URLSearchParams({
      type: params.type,
      kelasId: params.kelasId,
      mapelId: params.mapelId,
      tahunAjaran: params.tahunAjaran,
      semester: params.semester,
      ...(params.tugasId ? { tugasId: params.tugasId } : {}),
    });
    return request<{
      type: string;
      grades: { siswaId: string; nis: string; nama: string; nilai: number | null; catatan?: string }[];
    }>(`/grades?${q.toString()}`);
  },

  saveGradesBatch: (payload: {
    type: 'tugas' | 'uts' | 'uas';
    kelasId: string;
    mapelId: string;
    tugasId?: string;
    tahunAjaran: string;
    semester: string;
    grades: { siswaId: string; nilai: number | null; catatan?: string }[];
  }) =>
    request<{ message: string }>('/grades/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getWeights: (params: { kelasId: string; mapelId: string; tahunAjaran: string; semester: string }) => {
    const q = new URLSearchParams(params);
    return request<BobotNilai>(`/weights?${q.toString()}`);
  },

  saveWeights: (payload: {
    kelasId: string;
    mapelId: string;
    tahunAjaran: string;
    semester: string;
    bobotTugas: number;
    bobotUTS: number;
    bobotUAS: number;
    keterangan?: string;
  }) =>
    request<{ message: string; weights: BobotNilai }>('/weights', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getGradesRecap: (params: { kelasId: string; mapelId: string; tahunAjaran: string; semester: string }) => {
    const q = new URLSearchParams(params);
    return request<{ tasks: Tugas[]; weights: BobotNilai; recap: RekapNilaiRow[] }>(
      `/grades/recap?${q.toString()}`
    );
  },

  // Notifications
  getNotifications: () => request<NotifikasiOrangTua[]>('/notifications'),
  sendNotification: (id: string) =>
    request<{ message: string; notification: NotifikasiOrangTua }>(`/notifications/${id}/send`, {
      method: 'POST',
    }),

  // Dashboard
  getDashboard: () => request<DashboardStatsGuru | DashboardStatsSiswa>('/dashboard'),

  // Reset Demo
  resetDemo: () => request<{ message: string }>('/system/reset-demo', { method: 'POST' }),
};
