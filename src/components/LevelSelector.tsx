/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Star, 
  Crown, 
  Play, 
  Sparkles, 
  Check, 
  Trophy,
  Flame,
  LayoutGrid,
  Layers
} from 'lucide-react';
import { getAllLevelStars, getTotalStars } from '../utils/levels';
import sounds from '../utils/audio';

interface LevelSelectorProps {
  theme: any;
  onClose: () => void;
  onSelectLevel: (levelNum: number) => void;
}

interface StageInfo {
  stage: number;
  name: string;
  startLevel: number;
  endLevel: number;
  difficultyLabel: string;
}

const STAGES: StageInfo[] = [
  { stage: 1, name: 'Novice', startLevel: 1, endLevel: 20, difficultyLabel: 'Easy' },
  { stage: 2, name: 'Apprentice', startLevel: 21, endLevel: 40, difficultyLabel: 'Medium' },
  { stage: 3, name: 'Challenger', startLevel: 41, endLevel: 60, difficultyLabel: 'Medium' },
  { stage: 4, name: 'Master', startLevel: 61, endLevel: 80, difficultyLabel: 'Hard' },
  { stage: 5, name: 'Grandmaster', startLevel: 81, endLevel: 100, difficultyLabel: 'Insane' },
];

export const LevelSelector: React.FC<LevelSelectorProps> = ({ onClose, onSelectLevel }) => {
  const [highestUnlocked, setHighestUnlocked] = useState<number>(1);
  const [starsMap, setStarsMap] = useState<Record<number, number>>({});
  const [totalStars, setTotalStars] = useState<number>(0);
  const [selectedStage, setSelectedStage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'stage' | 'all'>('stage');
  const [shakeLevel, setShakeLevel] = useState<number | null>(null);

  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const currentNodeRef = useRef<HTMLDivElement | null>(null);

  // Load user level progress and stars from local storage
  useEffect(() => {
    const saved = localStorage.getItem('math_matrix_highest_unlocked_level');
    let unlocked = 1;
    if (saved) {
      unlocked = parseInt(saved, 10);
      setHighestUnlocked(unlocked);
    } else {
      localStorage.setItem('math_matrix_highest_unlocked_level', '1');
    }

    const stars = getAllLevelStars();
    setStarsMap(stars);
    setTotalStars(getTotalStars());

    // Auto-select the stage containing player's current unlocked level
    const currentStageNum = Math.min(5, Math.max(1, Math.ceil(unlocked / 20)));
    setSelectedStage(currentStageNum);
  }, []);

  // Compute stats for each stage
  const stageStats = useMemo(() => {
    return STAGES.map((s) => {
      let stageStars = 0;
      let completedCount = 0;
      for (let lvl = s.startLevel; lvl <= s.endLevel; lvl++) {
        const star = starsMap[lvl] || 0;
        stageStars += star;
        if (lvl < highestUnlocked) {
          completedCount++;
        }
      }
      const isStageUnlocked = highestUnlocked >= s.startLevel;
      return {
        ...s,
        stageStars,
        completedCount,
        isStageUnlocked,
        totalLevelsInStage: s.endLevel - s.startLevel + 1
      };
    });
  }, [starsMap, highestUnlocked]);

  const currentStageInfo = useMemo(() => {
    return stageStats.find((s) => s.stage === selectedStage) || stageStats[0];
  }, [stageStats, selectedStage]);

  // Determine levels to display based on view mode
  const displayedLevels = useMemo(() => {
    if (viewMode === 'all') {
      return Array.from({ length: 100 }, (_, i) => i + 1);
    }
    const info = currentStageInfo;
    const list: number[] = [];
    for (let i = info.startLevel; i <= info.endLevel; i++) {
      list.push(i);
    }
    return list;
  }, [viewMode, currentStageInfo]);

  // Scroll current level into view
  const scrollToCurrentLevel = () => {
    if (currentNodeRef.current) {
      currentNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleLevelClick = (levelNum: number) => {
    if (levelNum > highestUnlocked) {
      sounds.playFailure();
      setShakeLevel(levelNum);
      setTimeout(() => setShakeLevel(null), 500);
      return;
    }
    sounds.playClick();
    onSelectLevel(levelNum);
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col select-none overflow-hidden bg-[#f7f7f7] text-zinc-900 font-sans"
      style={{ backgroundColor: '#f7f7f7' }}
    >
      
      {/* 1. TOP STICKY HEADER */}
      <header className="sticky top-0 z-40 w-full px-4 py-3 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 flex items-center justify-between shadow-sm shrink-0">
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="w-10 h-10 rounded-2xl bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-700 active:scale-95 hover:bg-zinc-100 hover:text-zinc-900 transition-all shadow-sm shrink-0"
          title="Back to Menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
            Select Level
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">
            {viewMode === 'all' 
              ? 'All 100 Levels' 
              : `Stage ${currentStageInfo.stage}: ${currentStageInfo.name} (${currentStageInfo.startLevel}–${currentStageInfo.endLevel})`
            }
          </p>
        </div>

        {/* Total Stars Pill */}
        <div 
          className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/90 px-3 py-1.5 rounded-full shadow-sm shrink-0"
          title="Total Stars Earned"
        >
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 drop-shadow-sm" />
          <span className="text-xs font-black font-mono text-amber-800">
            {totalStars} / 300
          </span>
        </div>
      </header>

      {/* 2. STAGE TABS BAR */}
      <div className="w-full px-4 pt-3 pb-2 bg-[#f7f7f7] border-b border-zinc-200/80 shrink-0">
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto scrollbar-none py-1">
          {stageStats.map((s) => {
            const isActive = viewMode === 'stage' && selectedStage === s.stage;
            const isCompletedStage = s.completedCount >= s.totalLevelsInStage;

            return (
              <button
                key={s.stage}
                onClick={() => {
                  sounds.playClick();
                  setViewMode('stage');
                  setSelectedStage(s.stage);
                }}
                className={`flex-1 min-w-[62px] sm:min-w-[70px] py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center relative active:scale-95 ${
                  isActive
                    ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                    : 'bg-white border border-zinc-200/90 text-zinc-700 hover:text-zinc-900 hover:border-zinc-300 shadow-sm'
                }`}
              >
                <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-white' : 'text-zinc-800'}`}>
                  Stage {s.stage}
                </span>
                
                <div className="flex items-center gap-0.5 mt-0.5">
                  <Star className={`w-2.5 h-2.5 ${isActive ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-400'}`} />
                  <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-indigo-100' : 'text-zinc-500'}`}>
                    {s.stageStars}
                  </span>
                </div>

                {isCompletedStage && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold shadow-sm">
                    ✓
                  </span>
                )}
              </button>
            );
          })}

          {/* ALL LEVELS TAB */}
          <button
            onClick={() => {
              sounds.playClick();
              setViewMode(viewMode === 'all' ? 'stage' : 'all');
            }}
            className={`min-w-[50px] py-2 px-2 rounded-xl text-center transition-all flex flex-col items-center justify-center active:scale-95 ${
              viewMode === 'all'
                ? 'bg-zinc-800 text-white shadow-md'
                : 'bg-white border border-zinc-200/90 text-zinc-600 hover:text-zinc-900 shadow-sm'
            }`}
            title="Toggle All 100 Levels Grid"
          >
            <LayoutGrid className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">All</span>
          </button>
        </div>

        {/* STAGE SUMMARY BANNER */}
        {viewMode === 'stage' && (
          <div className="mt-2.5 p-3 rounded-2xl bg-white border border-zinc-200/90 shadow-sm flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  {currentStageInfo.name} Stage
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                  {currentStageInfo.difficultyLabel}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-600">
                {currentStageInfo.completedCount} / {currentStageInfo.totalLevelsInStage} Cleared
              </span>
            </div>

            {/* Stage Progress Bar */}
            <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden border border-zinc-200/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
                style={{
                  width: `${(currentStageInfo.completedCount / currentStageInfo.totalLevelsInStage) * 100}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. SCROLLABLE GRID OF LEVEL CARDS */}
      <div 
        ref={gridContainerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden p-4 pb-24 overscroll-contain"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-w-lg mx-auto">
          {displayedLevels.map((levelNum) => {
            const isCompleted = levelNum < highestUnlocked;
            const isCurrent = levelNum === highestUnlocked;
            const isLocked = levelNum > highestUnlocked;
            const isBoss = levelNum % 5 === 0;
            const stars = starsMap[levelNum] || 0;
            const isShaking = shakeLevel === levelNum;

            return (
              <div
                key={levelNum}
                ref={isCurrent ? currentNodeRef : null}
                onClick={() => handleLevelClick(levelNum)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-between p-2 relative select-none transition-all duration-200 shadow-sm ${
                  isShaking ? 'animate-bounce ring-2 ring-red-400' : ''
                } ${
                  isCurrent
                    ? 'bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white border-2 border-indigo-400 shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-500/20 active:scale-95 cursor-pointer transform hover:scale-[1.03]'
                    : isCompleted
                    ? 'bg-white border-2 border-emerald-400/80 hover:border-emerald-500 hover:shadow-md text-zinc-800 active:scale-95 cursor-pointer'
                    : 'bg-zinc-100/90 border border-zinc-200/80 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {/* TOP BADGE / MILESTONE CROWN */}
                <div className="w-full flex items-center justify-between px-0.5 min-h-[14px]">
                  {isBoss ? (
                    <span 
                      className={`text-xs ${isCurrent ? 'filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]' : ''}`} 
                      title="Milestone Boss Level"
                    >
                      👑
                    </span>
                  ) : (
                    <span />
                  )}

                  {isCompleted && (
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black">
                      ✓
                    </span>
                  )}
                </div>

                {/* CENTER CONTENT: LEVEL NUMBER OR LOCK ICON */}
                <div className="flex flex-col items-center justify-center flex-1 my-0.5">
                  {isLocked ? (
                    <div className="flex flex-col items-center justify-center">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                      <span className="text-[11px] font-black font-mono text-zinc-400 mt-1">
                        {levelNum}
                      </span>
                    </div>
                  ) : (
                    <span className={`font-black font-mono tracking-tight leading-none ${
                      isCurrent 
                        ? 'text-2xl sm:text-3xl text-white drop-shadow-sm' 
                        : 'text-xl sm:text-2xl text-zinc-800'
                    }`}>
                      {levelNum}
                    </span>
                  )}
                </div>

                {/* BOTTOM CONTENT: STARS OR PLAY PILL */}
                <div className="w-full flex items-center justify-center min-h-[16px]">
                  {isCurrent ? (
                    <span className="bg-white text-indigo-700 font-black text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-0.5 animate-pulse">
                      <Play className="w-2 h-2 fill-indigo-700 text-indigo-700" /> Play
                    </span>
                  ) : isCompleted ? (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
                            starIdx <= stars
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_1px_2px_rgba(251,191,36,0.5)]'
                              : 'fill-zinc-200 text-zinc-300'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-40">
                      {[1, 2, 3].map((starIdx) => (
                        <Star key={starIdx} className="w-2 h-2 fill-zinc-300 text-zinc-300" />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM FLOATING ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-between max-w-md mx-auto">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-bold text-zinc-400">
            Current Stage
          </span>
          <span className="text-xs font-black font-mono text-zinc-800">
            Level {highestUnlocked} of 100
          </span>
        </div>

        <button
          onClick={() => handleLevelClick(highestUnlocked)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Play Level {highestUnlocked}</span>
        </button>
      </footer>

    </div>
  );
};
