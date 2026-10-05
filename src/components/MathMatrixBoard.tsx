/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Volume2, VolumeX, Zap, CheckCircle2, ChevronRight, ChevronLeft, Map, AlertTriangle, RefreshCw, Globe, Heart, Star, Award, Sparkles } from 'lucide-react';
import sounds from '../utils/audio';
import { useFirebase } from '../context/FirebaseContext';
import { LEVELS, LevelConfig, getLevelDetail, calculateLevelStars, saveLevelStars, getLevelStars, LevelDetail } from '../utils/levels';
import { AdMobSimulator } from './AdMobSimulator';

interface MathMatrixBoardProps {
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  theme: any;
  onGameOver: (finalScore: number) => void;
  levelNumber?: number; // Optional level number when playing in level mode
  onExitLevelMode?: () => void; // Return to the level selector map
  isOnlineMode?: boolean; // Optional online mode flag
  initialScore?: number; // Optional initial score for ad-based reviving
}

interface FormulaTemplate {
  size: number;
  display: string;
  evaluate: (operands: number[]) => number;
}

// Score-based formula selector helper
const getFormulasForScore = (difficulty: 'easy' | 'medium' | 'hard' | 'insane', currentScore: number): FormulaTemplate[] => {
  if (difficulty === 'easy') {
    const list: FormulaTemplate[] = [
      { size: 2, display: "[A] + [B]", evaluate: (op) => op[0] + op[1] },
      { size: 2, display: "[A] - [B]", evaluate: (op) => op[0] - op[1] }
    ];
    if (currentScore > 100) {
      list.push({ size: 2, display: "[A] * [B]", evaluate: (op) => op[0] * op[1] });
    }
    if (currentScore > 200) {
      list.push({ size: 2, display: "[A] / [B]", evaluate: (op) => (op[1] !== 0 ? Math.floor(op[0] / op[1]) : op[0]) });
    }
    return list;
  }

  if (difficulty === 'medium') {
    const list: FormulaTemplate[] = [
      { size: 2, display: "[A] * [B]", evaluate: (op) => op[0] * op[1] },
      { size: 3, display: "[A] + [B] - [C]", evaluate: (op) => op[0] + op[1] - op[2] },
      { size: 3, display: "[A] - [B] + [C]", evaluate: (op) => op[0] - op[1] + op[2] }
    ];
    if (currentScore > 100) {
      list.push(
        { size: 3, display: "[A] * [B] - [C]", evaluate: (op) => op[0] * op[1] - op[2] },
        { size: 3, display: "[A] + [B] / [C]", evaluate: (op) => (op[2] !== 0 ? op[0] + Math.floor(op[1] / op[2]) : op[0] + op[1]) }
      );
    }
    if (currentScore > 200) {
      list.push(
        { size: 3, display: "[A] * [B] / [C]", evaluate: (op) => (op[2] !== 0 ? Math.floor((op[0] * op[1]) / op[2]) : op[0] * op[1]) }
      );
    }
    return list;
  }

  if (difficulty === 'hard') {
    const list: FormulaTemplate[] = [
      { size: 3, display: "[A] * [B] - [C]", evaluate: (op) => op[0] * op[1] - op[2] },
      { size: 3, display: "([A] - [B]) * [C]", evaluate: (op) => (op[0] - op[1]) * op[2] },
      { size: 3, display: "[A] * [B] + [C]", evaluate: (op) => op[0] * op[1] + op[2] }
    ];
    if (currentScore > 100) {
      list.push(
        { size: 3, display: "[A] * [B] / [C]", evaluate: (op) => (op[2] !== 0 ? Math.floor((op[0] * op[1]) / op[2]) : op[0] * op[1]) },
        { size: 3, display: "[A] * [B] * [C]", evaluate: (op) => op[0] * op[1] * op[2] }
      );
    }
    if (currentScore > 200) {
      list.push(
        { size: 3, display: "([A] * [B]) / [C]", evaluate: (op) => (op[2] !== 0 ? Math.floor((op[0] * op[1]) / op[2]) : op[0] * op[1]) },
        { size: 3, display: "([A] * ([B]) / [C])", evaluate: (op) => (op[2] !== 0 ? Math.floor((op[0] * op[1]) / op[2]) : op[0] * op[1]) }
      );
    }
    return list;
  }

  // Fallback / Insane mode
  return [
    { size: 4, display: "[A] * [B] + [C] * [D]", evaluate: (op) => op[0] * op[1] + op[2] * op[3] },
    { size: 4, display: "([A] + [B]) * [C] - [D]", evaluate: (op) => (op[0] + op[1]) * op[3] - op[2] },
    { size: 4, display: "[A] * [B] - [C] * [D]", evaluate: (op) => op[0] * op[1] - op[2] * op[3] }
  ];
};

