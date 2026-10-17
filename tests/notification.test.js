import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('notification and confirmation service', () => {
  let notification;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    notification = await import('../src/services/notification.js');
    notification.toastState.items = [];
  });

  afterEach(() => vi.useRealTimers());

  it('normalizes error toast presentation and dismisses it after four seconds', () => {
    notification.showToast('Simpan gagal', 'error');
    expect(notification.toastState.items).toHaveLength(1);
    expect(notification.toastState.items[0]).toMatchObject({ message: 'Simpan gagal', type: 'danger', title: 'Terjadi Kesalahan' });

    vi.advanceTimersByTime(3999);
    expect(notification.toastState.items).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(notification.toastState.items).toHaveLength(0);
  });

  it('removes only the requested toast', () => {
    notification.showToast('Satu');
    notification.showToast('Dua');
    const secondId = notification.toastState.items[1].id;

    notification.removeToast(secondId);

    expect(notification.toastState.items.map(item => item.message)).toEqual(['Satu']);
  });

  it.each([
    ['confirm', true],
    ['reject', false]
  ])('resolves the confirmation promise as %s', async (action, expected) => {
    const result = notification.confirmAction('Lanjut?', {
      title: 'Hapus data', confirmText: 'Hapus', cancelText: 'Tetap', confirmVariant: 'danger'
    });

    expect(notification.confirmModalState).toMatchObject({
      isOpen: true, title: 'Hapus data', message: 'Lanjut?', confirmText: 'Hapus', cancelText: 'Tetap', confirmVariant: 'danger'
    });
    notification.confirmModalState[action === 'confirm' ? 'resolve' : 'reject']();

    await expect(result).resolves.toBe(expected);
    expect(notification.confirmModalState.isOpen).toBe(false);
  });

  it('applies safe defaults when confirmation options are omitted', () => {
    notification.confirmAction('Yakin?');
    expect(notification.confirmModalState).toMatchObject({
      title: 'Konfirmasi Tindakan', confirmText: 'Ya, Lanjutkan', cancelText: 'Batal', confirmVariant: 'danger'
    });
    notification.confirmModalState.reject();
  });
});
