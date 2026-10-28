# Spaniel Grooming — Admin

Next.js (App Router) + Supabase. Role: `owner`, `admin`, `normal`.

## Menjalankan
```bash
cp .env.example .env.local   # isi URL & publishable key project Supabase `spaniel-grooming`
npm install
npm run dev
```

## Database
Skema ada di `supabase/migrations/` (tabel, RLS, fungsi; tanpa data). Untuk project Supabase baru, jalankan berurutan lewat `supabase db push` atau SQL Editor. Satu-satunya baris data adalah konfigurasi `fuel_rate` (tarif bensin per trip). User pertama yang dibuat otomatis menjadi owner.

## Alamat
- `/` — landing page publik (tanpa login). Harga & area dibaca lewat fungsi database `landing_data()`; nomor WhatsApp di `src/app/page.tsx`.
- `/back-office` — panel admin (login di `/back-office/login`).

## Pengguna pertama
Buat user di Supabase → Authentication → Add user. **User pertama otomatis `owner`**; berikutnya `normal` dan diubah di menu Pengguna.

## Impor data Excel
Tambahkan `IMPORT_EMAIL` & `IMPORT_PASSWORD` (akun owner) ke `.env.local`, lalu:
```bash
node scripts/import-excel.mjs "path/Spaniel_Grooming_2026.xlsx" --dry   # cek total
node --env-file=.env.local scripts/import-excel.mjs "path/Spaniel_Grooming_2026.xlsx"
```
Hapus kredensial impor dari `.env.local` setelah selesai.

## Deploy
Push ke GitHub, lalu hubungkan ke Vercel dengan env `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
