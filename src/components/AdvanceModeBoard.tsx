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
  AlertOctagon
} from 'lucide-react';
import sounds from '../utils/audio';
import { useFirebase } from '../context/FirebaseContext';

interface AdvanceModeBoardProps {
  theme: any;
  onExit: () => void;
}

// Operators allowed
const OPERATORS = ['+', '-', '*', '/'];

// Safe evaluation with standard mathematical precedence
const evaluateAdvanceExpression = (a: number, b: number, c: number, op1: string, op2: string): number => {
  // Multiplication & Division take precedence over Addition & Subtraction
  const isOp1High = op1 === '*' || op1 === '/';
  const isOp2High = op2 === '*' || op2 === '/';

  if (isOp2High && !isOp1High) {
    // Evaluate (b op2 c) first, then (a op1 result)
    let subResult = 0;
    if (op2 === '*') subResult = b * c;
    if (op2 === '/') subResult = c !== 0 ? Math.floor(b / c) : b;

    if (op1 === '+') return a + subResult;
    if (op1 === '-') return a - subResult;
  } else {
    // Evaluate (a op1 b) first, then (result op2 c)
    let firstResult = 0;
    if (op1 === '+') firstResult = a + b;
    if (op1 === '-') firstResult = a - b;
    if (op1 === '*') firstResult = a * b;
    if (op1 === '/') firstResult = b !== 0 ? Math.floor(a / b) : a;

    if (op2 === '+') return firstResult + c;
    if (op2 === '-') return firstResult - c;
    if (op2 === '*') return firstResult * c;
    if (op2 === '/') return c !== 0 ? Math.floor(firstResult / c) : firstResult;
  }

  return 0;
};

// Generate a valid, solvable equation for Advance Mode
const generateSolvableEquation = () => {
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    const a = Math.floor(Math.random() * 12) + 2;
    const b = Math.floor(Math.random() * 10) + 2;
    const c = Math.floor(Math.random() * 8) + 1;

    const op1 = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    const op2 = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];

    // Ensure division results in whole integer and no negative numbers
    if (op1 === '/' && a % b !== 0) continue;
    
    // Check nested division precedence
    const isOp2High = op2 === '*' || op2 === '/';
    if (op2 === '/' && b % c !== 0) continue;
    if (op2 === '/' && !isOp2High && (a % b) !== 0) continue;

    const targetVal = evaluateAdvanceExpression(a, b, c, op1, op2);

    // Filter out extremely negative values or targets that are too big (>150)
    if (targetVal < 0 || targetVal > 150) continue;

    return {
      a,
      b,
      c,
      correctOp1: op1,
      correctOp2: op2,
      target: targetVal
    };
  }

  // Fallback default
  return { a: 5, b: 3, c: 2, correctOp1: '*', correctOp2: '+', target: 17 };
};

