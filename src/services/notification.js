import { reactive } from 'vue';

/**
 * @typedef {Object} ToastItem
 * @property {number} id - Unique identifier untuk toast
 * @property {string} message - Pesan yang ditampilkan pada toast
 * @property {string} type - Tipe toast ('success', 'danger', 'info', 'warning')
 * @property {string} title - Judul toast
 * @property {string} timestamp - Waktu toast dibuat (format HH:MM)
 */

/**
 * Reactive state untuk menyimpan semua toast notification yang aktif.
 * @type {{
 *   items: ToastItem[]
 * }}
 */
export const toastState = reactive({
  items: []
});

let toastIdCounter = 0;

/**
 * Menampilkan toast notification dengan pesan dan tipe tertentu.
 * Toast akan otomatis hilang setelah 4 detik (auto-dismiss).
 *
 * @param {string} pesan - Isi pesan yang akan ditampilkan
 * @param {string} [tipe='success'] - Tipe toast: 'success', 'error', 'info', 'warning'
 * @param {string} [judul=''] - Judul opsional untuk toast
 * @returns {number} ID unik toast yang dibuat
 *
 * @example
 * // Tampilkan toast sukses
 * showToast('Data berhasil disimpan', 'success');
 *
 * @example
 * // Tampilkan toast error dengan judul kustom
 * showToast('Terjadi kesalahan saat menyimpan', 'error', 'Gagal');
 */
export function showToast(message, type = 'success', title = '') {
  const id = ++toastIdCounter;
  const newToast = {
    id,
    message,
    type: type === 'error' ? 'danger' : type, // Konversi 'error' ke 'danger' untuk konsistensi tipe
    title: title || (type === 'error' || type === 'danger' ? 'Terjadi Kesalahan' : 'Pemberitahuan'),
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  };
  toastState.items.push(newToast);

  // Auto-dismiss: hapus toast secara otomatis setelah 4 detik
  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

/**
 * Menghapus toast berdasarkan ID.
 * Fungsi ini memfilter array items untuk menghapus toast dengan ID yang cocok.
 *
 * @param {number} id - ID unik toast yang akan dihapus
 * @returns {void}
 *
 * @example
 * // Hapus toast dengan ID 1
 * removeToast(1);
 */
export function removeToast(id) {
  toastState.items = toastState.items.filter(t => t.id !== id);
}

// ============================================================================
// Modal Konfirmasi
// ============================================================================

/**
 * @typedef {Object} ConfirmModalOptions
 * @property {string} [title] - Judul modal konfirmasi
 * @property {string} [confirmText] - Teks tombol konfirmasi
 * @property {string} [cancelText] - Teks tombol batal
 * @property {string} [confirmVariant] - Variant tombol ('primary', 'danger', dll)
 */

/**
 * Reactive state untuk modal konfirmasi.
 * @type {{
 *   isOpen: boolean,
 *   title: string,
 *   message: string,
 *   confirmText: string,
 *   cancelText: string,
 *   confirmVariant: string,
 *   resolve: (value: boolean) => void | null,
 *   reject: (reason?: any) => void | null
 * }}
 */
export const confirmModalState = reactive({
  isOpen: false,
  title: 'Konfirmasi',
  message: '',
  confirmText: 'Hapus',
  cancelText: 'Batal',
  confirmVariant: 'danger',
  resolve: null,
  reject: null,
});

/**
 * Menampilkan modal konfirmasi dan mengembalikan Promise.
 * Promise resolve dengan `true` jika pengguna mengklik konfirmasi,
 * atau `false` jika pengguna membatalkan.
 *
 * @param {string} pesan - Pesan yang akan ditampilkan dalam modal
 * @param {ConfirmModalOptions} [options] - Opsi tambahan untuk kustomisasi modal
 * @returns {Promise<boolean>} Promise yang resolve true/false berdasarkan aksi pengguna
 *
 * @example
 * // Konfirmasi hapus data
 * const confirmed = await confirmAction('Apakah Anda yakin ingin menghapus data ini?');
 * if (confirmed) {
 *   // Logika hapus data
 * }
 *
 * @example
 * // Konfirmasi dengan opsi kustom
 * await confirmAction('Simpan perubahan?', {
 *   title: 'Simpan Data',
 *   confirmText: 'Simpan',
 *   cancelText: 'Batal',
 *   confirmVariant: 'primary'
 * });
 */
export function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    // Update state untuk menampilkan modal
    confirmModalState.isOpen = true;
    confirmModalState.title = options.title || 'Konfirmasi Tindakan';
    confirmModalState.message = message;
    confirmModalState.confirmText = options.confirmText || 'Ya, Lanjutkan';
    confirmModalState.cancelText = options.cancelText || 'Batal';
    confirmModalState.confirmVariant = options.confirmVariant || 'danger';

    // Simpan resolve function untuk dipanggil saat button diklik
    // Pattern ini memungkinkan Promise pending sampai pengguna merespons
    confirmModalState.resolve = () => {
      confirmModalState.isOpen = false;
      resolve(true);
    };
    confirmModalState.reject = () => {
      confirmModalState.isOpen = false;
      resolve(false);
    };
  });
}