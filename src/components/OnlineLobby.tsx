/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  ExternalLink
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

// Dynamic formulas representing hard difficulty
const HARD_FORMULAS = [
  { size: 3, display: "[A] * [B] - [C]", evaluate: (op: number[]) => op[0] * op[1] - op[2] },
  { size: 3, display: "([A] - [B]) * [C]", evaluate: (op: number[]) => (op[0] - op[1]) * op[2] },
  { size: 3, display: "[A] * [B] + [C]", evaluate: (op: number[]) => op[0] * op[1] + op[2] }
];

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

  // Gameplay specific synchronization
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Safe stable identifier across refresh & guests
  const currentUid = user?.uid || profile?.uid || 'guest_' + Math.random().toString(36).substring(2, 9);
  const currentDisplayName = profile?.displayName || user?.displayName || 'Matrix Explorer';

  const activeMatchIdRef = useRef<string | null>(null);
  activeMatchIdRef.current = activeMatchId;

  const onlineSubModeRef = useRef<string>(onlineSubMode);
  onlineSubModeRef.current = onlineSubMode;

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
      // Bot solves the puzzle in 14-22 seconds
      const solveTimeMs = Math.floor(Math.random() * 8000) + 14000;
      botTimer = setTimeout(() => {
        if (onlineSubModeRef.current === 'game_active') {
          setMatchData((prev: any) => ({
            ...prev,
            status: 'completed',
            winnerId: 'bot_ai',
            winnerName: 'AI Matrix Bot 🤖'
          }));
          sounds.playFailure();
          setOnlineSubMode('game_over');
        }
      }, solveTimeMs);
    }
    return () => {
      if (botTimer) clearTimeout(botTimer);
    };
  }, [isBotMatch, onlineSubMode, matchData]);

  // 1. ACTIVE MATCH LISTENER (Listens to the active match document)
  useEffect(() => {
    if (!activeMatchId || isBotMatch) return;

    let isSubscribed = true;
    const matchRef = doc(db, 'matches', activeMatchId);
    
    const unsubscribe = onSnapshot(matchRef, (snapshot) => {
      if (!isSubscribed) return;

      if (snapshot.exists()) {
        const data = snapshot.data();
        setMatchData(data);

        // Transition from matchmaking/waiting to game_active when 2nd player joins
        if (data.status === 'active' && (onlineSubModeRef.current === 'matchmaking' || onlineSubModeRef.current === 'room_waiting')) {
          sounds.playSuccess();
          setOnlineSubMode('game_active');
        }

        // Check for game completion
        if (data.status === 'completed' && data.winnerId) {
          setIsCreator(false);
          setOnlineSubMode('game_over');
          if (data.winnerId === currentUid) {
            sounds.playSuccess();
            if (!trophyAwarded && data.type === 'random') {
              setTrophyAwarded(true);
              incrementTrophyDirectly();
            }
          } else {
            sounds.playFailure();
          }
        }

        // Check for abandonment
        if (data.status === 'abandoned') {
          sounds.playFailure();
          setErrorMessage("Opponent left or disconnected from the match.");
          resetToLobby();
        }
      }
    }, (err) => {
      console.warn("Match snapshot listener note:", err);
      if (err?.code === 'permission-denied') {
        setShowRulesModal(true);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [activeMatchId, isBotMatch, currentUid, trophyAwarded, incrementTrophyDirectly]);

  // 2. CONTINUOUS MATCHMAKING QUEUE LISTENER
  // If player is in 'matchmaking' mode, continuously listen for other waiting random matches
  useEffect(() => {
    if (onlineSubMode !== 'matchmaking' || isBotMatch) return;

    let isSubscribed = true;
    const matchesRef = collection(db, 'matches');
    const q = query(
      matchesRef, 
      where('type', '==', 'random'), 
      where('status', '==', 'waiting')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!isSubscribed || onlineSubModeRef.current !== 'matchmaking') return;

      // Find any other player's waiting match
      const otherMatches = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() as any }))
        .filter(m => m.player1Id !== currentUid && m.id !== activeMatchIdRef.current);

      if (otherMatches.length > 0) {
        const targetMatch = otherMatches[0];
        try {
          // Connect to the found opponent's match!
          const targetRef = doc(db, 'matches', targetMatch.id);
          await updateDoc(targetRef, {
            player2Id: currentUid,
            player2Name: currentDisplayName,
            status: 'active',
            updatedAt: serverTimestamp()
          });

          if (!isSubscribed) return;

          setActiveMatchId(targetMatch.id);
          setMatchData({
            ...targetMatch,
            player2Id: currentUid,
            player2Name: currentDisplayName,
            status: 'active'
          });
          setIsCreator(false);
          sounds.playSuccess();
          setOnlineSubMode('game_active');
        } catch (err: any) {
          console.warn("Failed claiming opponent match:", err);
          if (err?.code === 'permission-denied') {
            setShowRulesModal(true);
          }
        }
      }
    }, (err) => {
      console.warn("Queue subscription warning:", err);
      if (err?.code === 'permission-denied') {
        setShowRulesModal(true);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [onlineSubMode, isBotMatch, currentUid, currentDisplayName]);

  const resetToLobby = () => {
    setActiveMatchId(null);
    setMatchData(null);
    setSelectedIndices([]);
    setIsCreator(false);
    setTrophyAwarded(false);
    setIsBotMatch(false);
    setOnlineSubMode('lobby');
  };

  const handleAbortMatch = async () => {
    const targetId = activeMatchIdRef.current;
    if (targetId && !isBotMatch) {
      try {
        const matchRef = doc(db, 'matches', targetId);
        const snap = await getDoc(matchRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'waiting' || data.status === 'active') {
            await updateDoc(matchRef, { status: 'abandoned', updatedAt: serverTimestamp() });
          }
        }
      } catch (err) {
        console.warn("Error recording abort: ", err);
      }
    }
    resetToLobby();
  };

  // RANDOM MATCHMAKING ENGINE
  const handleStartRandomMatchmaking = async () => {
    sounds.playClick();
    setErrorMessage(null);
    setIsBotMatch(false);

    // Deterministic match id for the host player
    const newMatchId = 'rand_' + currentUid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) + '_' + Math.random().toString(36).substring(2, 6);
    
    // Generate uniform game parameters
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
    const targetVal = formula.evaluate(operands);

    const newMatchPayload = {
      matchId: newMatchId,
      type: 'random',
      status: 'waiting',
      player1Id: currentUid,
      player1Name: currentDisplayName,
      player2Id: null,
      player2Name: null,
      grid: grid,
      target: targetVal,
      formulaDisplay: formula.display,
      formulaSize: formula.size,
      winnerId: null,
      winnerName: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 1. Immediately switch to matchmaking view
    setActiveMatchId(newMatchId);
    setMatchData(newMatchPayload);
    setIsCreator(true);
    setOnlineSubMode('matchmaking');

    // 2. Query available queue first, or publish own match
    try {
      const matchesRef = collection(db, 'matches');
      const q = query(
        matchesRef, 
        where('type', '==', 'random'), 
        where('status', '==', 'waiting')
      );
      const snapshot = await getDocs(q);

      const waitingMatches = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() as any }))
        .filter(m => m.player1Id !== currentUid);

      if (waitingMatches.length > 0) {
        // Connect to existing waiting match
        const chosenMatch = waitingMatches[0];
        const matchRef = doc(db, 'matches', chosenMatch.id);
        
        await updateDoc(matchRef, {
          player2Id: currentUid,
          player2Name: currentDisplayName,
          status: 'active',
          updatedAt: serverTimestamp()
        });

        setActiveMatchId(chosenMatch.id);
        setMatchData({
          ...chosenMatch,
          player2Id: currentUid,
          player2Name: currentDisplayName,
          status: 'active'
        });
        setIsCreator(false);
        setOnlineSubMode('game_active');
        sounds.playSuccess();
      } else {
        // Publish our waiting match to Firestore
        const matchRef = doc(db, 'matches', newMatchId);
        await setDoc(matchRef, newMatchPayload);
      }
    } catch (err: any) {
      console.warn("Matchmaking register note:", err);
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
    const targetVal = formula.evaluate(operands);

    const botMatchData = {
      matchId: 'bot_' + Math.random().toString(36).substring(2, 8),
      type: 'random',
      status: 'active',
      player1Id: currentUid,
      player1Name: currentDisplayName,
      player2Id: 'bot_ai',
      player2Name: 'AI Matrix Bot 🤖',
      grid: grid,
      target: targetVal,
      formulaDisplay: formula.display,
      formulaSize: formula.size,
      winnerId: null,
      winnerName: null
    };

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

    // Generate unique 4-character uppercase code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

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
    const targetVal = formula.evaluate(operands);

    const roomPayload = {
      matchId: code,
      type: 'room',
      status: 'waiting',
      player1Id: currentUid,
      player1Name: currentDisplayName,
      player2Id: null,
      player2Name: null,
      grid: grid,
      target: targetVal,
      formulaDisplay: formula.display,
      formulaSize: formula.size,
      winnerId: null,
      winnerName: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 1. Immediately set the code so the UI displays it with ZERO delay!
    setActiveMatchId(code);
    setMatchData(roomPayload);
    setIsCreator(true);
    setOnlineSubMode('room_waiting');

    // 2. Save document to Firestore
    try {
      const matchRef = doc(db, 'matches', code);
      await setDoc(matchRef, roomPayload);
    } catch (err: any) {
      console.warn("Room creation Firestore write note:", err);
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
            updatedAt: serverTimestamp()
          });

          setActiveMatchId(code);
          setMatchData({
            ...data,
            player2Id: currentUid,
            player2Name: currentDisplayName,
            status: 'active'
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

  // MULTIPLAYER SOLVER CLICKS
  const handleCellClick = async (idx: number) => {
    if (!matchData || matchData.status !== 'active') return;

    sounds.playClick();

    if (selectedIndices.includes(idx)) {
      setSelectedIndices(prev => prev.filter(i => i !== idx));
      return;
    }

    const newSelection = [...selectedIndices, idx];
    const maxFormulaSize = matchData.formulaSize;

    if (newSelection.length < maxFormulaSize) {
      setSelectedIndices(newSelection);
    } else {
      // Evaluate solution
      const operands = newSelection.map(index => matchData.grid[index]);
      
      let resultCheck = 0;
      if (matchData.formulaDisplay.includes('*') && matchData.formulaDisplay.includes('-')) {
        resultCheck = operands[0] * operands[1] - operands[2];
      } else if (matchData.formulaDisplay.includes('(')) {
        resultCheck = (operands[0] - operands[1]) * operands[2];
      } else {
        resultCheck = operands[0] * operands[1] + operands[2];
      }

      if (resultCheck === matchData.target) {
        sounds.playSuccess();
        if (isBotMatch) {
          setMatchData((prev: any) => ({
            ...prev,
            status: 'completed',
            winnerId: currentUid,
            winnerName: currentDisplayName
          }));
          setOnlineSubMode('game_over');
          if (!trophyAwarded) {
            setTrophyAwarded(true);
            incrementTrophyDirectly();
          }
        } else {
          try {
            const matchRef = doc(db, 'matches', activeMatchId!);
            await updateDoc(matchRef, {
              status: 'completed',
              winnerId: currentUid,
              winnerName: currentDisplayName,
              updatedAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Error committing win: ", err);
          }
        }
      } else {
        sounds.playFailure();
        setSelectedIndices([]);
      }
    }
  };

  const renderFormulaWithBlanks = () => {
    if (!matchData) return null;

    let display = matchData.formulaDisplay;
    const alphabet = ['A', 'B', 'C', 'D'];

    alphabet.forEach((letter, idx) => {
      if (idx < matchData.formulaSize) {
        const replacement = selectedIndices.length > idx 
          ? `<span class="px-2 py-1 mx-1 rounded border border-zinc-700 font-bold text-white bg-zinc-800 text-xs">${matchData.grid[selectedIndices[idx]]}</span>`
          : `<span class="px-2.5 py-1 mx-1 rounded border-2 border-dashed border-zinc-700 text-xs text-zinc-600 animate-pulse bg-zinc-950/20 font-bold">?</span>`;
        
        display = display.replace(`[${letter}]`, replacement);
      }
    });

    return (
      <div 
        className="flex items-center justify-center font-mono py-2 tracking-widest leading-relaxed text-zinc-400"
        dangerouslySetInnerHTML={{ __html: display }}
      />
    );
  };

  return (
    <div className="w-full flex flex-col h-full text-white animate-fadeIn pb-2 justify-between">
      
      {/* 1. LOBBY LANDING SCREEN */}
      {onlineSubMode === 'lobby' && (
        <div className="flex-1 flex flex-col justify-between">
          
          {/* HEADER */}
          <div className="flex items-center justify-between w-full mb-3 shrink-0 relative z-30">
            <button 
              onClick={() => { sounds.playClick(); onClose(); }}
              className="w-9 h-9 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all shadow-md shrink-0"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-300" />
            </button>

            <div className="text-center flex-1 mx-2">
              <h2 className="text-base font-black tracking-[0.2em] text-white leading-none uppercase flex items-center justify-center gap-1.5">
                <Globe className="w-4 h-4 text-blue-400 animate-pulse" /> Play Online
              </h2>
              <p className="text-[7px] text-zinc-500 uppercase tracking-[0.15em] mt-1">
                Real-Time Competitive Duels
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

          {/* MAIN ACTIONS CARD */}
          <div className="flex-1 flex flex-col justify-center gap-3 py-1 shrink-0">
            
            {/* Action 1: Random Matchmaking */}
            <button
              onClick={handleStartRandomMatchmaking}
              className="w-full p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/15 group transition-all text-left relative overflow-hidden"
            >
              <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-all">
                <Globe className="w-5 h-5 animate-spin-slow" />
              </div>
              <p className="text-xs font-black tracking-wider text-blue-400 uppercase">Random Duel</p>
              <p className="text-[10px] text-white font-extrabold mt-0.5">Quick Matchmaker</p>
              <p className="text-[8px] text-zinc-500 mt-1">Instantly pair with an active online challenger globally in real-time.</p>
            </button>

            {/* Action 2: Create Custom Room */}
            <button
              onClick={handleCreatePrivateRoom}
              className="w-full p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/15 group transition-all text-left relative overflow-hidden"
            >
              <div className="absolute right-4 top-4 w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <p className="text-xs font-black tracking-wider text-violet-400 uppercase">Create Room</p>
              <p className="text-[10px] text-white font-extrabold mt-0.5">Invite your friends</p>
              <p className="text-[8px] text-zinc-500 mt-1">Generate a 4-letter room code and duel with friends.</p>
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
                <div className="w-7 h-7 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-zinc-300">Duel AI Matrix Bot</p>
                  <p className="text-[8px] text-zinc-500">Practice real-time speed solving against AI</p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-all" />
            </button>

          </div>

          <div className="text-center py-1 shrink-0">
            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
              Hard level formula only • Real-Time solver wins
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
              <h3 className="text-xs font-bold text-white tracking-wider">Listening on Global Queue</h3>
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
                Custom Game Room
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
              Room rules: Hard level layout only
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
        <div className="flex-1 flex flex-col items-center justify-between w-full max-w-sm mx-auto animate-fadeIn">
          
          {/* Header Stats bar */}
          <div className={`w-full rounded-xl border ${theme.border} bg-black/40 p-2.5 mb-2 flex items-center justify-between shadow-md`}>
            <div>
              <p className="text-[8px] uppercase tracking-wider text-blue-400 font-bold">VS Match ID</p>
              <p className="text-xs font-black tracking-wider text-white font-mono">{activeMatchId}</p>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[8px] text-red-400 font-black tracking-widest uppercase animate-pulse">
              <Globe className="w-3 h-3 text-red-400" /> Competitive Duel
            </div>

            <div className="text-right">
              <p className="text-[8px] uppercase tracking-wider text-zinc-500">Opponent</p>
              <p className="text-xs font-bold text-zinc-300 uppercase tracking-wide truncate max-w-[90px]">
                {currentUid === matchData.player1Id ? (matchData.player2Name || 'Challenger') : matchData.player1Name}
              </p>
            </div>
          </div>

          {/* Equation Formula Header */}
          <div className="w-full rounded-xl border border-zinc-900 bg-black/35 p-2.5 mb-2 text-center relative">
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-500">Equation</span>
              <span className="text-[9px] font-black font-mono tracking-wide text-cyan-400 animate-pulse">
                SOLVER WINS
              </span>
            </div>

            {renderFormulaWithBlanks()}

            <div className="flex items-center justify-center gap-2 mt-1.5 border-t border-zinc-900 pt-1.5 select-none">
              <span className="text-[10px] uppercase font-bold text-zinc-500">Target Result:</span>
              <span className="text-lg font-black font-mono text-cyan-400 filter drop-shadow-[0_0_4px_#06b6d4]">
                {matchData.target}
              </span>
            </div>
          </div>

          {/* Matrix Cells Grid */}
          <div className="grid grid-cols-4 gap-1.5 w-full mb-2.5 p-1.5 bg-black/45 border border-zinc-900/60 rounded-xl select-none">
            {matchData.grid.map((val: number, idx: number) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  className={`aspect-square rounded-lg border font-mono font-black text-base flex items-center justify-center relative transition-all active:scale-90 ${
                    isSelected 
                      ? 'border-blue-500 bg-zinc-850/80 text-white font-extrabold shadow-[0_0_12px_#3b82f6]' 
                      : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700 hover:text-white'
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

          {/* Quit match action button */}
          <div className="w-full shrink-0">
            <button
              onClick={handleAbortMatch}
              className="w-full py-2.5 rounded-2xl border border-red-950/70 hover:border-red-500/50 bg-red-950/20 text-[10px] font-black uppercase text-red-400 hover:text-red-300 transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              Abort Match Duel
            </button>
          </div>

        </div>
      )}

      {/* 6. GAME OVER MULTIPLAYER DUEL WINNER RESULTS SCREEN */}
      {onlineSubMode === 'game_over' && matchData && (
        <div className="flex-1 flex flex-col justify-center items-center py-4 w-full max-w-sm mx-auto">
          
          <div className={`w-full max-w-xs rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative border ${
            matchData.winnerId === currentUid 
              ? 'border-emerald-500/30 bg-zinc-950' 
              : 'border-red-500/30 bg-zinc-950'
          }`}>
            
            {matchData.winnerId === currentUid ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <CheckCircle className="w-10 h-10" />
                </div>

                <h3 className="text-xl font-black tracking-widest text-emerald-400 uppercase leading-none mb-1">
                  YOU WON!
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
                  You solved the matrix first
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-shake">
                  <AlertOctagon className="w-10 h-10" />
                </div>

                <h3 className="text-xl font-black tracking-widest text-red-400 uppercase leading-none mb-1">
                  YOU LOST!
                </h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 truncate max-w-[180px]">
                  Winner: {matchData.winnerName || 'Opponent'}
                </p>
                <p className="text-[8px] text-zinc-600 uppercase tracking-wider mb-6">
                  They solved the board before you
                </p>
              </>
            )}

            <div className="w-full space-y-2">
              <button
                onClick={resetToLobby}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
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

    </div>
  );
};
