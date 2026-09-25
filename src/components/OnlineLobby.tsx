/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  User, 
  HelpCircle, 
  Loader2, 
  Globe, 
  Plus, 
  Key, 
  ArrowRight, 
  Trophy, 
  X,
  Play,
  RotateCcw,
  Zap,
  CheckCircle,
  AlertOctagon,
  Copy,
  Check,
  Bot,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Timer,
  Award,
  Swords
} from 'lucide-react';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import sounds from '../utils/audio';
import { useFirebase } from '../context/FirebaseContext';
import { AdMobSimulator } from './AdMobSimulator';

// Hard difficulty formulas for Normal Mode
const HARD_FORMULAS = [
  { size: 3, display: "[A] * [B] - [C]" },
  { size: 3, display: "([A] - [B]) * [C]" },
  { size: 3, display: "[A] * [B] + [C]" }
];

const OPERATORS = ['+', '-', '*', '/'];

// Normal Mode formula evaluator
const evaluateFormula = (formulaDisplay: string, operands: number[]): number => {
  if (operands.length < 3) return 0;
  if (formulaDisplay === "[A] * [B] - [C]") {
    return operands[0] * operands[1] - operands[2];
  } else if (formulaDisplay === "([A] - [B]) * [C]") {
    return (operands[0] - operands[1]) * operands[2];
  } else if (formulaDisplay === "[A] * [B] + [C]") {
    return operands[0] * operands[1] + operands[2];
  }
  return 0;
};

// Normal Mode puzzle generator
const generateNewPuzzle = () => {
  const formula = HARD_FORMULAS[Math.floor(Math.random() * HARD_FORMULAS.length)];
  const grid: number[] = [];
  for (let i = 0; i < 16; i++) {
    grid.push(Math.floor(Math.random() * 15) + 1);
  }
  
  const solvedIndices: number[] = [];
  while (solvedIndices.length < formula.size) {
    const randIdx = Math.floor(Math.random() * 16);
    if (!solvedIndices.includes(randIdx)) solvedIndices.push(randIdx);
  }
  
  const operands = solvedIndices.map(idx => grid[idx]);
  const targetVal = evaluateFormula(formula.display, operands);

  return {
    grid,
    target: targetVal,
    formulaDisplay: formula.display,
    formulaSize: formula.size
  };
};

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

// Advance Mode puzzle generator of any size
const generateNewAdvancePuzzle = (numCount: number) => {
  let attempts = 0;
  while (attempts < 200) {
    attempts++;
    const numbers: number[] = [];
    for (let i = 0; i < numCount; i++) {
      if (i === 0) {
        numbers.push(Math.floor(Math.random() * 12) + 2);
      } else {
        numbers.push(Math.floor(Math.random() * 8) + 1);
      }
    }

    const operators: string[] = [];
    for (let i = 0; i < numCount - 1; i++) {
      operators.push(OPERATORS[Math.floor(Math.random() * OPERATORS.length)]);
    }

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

    if (targetVal < 0 || targetVal > 150) continue;

    return {
      numbers,
      target: targetVal
    };
  }

  if (numCount === 4) {
    return { numbers: [12, 4, 3, 1], target: 8 };
  } else if (numCount === 5) {
    return { numbers: [8, 2, 5, 5, 8], target: 17 };
  }
  return { numbers: [5, 3, 2], target: 17 };
};

// Scale multiplayer puzzle size progressively based on scores and remaining time
const getRequiredOnlineAdvanceNumCount = (score1: number, score2: number, tLeft: number) => {
  const maxScore = Math.max(score1 || 0, score2 || 0);
  if (maxScore >= 100 || tLeft <= 60) {
    return 5;
  } else if (maxScore >= 50 || tLeft <= 90) {
    return 4;
  }
  return 3;
};

interface OnlineLobbyProps {
  user: any;
  profile: any;
  theme: any;
  onClose: () => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({ user, profile, theme, onClose }) => {
  const { incrementTrophyDirectly } = useFirebase();
  const [onlineSubMode, setOnlineSubMode] = useState<'lobby' | 'matchmaking' | 'room_waiting' | 'room_join' | 'game_active' | 'game_over'>('lobby');
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);
  const [pendingRematchData, setPendingRematchData] = useState<any>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [rulesCopied, setRulesCopied] = useState<boolean>(false);
  const [trophyAwarded, setTrophyAwarded] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [matchSearchSeconds, setMatchSearchSeconds] = useState<number>(0);
  const [isBotMatch, setIsBotMatch] = useState<boolean>(false);

  // Mode state: 'normal' vs 'advance'
  const [playMode, setPlayMode] = useState<'normal' | 'advance'>('normal');
  const [lobbyStep, setLobbyStep] = useState<'choose_mode' | 'choose_action'>('choose_mode');

  // Rematch-specific states
  const [isRematchRequestedByMe, setIsRematchRequestedByMe] = useState<boolean>(false);
  const [isRematchRequestReceived, setIsRematchRequestReceived] = useState<boolean>(false);
  const [rematchDeclinedMessage, setRematchDeclinedMessage] = useState<string | null>(null);

  // Match Time left (2 minutes speedrun)
  const [timeLeft, setTimeLeft] = useState<number>(120);

  // Normal mode cell selection indices, or Advance mode operator selections
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [advanceSelections, setAdvanceSelections] = useState<string[]>([]);

  // Stable round reference tracking to clear local UI reliably
  const lastRoundRef = useRef<number>(1);

  // Persistent Guest ID to avoid changes between renders
  const persistentGuestIdRef = useRef<string | null>(null);
  if (!persistentGuestIdRef.current) {
    const cached = localStorage.getItem('MATH_MATRIX_PERSISTENT_GUEST_ID');
    if (cached) {
      persistentGuestIdRef.current = cached;
    } else {
      const newId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('MATH_MATRIX_PERSISTENT_GUEST_ID', newId);
      persistentGuestIdRef.current = newId;
    }
  }

  const currentUid = user?.uid && user.uid !== 'guest_user' ? user.uid : (profile?.uid || persistentGuestIdRef.current);
  const currentDisplayName = profile?.displayName || user?.displayName || 'Matrix Explorer';

  const activeMatchIdRef = useRef<string | null>(null);
  activeMatchIdRef.current = activeMatchId;

  const onlineSubModeRef = useRef<string>(onlineSubMode);
  onlineSubModeRef.current = onlineSubMode;

  const playModeRef = useRef<'normal' | 'advance'>(playMode);
  playModeRef.current = playMode;

