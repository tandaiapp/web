# Tandai — System Interface Edition

Daily quest / habit tracker bergaya **Solo Leveling**, hasil redesign total dari aplikasi Tandai sebelumnya. Terinspirasi tampilan "System" ala Shadow Monarch: panel biru neon dengan sudut bracket, font Rajdhani/Exo 2/JetBrains Mono, dan seluruh mekanik habit-tracking dibungkus sebagai **Quest**.

## Fitur

- **Sistem Quest & Rank** — setiap task adalah "Quest" dengan rank E/D/C/B/A/S, masing-masing punya warna & efek glow sendiri.
- **EXP & Level** — menyelesaikan quest menambah EXP (dihitung dari streak × rank), naik level otomatis sampai Lv. 100.
- **Player card "Shadow Monarch"** — menampilkan level, EXP, dan progress bar kemajuan harian.
- **Quest Log mingguan** — grid 7 hari per quest, bisa navigasi minggu sebelumnya, klik sel untuk toggle selesai di hari itu.
- **Statistik** — Quests Clear (hari ini), Best Streak, Weekly Rate.
- **Rank legend & ringkasan penyelesaian mingguan** dengan bar glow emas saat 100%.
- **Pesan motivasi sistem** yang berubah sesuai progress harian.
- **Dwibahasa (ID/EN)** — toggle bahasa di layar login maupun dashboard.
- **Login & registrasi Hunter** (auth) tetap terhubung ke backend Google Apps Script yang sama.
- **Notifikasi pengingat** (pagi/sore) & **efek confetti** saat semua quest harian selesai.
- **PWA** — bisa di-install ke home screen (manifest + ikon).

## Menjalankan

Buka `index.html` langsung di browser, atau deploy sebagai static site (GitHub Pages, Netlify, Vercel, dll). Backend API (login/signup/simpan quest) memakai endpoint Google Apps Script yang dikonfigurasi di `script.js` (`API_URL`).

## Struktur

```
index.html    → markup seluruh layar (auth + dashboard + panel notifikasi)
style.css     → tema "System" (dark, neon blue, glow, corner brackets)
script.js     → logic: auth, quest CRUD, EXP/level, quest log grid, notifikasi, confetti, i18n
manifest.json → konfigurasi PWA
icon-192.png / icon-512.png → ikon aplikasi
```
