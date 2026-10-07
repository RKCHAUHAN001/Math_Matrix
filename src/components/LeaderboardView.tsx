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

  // Current player's ranking calculation
  const myStickRank = top50StickList.find(p => p.userId === profile?.uid)?.rank;
  const myTrophyRank = top50TrophyList.find(p => p.userId === profile?.uid)?.rank;
  const myScoreRankIndex = scores.findIndex(p => p.userId === profile?.uid);
  const myScoreRank = myScoreRankIndex !== -1 ? myScoreRankIndex + 1 : null;

  return (
    <div className="w-full flex flex-col text-white select-none h-full">
      
      {/* 1. TOP HEADER */}
      <header className="flex items-center justify-between w-full mb-2 shrink-0 relative z-30">
        <button 
          onClick={() => { 
            sounds.playClick(); 
            if (rankingType !== 'score') {
              setRankingType('score');
            } else {
              onClose(); 
            }
          }}
          className="w-9 h-9 rounded-xl bg-zinc-800/40 border border-white/10 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-700/50 transition-all shadow-md shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>

        <div className="text-center flex-1 mx-2">
          {rankingType === 'score' ? (
            <>
              <h2 className="text-base font-black tracking-[0.25em] text-white leading-none uppercase">
                HALL OF FAME
              </h2>
              <p className="text-[7px] text-sky-400 uppercase tracking-[0.2em] mt-0.5 font-bold">
                TOP 10 RECORDS ({difficultyFilter.toUpperCase()})
              </p>
            </>
          ) : rankingType === 'stick' ? (
            <>
              <h2 className="text-base font-black tracking-[0.18em] text-amber-400 leading-none uppercase flex items-center justify-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500 fill-current" /> STICK RANKING
              </h2>
              <p className="text-[7px] text-amber-500/80 uppercase tracking-[0.2em] mt-0.5 font-bold">
                TOP 50 ADVANCE PLAYERS
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-black tracking-[0.18em] text-yellow-400 leading-none uppercase flex items-center justify-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-400 inline" /> TROPHY RANKING
              </h2>
              <p className="text-[7px] text-yellow-500/80 uppercase tracking-[0.2em] mt-0.5 font-bold">
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
        ) : (
          <div className="shrink-0 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-white/10 text-[9px] font-mono font-bold text-zinc-300">
            {rankingType === 'stick' ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500 fill-current inline" />
                {profile?.streak || profile?.sticks || 0}
              </span>
            ) : (
              <span className="text-yellow-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-yellow-400 inline" />
                {profile?.highScore || 0}
              </span>
            )}
          </div>
        )}
      </header>

      {/* 2. PLAYER RANKING CARD (ONLY SHOWN FOR STICK & TROPHY RANKINGS) */}
      {rankingType !== 'score' && (
        <div className="w-full mb-2 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-between shrink-0 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs">
              👤
            </div>
            <div>
              <p className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-bold">
                {isSignedIn ? 'Your Ranking' : 'Account Status'}
              </p>
              <p className="text-xs font-black uppercase text-white tracking-wide truncate max-w-[120px]">
                {isSignedIn ? (profile?.displayName || 'Player') : 'Guest (Not Signed In)'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-black font-mono flex items-center justify-end gap-1 text-emerald-400">
              {isSignedIn ? (
                rankingType === 'stick' ? (
                  myStickRank ? (
                    <span>Rank #{myStickRank}</span>
                  ) : (
                    <span className="text-zinc-400">Unranked</span>
                  )
                ) : (
                  myTrophyRank ? (
                    <span>Rank #{myTrophyRank}</span>
                  ) : (
                    <span className="text-zinc-400">Unranked</span>
                  )
                )
              ) : (
                <span className="text-amber-400 text-[10px] font-bold">Sign in to join rank</span>
              )}
            </div>
            <p className="text-[8px] font-bold font-mono text-zinc-400 mt-0.5">
              {rankingType === 'stick' ? (
                <span className="text-amber-400 flex items-center gap-0.5 justify-end">
                  <Flame className="w-2.5 h-2.5 text-amber-500 fill-current inline" />
                  {(profile?.streak || profile?.sticks || 0)} Sticks
                </span>
              ) : (
                <span className="text-yellow-400 flex items-center gap-0.5 justify-end">
                  <Trophy className="w-2.5 h-2.5 text-yellow-500 inline" />
                  {(profile?.highScore || 0)} Trophies
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 3. SIMPLE CONTINUOUS RANKING LIST (TOP 3 ALSO SHOWN IN SAME LIST STYLE) */}
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
              <div className="text-center py-8 px-4 bg-white/5 rounded-2xl border border-white/5 my-2">
                <span className="text-2xl mb-1 block">
                  {rankingType === 'stick' ? '🔥' : '🏆'}
                </span>
                <h4 className="text-[11px] font-black uppercase text-white mb-0.5 tracking-wider">
                  {rankingType === 'stick' ? 'No Stick Rankings Yet' : 'No Trophy Rankings Yet'}
                </h4>
                <p className="text-[9px] text-zinc-400 uppercase tracking-wider max-w-[220px] leading-relaxed mx-auto">
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
                let rankBadgeBg = 'text-zinc-500';
                if (rankNum === 1) rankBadgeBg = 'text-yellow-400 font-extrabold';
                else if (rankNum === 2) rankBadgeBg = 'text-zinc-300 font-extrabold';
                else if (rankNum === 3) rankBadgeBg = 'text-amber-500 font-extrabold';

                return (
                  <div
                    key={`${entry.userId}-${rankNum}`}
                    onClick={() => social && openSocialProfile(social.url)}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between shadow-sm transition-all select-none ${
                      isMe 
                        ? 'border-emerald-500/70 bg-emerald-500/15 shadow-[0_0_10px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40' 
                        : rankNum === 1
                        ? 'border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 via-white/5 to-white/5'
                        : rankNum === 2
                        ? 'border-zinc-400/30 bg-gradient-to-r from-zinc-400/10 via-white/5 to-white/5'
                        : rankNum === 3
                        ? 'border-amber-600/30 bg-gradient-to-r from-amber-600/10 via-white/5 to-white/5'
                        : 'border-white/5 bg-gradient-to-r from-white/10 to-white/5'
                    } ${social ? 'cursor-pointer hover:bg-white/15' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Indicator */}
                      <div className="w-5 text-center shrink-0 flex items-center justify-center">
                        {rankNum === 1 ? (
                          <div className="flex items-center gap-0.5 text-yellow-400 font-black text-[10px]">
                            <Crown className="w-3 h-3 fill-current inline" />
                          </div>
                        ) : (
                          <span className={`text-[10px] font-mono ${rankBadgeBg}`}>
                            #{rankNum}
                          </span>
                        )}
                      </div>

                      {/* Flag / Avatar */}
                      <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] shrink-0">
                        {entry.flag || '👤'}
                      </div>

                      {/* Player Display Name */}
                      <span className={`text-[9.5px] tracking-wide uppercase truncate max-w-[85px] ${
                        isMe 
                          ? 'text-emerald-400 font-black' 
                          : rankNum === 1 
                          ? 'text-yellow-300 font-bold' 
                          : 'text-zinc-200 font-semibold'
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
                        <span className="text-amber-400 flex items-center gap-1 justify-end">
                          <Flame className="w-3 h-3 text-amber-500 fill-current inline" />
                          {entry.sticks.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-yellow-400 flex items-center gap-1 justify-end">
                          <Trophy className="w-3 h-3 text-yellow-400 inline" />
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
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-zinc-600 animate-spin mb-2" />
                <p className="text-[9px] uppercase tracking-wider text-zinc-500">Retrieving ranks...</p>
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-8 px-4 bg-white/5 rounded-2xl border border-white/5 my-2">
                <span className="text-2xl mb-1 block">🏆</span>
                <h4 className="text-[11px] font-black uppercase text-white mb-0.5 tracking-wider">
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

                let rankBadgeBg = 'text-zinc-500';
                if (rankNum === 1) rankBadgeBg = 'text-yellow-400 font-extrabold';
                else if (rankNum === 2) rankBadgeBg = 'text-zinc-300 font-extrabold';
                else if (rankNum === 3) rankBadgeBg = 'text-amber-500 font-extrabold';

                return (
                  <div
                    key={`${entry.userId}-${rankNum}-${entry.score}`}
                    onClick={() => social && openSocialProfile(social.url)}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between shadow-sm transition-all select-none ${
                      isMe 
                        ? 'border-emerald-500/70 bg-emerald-500/15 shadow-[0_0_10px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40' 
                        : rankNum === 1
                        ? 'border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 via-white/5 to-white/5'
                        : rankNum === 2
                        ? 'border-zinc-400/30 bg-gradient-to-r from-zinc-400/10 via-white/5 to-white/5'
                        : rankNum === 3
                        ? 'border-amber-600/30 bg-gradient-to-r from-amber-600/10 via-white/5 to-white/5'
                        : 'border-white/5 bg-gradient-to-r from-white/10 to-white/5'
                    } ${social ? 'cursor-pointer hover:bg-white/15' : ''}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Rank Indicator */}
                      <div className="w-5 text-center shrink-0 flex items-center justify-center">
                        {rankNum === 1 ? (
                          <div className="flex items-center gap-0.5 text-yellow-400 font-black text-[10px]">
                            <Crown className="w-3 h-3 fill-current inline" />
                          </div>
                        ) : (
                          <span className={`text-[10px] font-mono ${rankBadgeBg}`}>
                            #{rankNum}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-5 h-5 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] shrink-0">
                        👤
                      </div>

                      {/* Player Display Name */}
                      <span className={`text-[9.5px] tracking-wide uppercase truncate max-w-[85px] ${
                        isMe 
                          ? 'text-emerald-400 font-black' 
                          : rankNum === 1 
                          ? 'text-yellow-300 font-bold' 
                          : 'text-zinc-200 font-semibold'
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

                    <span className="text-[10px] font-black text-sky-400 tracking-wider font-mono shrink-0 ml-1">
                      {entry.score.toLocaleString()} pts
                    </span>
                  </div>
                );
              })
            )
          )}
        </div>
      )}

      {/* 4. BOTH RANKING BUTTONS AT THE BOTTOM OF THE RANKING LIST */}
      <div className="w-full pt-2.5 pb-1 border-t border-white/10 grid grid-cols-2 gap-2 mt-auto shrink-0">
        <button
          onClick={() => { 
            sounds.playClick(); 
            setRankingType(rankingType === 'stick' ? 'score' : 'stick'); 
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-[9.5px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all ${
            rankingType === 'stick'
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-500/40 text-amber-300'
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
          className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-[9.5px] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all ${
            rankingType === 'trophy'
              ? 'bg-yellow-400 text-zinc-950 border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
              : 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 border-yellow-500/40 text-yellow-300'
          }`}
        >
          <Trophy className={`w-3.5 h-3.5 ${rankingType === 'trophy' ? 'text-zinc-950' : 'text-yellow-400'}`} />
          <span>{rankingType === 'trophy' ? 'Score Ranking' : 'Trophy Ranking'}</span>
        </button>
      </div>

    </div>
  );
};
