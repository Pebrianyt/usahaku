# Supabase RPC di aplikasi

Pemanggilan RPC yang ditemukan di source aplikasi:

| RPC | Pemanggilan dan parameter dari frontend | Status pada hasil inspeksi |
| --- | --- | --- |
| `simpan_pesanan_fifo` | `p_no_pesanan`, `p_tanggal`, `p_total_penghasilan_akhir`, `p_items` (`{ kode_produk, qty }[]`) | **Ada.** Signature `text, date, numeric, jsonb`; validasi stok lalu panggil rebuild FIFO. |
| `edit_pesanan_fifo` | `p_no_pesanan_lama`, `p_no_pesanan_baru`, `p_tanggal`, `p_total_penghasilan_akhir`, `p_items` | **Belum ada; SQL disiapkan** di [`edit_pesanan_fifo.sql`](./edit_pesanan_fifo.sql). |
| `hapus_grup_pesanan_fifo` | `p_no_pesanan` | **Belum ada pada hasil inspeksi; SQL disiapkan** di [`hapus_grup_pesanan_fifo.sql`](./hapus_grup_pesanan_fifo.sql). |
| `simpan_stok_masuk_fifo` | `p_tanggal`, `p_kode_produk`, `p_qty`, `p_harga_satuan`, `p_sumber`, `p_keterangan` (`null`) | **Ada.** Signature `date, bigint, integer, numeric, text, text`. |
| `ubah_stok_masuk_fifo` | `p_transaksi_id`, `p_tanggal`, `p_kode_produk`, `p_qty`, `p_harga_satuan`, `p_sumber` | **Ada.** Signature `bigint, date, bigint, integer, numeric, text`. |
| `hapus_stok_masuk_fifo` | `p_transaksi_id` | **Ada.** Signature `bigint`. |

Nama fungsi dan nama argumen di tabel diambil langsung dari source. Tipe SQL di bawah masih perlu dicocokkan dengan definisi aktual, khususnya tipe `id` dan bentuk argumen `p_items`.

## Catatan sebelum menjalankan SQL edit

SQL edit menggunakan signature `simpan_pesanan_fifo` yang telah dikonfirmasi, menghapus baris pesanan lama dengan FK cascade, lalu memanggil helper `rebuild_alokasi_stok_fifo` untuk semua produk lama dan baru. RPC hapus tersedia sebagai skrip tersendiri dan juga memakai FK cascade serta helper rebuild yang sama. `rebuild_alokasi_stok_fifo(bigint)` dipanggil oleh RPC simpan, edit, dan hapus.
