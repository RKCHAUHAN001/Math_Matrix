/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Zap, 
  CheckCircle2, 
  ChevronLeft, 
  Heart, 
  Award, 
  Timer, 
  Sparkles,
  Play,
  AlertOctagon,
  Flame
} from 'lucide-react';
import sounds from '../utils/audio';
import { useFirebase } from '../context/FirebaseContext';
import { AdMobSimulator } from './AdMobSimulator';

interface AdvanceModeBoardProps {
  theme: any;
  onExit: () => void;
}

// Operators allowed
const OPERATORS = ['+', '-', '*', '/'];

// Safe evaluation of any size expression following standard PEMDAS order of operations
const evaluateAdvanceExpressionAny = (numbers: number[], operators: string[]): number => {
  let nums = [...numbers];
  let ops = [...operators];

  // First pass: Multiplication and Division
  let i = 0;
  while (i < ops.length) {
    if (ops[i] === '*' || ops[i] === '/') {
      const a = nums[i];
      const b = nums[i + 1];
      let res = 0;
      if (ops[i] === '*') res = a * b;
      if (ops[i] === '/') res = b !== 0 ? Math.floor(a / b) : a;
      
      nums.splice(i, 2, res);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  // Second pass: Addition and Subtraction
  i = 0;
  while (i < ops.length) {
    if (ops[i] === '+' || ops[i] === '-') {
      const a = nums[i];
      const b = nums[i + 1];
      let res = 0;
      if (ops[i] === '+') res = a + b;
      if (ops[i] === '-') res = a - b;
      
      nums.splice(i, 2, res);
      ops.splice(i, 1);
    } else {
      i++;
    }
  }

  return nums[0] || 0;
};

// Generate a valid, solvable equation for Advance Mode of any size
const generateSolvableEquationAny = (numCount: number) => {
  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    const numbers: number[] = [];
    for (let i = 0; i < numCount; i++) {
      if (i === 0) {
        numbers.push(Math.floor(Math.random() * 12) + 2); // 2 to 13
      } else {
        numbers.push(Math.floor(Math.random() * 8) + 1); // 1 to 8
      }
    }

    const operators: string[] = [];
    for (let i = 0; i < numCount - 1; i++) {
      operators.push(OPERATORS[Math.floor(Math.random() * OPERATORS.length)]);
    }

    // Ensure division results in a clean integer at each step to avoid decimals and fractions
    let hasFractionalDivision = false;
    let tempNums = [...numbers];
    let tempOps = [...operators];

    let i = 0;
    while (i < tempOps.length) {
      if (tempOps[i] === '/') {
        if (tempNums[i + 1] === 0 || tempNums[i] % tempNums[i + 1] !== 0) {
          hasFractionalDivision = true;
          break;
        }
        tempNums.splice(i, 2, Math.floor(tempNums[i] / tempNums[i + 1]));
        tempOps.splice(i, 1);
      } else if (tempOps[i] === '*') {
        tempNums.splice(i, 2, tempNums[i] * tempNums[i + 1]);
        tempOps.splice(i, 1);
      } else {
        i++;
      }
    }

    if (hasFractionalDivision) continue;

    const targetVal = evaluateAdvanceExpressionAny(numbers, operators);

    // Filter out negative values or targets that are too big
    if (targetVal < 0 || targetVal > 150) continue;

    return {
      numbers,
      correctOperators: operators,
      target: targetVal
    };
  }

  // Fallbacks
  if (numCount === 4) {
    return { numbers: [12, 4, 3, 1], correctOperators: ['/', '*', '-'], target: 8 };
  } else if (numCount === 5) {
    return { numbers: [8, 2, 5, 5, 8], correctOperators: ['/', '*', '+', '-'], target: 17 };
  }
  return { numbers: [5, 3, 2], correctOperators: ['*', '+'], target: 17 };
};

export const AdvanceModeBoard: React.FC<AdvanceModeBoardProps> = ({ theme, onExit }) => {
  const { submitScore, addTierPoints, addSticks, profile } = useFirebase();

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [runSticks, setRunSticks] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [lives, setLives] = useState<number>(3);
  const [muted, setMuted] = useState<boolean>(false);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);

  // Active equation values
  const [puzzle, setPuzzle] = useState(() => generateSolvableEquationAny(3));
  const [userOperators, setUserOperators] = useState<(string | null)[]>(() => Array(2).fill(null));
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  
  const [gameOver, setGameOver] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    sounds.setMuted(muted);
  }, [muted]);

  // Main countdown timer
  useEffect(() => {
    if (!isPlaying || gameOver || isAdPlaying) return;

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [puzzle, isPlaying, gameOver, isAdPlaying]);

  // Progressive difficulty logic: 3, 4, or 5 numbers based on current score or remaining time
  const getRequiredNumCount = (currScore: number, currTime: number) => {
    if (currScore >= 100 || currTime <= 6) {
      return 5;
    } else if (currScore >= 50 || currTime <= 12) {
      return 4;
    }
    return 3;
  };

  const handleTimeOut = () => {
    sounds.playFailure();
    setLives(prev => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        triggerGameOver();
      } else {
        // Generate next puzzle on timeout
        nextRound(false, score, 20);
      }
      return nextLives;
    });
  };

  const triggerGameOver = () => {
    setGameOver(true);
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    submitScore(score, 'insane', 3); // Report highscore under insane/advanced difficulties category
  };

  const nextRound = (isCorrect: boolean, nextScore: number, nextTimeLeft: number) => {
    const numCount = getRequiredNumCount(nextScore, nextTimeLeft);
    const nextPuzzle = generateSolvableEquationAny(numCount);
    setPuzzle(nextPuzzle);
    setTimeLeft(20);
    setUserOperators(Array(numCount - 1).fill(null));
    setActiveSlotIndex(0);
    if (isCorrect) {
      setCombo(prev => prev + 1);
    } else {
      setCombo(0);
    }
  };

  // Add operator click handler
  const handleOperatorClick = (op: string) => {
    if (gameOver) return;
    sounds.playClick();

    const updatedOps = [...userOperators];
    updatedOps[activeSlotIndex] = op;
    setUserOperators(updatedOps);

    // Look for any remaining empty slots
    const nextEmptyIndex = updatedOps.findIndex(o => o === null);

    if (nextEmptyIndex !== -1) {
      setActiveSlotIndex(nextEmptyIndex);
    } else {
      // Evaluate solution immediately when all slots are filled
      const evaluated = evaluateAdvanceExpressionAny(puzzle.numbers, updatedOps as string[]);

      if (evaluated === puzzle.target) {
        sounds.playSuccess();
        // Advance Mode: 2 tier points each puzzle
        addTierPoints(2);
        // Player gets 1 stick for each puzzle solved in Advance Mode!
        addSticks(1);
        setRunSticks(prev => prev + 1);
        const scoreGain = 10 + (combo * 2);
        const nextScore = score + scoreGain;
        setScore(nextScore);
        nextRound(true, nextScore, timeLeft);
      } else {
        sounds.playFailure();
        setLives(prev => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            triggerGameOver();
          } else {
            // Keep trying on the same puzzle but clear operator blanks
            setUserOperators(Array(puzzle.numbers.length - 1).fill(null));
            setActiveSlotIndex(0);
          }
          return nextLives;
        });
        setCombo(0);
      }
    }
  };

  const handleResetGame = () => {
    sounds.playClick();
    setScore(0);
    setCombo(0);
    setRunSticks(0);
    setLives(3);
    setTimeLeft(20);
    setGameOver(false);
    setIsPlaying(true);
    const nextPuzzle = generateSolvableEquationAny(3);
    setPuzzle(nextPuzzle);
    setUserOperators(Array(2).fill(null));
    setActiveSlotIndex(0);
  };

  const numCount = puzzle.numbers.length;

  return (
    <div className="w-full flex flex-col items-center select-none animate-fadeIn max-w-sm mx-auto px-4 justify-between h-full py-2">
      
      {/* HEADER SECTION */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={() => { sounds.playClick(); onExit(); }}
          className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 active:scale-95 hover:bg-zinc-50 transition-all shadow-sm shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-600" />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-black tracking-[0.2em] text-zinc-900 leading-none uppercase">
            Advance Mode
          </h2>
          <span className="text-[7px] text-zinc-500 uppercase tracking-widest mt-1 block">
            Offline Arcade Speedrun ({numCount} Numbers)
          </span>
        </div>

        <button
          onClick={() => setMuted(!muted)}
          className="w-9 h-9 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-700 active:scale-95 hover:bg-zinc-50 transition-all shadow-sm shrink-0"
        >
          {muted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-blue-600" />}
        </button>
      </div>

      {/* GAME RUN STATS BAR */}
      {!gameOver && (
        <div className="w-full grid grid-cols-4 gap-2 p-2.5 rounded-2xl bg-white border border-zinc-200/90 mb-4 text-center items-center shadow-sm">
          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-400 uppercase tracking-wider">Score</span>
            <span className="text-sm font-black text-zinc-900 font-mono">{score}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[7px] text-amber-600 uppercase tracking-wider font-bold">Sticks</span>
            <span className="text-xs font-black text-amber-600 font-mono flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" /> {(profile?.sticks || 0)}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-3.5 h-3.5 ${i < lives ? 'text-red-500 fill-current animate-pulse' : 'text-zinc-200'}`} 
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-400 uppercase tracking-wider">Timer</span>
            <span className={`text-sm font-black font-mono ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* GAMEPLAY VIEWPORTS */}
      {!gameOver ? (
        <div className="flex-1 flex flex-col justify-center items-center w-full py-4 shrink-0">
          
          {/* Main Equation Workspace Card - High Visibility Studio HUD */}
          <div className="w-full p-5 rounded-3xl bg-[#f7f7f7] border border-zinc-200/90 shadow-sm relative mb-5">
            
            {combo > 1 && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                <Sparkles className="w-3 h-3 fill-current" /> {combo}X Combo!
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
              <span className="text-[9px] uppercase tracking-[0.25em] font-black text-zinc-600">
                INSERT OPERATORS EQUATION
              </span>
            </div>

            {/* THE FORMULA WORKSPACE */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 font-mono py-4 px-2 rounded-2xl bg-white border border-zinc-200/90 shadow-sm select-none leading-none">
              
              {puzzle.numbers.map((num, idx) => (
                <React.Fragment key={idx}>
                  <span className="font-black text-zinc-900 text-2xl md:text-3xl px-1">{num}</span>
                  {idx < puzzle.numbers.length - 1 && (
                    <button
                      onClick={() => { sounds.playClick(); setActiveSlotIndex(idx); }}
                      className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl border-2 flex items-center justify-center text-lg md:text-xl font-black transition-all ${
                        activeSlotIndex === idx 
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm scale-110' 
                          : (userOperators[idx] 
                              ? 'border-sky-400 bg-sky-50 text-sky-600 shadow-sm' 
                              : 'border-dashed border-zinc-400 bg-zinc-100 text-zinc-600 animate-pulse')
                      }`}
                    >
                      {userOperators[idx] || '?'}
                    </button>
                  )}
                </React.Fragment>
              ))}

              {/* Equals */}
              <span className="text-zinc-600 font-mono font-black text-2xl md:text-3xl mx-1">=</span>

              {/* Solved Target */}
              <span className="px-3 py-1 rounded-2xl bg-white border border-zinc-200 font-black text-2xl md:text-3xl font-mono text-blue-600 shadow-sm">
                {puzzle.target}
              </span>

            </div>

          </div>

          {/* CHOOSE OPERATOR OPERAND KEYS GRID */}
          <div className="grid grid-cols-4 gap-3 w-full bg-white border border-zinc-200/90 p-3 rounded-2xl shadow-sm">
            {OPERATORS.map((op) => (
              <button
                key={op}
                onClick={() => handleOperatorClick(op)}
                className="aspect-square rounded-2xl bg-[#f7f7f7] border border-zinc-200 hover:border-blue-500 hover:text-blue-600 text-zinc-800 font-black text-xl flex items-center justify-center shadow-sm active:scale-90 transition-all font-mono"
              >
                {op}
              </button>
            ))}
          </div>

        </div>
      ) : (
        /* GAME OVER SCREEN */
        <div className="flex-1 flex flex-col justify-center items-center w-full py-4 shrink-0 animate-fadeIn">
          <div className="w-full max-w-xs rounded-3xl border border-zinc-200/90 bg-[#f7f7f7] p-6 text-center shadow-xl flex flex-col items-center text-zinc-900">
            
            <div className="w-14 h-14 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-500 mb-4 animate-shake">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black tracking-widest text-red-500 uppercase leading-none mb-1">
              GAME OVER
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
              You ran out of lives!
            </p>

            <div className="p-3.5 bg-white border border-zinc-200 rounded-2xl w-full mb-6 text-left font-mono text-xs space-y-1.5 shadow-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Final Score:</span>
                <span className="text-zinc-900 font-bold">{score} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Highest Combo:</span>
                <span className="text-zinc-700 font-bold">{combo} Max</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 mt-1">
                <span className="text-amber-600 flex items-center gap-1 font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" /> Sticks Earned:
                </span>
                <span className="text-amber-600 font-bold">+{runSticks} (Total: {profile?.sticks || 0})</span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <button
                onClick={() => { sounds.playClick(); setIsAdPlaying(true); }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border border-amber-400/20"
              >
                📺 Watch Ad to Resume Game
              </button>

              <button
                onClick={handleResetGame}
                className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border border-sky-400/20"
              >
                Try Again (Restart)
              </button>

              <button
                onClick={() => { sounds.playClick(); onExit(); }}
                className="w-full py-3 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 shadow-sm"
              >
                Exit to Menu
              </button>
            </div>

          </div>
        </div>
      )}

      {/* FOOTER CONTROLS HELPER */}
      {!gameOver && (
        <div className="text-center py-2 shrink-0 select-none">
          <p className="text-[8px] uppercase tracking-widest text-zinc-600 font-bold">
            Select operators to match the target equation
          </p>
        </div>
      )}

      {/* AdMob Rewarded Resume Ad Simulator */}
      <AdMobSimulator 
        isOpen={isAdPlaying}
        adType="rewarded_advance_resume"
        onAdCompleted={() => {
          setIsAdPlaying(false);
          setLives(3);
          setTimeLeft(20);
          setGameOver(false);
          setIsPlaying(true);
          const numCount = getRequiredNumCount(score, 30);
          const nextPuzzle = generateSolvableEquationAny(numCount);
          setPuzzle(nextPuzzle);
          setUserOperators(Array(numCount - 1).fill(null));
          setActiveSlotIndex(0);
          sounds.playSuccess();
        }}
        onAdCancelled={() => {
          setIsAdPlaying(false);
          sounds.playFailure();
        }}
      />

    </div>
  );
};
