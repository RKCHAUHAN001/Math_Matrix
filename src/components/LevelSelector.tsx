/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ChevronLeft, Lock } from 'lucide-react';
import { LEVELS, LevelConfig } from '../utils/levels';
import sounds from '../utils/audio';

interface LevelSelectorProps {
  theme: any;
  onClose: () => void;
  onSelectLevel: (levelNum: number) => void;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({ theme, onClose, onSelectLevel }) => {
  const [highestUnlocked, setHighestUnlocked] = useState<number>(1);

  useEffect(() => {
    const saved = localStorage.getItem('math_matrix_highest_unlocked_level');
    if (saved) {
      setHighestUnlocked(parseInt(saved, 10));
    } else {
      localStorage.setItem('math_matrix_highest_unlocked_level', '1');
    }
  }, []);

  const handleLevelClick = (level: LevelConfig) => {
    if (level.number > highestUnlocked) {
      sounds.playFailure();
      return;
    }
    sounds.playClick();
    onSelectLevel(level.number);
  };

  return (
    <div className="w-full flex flex-col h-full select-none text-white animate-fadeIn pb-2 justify-between">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between w-full mb-4 shrink-0 relative z-30">
        <button 
          onClick={() => { sounds.playClick(); onClose(); }}
          className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all shadow-md shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-300" />
        </button>

        <div className="text-center flex-1 mx-2">
          <h2 className="text-base font-black tracking-[0.2em] text-white leading-none uppercase">
            Levels Selector
          </h2>
          <p className="text-[7px] text-zinc-500 uppercase tracking-[0.15em] mt-1">
            Complete stages to progress
          </p>
        </div>

        <div className="w-9 h-9 shrink-0 opacity-0" />
      </div>

      {/* COMPACT 10x10 SINGLE PAGE GRID CONTAINER */}
      <div className="flex-1 flex items-center justify-center py-2 shrink-0">
        <div className="grid grid-cols-10 gap-1.5 p-2 bg-black/35 border border-zinc-900/50 rounded-2xl w-full justify-items-center">
          {LEVELS.map((level) => {
            const isUnlocked = level.number <= highestUnlocked;
            const isCompleted = level.number < highestUnlocked;

            return (
              <button
                key={level.number}
                onClick={() => handleLevelClick(level)}
                disabled={!isUnlocked}
                className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all border text-[9px] font-black font-mono leading-none ${
                  isCompleted
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-sm'
                    : isUnlocked
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10 active:scale-90'
                    : 'bg-zinc-950/40 border-zinc-950 text-zinc-700 opacity-25 cursor-not-allowed'
                }`}
              >
                {!isUnlocked ? (
                  <Lock className="w-2.5 h-2.5 text-zinc-800" />
                ) : (
                  <span>{level.number}</span>
                )}

                {/* Micro green completion dot indicator */}
                {isCompleted && (
                  <span className="absolute bottom-0.5 right-0.5 w-1 h-1 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER LEGEND SUMMARY */}
      <div className="text-center py-1 border-t border-zinc-900/30 shrink-0">
        <p className="text-[7px] uppercase tracking-widest text-zinc-500 font-bold">
          Progress: {highestUnlocked - 1} / 100 Levels Cleared
        </p>
      </div>
      
    </div>
  );
};
