import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-[#FFD23F] to-[#FFC61A] text-[#202736] rounded-xl p-4 shadow-2xl border-2 border-[#FFD23F]/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Install Demo Time Remote</h3>
            <p className="text-sm opacity-90 mb-3">
              Add to your home screen for quick access and offline support
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="bg-[#202736] text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#2a2f3e] transition-colors"
              >
                Install Now
              </button>
              <button
                onClick={handleDismiss}
                className="bg-transparent border border-[#202736]/30 text-[#202736] px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#202736]/10 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[#202736]/60 hover:text-[#202736] text-xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};