const getPuzzleTimeLimit = (diff: 'easy' | 'medium' | 'hard' | 'insane'): number => {
  if (diff === 'easy') return 10;
  if (diff === 'medium') return 20;
  return 30; // Hard and Insane are 30 seconds per puzzle
};

export const MathMatrixBoard: React.FC<MathMatrixBoardProps> = ({ 
  difficulty: initialDifficulty, 
  theme, 
  onGameOver,
  levelNumber: initialLevelNumber,
  onExitLevelMode,
  isOnlineMode = false,
  initialScore = 0
}) => {
  const { submitScore, incrementStreakDirectly, addTierPoints } = useFirebase();

  // Handle active level number
  const [currentLevelNum, setCurrentLevelNum] = useState<number | undefined>(initialLevelNumber);
  const isLevelMode = currentLevelNum !== undefined;

  // Resolve difficulty (derived from Level mix or manual selection)
  const [activeDifficulty, setActiveDifficulty] = useState<'easy' | 'medium' | 'hard' | 'insane'>(() => {
    if (initialLevelNumber !== undefined) {
      return LEVELS[initialLevelNumber - 1]?.difficulty || 'easy';
    }
    return initialDifficulty;
  });

  // Grid dimensions
  const gridDim = isLevelMode ? 4 : (activeDifficulty === 'easy' ? 3 : activeDifficulty === 'medium' ? 4 : 5);
  const numCells = gridDim * gridDim;

  // Game states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [grid, setGrid] = useState<number[]>([]);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(() => getPuzzleTimeLimit(initialDifficulty));
  const [target, setTarget] = useState<number>(0);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [currentFormula, setCurrentFormula] = useState<FormulaTemplate | null>(null);
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  
  // Player Lives state: starts with 3 hearts
  const [lives, setLives] = useState<number>(3);
  
  // Player Skips state: starts with 3 skips
  const [skipsLeft, setSkipsLeft] = useState<number>(3);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);

  // Success / Failure overlays
  const [showLevelSuccessOverlay, setShowLevelSuccessOverlay] = useState<boolean>(false);
  const [showLevelFailureOverlay, setShowLevelFailureOverlay] = useState<boolean>(false);

  // Level Mode detail and star tracking
  const [currentLevelDetail, setCurrentLevelDetail] = useState<LevelDetail | null>(null);
  const [levelMaxTime, setLevelMaxTime] = useState<number>(25);
  const [earnedStars, setEarnedStars] = useState<number>(1);

  // References
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound Muted state linkage
  useEffect(() => {
    sounds.setMuted(muted);
  }, [muted]);

  // Direct Auto Start Game on Mount
  useEffect(() => {
    handleStartGame();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentLevelNum, initialDifficulty, isOnlineMode]);

  // Timer decrement ticking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !showLevelSuccessOverlay && !showLevelFailureOverlay) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, showLevelSuccessOverlay, showLevelFailureOverlay]);

  // Monitor timer completion
  useEffect(() => {
    if (isPlaying && timeLeft <= 0) {
      if (isLevelMode) {
        sounds.playFailure();
        setShowLevelFailureOverlay(true);
      } else {
        handleEndGame();
      }
    }
  }, [timeLeft, isPlaying, isLevelMode]);

  const handleStartGame = () => {
    setShowLevelSuccessOverlay(false);
    setShowLevelFailureOverlay(false);
    
    // Set level difficulty dynamically
    if (currentLevelNum !== undefined) {
      const targetDiff = LEVELS[currentLevelNum - 1]?.difficulty || 'easy';
      setActiveDifficulty(targetDiff);
    } else {
      setActiveDifficulty(initialDifficulty);
    }

    sounds.playSuccess();
    setScore(initialScore);
    setCombo(0);
    setLives(3); // Reset lives back to 3
    setSkipsLeft(3); // Reset skips back to 3
    setSolvedCount(0);
    setSelectedIndices([]);
    setIsPlaying(true);
    
    // Note: generateBoardAndEquation needs score state
    setTimeout(() => {
      generateBoardAndEquation(initialScore);
    }, 0);
  };

  const handleEndGame = () => {
    setIsPlaying(false);
    sounds.playFailure();
    if (timerRef.current) clearInterval(timerRef.current);
    
    // In standard / online play, write highscore to firebase database
    submitScore(score, activeDifficulty, gridDim);
    onGameOver(score);
  };

  const generateBoardAndEquation = (forcedScore?: number) => {
    // 1. True Level Mode: Fetch handcrafted milestone or deterministic procedural puzzle
    if (isLevelMode && currentLevelNum !== undefined) {
      const detail = getLevelDetail(currentLevelNum);
      setCurrentLevelDetail(detail);
      setCurrentFormula(detail.formula);
      setGrid([...detail.grid]);
      setTarget(detail.target);
      setTimeLeft(detail.timeLimit);
      setLevelMaxTime(detail.timeLimit);
      setSelectedIndices([]);
      return;
    }

    // 2. Standard Endless / Online Mode: Procedural generation with score scaling
    const currentScore = forcedScore !== undefined ? forcedScore : score;
    const templates = getFormulasForScore(activeDifficulty, currentScore);
    const template = templates[Math.floor(Math.random() * templates.length)];
    setCurrentFormula(template);

    const maxVal = activeDifficulty === 'easy' ? 9 : activeDifficulty === 'medium' ? 12 : 15;
    const minVal = activeDifficulty === 'insane' ? -5 : 1;
    
    const newGrid: number[] = [];
    for (let i = 0; i < numCells; i++) {
      let rand = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
      if (rand === 0) rand = 2; // avoid zeros
      newGrid.push(rand);
    }

    const solvedIndices: number[] = [];
    while (solvedIndices.length < template.size) {
      const randIdx = Math.floor(Math.random() * numCells);
      if (!solvedIndices.includes(randIdx)) {
        solvedIndices.push(randIdx);
      }
    }

    const operands = solvedIndices.map(idx => newGrid[idx]);
    const solutionVal = template.evaluate(operands);

    const limit = getPuzzleTimeLimit(activeDifficulty);
    setTimeLeft(limit);

    setGrid(newGrid);
    setTarget(solutionVal);
    setSelectedIndices([]);
  };

  // Lose 1 Life and handle Game Over condition
  const handleLoseLife = () => {
    sounds.playFailure();
    setCombo(0);
    setSelectedIndices([]);
    
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        // Run game over after life deduction
        setTimeout(() => {
          handleEndGame();
        }, 100);
        return 0;
      }
      return newLives;
    });
  };

  const handleSkipMatrix = () => {
    if (!isPlaying || showLevelSuccessOverlay || showLevelFailureOverlay) return;
    
    if (skipsLeft <= 0) {
      sounds.playClick();
      setIsAdPlaying(true);
      return;
    }

    sounds.playClick();
    setSkipsLeft(prev => prev - 1);
    generateBoardAndEquation();
  };

  const handleAdCompleted = () => {
    setIsAdPlaying(false);
    setSkipsLeft(prev => prev + 1);
    sounds.playSuccess();
    generateBoardAndEquation();
  };

  const handleAdCancelled = () => {
    setIsAdPlaying(false);
    sounds.playFailure();
  };

  const handleCellClick = (index: number) => {
    if (!isPlaying || showLevelSuccessOverlay || showLevelFailureOverlay) return;

    sounds.playClick();

    if (selectedIndices.includes(index)) {
      setSelectedIndices(prev => prev.filter(i => i !== index));
      return;
    }

    const newSelection = [...selectedIndices, index];
    
    if (!currentFormula) return;

    if (newSelection.length < currentFormula.size) {
      setSelectedIndices(newSelection);
    } else {
      const operands = newSelection.map(idx => grid[idx]);
      const result = currentFormula.evaluate(operands);

      if (result === target) {
        sounds.playSuccess();
        const scoreGain = 10 + (combo * 2);
        const nextScore = score + scoreGain;
        setScore(nextScore);
        setCombo(prev => prev + 1);
        setSolvedCount(prev => prev + 1);
        
        if (combo > 0 && combo % 3 === 0) {
          sounds.playCombo(combo / 3);
        }

        // Increase streak upon solving a puzzle (Only apply to offline mode)
        if (!isOnlineMode) {
          incrementStreakDirectly();
        }

        if (isLevelMode) {
          handleLevelClearedSuccess();
        } else {
          // Play offline points:
          // Easy: 1 pt, Medium: 3 pts, Hard / Insane: 5 pts
          const ptsEarned = activeDifficulty === 'easy' ? 1 : activeDifficulty === 'medium' ? 3 : 5;
          addTierPoints(ptsEarned);

          // Correct! Refresh board and generate next puzzle with the updated score
          generateBoardAndEquation(nextScore);
        }
      } else {
        // Wrong answer costs exactly 1 life point!
        handleLoseLife();
      }
    }
  };

  const handleLevelClearedSuccess = () => {
    sounds.playSuccess();
    
    // Level: 2 points each level
    addTierPoints(2);
    
    // Calculate and save 3-Star Rating
    if (currentLevelNum !== undefined) {
      const stars = calculateLevelStars(timeLeft, levelMaxTime, lives);
      setEarnedStars(stars);
      saveLevelStars(currentLevelNum, stars);

      const nextLevel = currentLevelNum + 1;
      const currentHighest = localStorage.getItem('math_matrix_highest_unlocked_level') || '1';
      if (nextLevel > parseInt(currentHighest, 10)) {
        localStorage.setItem('math_matrix_highest_unlocked_level', String(nextLevel));
      }
    }

    setShowLevelSuccessOverlay(true);
  };

  const handlePlayNextLevel = () => {
    sounds.playClick();
    if (currentLevelNum !== undefined) {
      const nextLevel = currentLevelNum + 1;
      if (nextLevel <= 100) {
        setCurrentLevelNum(nextLevel);
        setShowLevelSuccessOverlay(false);
      } else {
        if (onExitLevelMode) onExitLevelMode();
      }
    }
  };

  const handlePlayPreviousLevel = () => {
    sounds.playClick();
    if (currentLevelNum !== undefined && currentLevelNum > 1) {
      setCurrentLevelNum(currentLevelNum - 1);
      setShowLevelFailureOverlay(false);
    }
  };

  const handleRetryLevel = () => {
    sounds.playClick();
    setShowLevelFailureOverlay(false);
    handleStartGame();
  };

  const renderFormulaText = () => {
    if (!currentFormula) return null;

    // Tokenize into variable slots ([A], [B], etc.) and operators/parentheses
    const tokens = currentFormula.display
      .split(/(\[[A-D]\]|[()+\-*/])/g)
      .map(t => t.trim())
      .filter(Boolean);

    return (
      <div className="flex flex-wrap items-center justify-center font-mono py-2 px-1 select-none leading-none gap-y-2.5">
        {tokens.map((token, i) => {
          // Check if token is a variable slot [A], [B], [C], [D]
          const match = token.match(/^\[([A-D])\]$/);
          if (match) {
            const letter = match[1];
            const slotIdx = letter.charCodeAt(0) - 'A'.charCodeAt(0);
            const isFilled = selectedIndices.length > slotIdx;

            if (isFilled) {
              const val = grid[selectedIndices[slotIdx]];
              return (
                <div
                  key={i}
                  className="inline-flex items-center justify-center min-w-[42px] h-11 md:min-w-[48px] md:h-12 px-3 mx-1 rounded-2xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-500/35 via-teal-500/25 to-emerald-600/35 text-white font-black text-lg md:text-xl font-mono shadow-[0_0_18px_rgba(16,185,129,0.6)] transform scale-105 transition-all animate-fadeIn"
                >
                  {val}
                </div>
              );
            }

            return (
              <div
                key={i}
                className="inline-flex items-center justify-center min-w-[42px] h-11 md:min-w-[48px] md:h-12 px-2.5 mx-1 rounded-2xl border-2 border-dashed border-cyan-400 bg-cyan-950/50 text-cyan-300 font-black text-base md:text-lg font-mono shadow-[0_0_16px_rgba(6,182,212,0.45)] animate-pulse"
              >
                ?
              </div>
            );
          }

          if (token === '*') {
            return (
              <span key={i} className="text-amber-400 font-black text-2xl md:text-3xl mx-1.5 select-none font-sans drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                ×
              </span>
            );
          }

          if (token === '/') {
            return (
              <span key={i} className="text-amber-400 font-black text-2xl md:text-3xl mx-1.5 select-none font-sans drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                ÷
              </span>
            );
          }

          if (token === '+') {
            return (
              <span key={i} className="text-cyan-400 font-black text-2xl md:text-3xl mx-1.5 select-none font-sans drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                +
              </span>
            );
          }

          if (token === '-') {
            return (
              <span key={i} className="text-rose-400 font-black text-2xl md:text-3xl mx-1.5 select-none font-sans drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                −
              </span>
            );
          }

          if (token === '(' || token === ')') {
            return (
              <span key={i} className="text-yellow-300 font-extrabold text-2xl md:text-3xl mx-0.5 select-none drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]">
                {token}
              </span>
            );
          }

          return (
            <span key={i} className="text-white font-bold text-lg mx-0.5">
              {token}
            </span>
          );
        })}
      </div>
    );
  };

  const currentMaxTime = getPuzzleTimeLimit(activeDifficulty);

  return (
    <div className="w-full flex flex-col items-center select-none relative">
      
      {/* Sound Toggle Utility */}
      <div className="w-full max-w-sm flex justify-end gap-2 mb-3 shrink-0">
        <button
          onClick={() => setMuted(!muted)}
          className={`p-1.5 rounded-xl border ${theme.border} text-zinc-500 hover:text-white transition`}
          title={muted ? "Unmute Audio" : "Mute Audio"}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Game Active Screen */}
      <div className="w-full max-w-sm flex flex-col items-center animate-fadeIn">
        
        {/* Top Stats Banner */}
        <div className={`w-full rounded-xl border ${theme.border} ${theme.cardBg} p-2.5 mb-2 flex items-center justify-between shadow-md`}>
          {isLevelMode ? (
            <>
              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  {currentLevelDetail?.isBoss ? (
                    <span className="text-[7.5px] uppercase tracking-wider text-amber-400 font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5" /> Boss Level
                    </span>
                  ) : (
                    <p className="text-[8px] uppercase tracking-wider text-blue-400 font-bold">Level Mode</p>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-black tracking-wide text-white truncate mt-0.5">
                  {currentLevelDetail?.title || `Level ${currentLevelNum}`}
                </p>
              </div>

              {/* GORGEOUS HEART LIVES CONTAINER */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-full shrink-0">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      i < lives 
                        ? "text-red-500 fill-red-500 filter drop-shadow-[0_0_2px_rgba(239,68,68,0.5)] scale-110" 
                        : "text-zinc-700 fill-zinc-800 scale-95"
                    }`}
                  />
                ))}
              </div>

              <div className="text-right shrink-0">
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Tier</p>
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                  {activeDifficulty}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[8px] uppercase tracking-wider text-zinc-500">Score</p>
                  {isOnlineMode && (
                    <span className="flex h-1.5 w-1.5 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <p className={`text-lg font-black font-mono tracking-tight ${theme.text}`}>{score}</p>
              </div>

              {/* GORGEOUS HEART LIVES CONTAINER */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-full">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-3.5 h-3.5 transition-all duration-300 ${
                      i < lives 
                        ? "text-red-500 fill-red-500 filter drop-shadow-[0_0_2px_rgba(239,68,68,0.5)] scale-110" 
                        : "text-zinc-700 fill-zinc-800 scale-95"
                    }`}
                  />
                ))}
              </div>

              {combo > 1 && (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-bounce">
                  <Zap className="w-3 h-3 text-amber-500 fill-current animate-pulse" />
                  <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
                    {combo}x Combo
                  </span>
                </div>
              )}

              <div className="text-right">
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Solved</p>
                <p className={`text-sm font-bold font-mono ${theme.text}`}>{solvedCount}</p>
              </div>
            </>
          )}
        </div>

        {/* High Visibility Equation Formula Card */}
        <div className="w-full rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-zinc-950/95 via-zinc-900/90 to-zinc-950/95 backdrop-blur-xl p-3 mb-3 shadow-[0_8px_30px_rgba(0,0,0,0.7),0_0_24px_rgba(6,182,212,0.18)] relative overflow-hidden">
          {/* Top Luminous Timer Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-900/80 overflow-hidden">
            <div 
              className={`h-full ${
                timeLeft <= 5 
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_12px_#ef4444]' 
                  : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
              } transition-all duration-300`} 
              style={{ width: `${(timeLeft / currentMaxTime) * 100}%` }}
            />
          </div>

          {/* Equation Header Row */}
          <div className="flex justify-between items-center mb-2 px-1 pt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                EQUATION WORKSPACE
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/70 border border-white/10 shadow-inner">
              <span className="text-[8px] uppercase tracking-wider text-zinc-400 font-bold">TIME</span>
              <span className={`text-xs font-black font-mono tracking-wider ${
                timeLeft <= 5 ? 'text-red-400 animate-pulse font-extrabold' : 'text-cyan-400'
              }`}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* High Contrast Formula Workspace Container */}
          <div className="py-2.5 px-2 rounded-xl bg-black/70 border border-white/10 shadow-inner">
            {renderFormulaText()}
          </div>

          {/* High Visibility Target Result Callout */}
          <div className="flex items-center justify-center gap-2.5 mt-2.5 pt-2 border-t border-white/10 select-none">
            <span className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-300 drop-shadow-sm">
              TARGET RESULT
            </span>
            <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-500/20 border-2 border-amber-400/60 shadow-[0_0_18px_rgba(245,158,11,0.35)]">
              <span className="text-amber-400 text-lg font-black font-mono">=</span>
              <span className="text-2xl font-black font-mono text-amber-300 tracking-wider filter drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]">
                {target}
              </span>
            </div>
          </div>
        </div>

        {/* Matrix Interactive Cells Grid */}
        <div 
          className="grid gap-1.5 w-full mb-3 p-1.5 bg-black/40 border border-zinc-900/60 rounded-xl select-none"
          style={{ gridTemplateColumns: `repeat(${gridDim}, minmax(0, 1fr))` }}
        >
          {grid.map((val, idx) => {
            const isSelected = selectedIndices.includes(idx);
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                className={`aspect-square rounded-lg border font-mono font-black text-base flex items-center justify-center relative transition-all active:scale-90 ${
                  isSelected 
                    ? `border-blue-500 bg-zinc-800/80 text-white font-extrabold ${theme.glow}` 
                    : `border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700 hover:text-white`
                }`}
              >
                {val}

                {isSelected && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-zinc-700 border border-zinc-500 text-[8px] font-bold text-white flex items-center justify-center">
                    {selectedIndices.indexOf(idx) + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Reset / Quit Controls Row */}
        <div className="w-full flex gap-1.5 shrink-0">
          <button
            onClick={handleSkipMatrix}
            className={`flex-1 py-2.5 rounded-xl border ${theme.border} text-[9px] font-bold uppercase transition active:scale-95 flex items-center justify-center gap-1 ${
              skipsLeft <= 0 
                ? 'border-yellow-500/50 bg-yellow-950/10 text-yellow-500 hover:border-yellow-400 hover:bg-yellow-950/20' 
                : 'text-zinc-500 hover:text-white hover:border-zinc-700'
            }`}
          >
            <RotateCcw className="w-3 h-3" /> {skipsLeft > 0 ? `Skip Matrix (${skipsLeft} left)` : '📺 Watch Ad for Skip'}
          </button>
          <button
            onClick={handleEndGame}
            className="flex-1 py-2.5 rounded-xl border border-red-950/70 hover:border-red-500/50 bg-red-950/20 text-[9px] font-bold uppercase text-red-400 hover:text-red-300 transition active:scale-95"
          >
            {isLevelMode ? 'Exit Level' : 'End Challenge'}
          </button>
        </div>
      </div>

      {/* GORGEOUS LEVEL SUCCESS CLEAR OVERLAY */}
      {showLevelSuccessOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className={`w-full max-w-xs rounded-3xl border border-emerald-500/30 bg-zinc-950 p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden`}>
            
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            
            {/* 3-STAR RATING ANIMATION */}
            <div className="flex items-center justify-center gap-2.5 mb-3">
              {[1, 2, 3].map((starIdx) => {
                const isEarned = starIdx <= earnedStars;
                return (
                  <div
                    key={starIdx}
                    className={`transition-all duration-500 transform ${
                      isEarned 
                        ? 'text-amber-400 scale-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)]' 
                        : 'text-zinc-700 scale-90 opacity-30'
                    }`}
                  >
                    <Star 
                      className={`w-9 h-9 ${isEarned ? 'fill-amber-400' : 'fill-transparent'}`} 
                    />
                  </div>
                );
              })}
            </div>

            <h3 className="text-base font-black tracking-widest text-white uppercase leading-none mb-1">
              {earnedStars === 3 ? 'PERFECT 3-STAR!' : earnedStars === 2 ? 'EXCELLENT CLEAR!' : 'STAGE CLEARED!'}
            </h3>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-3">
              {currentLevelDetail?.title || `Level ${currentLevelNum} Completed`}
            </p>

            {/* PERFORMANCE METRICS */}
            <div className="w-full bg-zinc-900/80 border border-zinc-850 rounded-2xl p-2.5 mb-4 space-y-1.5 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 uppercase font-bold text-[9px]">Time Left:</span>
                <span className="font-mono text-emerald-400 font-bold">{timeLeft}s / {levelMaxTime}s</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 uppercase font-bold text-[9px]">Hearts Left:</span>
                <span className="text-red-400 font-bold">{'❤️'.repeat(lives)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 uppercase font-bold text-[9px]">Stars Earned:</span>
                <span className="text-amber-400 font-black">{earnedStars} / 3 ⭐</span>
              </div>
            </div>

            <div className="w-full space-y-2 relative z-10">
              {currentLevelNum !== undefined && currentLevelNum < 100 ? (
                <button
                  onClick={handlePlayNextLevel}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_4px_14px_rgba(16,185,129,0.3)] transform active:scale-95 transition-all flex items-center justify-center gap-2 border border-emerald-400/20"
                >
                  Next Level <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <p className="text-[10px] text-yellow-500 font-bold uppercase mb-2">🏆 You Completed All 100 Levels!</p>
              )}

              {/* Replay this level for 3 stars */}
              {earnedStars < 3 && (
                <button
                  onClick={handleRetryLevel}
                  className="w-full py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-bold text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RefreshCw className="w-3 h-3" /> Replay For 3 Stars
                </button>
              )}

              <button
                onClick={() => { sounds.playClick(); if (onExitLevelMode) onExitLevelMode(); }}
                className="w-full py-2.5 rounded-2xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Map className="w-3.5 h-3.5" /> Levels Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GORGEOUS LEVEL FAILURE GAME OVER OVERLAY */}
      {showLevelFailureOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className={`w-full max-w-xs rounded-3xl border border-red-500/30 bg-zinc-950 p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden`}>
            
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-bounce">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <h3 className="text-lg font-black tracking-widest text-white uppercase leading-none mb-1">
              Time Out!
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
              Level {currentLevelNum} Failed
            </p>

            <div className="w-full space-y-2 relative z-10">
              {/* RETRY BUTTON - Main Action */}
              <button
                onClick={handleRetryLevel}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-black text-xs uppercase tracking-widest shadow-[0_4px_14px_rgba(239,68,68,0.3)] transform active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-400/20 animate-pulse"
              >
                <RefreshCw className="w-4 h-4 animate-spin-slow" /> Retry Level
              </button>

              {/* BACK MAP BUTTON */}
              <button
                onClick={() => { sounds.playClick(); if (onExitLevelMode) onExitLevelMode(); }}
                className="w-full py-3 rounded-2xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 text-zinc-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Map className="w-3.5 h-3.5" /> Levels Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AdMob Rewarded Ads Player Simulator */}
      <AdMobSimulator 
        isOpen={isAdPlaying}
        adType="rewarded_skip"
        onAdCompleted={handleAdCompleted}
        onAdCancelled={handleAdCancelled}
      />

    </div>
  );
};