export const AdvanceModeBoard: React.FC<AdvanceModeBoardProps> = ({ theme, onExit }) => {
  const { submitScore, incrementStreakDirectly } = useFirebase();

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [lives, setLives] = useState<number>(3);
  const [muted, setMuted] = useState<boolean>(false);

  // Active equation values
  const [puzzle, setPuzzle] = useState(() => generateSolvableEquation());
  const [userOp1, setUserOp1] = useState<string | null>(null);
  const [userOp2, setUserOp2] = useState<string | null>(null);

  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    sounds.setMuted(muted);
  }, [muted]);

  // Main countdown timer
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    setTimeLeft(30);
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
  }, [puzzle, isPlaying, gameOver]);

  const handleTimeOut = () => {
    sounds.playFailure();
    setLives(prev => {
      const nextLives = prev - 1;
      if (nextLives <= 0) {
        triggerGameOver();
      } else {
        // Generate next puzzle on timeout
        nextRound(false);
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

  const nextRound = (isCorrect: boolean) => {
    setUserOp1(null);
    setUserOp2(null);
    setActiveSlot(1);
    setPuzzle(generateSolvableEquation());
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

    if (activeSlot === 1) {
      setUserOp1(op);
      setActiveSlot(2);
    } else {
      setUserOp2(op);
      // Evaluate solution immediately when both are filled
      const evaluated = evaluateAdvanceExpression(puzzle.a, puzzle.b, puzzle.c, userOp1 || op, op);

      if (evaluated === puzzle.target) {
        sounds.playSuccess();
        const scoreGain = 10 + (combo * 2);
        setScore(prev => prev + scoreGain);
        nextRound(true);
      } else {
        sounds.playFailure();
        setLives(prev => {
          const nextLives = prev - 1;
          if (nextLives <= 0) {
            triggerGameOver();
          } else {
            // Keep trying on the same puzzle but clear operator blanks
            setUserOp1(null);
            setUserOp2(null);
            setActiveSlot(1);
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
    setLives(3);
    setGameOver(false);
    setIsPlaying(true);
    setUserOp1(null);
    setUserOp2(null);
    setActiveSlot(1);
    setPuzzle(generateSolvableEquation());
  };

  return (
    <div className="w-full flex flex-col items-center select-none animate-fadeIn max-w-sm mx-auto px-4 justify-between h-full py-2">
      
      {/* HEADER SECTION */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={() => { sounds.playClick(); onExit(); }}
          className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all shadow-md shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-300" />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-black tracking-[0.2em] text-emerald-400 leading-none uppercase">
            Advance Mode
          </h2>
          <span className="text-[7px] text-zinc-500 uppercase tracking-widest mt-1 block">
            Offline Arcade Speedrun
          </span>
        </div>

        <button
          onClick={() => setMuted(!muted)}
          className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 transition-all shadow-md shrink-0"
        >
          {muted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* GAME RUN STATS BAR */}
      {!gameOver && (
        <div className="w-full grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-900 mb-4 text-center">
          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-500 uppercase tracking-wider">Score</span>
            <span className="text-sm font-black text-white font-mono">{score}</span>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart 
                  key={i} 
                  className={`w-4 h-4 ${i < lives ? 'text-red-500 fill-current animate-pulse' : 'text-zinc-800'}`} 
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[7px] text-zinc-500 uppercase tracking-wider">Timer</span>
            <span className={`text-sm font-black font-mono ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {/* GAMEPLAY VIEWPORTS */}
      {!gameOver ? (
        <div className="flex-1 flex flex-col justify-center items-center w-full py-4 shrink-0">
          
          {/* Main Equation Workspace Card */}
          <div className="w-full p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-2xl relative mb-6">
            
            {combo > 1 && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                <Sparkles className="w-3 h-3 fill-current" /> {combo}X Combo!
              </div>
            )}

            <div className="text-center mb-1 text-[8px] uppercase tracking-widest font-bold text-zinc-500">
              Fill in the Operators
            </div>

            {/* THE FORMULA WORKSPACE */}
            <div className="flex items-center justify-center gap-2.5 font-mono text-xl py-6 select-none leading-none">
              
              {/* Number A */}
              <span className="font-black text-white">{puzzle.a}</span>

              {/* Slot 1 Box */}
              <button
                onClick={() => { sounds.playClick(); setActiveSlot(1); }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base font-black transition-all ${
                  activeSlot === 1 
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : (userOp1 ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-2 border-dashed border-zinc-800 text-zinc-700')
                }`}
              >
                {userOp1 || '?'}
              </button>

              {/* Number B */}
              <span className="font-black text-white">{puzzle.b}</span>

              {/* Slot 2 Box */}
              <button
                onClick={() => { sounds.playClick(); setActiveSlot(2); }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center text-base font-black transition-all ${
                  activeSlot === 2 
                    ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : (userOp2 ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-2 border-dashed border-zinc-800 text-zinc-700')
                }`}
              >
                {userOp2 || '?'}
              </button>

              {/* Number C */}
              <span className="font-black text-white">{puzzle.c}</span>

              {/* Equals */}
              <span className="text-zinc-600 font-sans">=</span>

              {/* Solved Target */}
              <span className="font-black text-cyan-400 filter drop-shadow-[0_0_6px_#06b6d4]">
                {puzzle.target}
              </span>

            </div>

          </div>

          {/* CHOOSE OPERATOR OPERAND KEYS GRID */}
          <div className="grid grid-cols-4 gap-3 w-full bg-black/45 border border-zinc-900/60 p-3 rounded-2xl">
            {OPERATORS.map((op) => (
              <button
                key={op}
                onClick={() => handleOperatorClick(op)}
                className="aspect-square rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-400 text-white font-black text-xl flex items-center justify-center shadow-lg active:scale-90 transition-all font-mono"
              >
                {op}
              </button>
            ))}
          </div>

        </div>
      ) : (
        /* GAME OVER SCREEN */
        <div className="flex-1 flex flex-col justify-center items-center w-full py-4 shrink-0 animate-fadeIn">
          <div className="w-full max-w-xs rounded-3xl border border-red-500/20 bg-zinc-950/95 p-6 text-center shadow-2xl flex flex-col items-center">
            
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4 animate-shake">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black tracking-widest text-red-400 uppercase leading-none mb-1">
              GAME OVER
            </h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
              You ran out of lives!
            </p>

            <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl w-full mb-6 text-left font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-500">Final Score:</span>
                <span className="text-emerald-400 font-bold">{score} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Highest Combo:</span>
                <span className="text-zinc-300 font-bold">{combo} Max</span>
              </div>
            </div>

            <div className="w-full space-y-2.5">
              <button
                onClick={handleResetGame}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
              >
                Try Again
              </button>

              <button
                onClick={() => { sounds.playClick(); onExit(); }}
                className="w-full py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white text-[10px] uppercase font-black tracking-widest transition-all active:scale-95"
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

    </div>
  );
};
