import React, { useState } from 'react';
import { Download, Monitor, Smartphone, HelpCircle } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import sounds from '../utils/audio';

export const PWAInstallButton: React.FC<{ theme: any }> = ({ theme }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    sounds.playClick();
    const success = await install();
    if (success) {
      sounds.playSuccess();
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 rounded-lg border ${theme.border} px-4 py-2 text-xs font-semibold uppercase hover:bg-zinc-800/50 hover:border-zinc-500 transition-all ${theme.text}`}
      >
        <Download className="w-4 h-4 text-emerald-400" />
        Install PWA App
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => {
            sounds.playClick();
            setShowIOSGuide(true);
          }}
          className={`flex items-center gap-2 rounded-lg border ${theme.border} px-4 py-2 text-xs font-semibold uppercase hover:bg-zinc-800/50 hover:border-zinc-500 transition-all ${theme.text}`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          Install on iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`w-full max-w-sm rounded-xl border ${theme.border} ${theme.cardBg} p-6 shadow-2xl`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className={`text-sm font-bold uppercase tracking-wider ${theme.text}`}>Install on iPhone / iPad</h3>
                <button 
                  onClick={() => { sounds.playClick(); setShowIOSGuide(false); }}
                  className="text-zinc-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className={`text-xs leading-relaxed mb-6 ${theme.textMuted}`}>
                Safari on iOS does not support one-tap installs. You can easily install it manually:
              </p>
              <div className={`space-y-4 rounded-lg bg-black/40 p-4 border ${theme.border} text-xs ${theme.textMuted}`}>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold">1</div>
                  <p>Tap the <strong className="text-zinc-200">Share</strong> icon at the bottom of the Safari screen.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold">2</div>
                  <p>Scroll down the share sheet options and tap <strong className="text-zinc-200">Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold">3</div>
                  <p>Tap <strong className="text-zinc-200">Add</strong> in the top-right corner to place it on your home screen.</p>
                </div>
              </div>
              <button
                onClick={() => { sounds.playClick(); setShowIOSGuide(false); }}
                className="mt-6 w-full rounded-lg bg-zinc-800 py-2.5 text-xs font-bold uppercase hover:bg-zinc-700 text-zinc-200 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // If already desktop or another browser and not deferrable, offer generic instructions if they are curious
  return null;
};
