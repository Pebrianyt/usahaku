# UsahaKu

UsahaKu adalah aplikasi web sederhana untuk membantu mengelola data usaha, mulai dari produk dan harga, persediaan, pesanan, hingga ringkasan keuangan. Aplikasi dibuat dengan HTML, CSS, dan JavaScript, serta menggunakan Supabase untuk menyimpan data.

## Fitur

- **Dashboard** — ringkasan informasi usaha.
- **Master Data** — mengelola produk dan harga.
- **Persediaan** — melihat dan mengelola stok.
- **Daftar Pesanan** — mengelola pesanan.
- **Arus Kas** — mencatat pemasukan dan pengeluaran.
- **Laba Rugi** — melihat ringkasan laba dan rugi.

## Struktur proyek

```text
usahaku/
├── index.html                 # Halaman Dashboard dan halaman awal aplikasi
├── master_data.html            # Halaman Master Data
├── persediaan.html             # Halaman Persediaan
├── daftar_pesanan.html         # Halaman Daftar Pesanan
├── arus_kas.html               # Halaman Arus Kas
├── laba_rugi.html              # Halaman Laba Rugi
├── css/
│   └── style.css               # Gaya bersama seluruh halaman
└── js/
    ├── supabase_client.js      # Konfigurasi koneksi Supabase bersama
    ├── currency_input.js       # Bantuan format input mata uang
    ├── dashboard.js            # Logika halaman Dashboard
    ├── master_data.js          # Logika halaman Master Data
    ├── persedian.js            # Logika halaman Persediaan
    ├── daftar_pesanan.js       # Logika halaman Daftar Pesanan
    ├── arus_kas.js             # Logika halaman Arus Kas
    └── laba_rugi.js            # Logika halaman Laba Rugi
```

> Nama file `persedian.js` mengikuti nama file yang saat ini dipakai di proyek.

## Persiapan

1. Pasang **Visual Studio Code**.
2. Pasang ekstensi **Live Server** di Visual Studio Code.
3. Pastikan komputer terhubung ke internet. Aplikasi memuat Supabase JS dan jsPDF dari CDN.
4. Pastikan proyek Supabase yang dipakai masih aktif dan kebijakan akses datanya sudah dikonfigurasi dengan aman.

## Menjalankan aplikasi di komputer

1. Unduh atau clone repository ini, lalu buka folder `usahaku` di Visual Studio Code.
2. Di panel Explorer, klik kanan `index.html`.
3. Pilih **Open with Live Server**.
4. Aplikasi akan terbuka di browser. Gunakan menu navigasi untuk membuka halaman lainnya.

Jangan membuka file HTML dengan cara klik dua kali (`file://`). Jalankan melalui server lokal seperti Live Server agar halaman bekerja dengan benar.

## Koneksi Supabase dan keamanan

Pengaturan koneksi bersama berada di `js/supabase_client.js`. Aplikasi browser menggunakan **anon/publishable key** Supabase; key tersebut memang dapat terlihat oleh pengguna aplikasi. Keamanan data harus diatur melalui **Row Level Security (RLS)** dan kebijakan akses yang sesuai pada tabel Supabase.

Jangan pernah memasukkan `service_role` key, kata sandi database, atau rahasia server ke file HTML/JavaScript yang dikirim ke browser atau ke repository. Sebelum membagikan aplikasi, pemilik proyek perlu memastikan RLS aktif dan akses setiap tabel hanya mengizinkan tindakan yang memang diperlukan.

Teman kelompok yang menjalankan aplikasi juga perlu memiliki akses internet dan menggunakan konfigurasi Supabase yang sama. Jangan mengirimkan kredensial pribadi melalui repository.

## Bekerja bersama melalui GitHub

1. Pemilik repository mengundang anggota kelompok sebagai collaborator melalui pengaturan akses repository GitHub.
2. Setiap anggota menerima dan menyetujui undangan tersebut.
3. Anggota clone repository ke komputernya, lalu membuka folder proyek di Visual Studio Code.
4. Jalankan `index.html` dengan Live Server.
5. Sebelum mengirim perubahan, ambil perubahan terbaru dari repository dan periksa perubahan lokal agar pekerjaan anggota tidak saling menimpa.

Repository GitHub berisi kode sumber. Agar aplikasi dapat dibuka sebagai situs melalui sebuah URL, proyek perlu dipublikasikan menggunakan hosting web yang sesuai; mengundang collaborator saja tidak membuat situs otomatis terbit.
