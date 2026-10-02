/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ChevronLeft, Lock, Star, Sparkles, Navigation, Trophy } from 'lucide-react';
import { LEVELS, LevelConfig, getAllLevelStars, getTotalStars } from '../utils/levels';
import sounds from '../utils/audio';

interface LevelSelectorProps {
  theme: any;
  onClose: () => void;
  onSelectLevel: (levelNum: number) => void;
}

interface PathPoint {
  x: number;
  y: number;
}

export const LevelSelector: React.FC<LevelSelectorProps> = ({ theme, onClose, onSelectLevel }) => {
  const [highestUnlocked, setHighestUnlocked] = useState<number>(1);
  const [starsMap, setStarsMap] = useState<Record<number, number>>({});
  const [totalStars, setTotalStars] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(400);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapAreaRef = useRef<HTMLDivElement | null>(null);
  const currentNodeRef = useRef<HTMLDivElement | null>(null);

  // Configuration for 100 Levels Map
  const totalLevels = 100;
  const verticalSpacing = 105; // Vertical px distance per level
  const paddingVertical = 160;  // Padding at top and bottom
  const dynamicMapHeight = totalLevels * verticalSpacing + paddingVertical * 2;

  // Load progress and stars
  useEffect(() => {
    const saved = localStorage.getItem('math_matrix_highest_unlocked_level');
    if (saved) {
      setHighestUnlocked(parseInt(saved, 10));
    } else {
      localStorage.setItem('math_matrix_highest_unlocked_level', '1');
    }

    const stars = getAllLevelStars();
    setStarsMap(stars);
    setTotalStars(getTotalStars());
  }, []);

  // Measure container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || 400);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Compute organic winding serpentine path points (Bottom: Level 1 -> Top: Level 100)
  const { pathPoints, levelPositions, pathSvgD } = useMemo(() => {
    const points: PathPoint[] = [];
    const width = containerWidth || 400;
    const height = dynamicMapHeight;

    const startY = height - paddingVertical; // Level 1 at bottom
    const endY = paddingVertical;            // Level 100 at top
    const totalYDistance = startY - endY;

    const centerX = width / 2;
    const maxAmplitude = Math.min(width * 0.36, 140); // Maximum horizontal swing left/right
    const stepY = 10; // Resolution of the curve

    // Sine frequencies for non-uniform organic winding
    const freq1 = 0.0032;
    const freq2 = 0.0065;

    for (let y = startY; y >= endY; y -= stepY) {
      const wave1 = Math.sin((height - y) * freq1);
      const wave2 = Math.cos((height - y) * freq2) * 0.45;
      const progress = 1 - (y - endY) / totalYDistance;
      const edgeDampening = Math.sin(progress * Math.PI);
      const offsetX = (wave1 + wave2) * maxAmplitude * (0.35 + 0.65 * edgeDampening);
      const x = centerX + offsetX;
      points.push({ x, y });
    }

    // Build SVG path string
    let d = '';
    if (points.length > 0) {
      d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        d += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    // Calculate exact coordinates along the path for each of the 100 levels
    const positions: { levelNum: number; x: number; y: number }[] = [];
    const totalPoints = points.length;
    const pointStep = (totalPoints - 1) / (totalLevels - 1);

    for (let i = 0; i < totalLevels; i++) {
      const pointIndex = Math.min(Math.round(i * pointStep), totalPoints - 1);
      const pt = points[pointIndex] || { x: centerX, y: startY };
      positions.push({
        levelNum: i + 1,
        x: pt.x,
        y: pt.y
      });
    }

    return { pathPoints: points, levelPositions: positions, pathSvgD: d };
  }, [containerWidth, dynamicMapHeight, totalLevels, paddingVertical]);

  // Auto-scroll to current unlocked level on initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToCurrentLevel();
    }, 180);
    return () => clearTimeout(timer);
  }, [levelPositions, highestUnlocked]);

  const scrollToCurrentLevel = () => {
    if (!containerRef.current) return;
    const currentPos = levelPositions.find((p) => p.levelNum === highestUnlocked);
    if (currentPos) {
      const containerH = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: currentPos.y - containerH / 2,
        behavior: 'smooth'
      });
    }
  };

  const handleLevelClick = (levelNum: number) => {
    if (levelNum > highestUnlocked) {
      sounds.playFailure();
      return;
    }
    sounds.playClick();
    onSelectLevel(levelNum);
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none overflow-hidden bg-transparent text-white">
      
      {/* 1. TOP STICKY GLASSMORPHIC HEADER */}
      <div className="sticky top-0 z-40 w-full px-4 py-3 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between shadow-xl">
        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="w-9 h-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-95 hover:bg-white/20 transition-all shadow-md shrink-0"
          title="Back to Menu"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white flex items-center gap-1.5">
            <span className="text-yellow-400">Candy</span> Matrix Map
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-black text-amber-300 flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/40 shadow-sm">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {totalStars} / 300
            </span>
            <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
              Stage {highestUnlocked} / 100
            </span>
          </div>
        </div>

        <button
          onClick={scrollToCurrentLevel}
          className="w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 active:scale-95 hover:bg-cyan-500/30 transition-all shadow-md shrink-0"
          title="Jump to Current Level"
        >
          <Navigation className="w-4 h-4 fill-cyan-400/20 text-cyan-400" />
        </button>
      </div>

      {/* 2. SCROLLABLE MAP AREA */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-hidden relative scroll-smooth overscroll-contain"
        style={{ scrollbarWidth: 'none' }}
      >
        <div
          ref={mapAreaRef}
          className="relative w-full overflow-hidden"
          style={{ height: `${dynamicMapHeight}px` }}
        >
          {/* SVG SERPENTINE CANDY TRAIL */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
            {/* Soft Shadow behind the path */}
            <path
              d={pathSvgD}
              fill="none"
              stroke="rgba(0, 0, 0, 0.45)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(0, 6)"
            />
            {/* Outer Glow Line */}
            <path
              d={pathSvgD}
              fill="none"
              stroke="rgba(56, 189, 248, 0.2)"
              strokeWidth="20"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dashed Candy Stepping Stones */}
            <path
              d={pathSvgD}
              fill="none"
              stroke="#ffffff"
              strokeWidth="12"
              strokeDasharray="0 28"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* 3. CANDY LEVEL NODES */}
          {levelPositions.map(({ levelNum, x, y }) => {
            const isCompleted = levelNum < highestUnlocked;
            const isCurrent = levelNum === highestUnlocked;
            const isLocked = levelNum > highestUnlocked;
            const isBoss = levelNum % 5 === 0;
            const stars = starsMap[levelNum] || 0;

            return (
              <div
                key={levelNum}
                ref={isCurrent ? currentNodeRef : null}
                onClick={() => handleLevelClick(levelNum)}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
                className={`absolute z-20 flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 active:scale-90 ${
                  isCurrent ? 'z-30 scale-110' : ''
                }`}
              >
                {/* Boss Milestone Crown */}
                {isBoss && (
                  <div className="absolute -top-6 flex items-center justify-center filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-bounce">
                    <span className="text-xl">👑</span>
                  </div>
                )}

                {/* 3D CANDY SPHERE BUTTON */}
                <div
                  className={`relative rounded-full flex items-center justify-center font-black font-mono transition-all shadow-xl ${
                    isCurrent
                      ? 'w-16 h-16 sm:w-[68px] sm:h-[68px] text-xl text-white border-4 border-white animate-pulse-ring'
                      : isCompleted
                      ? isBoss
                        ? 'w-14 h-14 sm:w-15 sm:h-15 text-lg text-white border-3 border-amber-200'
                        : 'w-13 h-13 sm:w-14 sm:h-14 text-base text-white border-3 border-white'
                      : 'w-12 h-12 sm:w-13 sm:h-13 text-sm text-zinc-400 border-2 border-zinc-700'
                  }`}
                  style={{
                    background: isCurrent
                      ? 'radial-gradient(circle at 35% 30%, #ff4b72, #e11d48, #881337)'
                      : isCompleted
                      ? isBoss
                        ? 'radial-gradient(circle at 35% 30%, #fef08a, #eab308, #854d0e)'
                        : 'radial-gradient(circle at 35% 30%, #38bdf8, #2563eb, #1e3a8a)'
                      : 'radial-gradient(circle at 35% 30%, #334155, #1e293b, #0f172a)',
                    boxShadow: isCurrent
                      ? 'inset 0 4px 6px rgba(255,255,255,0.7), inset 0 -6px 8px rgba(136,19,55,0.6), 0 10px 20px rgba(0,0,0,0.6)'
                      : isCompleted
                      ? 'inset 0 4px 6px rgba(255,255,255,0.6), inset 0 -5px 7px rgba(0,0,0,0.4), 0 8px 16px rgba(0,0,0,0.5)'
                      : 'inset 0 3px 5px rgba(255,255,255,0.2), inset 0 -4px 6px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.4)'
                  }}
                >
                  {/* Specular 3D Highlight Shine */}
                  <span className="absolute top-1 left-2.5 w-4 h-2 rounded-full bg-white/40 blur-[0.5px] rotate-[-20deg] pointer-events-none" />

                  {isLocked ? (
                    <Lock className="w-4 h-4 text-zinc-500 opacity-80" />
                  ) : (
                    <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] font-extrabold tracking-tight">
                      {levelNum}
                    </span>
                  )}
                </div>

                {/* STARS CONTAINER UNDER COMPLETED NODE */}
                {isCompleted && (
                  <div className="absolute -bottom-3 flex items-center gap-0.5 bg-black/80 border border-white/20 px-1.5 py-0.5 rounded-full shadow-lg backdrop-blur-sm">
                    {[1, 2, 3].map((starIdx) => (
                      <Star
                        key={starIdx}
                        className={`w-2.5 h-2.5 ${
                          starIdx <= stars
                            ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_#fbbf24]'
                            : 'text-zinc-600 fill-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* CURRENT PLAY BADGE */}
                {isCurrent && (
                  <div className="absolute -bottom-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-white shadow-lg animate-bounce">
                    PLAY
                  </div>
                )}

                {/* BOSS LEVEL PILL */}
                {isBoss && !isCompleted && !isCurrent && (
                  <div className="absolute -bottom-2 bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[7px] font-extrabold uppercase px-1.5 rounded-full">
                    BOSS
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. BOTTOM FLOATING JUMP BUTTON */}
      <div className="absolute bottom-4 right-4 z-40">
        <button
          onClick={scrollToCurrentLevel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider shadow-[0_4px_16px_rgba(244,63,94,0.4)] border border-white/30 active:scale-95 transition-all"
        >
          <Navigation className="w-3.5 h-3.5 fill-white" />
          <span>Stage {highestUnlocked}</span>
        </button>
      </div>

    </div>
  );
};
