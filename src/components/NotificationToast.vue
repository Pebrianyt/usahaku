<template>
  <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1090;">
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
          <div class="fw-bold mb-1">{{ toast.title }}</div>
          <div>{{ toast.message }}</div>
          <small class="opacity-75 d-block mt-1">{{ toast.timestamp }}</small>
        </div>
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
import { toastState, removeToast } from '@/services/notification';

export default {
  name: 'NotificationToast',
  computed: {
    toastsList() {
      return toastState.items;
    }
  },
  methods: {
    handleRemove(id) {
      removeToast(id);
    }
  }
};
</script>
