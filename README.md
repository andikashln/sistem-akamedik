# SISTEM AKAMEDIK

Aplikasi monitoring akademik SMP Negeri 1 Pangkalan Kerinci. Guru mengelola absensi, tugas, nilai UTS/UAS, dan rekap; siswa melihat perkembangan akademiknya sendiri.

Frontend dan backend berjalan sebagai dua proses terpisah. Keduanya dikelola dengan npm workspaces dan berbagi definisi tipe melalui `shared`.

## Pelajari sistem

Baca [panduan alur dan arsitektur](docs/ARSITEKTUR.md) untuk memahami fitur, aliran data, endpoint API, dan batasan sistem saat ini.

```text
sistem-akamedik/
├── frontend/          React, komponen tampilan, dan klien API
│   ├── src/
│   ├── .env.example
│   └── vite.config.ts
├── backend/           Express, autentikasi, aturan akademik, dan penyimpanan
│   ├── src/
│   ├── test/          Pengujian integrasi API dengan database sementara
│   ├── data/          Dibuat otomatis saat backend pertama kali dijalankan
│   └── .env.example
├── shared/            Tipe data bersama, tanpa kode server atau UI
├── docs/
└── package.json       Perintah untuk mengelola kedua aplikasi
```

## Jalankan untuk pengembangan

Prasyarat: Node.js versi 22.12 atau lebih baru; proyek ini diuji dengan Node.js 24.19.0.

Jalankan dari folder utama:

```powershell
npm.cmd install
npm.cmd run dev
```

Pada PowerShell komputer ini, gunakan `npm.cmd` karena eksekusi `npm.ps1` dibatasi. Pada terminal lain, perintah `npm` biasa juga dapat digunakan.

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api
- Pemeriksaan API: http://localhost:3001/api/health
- Hentikan kedua proses dengan `Ctrl+C` di terminal yang menjalankan `dev`.

Konfigurasi bawaan langsung berfungsi tanpa API key. Jika perlu mengubah port, origin, atau lokasi data, salin contoh konfigurasi berikut (cukup sekali jika `.env` belum tersedia):

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

Untuk menjalankan masing-masing bagian, gunakan dua terminal:

```powershell
# Terminal 1
npm.cmd run dev:backend

# Terminal 2
npm.cmd run dev:frontend
```

Perintah `npm.cmd run dev` juga bisa dijalankan langsung dari folder `frontend` atau `backend` setelah instalasi workspace dari folder utama.

## Akun demo

| Peran | NIP / NIS | Password |
| --- | --- | --- |
| Guru (Nurhayati) | `197405121998022001` | `Guru123!` |
| Guru (Budi Santoso) | `198203152006041008` | `Guru123!` |
| Guru (Rina Marlina) | `198809222011012015` | `Guru123!` |
| Siswa (Ahmad Rizky) | `2407001` | `Siswa123!` |

Database demo dibuat otomatis pada peluncuran pertama. Perubahan disimpan ke `backend/data/academic_db.json`. Restart backend mengakhiri sesi login yang tersimpan di memori; data akademik tetap tersimpan. Tombol **Reset Data** tersedia untuk guru dan mengembalikan seluruh data demo, termasuk password, ke kondisi awal.

## Konfigurasi koneksi

| File | Variabel | Kegunaan |
| --- | --- | --- |
| `frontend/.env` | `VITE_API_URL=/api` | Alamat dasar API yang dipakai browser |
| `frontend/.env` | `API_PROXY_TARGET=http://127.0.0.1:3001` | Tujuan proxy `/api` pada Vite dev/preview |
| `backend/.env` | `HOST=127.0.0.1` | Alamat jaringan tempat API mendengarkan |
| `backend/.env` | `PORT=3001` | Port backend |
| `backend/.env` | `FRONTEND_ORIGIN` | Origin frontend yang diizinkan CORS, dipisahkan koma |
| `backend/.env` | `DATA_DIR=./data` | Direktori database, relatif terhadap folder backend |

Jika port backend berubah, sesuaikan `API_PROXY_TARGET`. Jika frontend dihosting pada domain lain, isi `VITE_API_URL=https://domain-backend/api`, tambahkan origin frontend pada `FRONTEND_ORIGIN`, lalu build ulang frontend. Variabel `VITE_*` disertakan dalam hasil build dan tidak boleh berisi rahasia. Restart server setelah mengubah `.env`.

## Periksa dan build

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build

# Atau ketiganya sekaligus
npm.cmd run check

# Jalankan backend hasil build + preview frontend secara lokal
npm.cmd start
```

Hentikan `dev` sebelum menjalankan `start` karena keduanya memakai port yang sama. Hasil build berada di `frontend/dist`, `backend/dist`, dan deklarasi tipe di `shared/dist`. `npm start` dipakai untuk pemeriksaan build lokal; Vite preview bukan layanan hosting produksi.

Untuk deployment, gunakan hosting file statis bagi `frontend/dist` dan layanan Node terpisah bagi backend (`npm run start:backend` dari root atau `npm start` dari folder backend). Reverse proxy produksi harus meneruskan `/api` ke backend jika frontend tetap memakai URL relatif `/api`; alternatifnya atur URL API absolut sebelum build. Instal dependensi workspace di lingkungan tujuan.

## Data dan batasan

- Tidak membutuhkan MySQL/PostgreSQL: penyimpanan saat ini berupa satu file JSON untuk satu proses backend.
- Backup database sebelum menggunakan **Reset Data**. Jika mempunyai data versi lama di `data/academic_db.json` pada root, hentikan server lalu salin ke `backend/data/academic_db.json` sebelum menjalankan versi ini, atau arahkan `DATA_DIR` ke lokasi lama.
- Database yang rusak ditolak saat startup dan tidak ditimpa data demo secara otomatis.
- Notifikasi WhatsApp masih simulasi status pengiriman dengan tautan pesan manual; belum ada integrasi gateway pengiriman nyata.
- Hasil telaah dan batasan logika lama lainnya dijelaskan di [ARSITEKTUR.md](docs/ARSITEKTUR.md).

Referensi konfigurasi: [npm workspaces](https://docs.npmjs.com/cli/v11/using-npm/workspaces/), [proxy Vite](https://vite.dev/config/server-options#server-proxy), dan [environment Vite](https://vite.dev/guide/env-and-mode).
