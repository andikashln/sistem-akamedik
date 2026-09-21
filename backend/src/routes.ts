import { Router, Request, Response, NextFunction } from 'express';
import { dbInstance, verifyPassword, hashPassword, createSession, getSession, removeSession, Session } from './db.js';
import type {
  Role,
  NotifikasiOrangTua,
  RekapNilaiRow,
  RekapAbsensiRow,
  DashboardStatsGuru,
  DashboardStatsSiswa,
  AbsensiRecord,
  Tugas
} from '@sistem-akamedik/shared';

export const apiRouter = Router();

// Express type augmentation for authenticated session
export interface AuthenticatedRequest extends Request {
  sessionUser?: Session;
}

// Auth Middleware
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sesi tidak valid atau telah berakhir. Silakan login kembali.' });
  }

  const token = authHeader.split(' ')[1];
  const session = getSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Sesi tidak ditemukan atau telah kedaluwarsa.' });
  }

  req.sessionUser = session;
  next();
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.sessionUser || !allowedRoles.includes(req.sessionUser.role)) {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.' });
    }
    next();
  };
}

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { role, identifier, password } = req.body;

  if (!role || !identifier || !password) {
    return res.status(400).json({ error: 'Role, NIP/NIS, dan password wajib diisi.' });
  }

  if (role !== 'guru' && role !== 'siswa') {
    return res.status(400).json({ error: 'Pilihan peran tidak valid.' });
  }

  const db = dbInstance.data;
  const user = db.users.find((u) => u.role === role && u.identifier.trim() === String(identifier).trim());

  if (!user) {
    const roleLabel = role === 'guru' ? 'NIP' : 'NIS';
    return res.status(401).json({ error: `${roleLabel} atau password yang dimasukkan tidak tepat.` });
  }

  const isMatch = verifyPassword(password, user.passwordHash, user.salt);
  if (!isMatch) {
    const roleLabel = role === 'guru' ? 'NIP' : 'NIS';
    return res.status(401).json({ error: `${roleLabel} atau password yang dimasukkan tidak tepat.` });
  }

  const session = createSession(user);

  let kelasNama: string | undefined;
  let detailProfile: any = null;

  if (role === 'siswa') {
    const student = db.siswa.find((s) => s.nis === user.identifier);
    if (student) {
      const cls = db.kelas.find((k) => k.id === student.kelasId);
      kelasNama = cls ? cls.nama : undefined;
      detailProfile = student;
    }
  } else {
    const teacher = db.guru.find((g) => g.nip === user.identifier);
    detailProfile = teacher;
  }

  return res.json({
    token: session.token,
    user: {
      id: user.id,
      role: user.role,
      identifier: user.identifier,
      nama: user.nama,
      email: user.email,
      kelasId: user.kelasId,
      kelasNama,
      detail: detailProfile,
    },
  });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const db = dbInstance.data;
  const user = db.users.find((u) => u.id === session.userId);

  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  let kelasNama: string | undefined;
  let detailProfile: any = null;

  if (user.role === 'siswa') {
    const student = db.siswa.find((s) => s.nis === user.identifier);
    if (student) {
      const cls = db.kelas.find((k) => k.id === student.kelasId);
      kelasNama = cls ? cls.nama : undefined;
      detailProfile = student;
    }
  } else {
    const teacher = db.guru.find((g) => g.nip === user.identifier);
    detailProfile = teacher;
  }

  return res.json({
    id: user.id,
    role: user.role,
    identifier: user.identifier,
    nama: user.nama,
    email: user.email,
    kelasId: user.kelasId,
    kelasNama,
    detail: detailProfile,
  });
});

apiRouter.post('/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization!.split(' ')[1];
  removeSession(token);
  return res.json({ message: 'Berhasil logout.' });
});

apiRouter.post('/auth/change-password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const session = req.sessionUser!;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
  }

  const db = dbInstance.data;
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  }

  if (!verifyPassword(currentPassword, user.passwordHash, user.salt)) {
    return res.status(400).json({ error: 'Password saat ini salah.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  user.passwordHash = hash;
  user.salt = salt;
  dbInstance.save();

  return res.json({ message: 'Password berhasil diperbarui.' });
});

// -------------------------------------------------------------
// MASTER DATA & PENUGASAN
// -------------------------------------------------------------

apiRouter.get('/classes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const db = dbInstance.data;

  if (session.role === 'guru') {
    const teacher = db.guru.find((g) => g.nip === session.identifier);
    if (!teacher) return res.json([]);
    const assignedClassIds = db.penugasan.filter((p) => p.guruId === teacher.id).map((p) => p.kelasId);
    const classes = db.kelas.filter((k) => assignedClassIds.includes(k.id));
    return res.json(classes);
  } else {
    // Siswa only sees their own class
    const student = db.siswa.find((s) => s.nis === session.identifier);
    if (!student) return res.json([]);
    const classes = db.kelas.filter((k) => k.id === student.kelasId);
    return res.json(classes);
  }
});

