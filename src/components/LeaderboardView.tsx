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
  ExternalLink,
  Trophy,
  Flame,
  Award
} from 'lucide-react';
import { useFirebase, LeaderboardEntry } from '../context/FirebaseContext';
import { getSocialInfo, SocialInfo } from '../utils/social';
import sounds from '../utils/audio';
import { PlayerBadge } from './PlayerBadge';
import { TopPlayerEntry, isRealSignedInPlayer } from '../utils/rankings';

interface LeaderboardViewProps {
  theme: any;
  onClose: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ theme, onClose }) => {
  const { 
    getLeaderboard, 
    getStickLeaderboard, 
    getTrophyLeaderboard, 
    isOnline, 
    profile,
    user 
  } = useFirebase();

  const isSignedIn = Boolean(user && !user.isAnonymous);

  // Mode switcher: 'score' (current ranking), 'stick' (Top 50 Stick Ranking), 'trophy' (Top 50 Trophy Ranking)
  const [rankingType, setRankingType] = useState<'score' | 'stick' | 'trophy'>('score');
  
  // Standard score ranking state
  const [difficultyFilter, setDifficultyFilter] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  // Top 50 stick and trophy rankings state
  const [top50StickList, setTop50StickList] = useState<TopPlayerEntry[]>([]);
  const [top50TrophyList, setTop50TrophyList] = useState<TopPlayerEntry[]>([]);
  const [loadingTop50, setLoadingTop50] = useState<boolean>(false);

  const fetchScores = async () => {
    setLoading(true);
    const data = await getLeaderboard(difficultyFilter);
    const sorted = [...data]
      .filter(entry => isRealSignedInPlayer(entry.userId, entry.displayName))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Strictly show only Top 10 records
    setScores(sorted);
    setLoading(false);
  };

  const fetchTop50Rankings = async () => {
    setLoadingTop50(true);
    try {
      const [sticksData, trophyData] = await Promise.all([
        getStickLeaderboard(),
        getTrophyLeaderboard()
      ]);
      setTop50StickList(sticksData);
      setTop50TrophyList(trophyData);
    } catch (err) {
      console.error("Failed to load Top 50 lists:", err);
    } finally {
      setLoadingTop50(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [difficultyFilter, isOnline]);

  useEffect(() => {
    fetchTop50Rankings();
  }, [isOnline, profile?.streak, profile?.sticks, profile?.highScore]);

  const handleDropdownSelect = (val: 'easy' | 'medium' | 'hard') => {
    sounds.playClick();
    setDifficultyFilter(val);
    setShowDropdown(false);
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

  // Current player's ranking calculation
  const myStickRank = top50StickList.find(p => p.userId === profile?.uid)?.rank;
  const myTrophyRank = top50TrophyList.find(p => p.userId === profile?.uid)?.rank;
  const myScoreRankIndex = scores.findIndex(p => p.userId === profile?.uid);
  const myScoreRank = myScoreRankIndex !== -1 ? myScoreRankIndex + 1 : null;

  // Determine if the player is already featured in the current leaderboard list
  const isPlayerInList = rankingType === 'stick' 
    ? Boolean(myStickRank)
    : rankingType === 'trophy' 
    ? Boolean(myTrophyRank)
    : Boolean(myScoreRank);

  return (
    <div className="w-full flex flex-col text-zinc-900 select-none h-full">
      
      {/* 1. TOP HEADER */}
      <header className="flex items-center justify-between w-full mb-3 shrink-0 relative z-30">
        <button 
          onClick={() => { 
            sounds.playClick(); 
            if (rankingType !== 'score') {
              setRankingType('score');
            } else {
              onClose(); 
            }
          }}
          className="w-9 h-9 rounded-xl bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-700 active:scale-95 hover:bg-zinc-100 transition-all shadow-sm shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-zinc-700" />
        </button>

        <div className="text-center flex-1 mx-2">
          {rankingType === 'score' ? (
            <>
              <h2 className="text-base font-black tracking-[0.25em] text-zinc-900 leading-none uppercase">
                HALL OF FAME
              </h2>
              <p className="text-[7px] text-sky-600 uppercase tracking-[0.2em] mt-0.5 font-bold">
                TOP 10 RECORDS ({difficultyFilter.toUpperCase()})
              </p>
            </>
          ) : rankingType === 'stick' ? (
            <>
              <h2 className="text-base font-black tracking-[0.18em] text-amber-600 leading-none uppercase flex items-center justify-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-current" /> STICK RANKING
              </h2>
              <p className="text-[7px] text-amber-600/80 uppercase tracking-[0.2em] mt-0.5 font-bold">
                TOP 50 ADVANCE PLAYERS
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-black tracking-[0.18em] text-amber-600 leading-none uppercase flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-500 inline" /> TROPHY RANKING
              </h2>
              <p className="text-[7px] text-amber-600/80 uppercase tracking-[0.2em] mt-0.5 font-bold">
                TOP 50 CHAMPIONS
              </p>
            </>
          )}
        </div>

        {/* Header Right Action: Difficulty dropdown for score mode, or stat badge for Top 50 */}
        {rankingType === 'score' ? (
          <div className="relative shrink-0">
            <button
              onClick={() => { sounds.playClick(); setShowDropdown(!showDropdown); }}
              className="flex items-center gap-1 rounded-full bg-white border border-zinc-200/90 px-3.5 py-1.5 text-[9px] font-black uppercase text-sky-700 tracking-wider shadow-sm active:scale-95 transition-all"
            >
              {difficultyFilter}
              <ChevronDown className="w-2.5 h-2.5 text-sky-700" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-white border border-zinc-200 shadow-2xl z-50 overflow-hidden divide-y divide-zinc-100 animate-fadeIn">
                {(['easy', 'medium', 'hard'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleDropdownSelect(filter)}
                    className={`w-full text-left px-4 py-2.5 text-[9px] uppercase font-bold tracking-wider transition-colors ${
                      difficultyFilter === filter 
                        ? 'bg-sky-50 text-sky-700' 
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                  >
                    {filter} Mode
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="shrink-0 px-2.5 py-1 rounded-full bg-white border border-zinc-200/90 text-[9px] font-mono font-bold text-zinc-700 shadow-sm">
            {rankingType === 'stick' ? (
              <span className="text-amber-600 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500 fill-current inline" />
                {profile?.streak || profile?.sticks || 0}
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-yellow-500 inline" />
                {profile?.highScore || 0}
              </span>
            )}
          </div>
        )}
      </header>

      {/* 2. SIMPLE CONTINUOUS PROFESSIONAL RANKING LIST */}
      {!isOnline && rankingType === 'score' ? (
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
            onClick={() => { sounds.playClick(); fetchScores(); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : (
        <div 
          className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 min-h-0 max-h-[500px] scroll-smooth"
          style={{ maxHeight: '500px' }}
        >
          {(rankingType === 'stick' || rankingType === 'trophy') ? (
            /* TOP 50 LIST FOR STICKS / TROPHIES IN SIMPLE UNIFIED LIST */
            loadingTop50 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-amber-500 animate-spin mb-2" />
                <p className="text-[9px] uppercase tracking-wider text-zinc-500">Loading Rankings...</p>
              </div>
            ) : (rankingType === 'stick' ? top50StickList : top50TrophyList).length === 0 ? (
              <div className="text-center py-8 px-4 bg-white rounded-2xl border border-zinc-200/90 shadow-sm my-2">
                <span className="text-2xl mb-1 block">
                  {rankingType === 'stick' ? '🔥' : '🏆'}
                </span>
                <h4 className="text-[11px] font-black uppercase text-zinc-900 mb-0.5 tracking-wider">
                  {rankingType === 'stick' ? 'No Stick Rankings Yet' : 'No Trophy Rankings Yet'}
                </h4>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider max-w-[220px] leading-relaxed mx-auto">
                  {isSignedIn 
                    ? (rankingType === 'stick'
                        ? 'Solve puzzles in Advance Mode to earn sticks and climb the rankings!'
                        : 'Win matches to earn trophies and climb the rankings!')
                    : 'Sign in to your account and play to become the first ranked player!'}
                </p>
              </div>
            ) : (
              (rankingType === 'stick' ? top50StickList : top50TrophyList).map((entry, index) => {
                const rankNum = entry.rank || (index + 1);
                const isMe = entry.userId === profile?.uid;
                const social = getSocialInfo(entry.socialLink);

                // Rank style badges for Top 3 vs other rows
                let rankBadgeBg = 'text-zinc-400';
                if (rankNum === 1) rankBadgeBg = 'text-amber-500 font-extrabold';
                else if (rankNum === 2) rankBadgeBg = 'text-zinc-500 font-extrabold';
                else if (rankNum === 3) rankBadgeBg = 'text-amber-600 font-extrabold';

                return (
                  <div
                    key={`${entry.userId}-${rankNum}`}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between shadow-sm transition-all select-none ${
                      isMe 
                        ? 'border-emerald-500/80 bg-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40 text-zinc-900' 
                        : rankNum === 1
                        ? 'border-amber-300 bg-amber-50/80 text-zinc-900'
                        : rankNum === 2
                        ? 'border-zinc-300 bg-zinc-50 text-zinc-900'
                        : rankNum === 3
                        ? 'border-amber-200 bg-amber-50/40 text-zinc-900'
                        : 'border-zinc-200/90 bg-white text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Indicator */}
                      <div className="w-5 text-center shrink-0 flex items-center justify-center">
                        {rankNum === 1 ? (
                          <div className="flex items-center gap-0.5 text-amber-500 font-black text-[10px]">
                            <Crown className="w-3 h-3 fill-current inline" />
                          </div>
                        ) : (
                          <span className={`text-[10px] font-mono ${rankBadgeBg}`}>
                            #{rankNum}
                          </span>
                        )}
                      </div>

                      {/* Flag / Avatar */}
                      <div className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] shrink-0">
                        {entry.flag || '👤'}
                      </div>

                      {/* Player Display Name */}
                      <span className={`text-[9.5px] tracking-wide uppercase truncate max-w-[85px] ${
                        isMe 
                          ? 'text-emerald-700 font-black' 
                          : rankNum === 1 
                          ? 'text-amber-900 font-bold' 
                          : 'text-zinc-800 font-semibold'
                      }`}>
                        {entry.displayName} {isMe ? '(You)' : ''}
                      </span>

                      {/* Tier Badge */}
                      <PlayerBadge points={entry.tierPoints || 0} size="xs" shortLabel={true} />

                      {/* Social Link Badge */}
                      {social && (
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); sounds.playClick(); }}
                          title={`Visit ${entry.displayName}'s ${social.label}`}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full border text-[7px] font-black uppercase tracking-wider ${social.bgColor} ${social.borderColor} ${social.color} hover:brightness-125 transition shrink-0`}
                        >
                          {renderSocialIcon(social.platform, "w-2.5 h-2.5")}
                          <span>{social.label}</span>
                          <ExternalLink className="w-2 h-2 opacity-70" />
                        </a>
                      )}
                    </div>

                    {/* Stick / Trophy count */}
                    <div className="shrink-0 ml-1 font-mono text-[10px] font-black text-right">
                      {rankingType === 'stick' ? (
                        <span className="text-amber-600 flex items-center gap-1 justify-end">
                          <Flame className="w-3 h-3 text-amber-500 fill-current inline" />
                          {entry.sticks.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1 justify-end">
                          <Trophy className="w-3 h-3 text-yellow-500 inline" />
                          {entry.trophies.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* SCORE RANKING LIST IN SIMPLE UNIFIED LIST */
            loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-zinc-400 animate-spin mb-2" />
                <p className="text-[9px] uppercase tracking-wider text-zinc-500">Retrieving ranks...</p>
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-8 px-4 bg-white rounded-2xl border border-zinc-200/90 shadow-sm my-2">
                <span className="text-2xl mb-1 block">🏆</span>
                <h4 className="text-[11px] font-black uppercase text-zinc-900 mb-0.5 tracking-wider">
                  No Scores Recorded Yet
                </h4>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wider max-w-[200px] leading-relaxed mx-auto">
                  Be the first player to conquer the matrix and climb to the top!
                </p>
              </div>
            ) : (
              scores.map((entry, index) => {
                const rankNum = index + 1;
                const isMe = entry.userId === profile?.uid;
                const social = getSocialInfo(entry.socialLink);

                let rankBadgeBg = 'text-zinc-400';
                if (rankNum === 1) rankBadgeBg = 'text-amber-500 font-extrabold';
                else if (rankNum === 2) rankBadgeBg = 'text-zinc-500 font-extrabold';
                else if (rankNum === 3) rankBadgeBg = 'text-amber-600 font-extrabold';

                return (
                  <div
                    key={`${entry.userId}-${rankNum}-${entry.score}`}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between shadow-sm transition-all select-none ${
                      isMe 
                        ? 'border-emerald-500/80 bg-emerald-50 shadow-[0_0_10px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40 text-zinc-900' 
                        : rankNum === 1
                        ? 'border-amber-300 bg-amber-50/80 text-zinc-900'
                        : rankNum === 2
                        ? 'border-zinc-300 bg-zinc-50 text-zinc-900'
                        : rankNum === 3
                        ? 'border-amber-200 bg-amber-50/40 text-zinc-900'
                        : 'border-zinc-200/90 bg-white text-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Indicator */}
                      <div className="w-5 text-center shrink-0 flex items-center justify-center">
                        {rankNum === 1 ? (
                          <div className="flex items-center gap-0.5 text-amber-500 font-black text-[10px]">
                            <Crown className="w-3 h-3 fill-current inline" />
                          </div>
                        ) : (
                          <span className={`text-[10px] font-mono ${rankBadgeBg}`}>
                            #{rankNum}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] shrink-0">
                        👤
                      </div>

                      {/* Player Display Name */}
                      <span className={`text-[9.5px] tracking-wide uppercase truncate max-w-[85px] ${
                        isMe 
                          ? 'text-emerald-700 font-black' 
                          : rankNum === 1 
                          ? 'text-amber-900 font-bold' 
                          : 'text-zinc-800 font-semibold'
                      }`}>
                        {entry.displayName} {isMe ? '(You)' : ''}
                      </span>

                      {/* Tier Badge */}
                      <PlayerBadge points={entry.tierPoints || 0} size="xs" shortLabel={true} />

                      {/* Social Link Badge */}
                      {social && (
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => { e.stopPropagation(); sounds.playClick(); }}
                          title={`Visit ${entry.displayName}'s ${social.label}`}
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full border text-[7px] font-black uppercase tracking-wider ${social.bgColor} ${social.borderColor} ${social.color} hover:brightness-125 transition shrink-0`}
                        >
                          {renderSocialIcon(social.platform, "w-2.5 h-2.5")}
                          <span>{social.label}</span>
                          <ExternalLink className="w-2 h-2 opacity-70" />
                        </a>
                      )}
                    </div>

                    <span className="text-[10px] font-black text-sky-700 tracking-wider font-mono shrink-0 ml-1">
                      {entry.score.toLocaleString()} pts
                    </span>
                  </div>
                );
              })
            )
          )}
        </div>
      )}

      {/* 3. YOUR CURRENT POSITION CARD (DOCKED AT BOTTOM ONLY IF OUTSIDE TOP 50 / TOP 10) */}
      {!isPlayerInList && (
        <div className="w-full mt-2 mb-1 px-3 py-2 rounded-xl bg-white border border-emerald-500/50 shadow-md flex items-center justify-between shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            {/* Rank Indicator */}
            <div className="w-5 text-center shrink-0">
              <span className="text-[9px] font-mono font-bold text-zinc-500">
                {isSignedIn ? '>50' : '—'}
              </span>
            </div>

            {/* Avatar */}
            <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-[10px] shrink-0">
              👤
            </div>

            {/* Name & Status */}
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="text-[9.5px] font-black uppercase text-emerald-700 tracking-wide truncate max-w-[90px]">
                {isSignedIn ? (profile?.displayName || 'You') : 'Guest'} <span className="text-[7.5px] text-zinc-400 font-normal">(You)</span>
              </span>
              {profile && <PlayerBadge points={profile.tierPoints || 0} size="xs" shortLabel={true} />}
            </div>
          </div>

          {/* Stat / Status */}
          <div className="shrink-0 ml-1 font-mono text-[10px] font-black text-right">
            {isSignedIn ? (
              rankingType === 'stick' ? (
                <span className="text-amber-600 flex items-center gap-1 justify-end">
                  <Flame className="w-3 h-3 text-amber-500 fill-current inline" />
                  {(profile?.streak || profile?.sticks || 0).toLocaleString()}
                </span>
              ) : rankingType === 'trophy' ? (
                <span className="text-amber-600 flex items-center gap-1 justify-end">
                  <Trophy className="w-3 h-3 text-yellow-500 inline" />
                  {(profile?.highScore || 0).toLocaleString()}
                </span>
              ) : (
                <span className="text-sky-700 text-[9px] font-bold">
                  Personal Best
                </span>
              )
            ) : (
              <span className="text-amber-600 text-[8px] font-bold">
                Sign in to rank
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. BOTH RANKING BUTTONS AT THE BOTTOM OF THE RANKING LIST */}
      <div className="w-full pt-2.5 pb-1 border-t border-zinc-200/90 grid grid-cols-2 gap-2 mt-auto shrink-0">
        <button
          onClick={() => { 
            sounds.playClick(); 
            setRankingType(rankingType === 'stick' ? 'score' : 'stick'); 
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-[9.5px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all ${
            rankingType === 'stick'
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md'
              : 'bg-white hover:bg-amber-50 border-zinc-200 text-amber-800'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${rankingType === 'stick' ? 'text-zinc-950 fill-current' : 'text-amber-500 fill-current'}`} />
          <span>{rankingType === 'stick' ? 'Score Ranking' : 'Stick Ranking'}</span>
        </button>

        <button
          onClick={() => { 
            sounds.playClick(); 
            setRankingType(rankingType === 'trophy' ? 'score' : 'trophy'); 
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-[9.5px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all ${
            rankingType === 'trophy'
              ? 'bg-yellow-400 text-zinc-950 border-yellow-300 shadow-md'
              : 'bg-white hover:bg-yellow-50 border-zinc-200 text-yellow-800'
          }`}
        >
          <Trophy className={`w-3.5 h-3.5 ${rankingType === 'trophy' ? 'text-zinc-950' : 'text-yellow-500'}`} />
          <span>{rankingType === 'trophy' ? 'Score Ranking' : 'Trophy Ranking'}</span>
        </button>
      </div>

    </div>
  );
};
