<template>
  <!-- Container untuk toast notifications, diposisikan di pojok kanan bawah -->
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1090;">
    <!-- Looping untuk menampilkan setiap toast dari daftar -->
    <div
      v-for="toast in toastsList"
      :key="toast.id"
      class="toast show align-items-center border-0 shadow-lg mb-2"
      :class="`text-bg-${toast.type}`"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div class="d-flex">
        <div class="toast-body">
          <!-- Judul toast dengan bold -->
          <div class="fw-bold mb-1">{{ toast.title }}</div>
          <!-- Pesan utama toast -->
          <div>{{ toast.message }}</div>
          <!-- Timestamp informasi -->
          <small class="opacity-75 d-block mt-1">{{ toast.timestamp }}</small>
        </div>
        <!-- Tombol untuk menutup toast secara manual -->
        <button
          type="button"
          class="btn-close btn-close-white me-2 m-auto"
          aria-label="Tutup"
          @click="handleRemove(toast.id)"
        ></button>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Komponen NotificationToast
 * Menampilkan notifikasi toast dengan sistem auto-dismiss.
 * Mengambil data dari notification service secara reactive.
 */
import { toastState, removeToast } from '@/services/notification';

export default {
  name: 'NotificationToast',
  computed: {
    /**
     * Mengambil daftar toast dari notification service.
     * @returns {Array} Array berisi objek toast yang akan ditampilkan
     */
    toastsList() {
      return toastState.items;
    }
  },
  methods: {
    /**
     * Menghapus toast dari daftar berdasarkan ID.
     * @param {string|number} id - ID unik toast yang akan dihapus
     */
    handleRemove(id) {
      removeToast(id);
    }
  }
};
</script>