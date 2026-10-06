<template>
  <div
    v-if="modalState.isOpen"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    style="background: rgba(0,0,0,0.45); z-index: 1080;"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content shadow border-0" style="border-radius: var(--r, 14px);">
        <div class="modal-header border-bottom-0 pb-0">
          <h5 class="modal-title fw-bold fs-6">{{ modalState.title }}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Batal"
            @click="modalState.reject"
          ></button>
        </div>
        <div class="modal-body py-3">
          <p class="mb-0 text-secondary" style="font-size: 14.5px; line-height: 1.5;">
            {{ modalState.message }}
          </p>
        </div>
        <div class="modal-footer border-top-0 pt-0">
          <button
            type="button"
            class="btn btn-sm btn-light border px-3"
            style="border-radius: 8px;"
            @click="modalState.reject"
          >
            {{ modalState.cancelText }}
          </button>
          <button
            type="button"
            class="btn btn-sm px-3"
            :class="`btn-${modalState.confirmVariant}`"
            style="border-radius: 8px;"
            @click="modalState.resolve"
          >
            {{ modalState.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { confirmModalState } from '@/services/notification';

export default {
  name: 'ConfirmModal',
  computed: {
    modalState() {
      return confirmModalState;
    }
  }
};
</script>
