export const USER_STORAGE_KEY = 'lsoj_username';

/**
 * Lấy username hiện tại từ localStorage
 */
export function getStoredUsername(): string {
  if (typeof window === 'undefined') return '';
  return (localStorage.getItem(USER_STORAGE_KEY) || '').trim();
}

/**
 * Lưu username vào localStorage và phát event thông báo cho toàn hệ thống
 */
export function setStoredUsername(name: string): void {
  if (typeof window === 'undefined') return;
  const cleaned = name.trim();
  if (cleaned) {
    localStorage.setItem(USER_STORAGE_KEY, cleaned);
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent('lsoj_username_changed', { detail: cleaned }));
}

/**
 * Lắng nghe sự kiện thay đổi username giữa các component/tabs
 */
export function subscribeToUsername(callback: (username: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<string>;
    callback(customEvent.detail ?? getStoredUsername());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === USER_STORAGE_KEY) {
      callback(e.newValue ? e.newValue.trim() : '');
    }
  };

  window.addEventListener('lsoj_username_changed', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('lsoj_username_changed', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
