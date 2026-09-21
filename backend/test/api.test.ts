import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import type { Server } from 'node:http';

const dataDir = mkdtempSync(path.join(tmpdir(), 'akamedik-test-'));
process.env.DATA_DIR = dataDir;
process.env.FRONTEND_ORIGIN = 'http://localhost:3000';
let server: Server;
let baseUrl: string;
let teacherToken: string;
let studentToken: string;
const course = { kelasId: 'k-7a', mapelId: 'm-mat', tahunAjaran: '2026/2027', semester: 'Ganjil' };
const query = new URLSearchParams(course).toString();

async function api(endpoint: string, options: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const response = await fetch(`${baseUrl}/api${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  return { response, data: await response.json() };
}

before(async () => {
  const { app } = await import('../src/app.js');
  server = await new Promise<Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  // Hanya hapus direktori sementara yang dibuat oleh test ini.
  assert.equal(path.dirname(dataDir), path.resolve(tmpdir()));
  assert.ok(path.basename(dataDir).startsWith('akamedik-test-'));
  rmSync(dataDir, { recursive: true, force: true });
});

test('API mandiri memberikan health, JSON 404, dan pesan JSON rusak', async () => {
  const health = await api('/health');
  assert.equal(health.response.status, 200);
  assert.equal(health.data.status, 'ok');
  const missing = await api('/missing');
  assert.equal(missing.response.status, 404);
  assert.ok(missing.data.error);
  const root = await fetch(baseUrl);
  assert.equal(root.status, 404);
  assert.match(root.headers.get('content-type') || '', /application\/json/);
  const malformed = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error, 'Format JSON tidak valid.');
});

test('CORS mengizinkan frontend dan header Bearer tanpa membuka origin lain', async () => {
  const allowed = await api('/health', { headers: { Origin: 'http://localhost:3000' } });
  assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  const other = await api('/health', { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(other.response.headers.get('access-control-allow-origin'), null);
  const preflight = await fetch(`${baseUrl}/api/grades/batch`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers') || '', /Authorization/i);
});

test('login guru dan siswa, penolakan password salah, dan pembatasan reset', async () => {
  assert.equal((await api('/classes')).response.status, 401);
  assert.equal((await api('/system/reset-demo', { method: 'POST' })).response.status, 401);
  const wrong = await api('/auth/login', { method: 'POST', body: { role: 'guru', identifier: '197405121998022001', password: 'wrong' } });
  assert.equal(wrong.response.status, 401);
  const teacher = await api('/auth/login', { method: 'POST', body: { role: 'guru', identifier: '197405121998022001', password: 'Guru123!' } });
  assert.equal(teacher.response.status, 200);
  teacherToken = teacher.data.token;
  const student = await api('/auth/login', { method: 'POST', body: { role: 'siswa', identifier: '2407001', password: 'Siswa123!' } });
  assert.equal(student.response.status, 200);
  studentToken = student.data.token;
  assert.equal((await api('/auth/me', { token: teacherToken })).data.role, 'guru');
  assert.equal((await api('/auth/me', { token: studentToken })).data.kelasNama, '7A');
  assert.equal((await api('/system/reset-demo', { method: 'POST', token: studentToken })).response.status, 403);
});

test('dashboard, master data, dan rekap siswa sesuai peran', async () => {
  assert.equal((await api('/classes', { token: teacherToken })).data.length, 3);
  assert.equal((await api('/classes', { token: studentToken })).data.length, 1);
  assert.equal((await api('/students?kelasId=k-7a', { token: teacherToken })).data.length, 6);
  assert.equal((await api('/students?kelasId=k-7a', { token: studentToken })).data.length, 1);
  assert.ok((await api('/dashboard', { token: teacherToken })).data.totalKelas > 0);
  assert.equal((await api('/dashboard', { token: studentToken })).data.siswa.nis, '2407001');
  assert.equal((await api(`/attendance/recap?${query}`, { token: studentToken })).data.recap.length, 1);
  assert.equal((await api(`/grades/recap?${query}`, { token: studentToken })).data.recap.length, 1);
  assert.equal((await api(`/grades/recap?${query.replace('k-7a', 'k-7b')}`, { token: studentToken })).response.status, 403);
});

test('simpan absensi, koreksi, dan rekap terhubung ke penyimpanan backend', async () => {
  const payload = { ...course, pertemuanKe: 7, tanggal: '2026-09-21', materi: 'Pengujian integrasi', records: [{ siswaId: 's-1', status: 'Hadir' }] };
  assert.equal((await api('/attendance/save', { method: 'POST', token: studentToken, body: payload })).response.status, 403);
  const saved = await api('/attendance/save', { method: 'POST', token: teacherToken, body: payload });
  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.meeting.statusPengisian, 'Sebagian');
  const corrected = await api('/attendance/save', { method: 'POST', token: teacherToken, body: { ...payload, records: [{ siswaId: 's-1', status: 'Izin' }], alasanKoreksi: 'Koreksi pengujian' } });
  assert.equal(corrected.response.status, 200);
  const attendance = await api(`/attendance?${query}&pertemuanKe=7`, { token: studentToken });
  assert.equal(attendance.data.students[0].status, 'Izin');
  const history = await api('/attendance/history', { token: teacherToken });
  assert.ok(history.data.some((row: any) => row.alasan === 'Koreksi pengujian'));
  const savedDb = JSON.parse(readFileSync(path.join(dataDir, 'academic_db.json'), 'utf8'));
  assert.ok(savedDb.pertemuan.some((row: any) => row.pertemuanKe === 7));
});

test('tugas, nilai tugas/UTS/UAS, bobot, dan penghapusan nilai terkait', async () => {
  const created = await api('/tasks', { method: 'POST', token: teacherToken, body: { ...course, judul: 'Tugas integrasi' } });
  assert.equal(created.response.status, 200);
  const taskId = created.data.task.id;
  for (const type of ['tugas', 'uts', 'uas']) {
    const saved = await api('/grades/batch', { method: 'POST', token: teacherToken, body: { ...course, type, tugasId: taskId, grades: [{ siswaId: 's-1', nilai: 90 }] } });
    assert.equal(saved.response.status, 200);
    const grades = await api(`/grades?${query}&type=${type}&tugasId=${taskId}`, { token: studentToken });
    assert.equal(grades.data.grades.length, 1);
    assert.equal(grades.data.grades[0].nilai, 90);
  }
  const invalid = await api('/grades/batch', { method: 'POST', token: teacherToken, body: { ...course, type: 'uts', grades: [{ siswaId: 's-1', nilai: 101 }] } });
  assert.equal(invalid.response.status, 400);
  const weights = await api('/weights', { method: 'PUT', token: teacherToken, body: { ...course, bobotTugas: 50, bobotUTS: 25, bobotUAS: 25 } });
  assert.equal(weights.response.status, 200);
  const recap = await api(`/grades/recap?${query}`, { token: studentToken });
  const row = recap.data.recap[0];
  assert.equal(row.nilaiAkhir, Math.round((row.rataRataTugas * 0.5 + 45) * 10) / 10);
  assert.equal((await api(`/tasks/${taskId}`, { method: 'DELETE', token: teacherToken })).response.status, 200);
  const savedDb = JSON.parse(readFileSync(path.join(dataDir, 'academic_db.json'), 'utf8'));
  assert.equal(savedDb.nilaiTugas.some((item: any) => item.tugasId === taskId), false);
});

test('database tetap terbaca dari proses baru dengan direktori kerja berbeda', () => {
  const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    "const { dbInstance } = await import('./backend/src/db.ts'); console.log(JSON.stringify(dbInstance.data.bobotNilai.find(b => b.kelasId === 'k-7a' && b.mapelId === 'm-mat')));"],
    { cwd: repositoryRoot, env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).bobotTugas, 50);
});

test('perubahan password tersimpan dan logout membatalkan token', async () => {
  const changed = await api('/auth/change-password', { method: 'POST', token: studentToken, body: { currentPassword: 'Siswa123!', newPassword: 'SiswaTest123!' } });
  assert.equal(changed.response.status, 200);
  assert.equal((await api('/auth/logout', { method: 'POST', token: studentToken })).response.status, 200);
  assert.equal((await api('/auth/me', { token: studentToken })).response.status, 401);
  const login = await api('/auth/login', { method: 'POST', body: { role: 'siswa', identifier: '2407001', password: 'SiswaTest123!' } });
  assert.equal(login.response.status, 200);
});