apiRouter.get('/subjects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { kelasId } = req.query;
  const db = dbInstance.data;

  if (session.role === 'guru') {
    const teacher = db.guru.find((g) => g.nip === session.identifier);
    if (!teacher) return res.json([]);

    let penugasanList = db.penugasan.filter((p) => p.guruId === teacher.id);
    if (kelasId) {
      penugasanList = penugasanList.filter((p) => p.kelasId === kelasId);
    }
    const mapelIds = penugasanList.map((p) => p.mapelId);
    const subjects = db.mapel.filter((m) => mapelIds.includes(m.id));
    return res.json(subjects);
  } else {
    // Siswa sees subjects available in their curriculum
    const student = db.siswa.find((s) => s.nis === session.identifier);
    if (!student) return res.json([]);
    const classPenugasan = db.penugasan.filter((p) => p.kelasId === student.kelasId);
    const mapelIds = classPenugasan.map((p) => p.mapelId);
    const subjects = db.mapel.filter((m) => mapelIds.includes(m.id));
    return res.json(subjects);
  }
});

apiRouter.get('/students', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { kelasId } = req.query;
  const db = dbInstance.data;

  if (session.role === 'guru') {
    if (!kelasId) {
      return res.status(400).json({ error: 'Parameter kelasId diperlukan.' });
    }
    const students = db.siswa.filter((s) => s.kelasId === kelasId);
    return res.json(students);
  } else {
    // Siswa only gets their own student record
    const student = db.siswa.filter((s) => s.nis === session.identifier);
    return res.json(student);
  }
});

// -------------------------------------------------------------
// ABSENSI & REKAP
// -------------------------------------------------------------

apiRouter.get('/attendance', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { kelasId, mapelId, tahunAjaran, semester, pertemuanKe, tanggal } = req.query;
  const db = dbInstance.data;

  if (!kelasId || !mapelId || !tahunAjaran || !semester) {
    return res.status(400).json({ error: 'Parameter kelas, mapel, tahun ajaran, dan semester wajib diisi.' });
  }

  // Teacher permission check
  if (session.role === 'guru') {
    const teacher = db.guru.find((g) => g.nip === session.identifier);
    if (!teacher) return res.status(403).json({ error: 'Data guru tidak ditemukan.' });
    const isAssigned = db.penugasan.some(
      (p) => p.guruId === teacher.id && p.kelasId === kelasId && p.mapelId === mapelId
    );
    if (!isAssigned) {
      return res.status(403).json({ error: 'Anda tidak ditugaskan untuk mengajar kelas dan mata pelajaran ini.' });
    }
  } else {
    // Siswa cannot view full teacher attendance form, only personal recap/records
    const student = db.siswa.find((s) => s.nis === session.identifier);
    if (!student || student.kelasId !== kelasId) {
      return res.status(403).json({ error: 'Akses ditolak untuk kelas ini.' });
    }
  }

  // Find meeting if pertemuanKe specified
  let meeting: any = null;
  if (pertemuanKe) {
    meeting = db.pertemuan.find(
      (p) =>
        p.kelasId === kelasId &&
        p.mapelId === mapelId &&
        p.tahunAjaran === tahunAjaran &&
        p.semester === semester &&
        p.pertemuanKe === Number(pertemuanKe)
    );
  }

  // Students in this class
  let students = db.siswa.filter((s) => s.kelasId === kelasId);
  if (session.role === 'siswa') {
    students = students.filter((s) => s.nis === session.identifier);
  }

  // Map attendance records
  const studentRecords = students.map((s) => {
    let rec = meeting ? db.absensi.find((a) => a.pertemuanId === meeting.id && a.siswaId === s.id) : undefined;
    return {
      siswaId: s.id,
      nis: s.nis,
      nama: s.nama,
      namaOrangTua: s.namaOrangTua,
      noHpOrangTua: s.noHpOrangTua,
      status: rec ? rec.status : ('Belum diisi' as const),
      catatan: rec?.catatan || '',
      updatedAt: rec?.updatedAt,
    };
  });

  return res.json({
    meeting,
    students: studentRecords,
  });
});