  // Search timer during matchmaking
  useEffect(() => {
    let interval: any = null;
    if (onlineSubMode === 'matchmaking') {
      setMatchSearchSeconds(0);
      interval = setInterval(() => {
        setMatchSearchSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [onlineSubMode]);

  // AI Bot solver simulation
  useEffect(() => {
    let botTimer: any = null;
    if (isBotMatch && onlineSubMode === 'game_active' && matchData && matchData.status === 'active') {
      const solveTimeMs = Math.floor(Math.random() * 10000) + 18000;
      botTimer = setTimeout(() => {
        if (onlineSubModeRef.current === 'game_active') {
          const currentBotScore = matchData.player2Score || 0;
          let updatedMatch = {};

          if (matchData.playMode === 'advance') {
            const nextCount = getRequiredOnlineAdvanceNumCount(matchData.player1Score || 0, currentBotScore + 1, timeLeft);
            const nextPuzzle = generateNewAdvancePuzzle(nextCount);
            updatedMatch = {
              ...matchData,
              player2Score: currentBotScore + 1,
              player2Selection: [],
              player1Selection: [],
              advanceA: nextPuzzle.numbers[0],
              advanceB: nextPuzzle.numbers[1],
              advanceC: nextPuzzle.numbers[2],
              advanceD: nextCount >= 4 ? nextPuzzle.numbers[3] : null,
              advanceE: nextCount >= 5 ? nextPuzzle.numbers[4] : null,
              target: nextPuzzle.target,
              currentRound: (matchData.currentRound || 1) + 1
            };
          } else {
            const nextPuzzle = generateNewPuzzle();
            updatedMatch = {
              ...matchData,
              player2Score: currentBotScore + 1,
              player2Selection: [],
              player1Selection: [],
              grid: nextPuzzle.grid,
              target: nextPuzzle.target,
              formulaDisplay: nextPuzzle.formulaDisplay,
              formulaSize: nextPuzzle.formulaSize,
              currentRound: (matchData.currentRound || 1) + 1
            };
          }
          
          sounds.playFailure();
          setMatchData(updatedMatch);
          setSelectedIndices([]);
          setAdvanceSelections([]);
        }
      }, solveTimeMs);
    }
    return () => {
      if (botTimer) clearTimeout(botTimer);
    };
  }, [isBotMatch, onlineSubMode, matchData]);

  // Game timer countdown logic (120 seconds duration)
  useEffect(() => {
    if (onlineSubMode !== 'game_active' || !matchData) return;

    const timerInterval = setInterval(async () => {
      const now = Date.now();
      const expiresAt = matchData.expiresAt || (now + 120000);
      const remaining = Math.max(0, Math.round((expiresAt - now) / 1000));
      
      setTimeLeft(remaining);

      // When match timer expires, complete the match
      if (remaining === 0) {
        clearInterval(timerInterval);
        
        if (isBotMatch) {
          const finalMatch = {
            ...matchData,
            status: 'completed',
            winnerId: matchData.player1Score > matchData.player2Score 
              ? currentUid 
              : matchData.player1Score < matchData.player2Score ? 'bot_ai' : 'draw',
            winnerName: matchData.player1Score > matchData.player2Score 
              ? currentDisplayName 
              : matchData.player1Score < matchData.player2Score ? 'AI Matrix Bot 🤖' : 'Tied Duel'
          };
          setMatchData(finalMatch);
          setOnlineSubMode('game_over');
          if (finalMatch.winnerId === currentUid) {
            sounds.playSuccess();
            incrementTrophyDirectly();
          } else {
            sounds.playFailure();
          }
        } else if (isCreator) {
          try {
            const matchRef = doc(db, 'matches', activeMatchId!);
            const p1Score = matchData.player1Score || 0;
            const p2Score = matchData.player2Score || 0;
            const winnerId = p1Score > p2Score ? matchData.player1Id : p1Score < p2Score ? matchData.player2Id : 'draw';
            const winnerName = p1Score > p2Score ? matchData.player1Name : p1Score < p2Score ? matchData.player2Name : 'Tied Duel';
            
            await updateDoc(matchRef, {
              status: 'completed',
              winnerId,
              winnerName,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Error setting game timer complete:", err);
          }
        }
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [onlineSubMode, matchData, isBotMatch, isCreator, currentUid, currentDisplayName, activeMatchId]);

  // Real-Time Match Data Synchronizer
  useEffect(() => {
    if (!activeMatchId || isBotMatch) return;

    let isSubscribed = true;
    const matchRef = doc(db, 'matches', activeMatchId);
    
    const unsubscribe = onSnapshot(matchRef, (snapshot) => {
      if (!isSubscribed) return;

      if (snapshot.exists()) {
        const data = snapshot.data();
        setMatchData(data);

        // Transition from matchmaking/waiting to game_active when opponent joins
        if (data.status === 'active' && (onlineSubModeRef.current === 'matchmaking' || onlineSubModeRef.current === 'room_waiting')) {
          sounds.playSuccess();
          lastRoundRef.current = 1;
          setSelectedIndices([]);
          setAdvanceSelections([]);
          setTimeLeft(120);
          setOnlineSubMode('game_active');
        }

        // Rematch triggered -> transition back to active
        if (data.status === 'active' && onlineSubModeRef.current === 'game_over') {
          sounds.playSuccess();
          setPendingRematchData(data);
          setIsAdPlaying(true);
        }

        // Detect new round (currentRound advanced) -> clear local cells/operators selections
        if (data.currentRound > lastRoundRef.current) {
          lastRoundRef.current = data.currentRound;
          setSelectedIndices([]);
          setAdvanceSelections([]);
          sounds.playSuccess();
        }

        // Match Completed
        if (data.status === 'completed') {
          setOnlineSubMode('game_over');
          if (data.winnerId === currentUid) {
            sounds.playSuccess();
            if (!trophyAwarded) {
              setTrophyAwarded(true);
              incrementTrophyDirectly();
            }
          } else if (data.winnerId === 'draw') {
            sounds.playSuccess();
          } else {
            sounds.playFailure();
          }

          // Handle Rematch Requests in Real-Time
          if (data.rematchRequestedBy) {
            if (data.rematchRequestedBy === currentUid) {
              setIsRematchRequestedByMe(true);
              setIsRematchRequestReceived(false);
            } else {
              setIsRematchRequestedByMe(false);
              setIsRematchRequestReceived(true);
              sounds.playSuccess();
            }
          } else {
            setIsRematchRequestedByMe(false);
            setIsRematchRequestReceived(false);
          }

          if (data.rematchDeclined) {
            setRematchDeclinedMessage("Challenger declined the rematch request.");
            setIsRematchRequestedByMe(false);
            setIsRematchRequestReceived(false);
          }
        }

        // Abandoned match / Rage quit -> instant victory for the remaining player!
        if (data.status === 'abandoned') {
          sounds.playSuccess();
          setMatchData({
            ...data,
            status: 'completed',
            winnerId: currentUid,
            winnerName: currentDisplayName,
            abandonedByOpponent: true
          });
          setOnlineSubMode('game_over');
        }
      }
    }, (err) => {
      console.warn("Active match subscription warning:", err);
      if (err?.code === 'permission-denied') {
        setShowRulesModal(true);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeMatchId, isBotMatch, currentUid, currentDisplayName, trophyAwarded, incrementTrophyDirectly]);

  // Matchmaking Continuous Finder (Separates queues cleanly by playMode!)
  useEffect(() => {
    if (onlineSubMode !== 'matchmaking' || isBotMatch) return;

    let isSubscribed = true;
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef, 
      where('type', '==', 'random'), 
      where('status', '==', 'waiting'),
      where('playMode', '==', playMode) // Segment matching cleanly!
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!isSubscribed || onlineSubModeRef.current !== 'matchmaking') return;

      const otherMatches = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() as any }))
        .filter(m => m.player1Id !== currentUid && m.id !== activeMatchIdRef.current);

      if (otherMatches.length > 0) {
        const targetMatch = otherMatches[0];
        try {
          const targetRef = doc(db, 'matches', targetMatch.id);
          
          await updateDoc(targetRef, {
            player2Id: currentUid,
            player2Name: currentDisplayName,
            status: 'active',
            expiresAt: Date.now() + 120000,
            updatedAt: serverTimestamp()
          });

          if (!isSubscribed) return;

          setActiveMatchId(targetMatch.id);
          setMatchData({
            ...targetMatch,
            player2Id: currentUid,
            player2Name: currentDisplayName,
            status: 'active',
            expiresAt: Date.now() + 120000
          });
          setIsCreator(false);
          sounds.playSuccess();
          setOnlineSubMode('game_active');
        } catch (err: any) {
          console.warn("Matchmaking connect error:", err);
          if (err?.code === 'permission-denied') {
            setShowRulesModal(true);
          }
        }
      }
    }, (err) => {
      console.warn("Queue loop note:", err);
      if (err?.code === 'permission-denied') {
        setShowRulesModal(true);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [onlineSubMode, isBotMatch, currentUid, currentDisplayName, playMode]);

  const resetToLobby = () => {
    setActiveMatchId(null);
    setMatchData(null);
    setSelectedIndices([]);
    setAdvanceSelections([]);
    setIsCreator(false);
    setTrophyAwarded(false);
    setIsBotMatch(false);
    setTimeLeft(120);
    setIsRematchRequestedByMe(false);
    setIsRematchRequestReceived(false);
    setRematchDeclinedMessage(null);
    setLobbyStep('choose_mode');
    setOnlineSubMode('lobby');
  };

  const handleAbortMatch = async () => {
    const targetId = activeMatchIdRef.current;
    if (targetId && !isBotMatch) {
      try {
        const matchRef = doc(db, 'matches', targetId);
        await updateDoc(matchRef, { status: 'abandoned', updatedAt: serverTimestamp() });
      } catch (err) {
        console.warn("Error setting abort status: ", err);
      }
    }
    resetToLobby();
  };

  // RANDOM MATCHMAKING ENGINE
  const handleStartRandomMatchmaking = async () => {
    sounds.playClick();
    setErrorMessage(null);
    setIsBotMatch(false);

    const newMatchId = 'rand_' + currentUid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) + '_' + Math.random().toString(36).substring(2, 6);
    
    let newMatchPayload: any = {
      matchId: newMatchId,
      type: 'random',
      playMode: playMode,
      status: 'waiting',
      player1Id: currentUid,
      player1Name: currentDisplayName,
      player2Id: null,
      player2Name: null,
      winnerId: null,
      winnerName: null,
      player1Score: 0,
      player2Score: 0,
      player1Selection: [],
      player2Selection: [],
      currentRound: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (playMode === 'advance') {
      const puzzle = generateNewAdvancePuzzle(3);
      newMatchPayload.advanceA = puzzle.numbers[0];
      newMatchPayload.advanceB = puzzle.numbers[1];
      newMatchPayload.advanceC = puzzle.numbers[2];
      newMatchPayload.advanceD = null;
      newMatchPayload.advanceE = null;
      newMatchPayload.target = puzzle.target;
      newMatchPayload.grid = OPERATORS;
    } else {
      const puzzle = generateNewPuzzle();
      newMatchPayload.grid = puzzle.grid;
      newMatchPayload.target = puzzle.target;
      newMatchPayload.formulaDisplay = puzzle.formulaDisplay;
      newMatchPayload.formulaSize = puzzle.formulaSize;
    }

    setActiveMatchId(newMatchId);
    setMatchData(newMatchPayload);
    setIsCreator(true);
    setOnlineSubMode('matchmaking');

    try {
      const matchesRef = collection(db, 'matches');
      const q = query(
        matchesRef, 
        where('type', '==', 'random'), 
        where('status', '==', 'waiting'),
        where('playMode', '==', playMode)
      );
      const snapshot = await getDocs(q);

      const waitingMatches = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() as any }))
        .filter(m => m.player1Id !== currentUid);

      if (waitingMatches.length > 0) {
        const chosenMatch = waitingMatches[0];
        const matchRef = doc(db, 'matches', chosenMatch.id);
        
        await updateDoc(matchRef, {
          player2Id: currentUid,
          player2Name: currentDisplayName,
          status: 'active',
          expiresAt: Date.now() + 120000,
          updatedAt: serverTimestamp()
        });

        setActiveMatchId(chosenMatch.id);
        setMatchData({
          ...chosenMatch,
          player2Id: currentUid,
          player2Name: currentDisplayName,
          status: 'active',
          expiresAt: Date.now() + 120000
        });
        setIsCreator(false);
        setOnlineSubMode('game_active');
        sounds.playSuccess();
      } else {
        const matchRef = doc(db, 'matches', newMatchId);
        await setDoc(matchRef, newMatchPayload);
      }
    } catch (err: any) {
      console.warn("Queue registry issue:", err);
      if (err?.code === 'permission-denied') {
        setShowRulesModal(true);
      }
    }
  };

  // Launch simulated Bot duel
  const handleStartBotDuel = () => {
    sounds.playSuccess();
    setErrorMessage(null);
    setIsBotMatch(true);

    let botMatchData: any = {
      matchId: 'bot_' + Math.random().toString(36).substring(2, 8),
      type: 'random',
      playMode: playMode,
      status: 'active',
      player1Id: currentUid,
      player1Name: currentDisplayName,
      player2Id: 'bot_ai',
      player2Name: 'AI Matrix Bot 🤖',
      player1Score: 0,
      player2Score: 0,
      player1Selection: [],
      player2Selection: [],
      currentRound: 1,
      expiresAt: Date.now() + 120000,
      winnerId: null,
      winnerName: null
    };

    if (playMode === 'advance') {
      const puzzle = generateNewAdvancePuzzle(3);
      botMatchData.advanceA = puzzle.numbers[0];
      botMatchData.advanceB = puzzle.numbers[1];
      botMatchData.advanceC = puzzle.numbers[2];
      botMatchData.advanceD = null;
      botMatchData.advanceE = null;
      botMatchData.target = puzzle.target;
      botMatchData.grid = OPERATORS;
    } else {
      const puzzle = generateNewPuzzle();
      botMatchData.grid = puzzle.grid;
      botMatchData.target = puzzle.target;
      botMatchData.formulaDisplay = puzzle.formulaDisplay;
      botMatchData.formulaSize = puzzle.formulaSize;
    }

    setActiveMatchId(botMatchData.matchId);
    setMatchData(botMatchData);
    setIsCreator(true);
    setOnlineSubMode('game_active');
  };

  // CREATE PRIVATE GAME ROOM
  const handleCreatePrivateRoom = async () => {
    sounds.playClick();
    setErrorMessage(null);
    setIsBotMatch(false);

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let roomPayload: any = {
      matchId: code,
      type: 'room',
      playMode: playMode,
      status: 'waiting',
      player1Id: currentUid,
      player1Name: currentDisplayName,
      player2Id: null,
      player2Name: null,
      player1Score: 0,
      player2Score: 0,
      player1Selection: [],
      player2Selection: [],
      currentRound: 1,
      winnerId: null,
      winnerName: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (playMode === 'advance') {
      const puzzle = generateNewAdvancePuzzle(3);
      roomPayload.advanceA = puzzle.numbers[0];
      roomPayload.advanceB = puzzle.numbers[1];
      roomPayload.advanceC = puzzle.numbers[2];
      roomPayload.advanceD = null;
      roomPayload.advanceE = null;
      roomPayload.target = puzzle.target;
      roomPayload.grid = OPERATORS;
    } else {
      const puzzle = generateNewPuzzle();
      roomPayload.grid = puzzle.grid;
      roomPayload.target = puzzle.target;
      roomPayload.formulaDisplay = puzzle.formulaDisplay;
      roomPayload.formulaSize = puzzle.formulaSize;
    }

    setActiveMatchId(code);
    setMatchData(roomPayload);
    setIsCreator(true);
    setOnlineSubMode('room_waiting');

    try {
      const matchRef = doc(db, 'matches', code);
      await setDoc(matchRef, roomPayload);
    } catch (err: any) {
      console.warn("Room creation error:", err);
      if (err?.code === 'permission-denied') {
        setShowRulesModal(true);
      }
    }
  };

  // JOIN PRIVATE GAME ROOM
  const handleJoinPrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length !== 4) {
      sounds.playFailure();
      setJoinError("Room code must be exactly 4 characters.");
      return;
    }

    try {
      const matchRef = doc(db, 'matches', code);
      const snap = await getDoc(matchRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'waiting') {
          await updateDoc(matchRef, {
            player2Id: currentUid,
            player2Name: currentDisplayName,
            status: 'active',
            expiresAt: Date.now() + 120000,
            updatedAt: serverTimestamp()
          });

          setActiveMatchId(code);
          setMatchData({
            ...data,
            player2Id: currentUid,
            player2Name: currentDisplayName,
            status: 'active',
            expiresAt: Date.now() + 120000
          });
          setIsCreator(false);
          setOnlineSubMode('game_active');
          sounds.playSuccess();
        } else {
          sounds.playFailure();
          setJoinError("This room is already full or no longer active.");
        }
      } else {
        sounds.playFailure();
        setJoinError("Room Code not found! Please check and try again.");
      }
    } catch (err: any) {
      console.error("Room join error: ", err);
      sounds.playFailure();
      if (err?.code === 'permission-denied') {
        setShowRulesModal(true);
        setJoinError("Firebase Permission Error: Please update Firestore Security Rules.");
      } else {
        setJoinError("Failed to connect to room. Please check your connection.");
      }
    }
  };

  const copyToClipboard = () => {
    if (activeMatchId) {
      navigator.clipboard.writeText(activeMatchId);
      setCopied(true);
      sounds.playClick();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyRulesToClipboard = () => {
    const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`;
    navigator.clipboard.writeText(rulesText);
    setRulesCopied(true);
    sounds.playClick();
    setTimeout(() => setRulesCopied(false), 3000);
  };

  // REMATCH AD CALLBACKS
  const handleAdCompleted = () => {
    setIsAdPlaying(false);
    if (pendingRematchData) {
      setMatchData(pendingRematchData);
      setPendingRematchData(null);
    }
    lastRoundRef.current = 1;
    setSelectedIndices([]);
    setAdvanceSelections([]);
    setTimeLeft(120);
    setIsRematchRequestedByMe(false);
    setIsRematchRequestReceived(false);
    setRematchDeclinedMessage(null);
    setOnlineSubMode('game_active');
    sounds.playSuccess();
  };

  const handleAdCancelled = () => {
    setIsAdPlaying(false);
    setPendingRematchData(null);
    sounds.playFailure();
  };

  // REQUEST REMATCH HANDLER
  const handleRequestRematch = async () => {
    sounds.playClick();
    if (isBotMatch) {
      sounds.playSuccess();
      let resetBotMatch: any = {
        ...matchData,
        status: 'active',
        player1Score: 0,
        player2Score: 0,
        player1Selection: [],
        player2Selection: [],
        currentRound: 1,
        expiresAt: Date.now() + 120000,
        winnerId: null,
        winnerName: null
      };

      if (matchData.playMode === 'advance') {
        const puzzle = generateNewAdvancePuzzle(3);
        resetBotMatch.advanceA = puzzle.numbers[0];
        resetBotMatch.advanceB = puzzle.numbers[1];
        resetBotMatch.advanceC = puzzle.numbers[2];
        resetBotMatch.advanceD = null;
        resetBotMatch.advanceE = null;
        resetBotMatch.target = puzzle.target;
        resetBotMatch.grid = OPERATORS;
      } else {
        const puzzle = generateNewPuzzle();
        resetBotMatch.grid = puzzle.grid;
        resetBotMatch.target = puzzle.target;
        resetBotMatch.formulaDisplay = puzzle.formulaDisplay;
        resetBotMatch.formulaSize = puzzle.formulaSize;
      }

      setPendingRematchData(resetBotMatch);
      setIsAdPlaying(true);
      return;
    }

    try {
      const matchRef = doc(db, 'matches', activeMatchId!);
      await updateDoc(matchRef, {
        rematchRequestedBy: currentUid,
        rematchDeclined: false,
        updatedAt: serverTimestamp()
      });
      setIsRematchRequestedByMe(true);
    } catch (err) {
      console.warn("Error requesting rematch:", err);
    }
  };

  // ACCEPT REMATCH HANDLER
  const handleAcceptRematch = async () => {
    sounds.playSuccess();
    let updates: any = {
      status: 'active',
      player1Score: 0,
      player2Score: 0,
      player1Selection: [],
      player2Selection: [],
      currentRound: 1,
      expiresAt: Date.now() + 120000,
      winnerId: null,
      winnerName: null,
      rematchRequestedBy: null,
      rematchAccepted: true,
      rematchDeclined: false,
      updatedAt: serverTimestamp()
    };

    if (matchData.playMode === 'advance') {
      const puzzle = generateNewAdvancePuzzle(3);
      updates.advanceA = puzzle.numbers[0];
      updates.advanceB = puzzle.numbers[1];
      updates.advanceC = puzzle.numbers[2];
      updates.advanceD = null;
      updates.advanceE = null;
      updates.target = puzzle.target;
      updates.grid = OPERATORS;
    } else {
      const puzzle = generateNewPuzzle();
      updates.grid = puzzle.grid;
      updates.target = puzzle.target;
      updates.formulaDisplay = puzzle.formulaDisplay;
      updates.formulaSize = puzzle.formulaSize;
    }

    try {
      const matchRef = doc(db, 'matches', activeMatchId!);
      await updateDoc(matchRef, updates);
    } catch (err) {
      console.warn("Error accepting rematch:", err);
    }
  };

  // DECLINE REMATCH HANDLER
  const handleDeclineRematch = async () => {
    sounds.playClick();
    try {
      const matchRef = doc(db, 'matches', activeMatchId!);
      await updateDoc(matchRef, {
        rematchRequestedBy: null,
        rematchDeclined: true,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Error declining rematch:", err);
    }
    resetToLobby();
  };

  // SOLVER CLICK ENGINE FOR BOTH NORMAL AND ADVANCE MODE
  const handleCellClick = async (idx: number, optOperator?: string) => {
    if (!matchData || matchData.status !== 'active') return;

    sounds.playClick();

    if (matchData.playMode === 'advance') {
      // ADVANCE MODE REAL-TIME MULTIPLAYER SOLVER CLICK
      const activeNumCount = (matchData.advanceE !== undefined && matchData.advanceE !== null) ? 5 : ((matchData.advanceD !== undefined && matchData.advanceD !== null) ? 4 : 3);
      const reqOpsCount = activeNumCount - 1;
      const opToUse = optOperator || OPERATORS[idx];
      let newOps = [...advanceSelections, opToUse].slice(0, reqOpsCount);
      
      // 1. Instantly update client UI
      setAdvanceSelections(newOps);

      // 2. Sync to Firebase
      if (!isBotMatch) {
        try {
          const matchRef = doc(db, 'matches', activeMatchId!);
          if (currentUid === matchData.player1Id) {
            await updateDoc(matchRef, { player1Selection: newOps });
          } else {
            await updateDoc(matchRef, { player2Selection: newOps });
          }
        } catch (e) {}
      }

      // 3. Evaluate solution once all operators are specified
      if (newOps.length === reqOpsCount) {
        const currentNums = [
          matchData.advanceA,
          matchData.advanceB,
          matchData.advanceC
        ];
        if (activeNumCount >= 4) currentNums.push(matchData.advanceD);
        if (activeNumCount >= 5) currentNums.push(matchData.advanceE);

        const resultCheck = evaluateAdvanceExpressionAny(currentNums, newOps);

        if (resultCheck === matchData.target) {
          sounds.playSuccess();
          setAdvanceSelections([]);

          const isP1 = currentUid === matchData.player1Id;
          const p1Score = isP1 ? (matchData.player1Score || 0) + 1 : (matchData.player1Score || 0);
          const p2Score = !isP1 ? (matchData.player2Score || 0) + 1 : (matchData.player2Score || 0);
          const nextCount = getRequiredOnlineAdvanceNumCount(p1Score, p2Score, timeLeft);
          const nextPuzzle = generateNewAdvancePuzzle(nextCount);

          if (isBotMatch) {
            setMatchData((prev: any) => ({
              ...prev,
              player1Score: p1Score,
              player1Selection: [],
              player2Selection: [],
              advanceA: nextPuzzle.numbers[0],
              advanceB: nextPuzzle.numbers[1],
              advanceC: nextPuzzle.numbers[2],
              advanceD: nextCount >= 4 ? nextPuzzle.numbers[3] : null,
              advanceE: nextCount >= 5 ? nextPuzzle.numbers[4] : null,
              target: nextPuzzle.target,
              currentRound: (prev.currentRound || 1) + 1
            }));
          } else {
            try {
              const matchRef = doc(db, 'matches', activeMatchId!);

              await updateDoc(matchRef, {
                player1Score: p1Score,
                player2Score: p2Score,
                player1Selection: [],
                player2Selection: [],
                advanceA: nextPuzzle.numbers[0],
                advanceB: nextPuzzle.numbers[1],
                advanceC: nextPuzzle.numbers[2],
                advanceD: nextCount >= 4 ? nextPuzzle.numbers[3] : null,
                advanceE: nextCount >= 5 ? nextPuzzle.numbers[4] : null,
                target: nextPuzzle.target,
                currentRound: (matchData.currentRound || 1) + 1,
                updatedAt: serverTimestamp()
              });
            } catch (err) {
              console.error("Error submitting advanced solved round: ", err);
            }
          }
        } else {
          sounds.playFailure();
          setAdvanceSelections([]);
          if (!isBotMatch) {
            try {
              const matchRef = doc(db, 'matches', activeMatchId!);
              if (currentUid === matchData.player1Id) {
                await updateDoc(matchRef, { player1Selection: [] });
              } else {
                await updateDoc(matchRef, { player2Selection: [] });
              }
            } catch (e) {}
          }
        }
      }

    } else {
      // NORMAL MODE SOLVER
      let newSelection = [...selectedIndices];
      if (selectedIndices.includes(idx)) {
        newSelection = selectedIndices.filter(i => i !== idx);
      } else {
        newSelection = [...selectedIndices, idx];
      }

      const maxFormulaSize = matchData.formulaSize;
      const finalSelection = newSelection.slice(0, maxFormulaSize);
      
      setSelectedIndices(finalSelection);

      const currentValues = finalSelection.map(index => matchData.grid[index]);
      if (!isBotMatch) {
        try {
          const matchRef = doc(db, 'matches', activeMatchId!);
          if (currentUid === matchData.player1Id) {
            await updateDoc(matchRef, { player1Selection: currentValues });
          } else {
            await updateDoc(matchRef, { player2Selection: currentValues });
          }
        } catch (err) {
          console.warn("Failed selection sync:", err);
        }
      }

      if (finalSelection.length === maxFormulaSize) {
        const operands = finalSelection.map(index => matchData.grid[index]);
        const resultCheck = evaluateFormula(matchData.formulaDisplay, operands);

        if (resultCheck === matchData.target) {
          sounds.playSuccess();
          setSelectedIndices([]);
          
          const nextPuzzle = generateNewPuzzle();

          if (isBotMatch) {
            const currentScore = matchData.player1Score || 0;
            setMatchData((prev: any) => ({
              ...prev,
              player1Score: currentScore + 1,
              player1Selection: [],
              player2Selection: [],
              grid: nextPuzzle.grid,
              target: nextPuzzle.target,
              formulaDisplay: nextPuzzle.formulaDisplay,
              formulaSize: nextPuzzle.formulaSize,
              currentRound: (prev.currentRound || 1) + 1
            }));
          } else {
            try {
              const matchRef = doc(db, 'matches', activeMatchId!);
              const isP1 = currentUid === matchData.player1Id;
              const updatedScore = isP1 ? (matchData.player1Score || 0) + 1 : (matchData.player2Score || 0) + 1;

              await updateDoc(matchRef, {
                player1Score: isP1 ? updatedScore : (matchData.player1Score || 0),
                player2Score: !isP1 ? updatedScore : (matchData.player2Score || 0),
                player1Selection: [],
                player2Selection: [],
                grid: nextPuzzle.grid,
                target: nextPuzzle.target,
                formulaDisplay: nextPuzzle.formulaDisplay,
                formulaSize: nextPuzzle.formulaSize,
                currentRound: (matchData.currentRound || 1) + 1,
                updatedAt: serverTimestamp()
              });
            } catch (err) {
              console.error("Error submitting solved round: ", err);
            }
          }
        } else {
          sounds.playFailure();
          setSelectedIndices([]);
          if (!isBotMatch) {
            try {
              const matchRef = doc(db, 'matches', activeMatchId!);
              if (currentUid === matchData.player1Id) {
                await updateDoc(matchRef, { player1Selection: [] });
              } else {
                await updateDoc(matchRef, { player2Selection: [] });
              }
            } catch (e) {}
          }
        }
      }
    }
  };

  const formatTimerValue = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render static/typed elements of formula equation
  const renderFormulaBlocks = (isOpponent: boolean) => {
    if (!matchData) return null;

    const selections = isOpponent 
      ? (currentUid === matchData.player1Id ? (matchData.player2Selection || []) : (matchData.player1Selection || []))
      : (matchData.playMode === 'advance' ? advanceSelections : selectedIndices.map(index => matchData.grid[index]));

    if (matchData.playMode === 'advance') {
      // ADVANCE RENDERING LAYOUT
      const activeNumCount = (matchData.advanceE !== undefined && matchData.advanceE !== null) ? 5 : ((matchData.advanceD !== undefined && matchData.advanceD !== null) ? 4 : 3);
      const activeNums = [matchData.advanceA, matchData.advanceB, matchData.advanceC];
      if (activeNumCount >= 4) activeNums.push(matchData.advanceD);
      if (activeNumCount >= 5) activeNums.push(matchData.advanceE);

      return (
        <div className="flex flex-wrap items-center justify-center gap-2.5 font-mono text-white text-base py-1 leading-none select-none">
          {activeNums.map((num, idx) => {
            const sel = selections[idx] !== undefined ? selections[idx] : null;
            return (
              <React.Fragment key={idx}>
                <span className="font-extrabold">{num}</span>
                {idx < activeNums.length - 1 && (
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-black transition-all ${
                    sel ? (isOpponent ? 'border-pink-500/50 bg-pink-950/20 text-pink-400' : 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400') : 'border-2 border-dashed border-zinc-800 text-zinc-700 animate-pulse bg-zinc-950/20'
                  }`}>
                    {sel || '?'}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      );
    } else {
      // NORMAL MODE RENDERING
      const display = matchData.formulaDisplay;
      const alphabet = ['A', 'B', 'C'];

      return (
        <div className="flex items-center justify-center gap-2 font-mono text-zinc-400">
          {alphabet.map((letter, idx) => {
            if (idx >= matchData.formulaSize) return null;

            const selectionValue = selections[idx] !== undefined ? selections[idx] : null;
            const isFilled = selectionValue !== null;

            return (
              <React.Fragment key={letter}>
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center text-sm font-black transition-all ${
                  isFilled 
                    ? (isOpponent ? 'border-pink-500/50 bg-pink-950/20 text-pink-400' : 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]')
                    : 'border-2 border-dashed border-zinc-800 text-zinc-700 animate-pulse bg-zinc-950/30'
                }`}>
                  {isFilled ? selectionValue : '?'}
                </div>

                {idx === 0 && <span className="text-zinc-600 text-xs font-bold font-sans">*</span>}
                {idx === 1 && (
                  <span className="text-zinc-600 text-xs font-bold font-sans">
                    {display.includes('-') ? '-' : '+'}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      );
    }
  };

  const isPlayer1 = matchData && currentUid === matchData.player1Id;
  const p1Name = matchData ? matchData.player1Name : currentDisplayName;
  const p2Name = matchData ? (matchData.player2Name || 'AI Bot') : 'Challenger';

  const myScore = matchData ? (isPlayer1 ? (matchData.player1Score || 0) : (matchData.player2Score || 0)) : 0;
  const opponentScore = matchData ? (isPlayer1 ? (matchData.player2Score || 0) : (matchData.player1Score || 0)) : 0;

  return (
    <div className="w-full flex flex-col h-full text-white animate-fadeIn pb-2 justify-between">
      
      {/* 1. LOBBY LANDING SCREEN */}
      {onlineSubMode === 'lobby' && (
        <div className="flex-1 flex flex-col justify-between">
          
          {/* HEADER */}
          <div className="flex items-center justify-between w-full mb-3 shrink-0 relative z-30">
            <button 
              onClick={() => {
                sounds.playClick();
                if (lobbyStep === 'choose_action') {
                  setLobbyStep('choose_mode');
                } else {
                  onClose();
                }
              }}
              className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all shadow-md shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>

            <div className="text-center flex-1 mx-2">
              <h2 className="text-base font-black tracking-[0.2em] text-white leading-none uppercase flex items-center justify-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-400 animate-pulse" /> Play Online
              </h2>
              <p className="text-[7px] text-zinc-500 uppercase tracking-[0.15em] mt-1">
                {lobbyStep === 'choose_mode' ? 'Select Game Mode' : `${playMode === 'advance' ? 'Advance' : 'Normal'} Mode Queue`}
              </p>
            </div>

            <button
              onClick={() => setShowRulesModal(true)}
              title="Firestore Security Rules Setup Guide"
              className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-amber-400 hover:text-amber-300 active:scale-95 transition-all shadow-md shrink-0"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] text-center flex items-center justify-between gap-2">
              <span>{errorMessage}</span>
              <button 
                onClick={() => setErrorMessage(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {lobbyStep === 'choose_mode' ? (
            /* STEP 1: CHOOSE PLAYMODE LANDING BUTTONS */
            <div className="flex-1 flex flex-col justify-center gap-4 py-2 shrink-0 animate-fadeIn">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 text-center mb-1">
                Choose Online Mode
              </p>

              {/* Normal Mode Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setPlayMode('normal');
                  setLobbyStep('choose_action');
                }}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-blue-500/15 to-sky-500/5 border border-blue-500/30 hover:border-blue-400/60 hover:bg-blue-500/20 group transition-all text-left relative overflow-hidden active:scale-[0.98] shadow-lg"
              >
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-all">
                  <Play className="w-4 h-4" />
                </div>
                <p className="text-sm font-black tracking-wider text-blue-400 uppercase">🟢 Normal Mode</p>
                <p className="text-[10px] text-zinc-400 font-bold mt-1">Numbers Equation Puzzle</p>
                <p className="text-[8px] text-zinc-500 mt-1 max-w-[210px]">The classic gameplay. Pick number cells to satisfy the target formula.</p>
              </button>

              {/* Advance Mode Button */}
              <button
                onClick={() => {
                  sounds.playClick();
                  setPlayMode('advance');
                  setLobbyStep('choose_action');
                }}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/5 border border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-500/20 group transition-all text-left relative overflow-hidden active:scale-[0.98] shadow-lg"
              >
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-all">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-sm font-black tracking-wider text-purple-400 uppercase">🔵 Advance Mode</p>
                <p className="text-[10px] text-zinc-400 font-bold mt-1">PEMDAS Operator Puzzle</p>
                <p className="text-[8px] text-zinc-500 mt-1 max-w-[210px]">Add operators to a preset numbers equation. Scales dynamically based on scores!</p>
              </button>
            </div>
          ) : (
            /* STEP 2: CHOOSE ACTION CARD */
            <div className="flex-1 flex flex-col justify-center gap-3 py-1 shrink-0 animate-fadeIn">
              
              {/* Action 1: Random Matchmaking */}
              <button
                onClick={handleStartRandomMatchmaking}
                className={`w-full p-4 rounded-2xl bg-gradient-to-br border hover:bg-opacity-15 group transition-all text-left relative overflow-hidden ${
                  playMode === 'advance' 
                    ? 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/15'
                    : 'from-blue-500/20 to-sky-500/10 border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/15'
                }`}
              >
                <div className={`absolute right-4 top-4 w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all ${
                  playMode === 'advance' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  <Globe className="w-5 h-5 animate-spin-slow" />
                </div>
                <p className={`text-xs font-black tracking-wider uppercase ${playMode === 'advance' ? 'text-purple-400' : 'text-blue-400'}`}>Random Duel</p>
                <p className="text-[10px] text-white font-extrabold mt-0.5">Quick Matchmaker</p>
                <p className="text-[8px] text-zinc-500 mt-1">
                  Instantly pair with an opponent on {playMode === 'advance' ? 'Advance Mode (operators)' : 'Normal Mode (numbers)'}.
                </p>
              </button>

              {/* Action 2: Create Custom Room */}
              <button
                onClick={handleCreatePrivateRoom}
                className={`w-full p-4 rounded-2xl bg-gradient-to-br border hover:bg-opacity-15 group transition-all text-left relative overflow-hidden ${
                  playMode === 'advance'
                    ? 'from-purple-500/20 to-indigo-500/10 border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/15'
                    : 'from-violet-500/20 to-indigo-500/10 border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/15'
                }`}
              >
                <div className={`absolute right-4 top-4 w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all ${
                  playMode === 'advance' ? 'bg-purple-500/10 text-purple-400' : 'bg-violet-500/10 text-violet-400'
                }`}>
                  <Plus className="w-5 h-5" />
                </div>
                <p className={`text-xs font-black tracking-wider uppercase ${playMode === 'advance' ? 'text-purple-400' : 'text-violet-400'}`}>Create Room</p>
                <p className="text-[10px] text-white font-extrabold mt-0.5">Invite your friends</p>
                <p className="text-[8px] text-zinc-500 mt-1">Generate a 4-letter room code for a {playMode.toUpperCase()} mode duel.</p>
              </button>

              {/* Action 3: Join Custom Room */}
              <button
                onClick={() => { sounds.playClick(); setJoinError(null); setOnlineSubMode('room_join'); }}
                className="w-full p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-400/50 hover:bg-emerald-500/15 group transition-all text-left relative overflow-hidden"
              >
                <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-all">
                  <Key className="w-5 h-5" />
                </div>
                <p className="text-xs font-black tracking-wider text-emerald-400 uppercase">Join Room</p>
                <p className="text-[10px] text-white font-extrabold mt-0.5">Enter code</p>
                <p className="text-[8px] text-zinc-500 mt-1">Enter code shared by a friend to jump straight into their board.</p>
              </button>

              {/* Action 4: Quick AI Duel Bot */}
              <button
                onClick={handleStartBotDuel}
                className="w-full p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    playMode === 'advance' ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  }`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Duel AI Matrix Bot</p>
                    <p className="text-[8px] text-zinc-500">Practice real-time speed solving in {playMode.toUpperCase()} mode</p>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-all" />
              </button>

              {/* BACK BUTTON TO STEPS CHOOSE_MODE */}
              <button
                onClick={() => { sounds.playClick(); setLobbyStep('choose_mode'); }}
                className="w-full py-2.5 rounded-xl text-[9px] uppercase tracking-widest text-zinc-500 hover:text-white transition-all font-black flex items-center justify-center gap-1 mt-1 active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back to mode selector
              </button>

            </div>
          )}

          <div className="text-center py-1 shrink-0">
            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
              Multiplayer duels last 2 mins • Most solves wins
            </p>
          </div>

        </div>
      )}

      {/* 2. MATCHMAKING WAITING SCREEN */}
      {onlineSubMode === 'matchmaking' && (
        <div className="flex-1 flex flex-col justify-between items-center py-4">
          
          {/* TOP CONTROLS */}
          <div className="w-full flex justify-between items-center mb-4">
            <button 
              onClick={handleAbortMatch}
              className="px-3.5 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] font-black uppercase text-zinc-400 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Cancel
            </button>
            <span className="text-[9px] font-mono text-cyan-400 font-bold animate-pulse">
              Searching: {matchSearchSeconds}s
            </span>
          </div>

          {/* DUEL MATCHMAKING VS VIEWER */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm relative px-6 py-2">
            
            <div className="flex items-center justify-between w-full relative z-10 gap-4 mb-5">
              
              {/* YOU */}
              <div className="flex flex-col items-center flex-1">
                <div className="relative w-16 h-16 rounded-full border-2 border-emerald-500 bg-zinc-950 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse mb-2">
                  <User className="w-8 h-8 text-emerald-400" />
                </div>
                <span className="text-[10px] uppercase font-black text-white tracking-widest leading-none">YOU</span>
                <span className="text-[8px] text-zinc-400 mt-1 font-bold font-mono truncate max-w-[85px]">
                  {currentDisplayName}
                </span>
              </div>

              {/* VS */}
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 px-2 tracking-widest animate-pulse filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                VS
              </div>

              {/* WAITING OPPONENT */}
              <div className="flex flex-col items-center flex-1">
                <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-zinc-800 bg-zinc-950/40 flex items-center justify-center mb-2 animate-spin-slow">
                  <HelpCircle className="w-7 h-7 text-zinc-700" />
                </div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest leading-none">Waiting</span>
                <span className="text-[8px] text-zinc-500 mt-1 font-bold tracking-wider uppercase animate-pulse">
                  Searching...
                </span>
              </div>

            </div>

            {/* DETAILS SUMMARY */}
            <div className="text-center w-full">
              <h3 className="text-xs font-bold text-white tracking-wider">Listening in {playMode.toUpperCase()} Queue</h3>
              <p className="text-[9px] text-zinc-500 tracking-widest mt-1 flex items-center justify-center gap-1.5">
                Connecting with opponent <span className="flex gap-0.5"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span></span>
              </p>
              
              <div className="mt-3 flex justify-center">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              </div>

              {/* Bot duel recommendation */}
              {matchSearchSeconds >= 5 && (
                <div className="mt-4 p-3 rounded-2xl bg-zinc-900/80 border border-purple-500/30 animate-fadeIn">
                  <p className="text-[9px] text-zinc-400 mb-2">No other player online right now?</p>
                  <button
                    onClick={handleStartBotDuel}
                    className="w-full py-2 px-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Bot className="w-3.5 h-3.5" /> Duel AI Matrix Bot Now
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* 3. ROOM CODE CREATOR WAITING SCREEN */}
      {onlineSubMode === 'room_waiting' && (
        <div className="flex-1 flex flex-col justify-between items-center py-4">
          
          {/* HEADER */}
          <div className="flex items-center justify-between w-full mb-3 shrink-0 relative z-30">
            <button 
              onClick={handleAbortMatch}
              className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all shadow-md shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>

            <div className="text-center flex-1 mx-2">
              <h2 className="text-base font-black tracking-[0.2em] text-white leading-none uppercase">
                Custom Game Room ({playMode.toUpperCase()})
              </h2>
              <p className="text-[7px] text-zinc-500 uppercase tracking-[0.15em] mt-1">
                Waiting for joiner
              </p>
            </div>

            <div className="w-9 h-9 shrink-0 opacity-0" />
          </div>

          {/* COPY CODE CARD */}
          <div className="flex-1 flex flex-col justify-center items-center w-full py-2 shrink-0">
            
            <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-3">Share Room Code</p>
            
            <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl w-full max-w-[240px] justify-between">
              <span className="text-2xl font-black font-mono text-emerald-400 tracking-[0.2em] pl-2">
                {activeMatchId || '----'}
              </span>
              <button
                onClick={copyToClipboard}
                className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition active:scale-90"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {copied && <p className="text-[8px] text-emerald-400 uppercase font-black tracking-widest mt-2 animate-fadeIn">Copied to Clipboard!</p>}

            {/* Waiting indicators */}
            <div className="mt-6 flex flex-col items-center">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest mt-2.5">Waiting for challenger to join...</p>
              <p className="text-[8px] text-zinc-600 mt-1">Tell your friend to click "Join Room" and enter this code.</p>
            </div>

          </div>

          <div className="text-center py-1 shrink-0">
            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
              Room rules: {playMode.toUpperCase()} level layout only
            </p>
          </div>

        </div>
      )}

      {/* 4. JOIN ROOM INPUT SCREEN */}
      {onlineSubMode === 'room_join' && (
        <div className="flex-1 flex flex-col justify-between">
          
          {/* HEADER */}
          <div className="flex items-center justify-between w-full mb-3 shrink-0 relative z-30">
            <button 
              onClick={() => { sounds.playClick(); setJoinError(null); setOnlineSubMode('lobby'); }}
              className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all shadow-md shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>

            <div className="text-center flex-1 mx-2">
              <h2 className="text-base font-black tracking-[0.2em] text-white leading-none uppercase">
                Join Game Room
              </h2>
              <p className="text-[7px] text-zinc-500 uppercase tracking-[0.15em] mt-1">
                Enter shared friend code
              </p>
            </div>

            <div className="w-9 h-9 shrink-0 opacity-0" />
          </div>

          {/* INPUT FIELDS CONTAINER */}
          <div className="flex-1 flex flex-col justify-center items-center w-full py-2 shrink-0">
            
            <form onSubmit={handleJoinPrivateRoom} className="w-full max-w-[280px] text-center space-y-4">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Enter 4-Character Room Code</p>
              
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => {
                  setJoinError(null);
                  setRoomCodeInput(e.target.value.slice(0, 4).toUpperCase());
                }}
                placeholder="ABCD"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-center font-mono font-black text-2xl tracking-[0.25em] text-white focus:border-emerald-500 focus:outline-none uppercase"
              />

              {joinError && (
                <p className="text-[10px] text-rose-400 font-bold leading-tight animate-fadeIn">{joinError}</p>
              )}

              <button
                type="submit"
                disabled={roomCodeInput.trim().length !== 4}
                className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transform active:scale-95 transition-all border ${
                  roomCodeInput.trim().length === 4
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg border-emerald-400/20'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
              >
                Join Duel <ArrowRight className="w-4 h-4" />
              </button>
            </form>

          </div>

          <div className="text-center py-1 shrink-0 animate-pulse">
            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
              Rooms are temporary and secure
            </p>
          </div>

        </div>
      )}

      {/* 5. ACTIVE MULTIPLAYER PLAYING GAME BOARD */}
      {onlineSubMode === 'game_active' && matchData && (
        <div className="flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto animate-fadeIn select-none px-4">
          
          {/* HIGH-FIDELITY MATCH HEADER: You vs Opponent */}
          <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3.5 mb-3.5 flex items-center justify-between relative shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span className="text-[8px] uppercase font-bold tracking-widest text-zinc-500">You</span>
              <span className="text-xs font-black text-white truncate max-w-[120px] uppercase font-mono tracking-wider">
                {currentDisplayName}
              </span>
              <span className="text-[10px] font-black text-cyan-400 font-mono mt-0.5">
                {myScore} Solved
              </span>
            </div>

            <div className="text-center px-4 shrink-0 flex flex-col items-center">
              <div className="text-sm font-black text-cyan-400 tracking-[0.25em] pl-1 animate-pulse">V/S</div>
              <span className="text-[7px] text-zinc-600 uppercase font-black tracking-widest mt-0.5">
                ROUND {matchData.currentRound || 1}
              </span>
            </div>

            <div className="flex flex-col items-end flex-1 min-w-0 text-right">
              <span className="text-[8px] uppercase font-bold tracking-widest text-zinc-500 font-sans">Opponent</span>
              <span className="text-xs font-black text-pink-400 truncate max-w-[120px] uppercase font-mono tracking-wider">
                {currentUid === matchData.player1Id 
                  ? (matchData.player2Name || (isBotMatch ? 'AI Bot' : 'Challenger')) 
                  : matchData.player1Name}
              </span>
              <span className="text-[10px] font-black text-pink-400 font-mono mt-0.5">
                {opponentScore} Solved
              </span>
            </div>
          </div>

          {/* 2-MIN GAME RUN TIME TIMER DISPLAY */}
          <div className="mb-3.5 flex items-center gap-1.5 px-3 py-1 bg-black/60 border border-zinc-800 rounded-full text-[10px] font-black font-mono tracking-widest text-cyan-400 select-none">
            <Timer className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>TIMER : {formatTimerValue(timeLeft)} ({matchData.playMode?.toUpperCase() || 'NORMAL'})</span>
          </div>

          {/* EQUATION WORKSPACE BOARD */}
          <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-4 mb-4 shadow-xl relative flex flex-col gap-3">
            
            {/* OPPONENT EQUATION BOX */}
            <div className="flex flex-col gap-1.5 pb-2 border-b border-zinc-900">
              <span className="text-[8px] uppercase font-black tracking-widest text-pink-400 font-mono">Opponent</span>
              {renderFormulaBlocks(true)}
            </div>

            {/* SHARED TARGET RESULT TARGET */}
            <div className="flex items-center justify-between px-2 select-none">
              <span className="text-[8px] uppercase tracking-[0.2em] font-black text-zinc-500 font-sans">
                Target Result:
              </span>
              <span className="text-xl font-black font-mono text-cyan-400 filter drop-shadow-[0_0_6px_#06b6d4]">
                {matchData.target}
              </span>
            </div>

            {/* YOUR EQUATION BOX */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-900">
              <span className="text-[8px] uppercase font-black tracking-widest text-cyan-400 font-mono">You</span>
              {renderFormulaBlocks(false)}
            </div>

          </div>

          {/* SHARED GRID INTERFACE AREA (4x4 Matrix for Normal vs Operator keys for Advance!) */}
          <div className="w-full">
            {matchData.playMode === 'advance' ? (
              /* ADVANCE MULTIPLAYER OPERATOR SELECTION KEYS */
              <div className="grid grid-cols-4 gap-3 bg-black/65 border border-zinc-900/80 p-3.5 rounded-2xl select-none">
                {OPERATORS.map((op, opIdx) => {
                  return (
                    <button
                      key={op}
                      onClick={() => handleCellClick(opIdx, op)}
                      className="aspect-square rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-cyan-500 hover:text-cyan-400 text-white font-black text-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all font-mono"
                    >
                      {op}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* NORMAL MODE MATRIX SELECTION TILES */
              <div className="grid grid-cols-4 gap-2.5 w-full mb-4 p-2.5 bg-black/65 border border-zinc-900/80 rounded-2xl select-none">
                {matchData.grid.map((val: number, idx: number) => {
                  const isSelected = selectedIndices.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCellClick(idx)}
                      className={`aspect-square rounded-xl border font-mono font-black text-lg flex items-center justify-center relative transition-all active:scale-90 ${
                        isSelected 
                          ? 'border-cyan-500 bg-cyan-950/20 text-cyan-400 font-extrabold shadow-[0_0_15px_#06b6d4]' 
                          : 'border-zinc-850 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      {val}

                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-[9px] font-black text-black flex items-center justify-center">
                          {selectedIndices.indexOf(idx) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ABORT DUEL BUTTON */}
          <div className="w-full shrink-0 mt-3.5">
            <button
              onClick={handleAbortMatch}
              className="w-full py-3 rounded-2xl border border-red-950/70 hover:border-red-500/50 bg-red-950/10 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              Abort Match Duel
            </button>
          </div>

        </div>
      )}

      {/* 6. GAME OVER SPEEDRUN RESULTS SCREEN WITH REMATCHING FLOW */}
      {onlineSubMode === 'game_over' && matchData && (
        <div className="flex-1 flex flex-col justify-center items-center py-4 w-full max-w-sm mx-auto select-none px-4">
          
          <div className={`w-full max-w-xs rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative border ${
            matchData.winnerId === currentUid 
              ? 'border-emerald-500/30 bg-zinc-950' 
              : matchData.winnerId === 'draw' ? 'border-amber-500/30 bg-zinc-950' : 'border-red-500/30 bg-zinc-950'
          }`}>
            
            {matchData.winnerId === currentUid ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>

                <h3 className="text-xl font-black tracking-widest text-emerald-400 uppercase leading-none mb-1">
                  VICTORY!
                </h3>
                
                {matchData.abandonedByOpponent ? (
                  <p className="text-[9px] text-amber-400 uppercase font-black tracking-widest mb-4">
                    Opponent Abandonded Game!
                  </p>
                ) : (
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-4">
                    Winner of the speedrun duel!
                  </p>
                )}

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl w-full mb-6 text-left space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Your Score:</span>
                    <span className="text-emerald-400 font-bold">{myScore} Solved</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Challenger:</span>
                    <span className="text-zinc-400">{opponentScore} Solved</span>
                  </div>
                </div>
              </>
            ) : matchData.winnerId === 'draw' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                  <Award className="w-10 h-10 animate-pulse" />
                </div>

                <h3 className="text-xl font-black tracking-widest text-amber-400 uppercase leading-none mb-1">
                  TIED DUEL
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
                  It's an even match!
                </p>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl w-full mb-6 text-left space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Both Solved:</span>
                    <span className="text-amber-400 font-bold">{myScore} Puzzles</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-shake">
                  <AlertOctagon className="w-10 h-10" />
                </div>

                <h3 className="text-xl font-black tracking-widest text-red-400 uppercase leading-none mb-1">
                  DEFEAT
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 truncate max-w-[180px]">
                  Winner: {p2Name}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-wider mb-4">
                  They solved more puzzles before time ran out
                </p>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl w-full mb-6 text-left space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Your Score:</span>
                    <span className="text-zinc-400">{myScore} Solved</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Challenger:</span>
                    <span className="text-pink-400 font-bold">{opponentScore} Solved</span>
                  </div>
                </div>
              </>
            )}

            {/* REMATCHING USER INTERFACE ACTIONS */}
            <div className="w-full space-y-2.5">
              
              {rematchDeclinedMessage && (
                <p className="text-[9px] text-red-400 bg-red-950/20 border border-red-950 py-2 rounded-xl uppercase font-black tracking-widest leading-none">
                  {rematchDeclinedMessage}
                </p>
              )}

              {!isRematchRequestedByMe && !isRematchRequestReceived && (
                <button
                  onClick={handleRequestRematch}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 border border-emerald-400/20"
                >
                  <RefreshCw className="w-4 h-4 animate-spin-slow" /> Request Rematch
                </button>
              )}

              {isRematchRequestedByMe && (
                <div className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">
                    Rematch Requested...
                  </span>
                  <span className="text-[8px] text-zinc-500">Waiting for Challenger to Accept</span>
                </div>
              )}

              {isRematchRequestReceived && (
                <div className="w-full p-4 rounded-2xl bg-zinc-900 border-2 border-dashed border-cyan-500/50 flex flex-col items-center justify-center gap-3 animate-pulse">
                  <Swords className="w-6 h-6 text-cyan-400" />
                  <div className="text-center">
                    <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest block">
                      Rematch Requested!
                    </span>
                    <span className="text-[8px] text-zinc-400 mt-1 block">
                      Opponent wants to play again!
                    </span>
                  </div>
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      onClick={handleDeclineRematch}
                      className="flex-1 py-2 rounded-xl bg-red-950/30 border border-red-900 text-red-400 font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all"
                    >
                      Decline
                    </button>
                    <button
                      onClick={handleAcceptRematch}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={resetToLobby}
                className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                Exit to Lobby
              </button>
            </div>

          </div>

        </div>
      )}

      {/* 7. FIREBASE SECURITY RULES HELP MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-md w-full bg-zinc-950 border border-amber-500/40 rounded-3xl p-5 shadow-2xl relative text-left">
            <button
              onClick={() => setShowRulesModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Firestore Security Rules
              </h3>
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
              To allow multiplayer match rooms to sync across devices, please paste these rules into your Firebase Console:
            </p>

            <ol className="text-[9px] text-zinc-300 space-y-1 mb-3 list-decimal list-inside font-medium">
              <li>Open <span className="text-blue-400 font-mono">console.firebase.google.com</span></li>
              <li>Select your Firebase project</li>
              <li>Go to <span className="text-white font-bold">Build &rarr; Firestore Database &rarr; Rules</span></li>
              <li>Paste the rules below and click <span className="text-emerald-400 font-bold">Publish</span></li>
            </ol>

            <div className="relative bg-black/80 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] text-zinc-300 mb-3 overflow-x-auto">
              <pre className="text-emerald-400 text-[9px] leading-tight">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
              </pre>
              <button
                onClick={copyRulesToClipboard}
                className="absolute top-2 right-2 px-2 py-1 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white rounded-lg text-[9px] font-bold flex items-center gap-1 active:scale-95 transition-all"
              >
                {rulesCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {rulesCopied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-95 transition-all text-center"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* AdMob Rematch Interstitial Ad Simulator */}
      <AdMobSimulator 
        isOpen={isAdPlaying}
        adType="interstitial_rematch"
        onAdCompleted={handleAdCompleted}
        onAdCancelled={handleAdCancelled}
      />

    </div>
  );
};
