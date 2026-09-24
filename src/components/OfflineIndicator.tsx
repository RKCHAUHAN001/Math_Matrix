import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:right-auto md:max-w-xs z-50 flex items-center gap-3 rounded-lg border border-amber-900 bg-black/90 p-3 shadow-2xl backdrop-blur-md animate-pulse">
      <div className="p-2 bg-amber-500/10 rounded-md border border-amber-500/30">
        <WifiOff className="w-4 h-4 text-amber-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">Offline Mode Active</p>
        <p className="text-[10px] text-zinc-400 truncate">Saves are cached and synced on reconnect</p>
      </div>
    </div>
  );
};
