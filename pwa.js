(() => {
  const PWA = {
    registration: null,
    isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    },
    supportsNotifications() {
      return 'Notification' in window && 'serviceWorker' in navigator;
    },
    async requestNotificationPermission() {
      if (!this.supportsNotifications()) return 'unsupported';
      return Notification.requestPermission();
    },
    async setBadge(count) {
      if (!('setAppBadge' in navigator)) return false;
      const value = Number(count);
      if (!Number.isFinite(value) || value <= 0) {
        await navigator.clearAppBadge?.();
      } else {
        await navigator.setAppBadge(Math.floor(value));
      }
      return true;
    },
    async clearBadge() {
      if (!('clearAppBadge' in navigator)) return false;
      await navigator.clearAppBadge();
      return true;
    },
    async subscribeToPush(applicationServerKey) {
      if (!applicationServerKey || !this.registration || !this.supportsNotifications()) return null;
      if (Notification.permission !== 'granted') return null;

      const existing = await this.registration.pushManager.getSubscription();
      if (existing) return existing;

      return this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
      });
    }
  };

  window.LumiPWA = PWA;

  addLink('manifest', '/manifest.webmanifest');
  addMeta('theme-color', '#b9858f');
  addMeta('mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-capable', 'yes');
  addMeta('apple-mobile-web-app-status-bar-style', 'default');
  addMeta('apple-mobile-web-app-title', 'Lumi Nails');
  addMeta('format-detection', 'telephone=yes');

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', async () => {
      try {
        PWA.registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (error) {
        console.warn('Lumi PWA service worker registration failed:', error);
      }
    }, { once: true });
  }

  function addLink(rel, href) {
    if (document.head.querySelector(`link[rel="${rel}"]`)) return;
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  }

  function addMeta(name, content) {
    let meta = document.head.querySelector(`meta[name="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }
})();
