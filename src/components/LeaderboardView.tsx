/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, 
  ChevronDown, 
  Crown, 
  WifiOff, 
  RefreshCw, 
  Instagram, 
  Facebook, 
  Linkedin, 
  Youtube, 
  ExternalLink 
} from 'lucide-react';
import { useFirebase, LeaderboardEntry } from '../context/FirebaseContext';
import { getSocialInfo, SocialInfo } from '../utils/social';
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

  const openSocialProfile = (url?: string) => {
    if (!url) return;
    sounds.playClick();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderSocialIcon = (platform: SocialInfo['platform'], className = "w-3 h-3") => {
    switch (platform) {
      case 'instagram':
        return <Instagram className={className} />;
      case 'facebook':
        return <Facebook className={className} />;
      case 'linkedin':
        return <Linkedin className={className} />;
      case 'youtube':
        return <Youtube className={className} />;
      case 'x':
        return (
          <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
    }
  };

  const hasScores = scores.length > 0;

  // Extract Top 3 podium players dynamically
  const rank1 = scores[0] || null;
  const rank2 = scores[1] || null;
  const rank3 = scores[2] || null;

  const social1 = rank1 ? getSocialInfo(rank1.socialLink) : null;
  const social2 = rank2 ? getSocialInfo(rank2.socialLink) : null;
  const social3 = rank3 ? getSocialInfo(rank3.socialLink) : null;

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

      {/* 2. DYNAMIC PODIUM & SCORES VIEW OR NO INTERNET STATE */}
      {!isOnline ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white/5 border border-white/10 rounded-3xl my-auto animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <WifiOff className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white mb-1">
            No Internet Connection
          </h3>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest max-w-[220px] leading-relaxed mb-5">
            Global rankings require an active internet connection to load live scores.
          </p>
          <button
            onClick={() => {
              sounds.playClick();
              if (navigator.onLine) {
                fetchScores();
              } else {
                sounds.playFailure();
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-black uppercase tracking-wider text-white transition active:scale-95 flex items-center gap-2 shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </div>
      ) : (
        <>
          {/* DYNAMIC PODIUM VIEW */}
          {hasScores ? (
            <div className="flex items-end justify-center gap-3.5 mt-1 mb-3 shrink-0">
              
              {/* RANK #2 (LEFT) */}
              <div 
                onClick={() => social2 && openSocialProfile(social2.url)}
                className={`flex flex-col items-center text-center w-20 transition-transform active:scale-95 ${
                  social2 ? 'cursor-pointer group' : ''
                }`}
              >
                <div className="relative w-12 h-12 rounded-full bg-zinc-800/20 border-2 border-zinc-400 flex items-center justify-center shadow-[0_0_8px_rgba(156,163,175,0.2)] group-hover:border-zinc-200">
                  <span className="text-lg">{rank2 ? '👤' : '—'}</span>
                  <div className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-zinc-400 border border-zinc-300 text-[6px] font-black text-zinc-950 uppercase">
                    #2
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider text-white mt-1.5 truncate w-full group-hover:text-zinc-200">
                  {rank2 ? rank2.displayName : 'Empty Slot'}
                </span>
                <span className="text-[7px] font-black text-sky-400 mt-0.5">
                  {rank2 ? `${rank2.score.toLocaleString()} PTS` : '0 PTS'}
                </span>

                {/* Social Button Badge */}
                {social2 && (
                  <a
                    href={social2.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); sounds.playClick(); }}
                    title={`Visit ${rank2?.displayName}'s ${social2.label}`}
                    className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-wider ${social2.bgColor} ${social2.borderColor} ${social2.color} shadow-sm active:scale-90 transition-all hover:scale-105`}
                  >
                    {renderSocialIcon(social2.platform, "w-2.5 h-2.5")}
                    <span>{social2.label}</span>
                    <ExternalLink className="w-2 h-2 opacity-70" />
                  </a>
                )}
              </div>

              {/* RANK #1 (CENTER) */}
              <div 
                onClick={() => social1 && openSocialProfile(social1.url)}
                className={`flex flex-col items-center text-center w-24 transition-transform active:scale-95 ${
                  social1 ? 'cursor-pointer group' : ''
                }`}
              >
                <div className="relative w-15 h-15 rounded-full bg-yellow-950/20 border-[3px] border-yellow-400 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(234,179,8,0.3)] group-hover:border-yellow-300">
                  <Crown className="w-3.5 h-3.5 text-yellow-400 fill-current mb-0.5 animate-pulse" />
                  <div className="absolute -bottom-1 px-2 py-0.2 rounded-full bg-yellow-400 border border-yellow-300 text-[6px] font-black text-yellow-950 uppercase">
                    #1
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-white mt-2 truncate w-full group-hover:text-yellow-300">
                  {rank1 ? rank1.displayName : 'Empty Slot'}
                </span>
                <span className="text-[8px] font-black text-yellow-400 mt-0.5">
                  {rank1 ? `${rank1.score.toLocaleString()} PTS` : '0 PTS'}
                </span>

                {/* Social Button Badge */}
                {social1 && (
                  <a
                    href={social1.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); sounds.playClick(); }}
                    title={`Visit ${rank1?.displayName}'s ${social1.label}`}
                    className={`mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-wider ${social1.bgColor} ${social1.borderColor} ${social1.color} shadow-sm active:scale-90 transition-all hover:scale-105`}
                  >
                    {renderSocialIcon(social1.platform, "w-2.5 h-2.5")}
                    <span>{social1.label}</span>
                    <ExternalLink className="w-2 h-2 opacity-70" />
                  </a>
                )}
              </div>

              {/* RANK #3 (RIGHT) */}
              <div 
                onClick={() => social3 && openSocialProfile(social3.url)}
                className={`flex flex-col items-center text-center w-20 transition-transform active:scale-95 ${
                  social3 ? 'cursor-pointer group' : ''
                }`}
              >
                <div className="relative w-12 h-12 rounded-full bg-orange-950/20 border-2 border-orange-500 flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.2)] group-hover:border-orange-400">
                  <span className="text-lg">{rank3 ? '👤' : '—'}</span>
                  <div className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-orange-500 border border-orange-450 text-[6px] font-black text-orange-950 uppercase">
                    #3
                  </div>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider text-white mt-1.5 truncate w-full group-hover:text-orange-300">
                  {rank3 ? rank3.displayName : 'Empty Slot'}
                </span>
                <span className="text-[7px] font-black text-orange-400 mt-0.5">
                  {rank3 ? `${rank3.score.toLocaleString()} PTS` : '0 PTS'}
                </span>

                {/* Social Button Badge */}
                {social3 && (
                  <a
                    href={social3.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => { e.stopPropagation(); sounds.playClick(); }}
                    title={`Visit ${rank3?.displayName}'s ${social3.label}`}
                    className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-wider ${social3.bgColor} ${social3.borderColor} ${social3.color} shadow-sm active:scale-90 transition-all hover:scale-105`}
                  >
                    {renderSocialIcon(social3.platform, "w-2.5 h-2.5")}
                    <span>{social3.label}</span>
                    <ExternalLink className="w-2 h-2 opacity-70" />
                  </a>
                )}
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

          {/* 3. SCROLLABLE ROWS FOR COMPRESSED LIST */}
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[190px] pr-0.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6">
                <div className="w-5 h-5 rounded-full border-2 border-dashed border-zinc-600 animate-spin mb-2" />
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Retrieving ranks...</p>
              </div>
            ) : (
              remainingRanks.map((entry, index) => {
                const rank = index + 4;
                const isMe = entry.userId === profile?.uid;
                const social = getSocialInfo(entry.socialLink);

                return (
                  <div
                    key={rank}
                    onClick={() => social && openSocialProfile(social.url)}
                    className={`w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-white/10 to-white/5 border border-white/5 flex items-center justify-between shadow-sm transition-all ${
                      social ? 'cursor-pointer hover:bg-white/15' : ''
                    } ${
                      isMe ? 'border-emerald-500/40 bg-emerald-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-bold text-zinc-500 w-3.5 text-center">
                        {rank}
                      </span>

                      <div className="w-4 h-4 rounded-full bg-zinc-850/60 border border-white/5 flex items-center justify-center text-[8px] text-zinc-400 shrink-0">
                        👤
                      </div>

                      <span className={`text-[9px] font-semibold tracking-wide uppercase truncate max-w-[95px] ${
                        isMe ? 'text-emerald-400' : 'text-zinc-300'
                      }`}>
                        {entry.displayName}
                      </span>

                      {/* Clickable Social Badge */}
                      {social && (
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); sounds.playClick(); }}
                          title={`Visit ${entry.displayName}'s ${social.label}`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[7px] font-black uppercase tracking-wider ${social.bgColor} ${social.borderColor} ${social.color} hover:brightness-125 transition shrink-0`}
                        >
                          {renderSocialIcon(social.platform, "w-2.5 h-2.5")}
                          <span>{social.label}</span>
                          <ExternalLink className="w-2 h-2 opacity-70" />
                        </a>
                      )}
                    </div>

                    <span className="text-[9px] font-black text-sky-400 tracking-wider font-mono shrink-0 ml-1">
                      {entry.score.toLocaleString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

    </div>
  );
};
