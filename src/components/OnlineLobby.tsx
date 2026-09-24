/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Check
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
import { MathMatrixBoard } from './MathMatrixBoard';
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
  const [trophyAwarded, setTrophyAwarded] = useState<boolean>(false);

  // Gameplay specific synchronization
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      handleAbortMatch();
    };
  }, []);

  // Listen to the active match document in real time
  useEffect(() => {
    if (!activeMatchId) return;

    const matchRef = doc(db, 'matches', activeMatchId);
    const unsubscribe = onSnapshot(matchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMatchData(data);

        // Check for opponent connection
        if (onlineSubMode === 'matchmaking' && data.status === 'active') {
          sounds.playSuccess();
          setOnlineSubMode('game_active');
        }
        if (onlineSubMode === 'room_waiting' && data.status === 'active') {
          sounds.playSuccess();
          setOnlineSubMode('game_active');
        }

        // Check for game winner completed state
        if (data.status === 'completed' && data.winnerId) {
          setIsCreator(false);
          setOnlineSubMode('game_over');
          if (data.winnerId === user.uid) {
            sounds.playSuccess();
            // Trophies are awarded for Quick Random Matchmaking Only (type === 'random')
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
          alert("Opponent left the match.");
          resetToLobby();
        }
      }
    });

    return () => unsubscribe();
  }, [activeMatchId, onlineSubMode]);

  const resetToLobby = () => {
    setActiveMatchId(null);
    setMatchData(null);
    setSelectedIndices([]);
    setIsCreator(false);
    setTrophyAwarded(false);
    setOnlineSubMode('lobby');
  };

  const handleAbortMatch = async () => {
    if (activeMatchId) {
      try {
        const matchRef = doc(db, 'matches', activeMatchId);
        const snap = await getDoc(matchRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.status === 'waiting' && data.player1Id === user.uid) {
            await updateDoc(matchRef, { status: 'abandoned', updatedAt: serverTimestamp() });
          } else if (data.status === 'active') {
            await updateDoc(matchRef, { status: 'abandoned', updatedAt: serverTimestamp() });
          }
        }
      } catch (err) {
        console.error("Error aborting match: ", err);
      }
    }
    resetToLobby();
  };

  // 1. RANDOM MATCHMAKING ENGINE
  const handleStartRandomMatchmaking = async () => {
    sounds.playClick();
    setOnlineSubMode('matchmaking');

    try {
      // Find active waiting matches
      const matchesRef = collection(db, 'matches');
      const q = query(
        matchesRef, 
        where('type', '==', 'random'), 
        where('status', '==', 'waiting')
      );
      const snapshot = await getDocs(q);

      // Filter out self matches
      const waitingMatches = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(m => m.player1Id !== user.uid);

      if (waitingMatches.length > 0) {
        // Join existing match
        const chosenMatch = waitingMatches[0];
        const matchRef = doc(db, 'matches', chosenMatch.id);
        
        await updateDoc(matchRef, {
          player2Id: user.uid,
          player2Name: profile?.displayName || user.displayName || 'Anonymous Match',
          status: 'active',
          updatedAt: serverTimestamp()
        });

        setActiveMatchId(chosenMatch.id);
        setIsCreator(false);
      } else {
        // Create new waiting match
        const newMatchId = 'rand_' + Math.random().toString(36).substring(2, 11);
        
        // Generate uniform game parameters
        const formula = HARD_FORMULAS[Math.floor(Math.random() * HARD_FORMULAS.length)];
        const grid: number[] = [];
        for (let i = 0; i < 16; i++) {
          let val = Math.floor(Math.random() * 15) + 1;
          grid.push(val);
        }
        
        // Find deterministic solved target
        const solvedIndices: number[] = [];
        while (solvedIndices.length < formula.size) {
          const randIdx = Math.floor(Math.random() * 16);
          if (!solvedIndices.includes(randIdx)) solvedIndices.push(randIdx);
        }
        const operands = solvedIndices.map(idx => grid[idx]);
        const targetVal = formula.evaluate(operands);

        const matchRef = doc(db, 'matches', newMatchId);
        await setDoc(matchRef, {
          matchId: newMatchId,
          type: 'random',
          status: 'waiting',
          player1Id: user.uid,
          player1Name: profile?.displayName || user.displayName || 'Anonymous Match',
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
        });

        setActiveMatchId(newMatchId);
        setIsCreator(true);
      }
    } catch (err) {
      console.error("Matchmaking failed: ", err);
      sounds.playFailure();
      resetToLobby();
    }
  };

  // 2. CREATE PRIVATE GAME ROOM
  const handleCreatePrivateRoom = async () => {
    sounds.playClick();
    setOnlineSubMode('room_waiting');

    // Generate unique 4-character uppercase code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const formula = HARD_FORMULAS[Math.floor(Math.random() * HARD_FORMULAS.length)];
      const grid: number[] = [];
      for (let i = 0; i < 16; i++) {
        let val = Math.floor(Math.random() * 15) + 1;
        grid.push(val);
      }
      
      const solvedIndices: number[] = [];
      while (solvedIndices.length < formula.size) {
        const randIdx = Math.floor(Math.random() * 16);
        if (!solvedIndices.includes(randIdx)) solvedIndices.push(randIdx);
      }
      const operands = solvedIndices.map(idx => grid[idx]);
      const targetVal = formula.evaluate(operands);

      const matchRef = doc(db, 'matches', code);
      await setDoc(matchRef, {
        matchId: code,
        type: 'room',
        status: 'waiting',
        player1Id: user.uid,
        player1Name: profile?.displayName || user.displayName || 'Room Host',
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
      });

      setActiveMatchId(code);
      setIsCreator(true);
    } catch (err) {
      console.error("Room creation failed: ", err);
      sounds.playFailure();
      resetToLobby();
    }
  };

  // 3. JOIN PRIVATE GAME ROOM
  const handleJoinPrivateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length !== 4) {
      sounds.playFailure();
      return;
    }

    try {
      const matchRef = doc(db, 'matches', code);
      const snap = await getDoc(matchRef);

      if (snap.exists()) {
        const data = snap.data();
        if (data.status === 'waiting') {
          await updateDoc(matchRef, {
            player2Id: user.uid,
            player2Name: profile?.displayName || user.displayName || 'Opponent Player',
            status: 'active',
            updatedAt: serverTimestamp()
          });

          setActiveMatchId(code);
          setIsCreator(false);
          setOnlineSubMode('game_active');
          sounds.playSuccess();
        } else {
          sounds.playFailure();
          alert("This room is already full or inactive!");
        }
      } else {
        sounds.playFailure();
        alert("Room Code not found!");
      }
    } catch (err) {
      console.error("Room join error: ", err);
      sounds.playFailure();
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

  // 4. MULTIPLAYER SOLVER CLICKS
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
      
      // Determine the active formula check method
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
        // Correct solve! Update match state immediately as Winner!
        try {
          const matchRef = doc(db, 'matches', activeMatchId!);
          await updateDoc(matchRef, {
            status: 'completed',
            winnerId: user.uid,
            winnerName: profile?.displayName || user.displayName || 'Challenger',
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error("Error committing win: ", err);
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
          <div className="flex items-center justify-between w-full mb-4 shrink-0 relative z-30">
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

            <div className="w-9 h-9 shrink-0 opacity-0" />
          </div>

          {/* MAIN ACTIONS CARD */}
          <div className="flex-1 flex flex-col justify-center gap-4 py-4 shrink-0">
            
            {/* Action 1: Random Matchmaking */}
            <button
              onClick={handleStartRandomMatchmaking}
              className="w-full p-5 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/10 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/15 group transition-all text-left relative overflow-hidden"
            >
              <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-all">
                <Globe className="w-6 h-6 animate-spin-slow" />
              </div>
              <p className="text-xs font-black tracking-wider text-blue-400 uppercase">Random Duel</p>
              <p className="text-[10px] text-white font-extrabold mt-1">Quick Matchmaker</p>
              <p className="text-[8px] text-zinc-500 mt-2">Instantly pair with an active online challenger globally on a Hard level game.</p>
            </button>

            {/* Action 2: Create Custom Room */}
            <button
              onClick={handleCreatePrivateRoom}
              className="w-full p-5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 border border-violet-500/30 hover:border-violet-400/50 hover:bg-violet-500/15 group transition-all text-left relative overflow-hidden"
            >
              <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-xs font-black tracking-wider text-violet-400 uppercase">Create Room</p>
              <p className="text-[10px] text-white font-extrabold mt-1">Invite your friends</p>
              <p className="text-[8px] text-zinc-500 mt-2">Generate a unique 4-letter room code and duel with friends.</p>
            </button>

            {/* Action 3: Join Custom Room */}
            <button
              onClick={() => { sounds.playClick(); setOnlineSubMode('room_join'); }}
              className="w-full p-5 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-400/50 hover:bg-emerald-500/15 group transition-all text-left relative overflow-hidden"
            >
              <div className="absolute right-4 top-4 w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-all">
                <Key className="w-5 h-5" />
              </div>
              <p className="text-xs font-black tracking-wider text-emerald-400 uppercase">Join Room</p>
              <p className="text-[10px] text-white font-extrabold mt-1">Enter code</p>
              <p className="text-[8px] text-zinc-500 mt-2">Enter code shared by a friend to jump straight into their board.</p>
            </button>

          </div>

          <div className="text-center py-2 shrink-0">
            <p className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">
              Hard level formula only • Real-Time solver wins
            </p>
          </div>

        </div>
      )}

      {/* 2. MATCHMAKING WAITING SCREEN (WAITING.SVG STYLING) */}
      {onlineSubMode === 'matchmaking' && (
        <div className="flex-1 flex flex-col justify-between items-center py-4">
          
          {/* BACK BUTTON */}
          <div className="w-full flex justify-start mb-6">
            <button 
              onClick={handleAbortMatch}
              className="px-4 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-[10px] font-black uppercase text-zinc-400 active:scale-95 transition-all shadow-md"
            >
              Back
            </button>
          </div>

          {/* DUEL MATCHMAKING VS VIEWER */}
          <div className="flex-1 flex items-center justify-center w-full max-w-sm relative px-6 py-4">
            
            <div className="flex items-center justify-between w-full relative z-10 gap-4">
              
              {/* YOU (ACTIVE USER) */}
              <div className="flex flex-col items-center flex-1">
                <div className="relative w-20 h-20 rounded-full border-2 border-emerald-500 bg-zinc-950 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse mb-3">
                  <User className="w-10 h-10 text-emerald-400" />
                </div>
                <span className="text-[10px] uppercase font-black text-white tracking-widest leading-none">YOU</span>
                <span className="text-[8px] text-zinc-500 mt-1 font-bold font-mono truncate max-w-[80px]">
                  {profile?.displayName || 'Guest Player'}
                </span>
              </div>

              {/* VS DECORATOR */}
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 px-3 tracking-widest animate-pulse filter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                VS
              </div>

              {/* WAITING OPPONENT */}
              <div className="flex flex-col items-center flex-1">
                <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-zinc-800 bg-zinc-950/40 flex items-center justify-center mb-3 animate-spin-slow">
                  <HelpCircle className="w-8 h-8 text-zinc-700" />
                </div>
                <span className="text-[10px] uppercase font-black text-zinc-400 tracking-widest leading-none">Waiting</span>
                <span className="text-[8px] text-zinc-500 mt-1 font-bold tracking-wider uppercase animate-pulse">
                  Searching...
                </span>
              </div>

            </div>

          </div>

          {/* LOADING DETAILS SUMMARY */}
          <div className="text-center mt-6">
            <h3 className="text-sm font-bold text-white tracking-wider">Waiting for Opponent</h3>
            <p className="text-[10px] text-zinc-500 tracking-widest mt-1 flex items-center justify-center gap-1.5">
              Find a match <span className="flex gap-0.5"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span></span>
            </p>
            
            {/* Spinning radar wheel loader */}
            <div className="mt-6 flex justify-center">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          </div>

        </div>
      )}

      {/* 3. ROOM CODE CREATOR WAITING SCREEN */}
      {onlineSubMode === 'room_waiting' && (
        <div className="flex-1 flex flex-col justify-between items-center py-4">
          
          {/* HEADER */}
          <div className="flex items-center justify-between w-full mb-4 shrink-0 relative z-30">
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
          <div className="flex-1 flex flex-col justify-center items-center w-full py-4 shrink-0">
            
            <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-500 font-bold mb-3">Share Room Code</p>
            
            <div className="flex items-center gap-2 p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl w-full max-w-[240px] justify-between">
              <span className="text-2xl font-black font-mono text-white tracking-[0.15em] pl-2">{activeMatchId}</span>
              <button
                onClick={copyToClipboard}
                className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition active:scale-90"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {copied && <p className="text-[8px] text-emerald-400 uppercase font-black tracking-widest mt-2">Copied to Clipboard!</p>}

            {/* Waiting indicators */}
            <div className="mt-10 flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <p className="text-[9px] text-zinc-400 uppercase font-bold tracking-widest mt-4">Waiting for challenger to join...</p>
            </div>

          </div>

          <div className="text-center py-2 shrink-0">
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
          <div className="flex items-center justify-between w-full mb-4 shrink-0 relative z-30">
            <button 
              onClick={() => { sounds.playClick(); setOnlineSubMode('lobby'); }}
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
          <div className="flex-1 flex flex-col justify-center items-center w-full py-4 shrink-0">
            
            <form onSubmit={handleJoinPrivateRoom} className="w-full max-w-[280px] text-center space-y-4">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Enter 4-Character Room Code</p>
              
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.slice(0, 4))}
                placeholder="ABCD"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-center font-mono font-black text-2xl tracking-[0.25em] text-white focus:border-emerald-500 focus:outline-none uppercase"
              />

              <button
                type="submit"
                disabled={roomCodeInput.trim().length !== 4}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transform active:scale-95 transition-all border ${
                  roomCodeInput.trim().length === 4
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg border-emerald-400/20'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed'
                }`}
              >
                Join Duel <ArrowRight className="w-4 h-4" />
              </button>
            </form>

          </div>

          <div className="text-center py-2 shrink-0 animate-pulse">
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
          <div className={`w-full rounded-xl border ${theme.border} bg-black/40 p-2.5 mb-2.5 flex items-center justify-between shadow-md`}>
            <div>
              <p className="text-[8px] uppercase tracking-wider text-blue-400 font-bold">VS Match ID</p>
              <p className="text-xs font-black tracking-wider text-white font-mono">{activeMatchId}</p>
            </div>

            <div className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-[8px] text-red-400 font-black tracking-widest uppercase animate-pulse">
              <Globe className="w-3 h-3 text-red-400" /> Competetive Duel
            </div>

            <div className="text-right">
              <p className="text-[8px] uppercase tracking-wider text-zinc-500">Opponent</p>
              <p className="text-xs font-bold text-zinc-300 uppercase tracking-wide truncate max-w-[90px]">
                {user.uid === matchData.player1Id ? (matchData.player2Name || 'Challenger') : matchData.player1Name}
              </p>
            </div>
          </div>

          {/* Equation Formula Header */}
          <div className="w-full rounded-xl border border-zinc-900 bg-black/35 p-3 mb-2.5 text-center relative">
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

          {/* Matrix Cells Grid (Strictly fixed to 4x4 matrix for Online hard mode) */}
          <div className="grid grid-cols-4 gap-1.5 w-full mb-3.5 p-1.5 bg-black/45 border border-zinc-900/60 rounded-xl select-none">
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
              className="w-full py-3 rounded-2xl border border-red-950/70 hover:border-red-500/50 bg-red-950/20 text-[10px] font-black uppercase text-red-400 hover:text-red-300 transition active:scale-95 flex items-center justify-center gap-1.5"
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
            matchData.winnerId === user.uid 
              ? 'border-emerald-500/30 bg-zinc-950' 
              : 'border-red-500/30 bg-zinc-950'
          }`}>
            
            {matchData.winnerId === user.uid ? (
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

            {/* EXIT LOBBY ACTIONS */}
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

    </div>
  );
};
