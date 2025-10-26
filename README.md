# Sticky Notes PWA

Aplikasi catatan sticky modern, responsif, PWA-ready. Semua orang bisa menambahkan catatan. Hapus/edit hanya oleh admin.

## Fitur
- Publik: buat catatan (konten + warna).
- Admin: login dengan password (ENV), hapus dan edit catatan.
- UI/UX modern (Tailwind), responsif, profesional.
- PWA: installable di Chrome (manifest + service worker).
- Backend: Express + Netlify Functions + Hosted libSQL (Turso/@libsql/client).
- Proteksi: rate limit untuk mencegah spam.

## Menjalankan secara lokal
1. Node.js 18+ direkomendasikan.
2. Install dependencies:
   ```
   npm install
   ```
3. Siapkan env:
   - Salin `.env.example` ke `.env` dan isi:
     ```
     PORT=3000
     ADMIN_PASSWORD=ubah_password_admin_yang_kuat
     JWT_SECRET=ganti_dengan_secret_minimal_32_karakter
     LIBSQL_URL=libsql://your-db.turso.io
     LIBSQL_AUTH=your_turso_auth_token
     ```
4. Jalankan:
   ```
   npm run dev
   ```
   Akses: http://localhost:3000

## Deploy ke Netlify (Opsi 2)
- Struktur:
  - Frontend statis di folder `public` (PWA: manifest + service worker)
  - API via Netlify Functions di `netlify/functions/api.mjs`
  - Routing API diatur oleh `netlify.toml` (redirect `/api/*` → `/.netlify/functions/api`)
- Langkah:
  1. Push kode ini ke branch default.
  2. Hubungkan repo ke Netlify → New site from Git → pilih repo ini.
  3. Build command: (kosongkan) — ini site statis; Publish directory: `public`.
  4. Tambahkan Environment Variables (Site settings → Environment variables):
     - `ADMIN_PASSWORD`
     - `JWT_SECRET`
     - `LIBSQL_URL`
     - `LIBSQL_AUTH`
  5. Deploy. Akses site Anda, semua endpoint API tersedia pada path relatif `/api/...` (same-origin).

### Menyiapkan Turso (libSQL)
- Install CLI: https://docs.turso.tech/cli/install
- Buat database:
  ```sh
  turso db create sticky-notes
  turso db show sticky-notes # dapatkan URL
  turso db tokens create sticky-notes # dapatkan AUTH token
  ```
- Set ke Netlify env: `LIBSQL_URL` dan `LIBSQL_AUTH`.

## Struktur Endpoint
- GET `/api/notes` — daftar catatan.
- POST `/api/notes` — buat catatan (public).
- POST `/api/admin/login` — login admin, body: `{ "password": "..." }`.
- PUT `/api/notes/:id` — edit catatan (admin).
- DELETE `/api/notes/:id` — hapus catatan (admin).

## PWA Icons
- Ganti placeholder `public/icons/icon-192.png` dan `public/icons/icon-512.png` dengan ikon PNG brand Anda.

## Catatan Keamanan
- Endpoint POST `/api/notes` terbuka.
- Pertimbangkan rate limit lebih ketat/captcha jika dibutuhkan.
- Tambah moderasi/pendeteksian spam jika aplikasi dibuka untuk publik luas.

## Lisensi
MIT