apiRouter.post('/attendance/save', requireAuth, requireRole(['guru']), (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { kelasId, mapelId, tahunAjaran, semester, pertemuanKe, tanggal, materi, records, alasanKoreksi } = req.body;

  if (!kelasId || !mapelId || !tahunAjaran || !semester || !pertemuanKe || !tanggal || !records) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi untuk menyimpan absensi.' });
  }

  const db = dbInstance.data;
  const teacher = db.guru.find((g) => g.nip === session.identifier);
  if (!teacher) return res.status(403).json({ error: 'Data guru tidak ditemukan.' });

  const isAssigned = db.penugasan.some(
    (p) => p.guruId === teacher.id && p.kelasId === kelasId && p.mapelId === mapelId
  );
  if (!isAssigned) {
    return res.status(403).json({ error: 'Anda tidak memiliki wewenang untuk kelas/mapel ini.' });
  }

  // Find or create meeting
  let meeting = db.pertemuan.find(
    (p) =>
      p.kelasId === kelasId &&
      p.mapelId === mapelId &&
      p.tahunAjaran === tahunAjaran &&
      p.semester === semester &&
      p.pertemuanKe === Number(pertemuanKe)
  );

  const nowIso = new Date().toISOString();

  if (!meeting) {
    meeting = {
      id: `pt-${Date.now()}`,
      kelasId,
      mapelId,
      guruId: teacher.id,
      tahunAjaran,
      semester,
      pertemuanKe: Number(pertemuanKe),
      tanggal,
      materi: materi || `Pertemuan Ke-${pertemuanKe}`,
      statusPengisian: 'Lengkap',
    };
    db.pertemuan.push(meeting);
  } else {
    meeting.tanggal = tanggal;
    if (materi) meeting.materi = materi;
  }

  const mapelObj = db.mapel.find((m) => m.id === mapelId);
  const kelasObj = db.kelas.find((k) => k.id === kelasId);
  let notifikasiDibuat = 0;

  // Process records
  for (const item of records) {
    if (!item.siswaId) continue;
    // Skip if status is 'Belum diisi'
    if (item.status === 'Belum diisi') {
      continue;
    }

    const existingRec = db.absensi.find((a) => a.pertemuanId === meeting!.id && a.siswaId === item.siswaId);
    const student = db.siswa.find((s) => s.id === item.siswaId);

    if (existingRec) {
      // Check if status modified -> record history
      if (existingRec.status !== item.status) {
        db.riwayatKoreksi.unshift({
          id: `rw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          absensiId: existingRec.id,
          siswaId: item.siswaId,
          namaSiswa: student?.nama || 'Siswa',
          pertemuanKe: meeting.pertemuanKe,
          tanggal: meeting.tanggal,
          statusLama: existingRec.status,
          statusBaru: item.status,
          alasan: alasanKoreksi || item.catatan || 'Koreksi data absensi oleh guru pengampu',
          diubahPada: nowIso,
          diubahOleh: teacher.nama,
        });
      }
      existingRec.status = item.status;
      existingRec.catatan = item.catatan || '';
      existingRec.updatedAt = nowIso;
      existingRec.updatedBy = teacher.id;
    } else {
      // Create new record
      const newRec: AbsensiRecord = {
        id: `ab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pertemuanId: meeting.id,
        siswaId: item.siswaId,
        status: item.status,
        catatan: item.catatan || '',
        createdAt: nowIso,
        updatedAt: nowIso,
        updatedBy: teacher.id,
      };
      db.absensi.push(newRec);
    }

    // AUTOMATED PARENT NOTIFICATION:
    // If student is Alpa (or Sakit/Izin without prior notice), trigger parental notification
    if (student && (item.status === 'Alpa' || item.status === 'Sakit' || item.status === 'Izin')) {
      const cleanPhone = (student.noHpOrangTua || '').replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
      
      const statusText = item.status === 'Alpa' ? 'tidak hadir tanpa keterangan (Alpa)' : item.status === 'Sakit' ? 'tidak dapat mengikuti pelajaran karena Sakit' : 'mengajukan Izin tidak mengikuti pelajaran';

      const pesan = `Pemberitahuan Akademik SMP Negeri 1 Pangkalan Kerinci.\n\nYth. ${student.namaOrangTua},\nOrang Tua/Wali dari ananda ${student.nama} (NIS: ${student.nis}, Kelas: ${kelasObj?.nama || '7'}).\n\nKami menginformasikan bahwa ananda tercatat ${statusText} pada mata pelajaran ${mapelObj?.nama || 'Mata Pelajaran'} Pertemuan Ke-${meeting.pertemuanKe} (Tanggal: ${tanggal}).\n${item.catatan ? `Keterangan: ${item.catatan}\n` : ''}\nMohon kerja sama Bapak/Ibu untuk memantau kehadiran dan perkembangan belajar ananda. Terima kasih.\n\nSMP Negeri 1 Pangkalan Kerinci\nKabupaten Pelalawan, Riau`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(pesan)}`;

      // Check if duplicate notification for same meeting & student exists
      const existingNotif = db.notifikasiOrangTua.find(
        (n) => n.siswaId === student.id && n.pertemuanKe === meeting!.pertemuanKe && n.tanggal === tanggal && n.mapelNama === (mapelObj?.nama || '')
      );

      if (!existingNotif) {
        db.notifikasiOrangTua.unshift({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          siswaId: student.id,
          namaSiswa: student.nama,
          nis: student.nis,
          kelasNama: kelasObj?.nama || '7A',
          mapelNama: mapelObj?.nama || 'Matematika',
          namaOrangTua: student.namaOrangTua,
          noHpOrangTua: student.noHpOrangTua,
          tanggal,
          pertemuanKe: meeting.pertemuanKe,
          statusAbsen: item.status,
          alasan: item.catatan || '',
          pesanNotifikasi: pesan,
          statusPengiriman: 'Terkirim',
          waktuPengiriman: nowIso,
          whatsappDirectUrl: whatsappUrl,
        });
        notifikasiDibuat++;
      }
    }
  }

  // Update statusPengisian of meeting
  const totalStudents = db.siswa.filter((s) => s.kelasId === kelasId).length;
  const recordedCount = db.absensi.filter((a) => a.pertemuanId === meeting!.id).length;
  meeting.statusPengisian = recordedCount >= totalStudents ? 'Lengkap' : recordedCount > 0 ? 'Sebagian' : 'Belum diisi';

  dbInstance.save();

  return res.json({
    message: 'Data absensi berhasil disimpan.',
    meeting,
    notifikasiDibuat,
  });
});

apiRouter.get('/attendance/recap', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { kelasId, mapelId, tahunAjaran, semester } = req.query;
  const db = dbInstance.data;

  if (!kelasId || !mapelId || !tahunAjaran || !semester) {
    return res.status(400).json({ error: 'Filter kelas, mapel, tahun ajaran, dan semester wajib diisi.' });
  }

  // Access control
  if (session.role === 'siswa') {
    const student = db.siswa.find((s) => s.nis === session.identifier);
    if (!student || student.kelasId !== kelasId) {
      return res.status(403).json({ error: 'Akses ditolak untuk data kelas lain.' });
    }
  }

  // Meetings for this course & class
  const meetings = db.pertemuan.filter(
    (p) => p.kelasId === kelasId && p.mapelId === mapelId && p.tahunAjaran === tahunAjaran && p.semester === semester
  );
  const meetingIds = meetings.map((m) => m.id);

  let students = db.siswa.filter((s) => s.kelasId === kelasId);
  if (session.role === 'siswa') {
    students = students.filter((s) => s.nis === session.identifier);
  }

  const kelasObj = db.kelas.find((k) => k.id === kelasId);

  const recapRows: RekapAbsensiRow[] = students.map((s) => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    for (const mId of meetingIds) {
      const rec = db.absensi.find((a) => a.pertemuanId === mId && a.siswaId === s.id);
      if (rec) {
        if (rec.status === 'Hadir') hadir++;
        else if (rec.status === 'Izin') izin++;
        else if (rec.status === 'Sakit') sakit++;
        else if (rec.status === 'Alpa') alpa++;
      }
    }

    const totalPertemuanTerisi = hadir + izin + sakit + alpa;
    const persentaseKehadiran = totalPertemuanTerisi > 0 ? Math.round((hadir / totalPertemuanTerisi) * 100) : null;

    return {
      siswaId: s.id,
      nis: s.nis,
      nama: s.nama,
      kelasNama: kelasObj?.nama || '',
      hadir,
      izin,
      sakit,
      alpa,
      totalPertemuanTerisi,
      persentaseKehadiran,
    };
  });

  return res.json({
    totalMeetings: meetings.length,
    meetings,
    recap: recapRows,
  });
});

apiRouter.get('/attendance/history', requireAuth, requireRole(['guru']), (req: AuthenticatedRequest, res: Response) => {
  const db = dbInstance.data;
  return res.json(db.riwayatKoreksi);
});

// -------------------------------------------------------------
// TUGAS & NILAI
// -------------------------------------------------------------

apiRouter.get('/tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { kelasId, mapelId, tahunAjaran, semester } = req.query;
  const db = dbInstance.data;

  if (!kelasId || !mapelId || !tahunAjaran || !semester) {
    return res.status(400).json({ error: 'Filter kelasId, mapelId, tahunAjaran, semester diperlukan.' });
  }

  const tasks = db.tugas
    .filter(
      (t) => t.kelasId === kelasId && t.mapelId === mapelId && t.tahunAjaran === tahunAjaran && t.semester === semester
    )
    .sort((a, b) => a.nomor - b.nomor);

  return res.json(tasks);
});

apiRouter.post('/tasks', requireAuth, requireRole(['guru']), (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { kelasId, mapelId, tahunAjaran, semester, judul, keterangan, tanggalDiberikan } = req.body;

  if (!kelasId || !mapelId || !tahunAjaran || !semester || !judul) {
    return res.status(400).json({ error: 'Judul tugas dan parameter kelas/mapel wajib diisi.' });
  }

  const db = dbInstance.data;
  const teacher = db.guru.find((g) => g.nip === session.identifier);
  if (!teacher) return res.status(403).json({ error: 'Data guru tidak ditemukan.' });

  const existingTasks = db.tugas.filter(
    (t) => t.kelasId === kelasId && t.mapelId === mapelId && t.tahunAjaran === tahunAjaran && t.semester === semester
  );
  const nextNomor = existingTasks.length > 0 ? Math.max(...existingTasks.map((t) => t.nomor)) + 1 : 1;

  const newTask: Tugas = {
    id: `tg-${Date.now()}`,
    kelasId,
    mapelId,
    guruId: teacher.id,
    tahunAjaran,
    semester,
    nomor: nextNomor,
    judul,
    keterangan: keterangan || '',
    tanggalDiberikan: tanggalDiberikan || new Date().toISOString().split('T')[0],
  };

  db.tugas.push(newTask);
  dbInstance.save();

  return res.json({ message: 'Tugas berhasil ditambahkan.', task: newTask });
});

apiRouter.delete('/tasks/:id', requireAuth, requireRole(['guru']), (req: AuthenticatedRequest, res: Response) => {
  const taskId = req.params.id;
  const db = dbInstance.data;

  const taskIndex = db.tugas.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Tugas tidak ditemukan.' });
  }

  // Remove task and related grades
  db.tugas.splice(taskIndex, 1);
  db.nilaiTugas = db.nilaiTugas.filter((nt) => nt.tugasId !== taskId);
  dbInstance.save();

  return res.json({ message: 'Tugas dan nilai terkait berhasil dihapus.' });
});

apiRouter.get('/grades', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { type, kelasId, mapelId, tugasId, tahunAjaran, semester } = req.query;
  const db = dbInstance.data;

  if (!type || !kelasId || !mapelId || !tahunAjaran || !semester) {
    return res.status(400).json({ error: 'Parameter type, kelasId, mapelId, tahunAjaran, semester wajib diisi.' });
  }

  let students = db.siswa.filter((s) => s.kelasId === kelasId);
  if (session.role === 'siswa') {
    students = students.filter((s) => s.nis === session.identifier);
  }

  if (type === 'tugas') {
    if (!tugasId) {
      return res.status(400).json({ error: 'Parameter tugasId wajib diisi untuk jenis nilai tugas.' });
    }
    const grades = students.map((s) => {
      const rec = db.nilaiTugas.find((n) => n.tugasId === tugasId && n.siswaId === s.id);
      return {
        siswaId: s.id,
        nis: s.nis,
        nama: s.nama,
        nilai: rec ? rec.nilai : null,
        catatan: rec?.catatan || '',
      };
    });
    return res.json({ type: 'tugas', grades });
  } else if (type === 'uts' || type === 'uas') {
    const examType = type.toUpperCase() as 'UTS' | 'UAS';
    const grades = students.map((s) => {
      const rec = db.nilaiUjian.find(
        (n) =>
          n.kelasId === kelasId &&
          n.mapelId === mapelId &&
          n.tahunAjaran === tahunAjaran &&
          n.semester === semester &&
          n.tipe === examType &&
          n.siswaId === s.id
      );
      return {
        siswaId: s.id,
        nis: s.nis,
        nama: s.nama,
        nilai: rec ? rec.nilai : null,
      };
    });
    return res.json({ type, grades });
  }

  return res.status(400).json({ error: 'Tipe nilai tidak dikenali.' });
});

apiRouter.post('/grades/batch', requireAuth, requireRole(['guru']), (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { type, kelasId, mapelId, tugasId, tahunAjaran, semester, grades } = req.body;

  if (!type || !kelasId || !mapelId || !tahunAjaran || !semester || !Array.isArray(grades)) {
    return res.status(400).json({ error: 'Data penilaian tidak lengkap.' });
  }

  const db = dbInstance.data;
  const teacher = db.guru.find((g) => g.nip === session.identifier);
  if (!teacher) return res.status(403).json({ error: 'Data guru tidak ditemukan.' });

  const isAssigned = db.penugasan.some(
    (p) => p.guruId === teacher.id && p.kelasId === kelasId && p.mapelId === mapelId
  );
  if (!isAssigned) {
    return res.status(403).json({ error: 'Anda tidak memiliki wewenang untuk menilai kelas/mapel ini.' });
  }

  const nowIso = new Date().toISOString();

  for (const item of grades) {
    if (!item.siswaId) continue;

    // Validate 0-100 or null
    let numericScore: number | null = null;
    if (item.nilai !== null && item.nilai !== '' && item.nilai !== undefined) {
      const parsed = Number(item.nilai);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({
          error: `Nilai untuk siswa dengan ID ${item.siswaId} tidak valid (${item.nilai}). Nilai harus antara 0 dan 100.`,
        });
      }
      numericScore = parsed;
    }

    if (type === 'tugas') {
      if (!tugasId) return res.status(400).json({ error: 'tugasId diperlukan untuk input nilai tugas.' });
      const existing = db.nilaiTugas.find((n) => n.tugasId === tugasId && n.siswaId === item.siswaId);
      if (existing) {
        existing.nilai = numericScore;
        existing.catatan = item.catatan || '';
        existing.updatedAt = nowIso;
      } else {
        db.nilaiTugas.push({
          id: `nt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          tugasId,
          siswaId: item.siswaId,
          nilai: numericScore,
          catatan: item.catatan || '',
          updatedAt: nowIso,
        });
      }
    } else if (type === 'uts' || type === 'uas') {
      const examType = type.toUpperCase() as 'UTS' | 'UAS';
      const existing = db.nilaiUjian.find(
        (n) =>
          n.kelasId === kelasId &&
          n.mapelId === mapelId &&
          n.tahunAjaran === tahunAjaran &&
          n.semester === semester &&
          n.tipe === examType &&
          n.siswaId === item.siswaId
      );
      if (existing) {
        existing.nilai = numericScore;
        existing.updatedAt = nowIso;
      } else {
        db.nilaiUjian.push({
          id: `nu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          kelasId,
          mapelId,
          siswaId: item.siswaId,
          tahunAjaran,
          semester,
          tipe: examType,
          nilai: numericScore,
          updatedAt: nowIso,
        });
      }
    }
  }

  dbInstance.save();
  return res.json({ message: 'Nilai berhasil disimpan dengan aman.' });
});

apiRouter.get('/weights', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { kelasId, mapelId, tahunAjaran, semester } = req.query;
  const db = dbInstance.data;

  const found = db.bobotNilai.find(
    (b) => b.kelasId === kelasId && b.mapelId === mapelId && b.tahunAjaran === tahunAjaran && b.semester === semester
  );

  if (found) {
    return res.json(found);
  }

  // Default demo weights: 40% Tugas, 30% UTS, 30% UAS
  return res.json({
    kelasId,
    mapelId,
    tahunAjaran,
    semester,
    bobotTugas: 40,
    bobotUTS: 30,
    bobotUAS: 30,
    keterangan: 'Bobot contoh (40% Tugas, 30% UTS, 30% UAS) - dapat disesuaikan kebijakan sekolah.',
  });
});

apiRouter.put('/weights', requireAuth, requireRole(['guru']), (req: AuthenticatedRequest, res: Response) => {
  const { kelasId, mapelId, tahunAjaran, semester, bobotTugas, bobotUTS, bobotUAS, keterangan } = req.body;

  const t = Number(bobotTugas);
  const u = Number(bobotUTS);
  const a = Number(bobotUAS);

  if (isNaN(t) || isNaN(u) || isNaN(a) || t + u + a !== 100) {
    return res.status(400).json({ error: 'Total bobot Tugas + UTS + UAS wajib sama dengan 100%.' });
  }

  const db = dbInstance.data;
  let found = db.bobotNilai.find(
    (b) => b.kelasId === kelasId && b.mapelId === mapelId && b.tahunAjaran === tahunAjaran && b.semester === semester
  );

  if (found) {
    found.bobotTugas = t;
    found.bobotUTS = u;
    found.bobotUAS = a;
    found.keterangan = keterangan || found.keterangan;
  } else {
    found = {
      id: `bb-${Date.now()}`,
      kelasId,
      mapelId,
      tahunAjaran,
      semester,
      bobotTugas: t,
      bobotUTS: u,
      bobotUAS: a,
      keterangan: keterangan || 'Disesuaikan oleh guru mata pelajaran',
    };
    db.bobotNilai.push(found);
  }

  dbInstance.save();
  return res.json({ message: 'Pengaturan bobot nilai berhasil disimpan.', weights: found });
});

apiRouter.get('/grades/recap', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const { kelasId, mapelId, tahunAjaran, semester } = req.query;
  const db = dbInstance.data;

  if (!kelasId || !mapelId || !tahunAjaran || !semester) {
    return res.status(400).json({ error: 'Filter kelasId, mapelId, tahunAjaran, semester wajib diisi.' });
  }

  // Access check
  if (session.role === 'siswa') {
    const student = db.siswa.find((s) => s.nis === session.identifier);
    if (!student || student.kelasId !== kelasId) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
  }

  const tasks = db.tugas
    .filter(
      (t) => t.kelasId === kelasId && t.mapelId === mapelId && t.tahunAjaran === tahunAjaran && t.semester === semester
    )
    .sort((a, b) => a.nomor - b.nomor);

  // Weights
  const weightsConfig = db.bobotNilai.find(
    (b) => b.kelasId === kelasId && b.mapelId === mapelId && b.tahunAjaran === tahunAjaran && b.semester === semester
  ) || { bobotTugas: 40, bobotUTS: 30, bobotUAS: 30 };

  const kelasObj = db.kelas.find((k) => k.id === kelasId);
  const mapelObj = db.mapel.find((m) => m.id === mapelId);

  let students = db.siswa.filter((s) => s.kelasId === kelasId);
  if (session.role === 'siswa') {
    students = students.filter((s) => s.nis === session.identifier);
  }

  const recapRows: RekapNilaiRow[] = students.map((s) => {
    const nilaiTugasMap: { [tugasId: string]: number | null } = {};
    let totalScore = 0;
    let countFilled = 0;

    for (const t of tasks) {
      const rec = db.nilaiTugas.find((n) => n.tugasId === t.id && n.siswaId === s.id);
      const val = rec && rec.nilai !== null && rec.nilai !== undefined ? rec.nilai : null;
      nilaiTugasMap[t.id] = val;
      if (val !== null) {
        totalScore += val;
        countFilled++;
      }
    }

    const rataRataTugas = countFilled > 0 ? Math.round((totalScore / countFilled) * 10) / 10 : null;

    const utsRec = db.nilaiUjian.find(
      (n) =>
        n.kelasId === kelasId &&
        n.mapelId === mapelId &&
        n.tahunAjaran === tahunAjaran &&
        n.semester === semester &&
        n.tipe === 'UTS' &&
        n.siswaId === s.id
    );
    const nilaiUTS = utsRec && utsRec.nilai !== null ? utsRec.nilai : null;

    const uasRec = db.nilaiUjian.find(
      (n) =>
        n.kelasId === kelasId &&
        n.mapelId === mapelId &&
        n.tahunAjaran === tahunAjaran &&
        n.semester === semester &&
        n.tipe === 'UAS' &&
        n.siswaId === s.id
    );
    const nilaiUAS = uasRec && uasRec.nilai !== null ? uasRec.nilai : null;

    // Nilai Akhir calculation:
    // If any mandatory component is missing, flag "Belum Lengkap"
    let nilaiAkhir: number | null = null;
    let statusKelulusan: 'Lulus' | 'Remedial' | 'Belum Lengkap' = 'Belum Lengkap';
    let keterangan = 'Komponen nilai belum lengkap';

    if (rataRataTugas !== null && nilaiUTS !== null && nilaiUAS !== null) {
      const finalScore =
        (rataRataTugas * weightsConfig.bobotTugas +
          nilaiUTS * weightsConfig.bobotUTS +
          nilaiUAS * weightsConfig.bobotUAS) /
        100;
      nilaiAkhir = Math.round(finalScore * 10) / 10;
      // KKM standard SMPN 1 Pangkalan Kerinci is 75
      if (nilaiAkhir >= 75) {
        statusKelulusan = 'Lulus';
        keterangan = 'Tuntas KKM (>= 75)';
      } else {
        statusKelulusan = 'Remedial';
        keterangan = 'Di bawah KKM (< 75)';
      }
    }

    return {
      siswaId: s.id,
      nis: s.nis,
      nama: s.nama,
      kelasNama: kelasObj?.nama || '',
      mapelNama: mapelObj?.nama || '',
      nilaiTugas: nilaiTugasMap,
      rataRataTugas,
      nilaiUTS,
      nilaiUAS,
      nilaiAkhir,
      statusKelulusan,
      keterangan,
    };
  });

  return res.json({
    tasks,
    weights: weightsConfig,
    recap: recapRows,
  });
});

// -------------------------------------------------------------
// NOTIFIKASI ORANG TUA
// -------------------------------------------------------------

apiRouter.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const db = dbInstance.data;

  if (session.role === 'guru') {
    // Teachers see all parent notification logs
    return res.json(db.notifikasiOrangTua);
  } else {
    // Student sees notifications regarding their own absences
    const student = db.siswa.find((s) => s.nis === session.identifier);
    if (!student) return res.json([]);
    const notifs = db.notifikasiOrangTua.filter((n) => n.siswaId === student.id);
    return res.json(notifs);
  }
});

apiRouter.post('/notifications/:id/send', requireAuth, requireRole(['guru']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const db = dbInstance.data;
  const notif = db.notifikasiOrangTua.find((n) => n.id === id);
  if (!notif) {
    return res.status(404).json({ error: 'Notifikasi tidak ditemukan.' });
  }

  notif.statusPengiriman = 'Terkirim';
  notif.waktuPengiriman = new Date().toISOString();
  dbInstance.save();

  return res.json({
    message: `Notifikasi berhasil dikirimkan ke nomor WhatsApp orang tua (${notif.noHpOrangTua}).`,
    notification: notif,
  });
});


// -------------------------------------------------------------
// DASHBOARD
// -------------------------------------------------------------

apiRouter.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.sessionUser!;
  const db = dbInstance.data;

  if (session.role === 'guru') {
    const teacher = db.guru.find((g) => g.nip === session.identifier);
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan.' });

    const assignments = db.penugasan.filter((p) => p.guruId === teacher.id);
    const assignedClassIds = Array.from(new Set(assignments.map((p) => p.kelasId)));
    const totalKelas = assignedClassIds.length;

    // Total unique students taught
    const totalSiswa = db.siswa.filter((s) => assignedClassIds.includes(s.kelasId)).length;

    // Attendance stats across recorded meetings
    const meetings = db.pertemuan.filter((p) => p.guruId === teacher.id);
    const meetingIds = meetings.map((m) => m.id);
    const attendanceRecords = db.absensi.filter((a) => meetingIds.includes(a.pertemuanId));

    let rataRataKehadiran: number | null = null;
    if (attendanceRecords.length > 0) {
      const hadirCount = attendanceRecords.filter((a) => a.status === 'Hadir').length;
      rataRataKehadiran = Math.round((hadirCount / attendanceRecords.length) * 100);
    }

    // Incomplete assessments count
    let penilaianBelumLengkap = 0;
    const tasks = db.tugas.filter((t) => t.guruId === teacher.id);
    for (const t of tasks) {
      const classStudents = db.siswa.filter((s) => s.kelasId === t.kelasId);
      const gradedCount = db.nilaiTugas.filter((nt) => nt.tugasId === t.id && nt.nilai !== null).length;
      if (gradedCount < classStudents.length) {
        penilaianBelumLengkap++;
      }
    }

    // Class summaries
    const ringkasanKelas = assignments.map((asg) => {
      const cls = db.kelas.find((k) => k.id === asg.kelasId);
      const mpl = db.mapel.find((m) => m.id === asg.mapelId);
      const classStudents = db.siswa.filter((s) => s.kelasId === asg.kelasId);
      const classMeetings = db.pertemuan.filter((p) => p.kelasId === asg.kelasId && p.mapelId === asg.mapelId);
      const classMeetingIds = classMeetings.map((m) => m.id);
      const classAttendance = db.absensi.filter((a) => classMeetingIds.includes(a.pertemuanId));
      const hadir = classAttendance.filter((a) => a.status === 'Hadir').length;
      const pct = classAttendance.length > 0 ? Math.round((hadir / classAttendance.length) * 100) : null;

      return {
        kelasId: asg.kelasId,
        kelasNama: cls?.nama || '',
        mapelNama: mpl?.nama || '',
        totalSiswa: classStudents.length,
        pertemuanSelesai: classMeetings.length,
        kehadiranPersen: pct,
      };
    });

    const stats: DashboardStatsGuru = {
      totalKelas,
      totalSiswa,
      rataRataKehadiran,
      penilaianBelumLengkap,
      ringkasanKelas,
    };

    return res.json(stats);
  } else {
    // Siswa Dashboard
    const student = db.siswa.find((s) => s.nis === session.identifier);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan.' });

    const cls = db.kelas.find((k) => k.id === student.kelasId);

    // Attendance stats for student
    const studentAbsensi = db.absensi.filter((a) => a.siswaId === student.id);
    const totalHadir = studentAbsensi.filter((a) => a.status === 'Hadir').length;
    const totalIzin = studentAbsensi.filter((a) => a.status === 'Izin').length;
    const totalSakit = studentAbsensi.filter((a) => a.status === 'Sakit').length;
    const totalAlpa = studentAbsensi.filter((a) => a.status === 'Alpa').length;
    const totalTerisi = totalHadir + totalIzin + totalSakit + totalAlpa;
    const persentaseKehadiran = totalTerisi > 0 ? Math.round((totalHadir / totalTerisi) * 100) : null;

    // Subjects in student's class
    const classPenugasan = db.penugasan.filter((p) => p.kelasId === student.kelasId);
    const ringkasanNilai = classPenugasan.map((p) => {
      const mpl = db.mapel.find((m) => m.id === p.mapelId);
      const guru = db.guru.find((g) => g.id === p.guruId);

      // Tasks for this mapel
      const mapelTasks = db.tugas.filter((t) => t.kelasId === student.kelasId && t.mapelId === p.mapelId);
      let taskSum = 0;
      let taskFilled = 0;
      for (const t of mapelTasks) {
        const nt = db.nilaiTugas.find((n) => n.tugasId === t.id && n.siswaId === student.id);
        if (nt && nt.nilai !== null) {
          taskSum += nt.nilai;
          taskFilled++;
        }
      }
      const rataTugas = taskFilled > 0 ? Math.round((taskSum / taskFilled) * 10) / 10 : null;

      // UTS
      const uts = db.nilaiUjian.find(
        (n) => n.kelasId === student.kelasId && n.mapelId === p.mapelId && n.tipe === 'UTS' && n.siswaId === student.id
      );
      const nilaiUTS = uts?.nilai ?? null;

      // UAS
      const uas = db.nilaiUjian.find(
        (n) => n.kelasId === student.kelasId && n.mapelId === p.mapelId && n.tipe === 'UAS' && n.siswaId === student.id
      );
      const nilaiUAS = uas?.nilai ?? null;

      let nilaiAkhir: number | null = null;
      let status = 'Belum Lengkap';
      if (rataTugas !== null && nilaiUTS !== null && nilaiUAS !== null) {
        nilaiAkhir = Math.round((rataTugas * 0.4 + nilaiUTS * 0.3 + nilaiUAS * 0.3) * 10) / 10;
        status = nilaiAkhir >= 75 ? 'Tuntas KKM' : 'Remedial';
      }

      return {
        mapelId: p.mapelId,
        mapelNama: mpl?.nama || '',
        guruNama: guru?.nama || '',
        rataTugas,
        nilaiUTS,
        nilaiUAS,
        nilaiAkhir,
        status,
      };
    });

    // Recent assessments
    const penilaianTerbaru: any[] = [];
    const studentTasks = db.nilaiTugas.filter((nt) => nt.siswaId === student.id && nt.nilai !== null);
    for (const nt of studentTasks.slice(-3)) {
      const tg = db.tugas.find((t) => t.id === nt.tugasId);
      const mpl = tg ? db.mapel.find((m) => m.id === tg.mapelId) : undefined;
      penilaianTerbaru.push({
        judul: tg?.judul || 'Tugas',
        mapelNama: mpl?.nama || '',
        tanggal: tg?.tanggalDiberikan || '',
        nilai: nt.nilai,
        tipe: 'Tugas',
      });
    }

    const stats: DashboardStatsSiswa = {
      siswa: student,
      kelasNama: cls?.nama || '',
      persentaseKehadiran,
      totalHadir,
      totalIzin,
      totalSakit,
      totalAlpa,
      ringkasanNilai,
      penilaianTerbaru,
    };

    return res.json(stats);
  }
});

// -------------------------------------------------------------
// SYSTEM & DEMO
// -------------------------------------------------------------

apiRouter.post('/system/reset-demo', requireAuth, requireRole(['guru']), (req: Request, res: Response) => {
  dbInstance.resetDemo();
  return res.json({ message: 'Data demo SISTEM AKAMEDIK berhasil diatur ulang ke kondisi awal.' });
});
