import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    if (isIOSDevice) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      const isStandalone = window.navigator.standalone;
      if (!dismissed && !isStandalone) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  useEffect(() => {
    const handleResetPrompt = () => {
      localStorage.removeItem('pwa-prompt-dismissed');
      if (!isInstalled && (isIOS || deferredPrompt)) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa:reset-install-prompt', handleResetPrompt);
    return () => window.removeEventListener('pwa:reset-install-prompt', handleResetPrompt);
  }, [deferredPrompt, isIOS, isInstalled]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm mb-1">
                  Install Fiber Oracle
                </h3>
                <p className="text-xs text-blue-100 mb-3">
                  {isIOS
                    ? 'Tap Share → Add to Home Screen for quick access and improved offline support'
                    : 'Install the app for quick access and improved offline support'}
                </p>
                {!isIOS && deferredPrompt && (
                  <Button
                    size="sm"
                    onClick={handleInstall}
                    className="bg-white text-blue-600 hover:bg-blue-50 w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Install Now
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                aria-label="Dismiss install prompt"
                className="text-white hover:bg-white/20 flex-shrink-0 h-10 w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}