/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldAlert, 
  Play, 
  Tv, 
  Timer,
  CheckCircle,
  Award
} from 'lucide-react';
import sounds from '../utils/audio';

interface AdMobSimulatorProps {
  isOpen: boolean;
  adType: 'rewarded_skip' | 'rewarded_resume' | 'interstitial_rematch' | 'rewarded_advance_resume';
  onAdCompleted: () => void;
  onAdCancelled: () => void;
}

export const AdMobSimulator: React.FC<AdMobSimulatorProps> = ({
  isOpen,
  adType,
  onAdCompleted,
  onAdCancelled
}) => {
  if (!isOpen) return null;

  const [timeLeft, setTimeLeft] = useState<number>(6); // Fast 6 seconds simulation for smooth gameplay testing
  const [muted, setMuted] = useState<boolean>(false);
  const [adStage, setAdStage] = useState<'playing' | 'completed'>('playing');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    sounds.playClick();
    setTimeLeft(6);
    setAdStage('playing');

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setAdStage('completed');
          sounds.playSuccess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [adType]);

  const handleClaimReward = () => {
    sounds.playSuccess();
    onAdCompleted();
  };

  const adTitles = {
    rewarded_skip: 'Watch Ad for +1 Skip 🎫',
    rewarded_resume: 'Watch Ad to Revive Game 💖',
    rewarded_advance_resume: 'Watch Ad to Revive Advance Game 🔮',
    interstitial_rematch: 'Loading Rematch Interstitial Ad ⚔️'
  };

  const adDescriptions = {
    rewarded_skip: 'Get an extra skip immediately without losing your score combo!',
    rewarded_resume: 'Resume your current run from where you failed with 3 fresh lives!',
    rewarded_advance_resume: 'Resume your current advance run with 3 fresh lives!',
    interstitial_rematch: 'Ad is playing. Your online rematch starts immediately after.'
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-6 animate-fadeIn select-none">
      
      {/* BACKGROUND GRAPHIC DECORATIONS */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:20px_28px]" />

      <div className="max-w-sm w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl relative overflow-hidden flex flex-col text-white">
        
        {/* GOOGLE ADMOB TOP MARKER BAR */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-zinc-900 mb-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="bg-yellow-500 text-black text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
              AdMob Ad
            </span>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">
              Google Ads Partner
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(!muted)}
              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Skip / Close early button */}
            {adStage === 'playing' ? (
              <button
                onClick={onAdCancelled}
                className="text-[9px] text-zinc-500 hover:text-white font-bold bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded flex items-center gap-1"
                title="Cancel Ad"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            ) : null}
          </div>
        </div>

        {/* AD STAGE VIEW */}
        {adStage === 'playing' ? (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center shrink-0">
            
            <div className="relative w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 flex items-center justify-center text-cyan-400 mb-6 animate-spin">
              <Tv className="w-10 h-10 -rotate-12 animate-pulse text-cyan-400" />
            </div>

            <div className="px-2">
              <h3 className="text-sm font-black tracking-wider uppercase text-zinc-200">
                {adTitles[adType]}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-2 max-w-[240px] leading-relaxed mx-auto">
                {adDescriptions[adType]}
              </p>
            </div>

            {/* PROGRESS BAR TIMERS */}
            <div className="w-full max-w-[200px] mt-6">
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden w-full relative">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-1000 ease-linear rounded-full" 
                  style={{ width: `${(6 - timeLeft) * 16.6}%` }} 
                />
              </div>
              <p className="text-[9px] text-cyan-400 font-mono font-bold mt-2.5 tracking-wider uppercase flex items-center justify-center gap-1">
                <Timer className="w-3.5 h-3.5" /> Reward in 00:0{timeLeft}s...
              </p>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center animate-fadeIn shrink-0">
            
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-5 animate-bounce">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div className="px-2 mb-6">
              <h3 className="text-sm font-black tracking-wider uppercase text-emerald-400 leading-none">
                Ad Completed!
              </h3>
              <p className="text-[10px] text-zinc-400 mt-2.5 max-w-[230px] leading-relaxed mx-auto">
                Thank you for watching the sponsor video. Tap below to claim your reward!
              </p>
            </div>

            <button
              onClick={handleClaimReward}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all border border-emerald-400/20"
            >
              <Award className="w-4 h-4 text-emerald-200" /> Claim Reward
            </button>

          </div>
        )}

        {/* BOTTOM AD SPONSOR LABEL */}
        <div className="text-center pt-2 border-t border-zinc-900 mt-4 text-[7px] text-zinc-600 uppercase tracking-widest font-bold">
          Sponsored Ad Service provided by Google AdMob SDK
        </div>

      </div>
    </div>
  );
};
