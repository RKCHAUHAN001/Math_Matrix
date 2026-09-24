/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronDown, Crown } from 'lucide-react';
import { useFirebase, LeaderboardEntry } from '../context/FirebaseContext';
import sounds from '../utils/audio';

interface LeaderboardViewProps {
  theme: any;
  onClose: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ theme, onClose }) => {
  const { getLeaderboard, isOnline, profile } = useFirebase();
  const [difficultyFilter, setDifficultyFilter] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const fetchScores = async () => {
    setLoading(true);
    const data = await getLeaderboard(difficultyFilter);
    const sorted = [...data]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setScores(sorted);
    setLoading(false);
  };

  useEffect(() => {
    fetchScores();
  }, [difficultyFilter, isOnline]);

  const handleDropdownSelect = (val: 'easy' | 'medium' | 'hard') => {
    sounds.playClick();
    setDifficultyFilter(val);
    setShowDropdown(false);
  };

  const hasScores = scores.length > 0;

  // Extract Top 3 podium players dynamically
  const rank1 = scores[0] || null;
  const rank2 = scores[1] || null;
  const rank3 = scores[2] || null;

  // Ranks 4 to 10
  const remainingRanks = scores.slice(3);

  return (
    <div className="w-full flex flex-col text-white select-none h-full justify-between">
      
      {/* 1. COMPRESSED HEADER */}
      <header className="flex items-center justify-between w-full mb-3 shrink-0 relative z-30">
        <button 
          onClick={() => { sounds.playClick(); onClose(); }}
          className="w-9 h-9 rounded-xl bg-zinc-800/40 border border-white/10 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-700/50 transition-all shadow-md shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <div className="text-center flex-1 mx-2">
          <h2 className="text-base font-black tracking-[0.25em] text-white leading-none uppercase">
            HALL OF FAME
          </h2>
          <p className="text-[7px] text-zinc-500 uppercase tracking-[0.2em] mt-0.5 font-bold">
            GLOBAL LEADERBOARD
          </p>
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => { sounds.playClick(); setShowDropdown(!showDropdown); }}
            className="flex items-center gap-1 rounded-full bg-zinc-800/40 border border-white/10 px-3.5 py-1.5 text-[9px] font-black uppercase text-sky-400 tracking-wider shadow-md active:scale-95 transition-all"
          >
            {difficultyFilter}
            <ChevronDown className="w-2.5 h-2.5 text-sky-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-zinc-950 border border-zinc-900 shadow-2xl z-50 overflow-hidden divide-y divide-zinc-900 animate-fadeIn">
              {(['easy', 'medium', 'hard'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleDropdownSelect(filter)}
                  className={`w-full text-left px-4 py-2.5 text-[9px] uppercase font-bold tracking-wider transition-colors ${
                    difficultyFilter === filter 
                      ? 'bg-sky-500/10 text-sky-400' 
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  {filter} Mode
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* 2. DYNAMIC PODIUM VIEW (ONLY RENDERS IF AT LEAST ONE SCORE EXISTS) */}
      {hasScores ? (
        <div className="flex items-end justify-center gap-4 mt-1 mb-3 shrink-0">
          
          {/* RANK #2 (LEFT) */}
          <div className="flex flex-col items-center text-center w-20">
            <div className="relative w-12 h-12 rounded-full bg-zinc-800/20 border-2 border-zinc-400 flex items-center justify-center shadow-[0_0_8px_rgba(156,163,175,0.2)]">
              <span className="text-lg">{rank2 ? '👤' : '—'}</span>
              <div className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-zinc-400 border border-zinc-300 text-[6px] font-black text-zinc-950 uppercase">
                #2
              </div>
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-white mt-2 truncate w-full">
              {rank2 ? rank2.displayName : 'Empty Slot'}
            </span>
            <span className="text-[7px] font-black text-sky-400 mt-0.5">
              {rank2 ? `${rank2.score.toLocaleString()} PTS` : '0 PTS'}
            </span>
          </div>

          {/* RANK #1 (CENTER) */}
          <div className="flex flex-col items-center text-center w-24">
            <div className="relative w-15 h-15 rounded-full bg-yellow-950/20 border-[3px] border-yellow-400 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(234,179,8,0.3)]">
              <Crown className="w-3.5 h-3.5 text-yellow-400 fill-current mb-0.5 animate-pulse" />
              <div className="absolute -bottom-1 px-2 py-0.2 rounded-full bg-yellow-400 border border-yellow-300 text-[6px] font-black text-yellow-950 uppercase">
                #1
              </div>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-white mt-2.5 truncate w-full">
              {rank1 ? rank1.displayName : 'Empty Slot'}
            </span>
            <span className="text-[8px] font-black text-yellow-400 mt-0.5">
              {rank1 ? `${rank1.score.toLocaleString()} PTS` : '0 PTS'}
            </span>
          </div>

          {/* RANK #3 (RIGHT) */}
          <div className="flex flex-col items-center text-center w-20">
            <div className="relative w-12 h-12 rounded-full bg-orange-950/20 border-2 border-orange-500 flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.2)]">
              <span className="text-lg">{rank3 ? '👤' : '—'}</span>
              <div className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-orange-500 border border-orange-450 text-[6px] font-black text-orange-950 uppercase">
                #3
              </div>
            </div>
            <span className="text-[8px] font-black uppercase tracking-wider text-white mt-2 truncate w-full">
              {rank3 ? rank3.displayName : 'Empty Slot'}
            </span>
            <span className="text-[7px] font-black text-orange-400 mt-0.5">
              {rank3 ? `${rank3.score.toLocaleString()} PTS` : '0 PTS'}
            </span>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/5 border border-white/10 rounded-2xl mb-4 shrink-0">
          <span className="text-3xl mb-2">⭐</span>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400 mb-1">
            No Scores Submitted
          </p>
          <p className="text-[9px] text-zinc-500 uppercase tracking-wider max-w-[200px] leading-relaxed mx-auto">
            Be the very first player to conquer the offline matrix to top this rank!
          </p>
        </div>
      )}

      {/* 3. SCROLLABLE ROWS FOR COMPRESSED LIST (ONLY RENDERS ACTUAL SCORES) */}
      <div className="flex-1 space-y-1 overflow-y-auto max-h-[190px] pr-0.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-5 h-5 rounded-full border-2 border-dashed border-zinc-600 animate-spin mb-2" />
            <p className="text-[8px] uppercase tracking-wider text-zinc-500">Retrieving ranks...</p>
          </div>
        ) : (
          remainingRanks.map((entry, index) => {
            const rank = index + 4;
            const isMe = entry.userId === profile?.uid;

            return (
              <div
                key={rank}
                className={`w-full py-1.5 px-4 rounded-xl bg-gradient-to-r from-white/10 to-white/5 border border-white/5 flex items-center justify-between shadow-sm ${
                  isMe ? 'border-emerald-500/40 bg-emerald-500/5' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[9px] font-bold text-zinc-500 w-4">
                    {rank}
                  </span>

                  <div className="w-4 h-4 rounded-full bg-zinc-850/60 border border-white/5 flex items-center justify-center text-[8px] text-zinc-400">
                    👤
                  </div>

                  <span className={`text-[9px] font-semibold tracking-wide uppercase truncate max-w-[120px] ${
                    isMe ? 'text-emerald-400' : 'text-zinc-300'
                  }`}>
                    {entry.displayName}
                  </span>
                </div>

                <span className="text-[9px] font-black text-sky-400 tracking-wider font-mono">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
