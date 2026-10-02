import { reactive } from 'vue';

// Toasts state
export const toastState = reactive({
  items: []
});

let toastIdCounter = 0;

export function showToast(message, type = 'success', title = '') {
  const id = ++toastIdCounter;
  const newToast = {
    id,
    message,
    type: type === 'error' ? 'danger' : type, // 'success', 'danger', 'info', 'warning'
    title: title || (type === 'error' || type === 'danger' ? 'Terjadi Kesalahan' : 'Pemberitahuan'),
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  };
  toastState.items.push(newToast);

  // Auto remove toast after 4 seconds
  setTimeout(() => {
    removeToast(id);
  }, 4000);
}

export function removeToast(id) {
  toastState.items = toastState.items.filter(t => t.id !== id);
}

// Modal confirmation state
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

export function confirmAction(message, options = {}) {
  return new Promise((resolve) => {
    confirmModalState.isOpen = true;
    confirmModalState.title = options.title || 'Konfirmasi Tindakan';
    confirmModalState.message = message;
    confirmModalState.confirmText = options.confirmText || 'Ya, Lanjutkan';
    confirmModalState.cancelText = options.cancelText || 'Batal';
    confirmModalState.confirmVariant = options.confirmVariant || 'danger';
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
