/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Settings as SettingsIcon, 
  Play, 
  Flame, 
  LogOut, 
  LogIn, 
  X,
  ChevronLeft,
  Globe,
  WifiOff,
  MapPin
} from 'lucide-react';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { MathMatrixBoard } from './components/MathMatrixBoard';
import { LeaderboardView } from './components/LeaderboardView';
import { LevelSelector } from './components/LevelSelector';
import { OnlineLobby } from './components/OnlineLobby';
import { ChallengeShare } from './components/ChallengeShare';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { THEMES } from './utils/themes';
import sounds from './utils/audio';

function GameDashboard() {
  const { 
    user, 
    profile, 
    isOnline, 
    loginWithGoogle, 
    logout,
    updateProfileSocialLink
  } = useFirebase();

  // Unified standard premium theme
  const theme = THEMES.matrix;

  // Dialog/Modal overlays
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'rankings' | 'settings' | 'levels' | 'online_lobby'>('none');
  
  // Menu navigation state: 'main' displays (Play Offline, Play Online, Level)
  // 'play_offline' displays (Easy, Medium, Hard, Back)
  const [menuView, setMenuView] = useState<'main' | 'play_offline'>('main');

  // Game states
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'insane'>('easy');
  const [selectedLevelNumber, setSelectedLevelNumber] = useState<number | undefined>(undefined);
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [gameOverScore, setGameOverScore] = useState<number | null>(null);

  // Profile customization states
  const [displayNameInput, setDisplayNameInput] = useState<string>('');
  const [socialLinkInput, setSocialLinkInput] = useState<string>('');

  // Sync profile display name input
  useEffect(() => {
    if (profile) {
      setDisplayNameInput(profile.displayName);
      setSocialLinkInput(profile.socialLink || '');
    }
  }, [profile]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    if (!profile) return;

    const trimmed = displayNameInput.trim();
    if (trimmed.length >= 2 && trimmed.length <= 30) {
      try {
        const localCopy = localStorage.getItem('math_matrix_profile');
        if (localCopy) {
          const parsed = JSON.parse(localCopy);
          parsed.displayName = trimmed;
          localStorage.setItem('math_matrix_profile', JSON.stringify(parsed));
          window.location.reload(); // Refresh cleanly to trigger sync merge
        }
      } catch (err) {
        console.error("Error writing name update:", err);
      }
    }
  };

  const handleUpdateSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    if (!profile) return;
    try {
      await updateProfileSocialLink(socialLinkInput.trim());
      sounds.playSuccess();
    } catch (err) {
      console.error("Error writing social link update:", err);
    }
  };

  const handleGoogleSync = async () => {
    sounds.playClick();
    try {
      await loginWithGoogle();
      sounds.playSuccess();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartGame = (difficulty: 'easy' | 'medium' | 'hard' | 'insane') => {
    sounds.playClick();
    setSelectedDifficulty(difficulty);
    setSelectedLevelNumber(undefined); // Clear Level Mode
    setIsOnlineMode(false); // Play Offline
    setGameOverScore(null);
    setGameActive(true);
  };

  const handleStartOnlineGame = async () => {
    sounds.playClick();
    if (!user) {
      try {
        await loginWithGoogle();
        sounds.playSuccess();
        setActiveOverlay('online_lobby');
      } catch (e) {
        console.error("Google authentication error:", e);
      }
      return;
    }
    // Authenticated: open competitive online lobby
    setActiveOverlay('online_lobby');
  };

  const handleStartLevelGame = (levelNum: number) => {
    sounds.playClick();
    setSelectedLevelNumber(levelNum);
    setIsOnlineMode(false);
    setActiveOverlay('none');
    setGameOverScore(null);
    setGameActive(true);
  };

  return (
    <div className={`h-screen max-h-screen overflow-hidden flex flex-col justify-between ${theme.bg} ${theme.text} ${theme.fontFamily} transition-colors duration-500 relative select-none p-6`}>
      
      {/* Crisp white coordinate blueprint background grid decoration */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]"></div>

      {/* 1. LAYERED CONCENTRIC COSMIC CIRCLE DECORATIONS */}
      <div className="absolute -top-24 -left-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_6s_infinite_alternate]">
        <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <div className="absolute -bottom-24 -right-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_8s_infinite_alternate_2s]">
        <svg viewBox="0 0 100 100" className="w-full h-full text-pink-500">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity={0.8} />
          <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* 2. TOP HEADER ROW (TRANSPARENT BG) */}
      <header className="w-full flex justify-between items-start z-10 shrink-0">
        {/* Name and Label in top-left */}
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-widest text-white leading-none font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Math Matrix
          </span>
          <span className="text-[9px] text-zinc-400 font-medium tracking-wider uppercase mt-1">
            The Puzzle Game
          </span>
        </div>

        {/* Status badges in top-right */}
        {profile && (
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] text-xs"
              title="Daily Streak"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-current" />
              <span className="font-extrabold font-mono text-white">{profile.streak}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.4)] text-xs">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="font-extrabold font-mono text-yellow-400">{profile.highScore}</span>
            </div>
          </div>
        )}
      </header>

      {/* 3. CENTER VIEWPORT CONTROLLER */}
      <main className="flex-1 flex flex-col justify-center items-center z-10 w-full max-w-sm mx-auto my-auto relative">
        
        {gameActive ? (
          /* ACTIVE BOARD INTERFACE */
          <div className="w-full flex flex-col items-center">
            <MathMatrixBoard
              difficulty={selectedDifficulty}
              theme={theme}
              levelNumber={selectedLevelNumber}
              isOnlineMode={isOnlineMode}
              onExitLevelMode={() => {
                setSelectedLevelNumber(undefined);
                setGameActive(false);
                setActiveOverlay('levels');
              }}
              onGameOver={(final) => {
                setGameOverScore(final);
                setGameActive(false);
              }}
            />
          </div>
        ) : (
          /* SINGLE VIEW SWITCHABLE NAVIGATION SYSTEM */
          <div className="w-full flex flex-col items-center space-y-4 select-none animate-fadeIn">
            
            {menuView === 'main' ? (
              <>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mb-1">
                  Select Game Mode
                </span>

                {/* PLAY OFFLINE (REVEALS DIFFICULTIES SUBMENU) */}
                <button
                  onClick={() => { sounds.playClick(); setMenuView('play_offline'); }}
                  className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm tracking-widest shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.4)] transform active:scale-95 transition-all text-center border border-emerald-400/20 uppercase flex items-center justify-center gap-2"
                >
                  <WifiOff className="w-4 h-4" /> Play Offline
                </button>

                {/* PLAY ONLINE (LAUNCHES REAL-TIME MULTIPLAYER LOBBY) */}
                <button
                  onClick={handleStartOnlineGame}
                  className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm tracking-widest shadow-[0_4px_14px_rgba(14,165,233,0.3)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.4)] transform active:scale-95 transition-all text-center border border-sky-400/20 uppercase flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" /> Play Online
                </button>

                {/* LEVEL (100 STAGES GRID MAP SELECTOR) */}
                <button
                  onClick={() => { sounds.playClick(); setActiveOverlay('levels'); }}
                  className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold text-sm tracking-widest shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.4)] transform active:scale-95 transition-all text-center border border-indigo-400/20 uppercase flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" /> Level
                </button>
              </>
            ) : (
              /* PLAY OFFLINE: EASY, MEDIUM, AND HARD DIFFICULTIES SUB-MENU */
              <div className="w-full flex flex-col items-center space-y-3 w-full animate-fadeIn">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mb-1">
                  Offline Difficulties
                </span>

                {/* EASY SUB-MODE */}
                <button
                  onClick={() => handleStartGame('easy')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs tracking-widest shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_18px_rgba(16,185,129,0.4)] transition-all uppercase text-center active:scale-95 border border-emerald-400/20"
                >
                  Easy Mode
                </button>

                {/* MEDIUM SUB-MODE */}
                <button
                  onClick={() => handleStartGame('medium')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-xs tracking-widest shadow-[0_4px_12px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_18px_rgba(245,158,11,0.4)] transition-all uppercase text-center active:scale-95 border border-amber-400/20"
                >
                  Medium Mode
                </button>

                {/* HARD SUB-MODE */}
                <button
                  onClick={() => handleStartGame('hard')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-black text-xs tracking-widest shadow-[0_4px_12px_rgba(244,63,94,0.3)] hover:shadow-[0_6px_18px_rgba(244,63,94,0.4)] transition-all uppercase text-center active:scale-95 border border-rose-400/20"
                >
                  Hard Mode
                </button>

                {/* BACK BUTTON */}
                <button
                  onClick={() => { sounds.playClick(); setMenuView('main'); }}
                  className="w-full py-2.5 px-6 rounded-xl text-[9px] text-zinc-500 hover:text-white uppercase font-black tracking-widest flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to modes
                </button>
              </div>
            )}

            {gameOverScore !== null && (
              <div className="mt-4 px-4 py-2 rounded-lg bg-black/60 border border-zinc-900/60 text-center animate-pulse shrink-0">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500">Last Score:</span>
                <span className="text-sm font-bold font-mono text-emerald-400 ml-1">{gameOverScore} pts</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. BOTTOM CONTROLS ROW */}
      <footer className="w-full flex justify-center gap-3 z-20 shrink-0 select-none pb-2">
        <button
          onClick={() => { sounds.playClick(); setActiveOverlay(activeOverlay === 'rankings' ? 'none' : 'rankings'); }}
          className="flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 transition-all min-w-[130px] tracking-widest"
        >
          🏆 Rankings
        </button>

        <button
          onClick={() => { sounds.playClick(); setActiveOverlay(activeOverlay === 'settings' ? 'none' : 'settings'); }}
          className="flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)] active:scale-95 transition-all min-w-[130px] tracking-widest"
        >
          ⚙️ Settings
        </button>
      </footer>

      {/* 5. IMMERSIVE FULL-PAGE HALL OF FAME LEADERBOARD */}
      {activeOverlay === 'rankings' && (
        <div className={`fixed inset-0 z-50 flex flex-col p-6 ${theme.bg} overflow-hidden select-none`}>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          {/* BACKGROUND CONCENTRIC COSMIC CIRCLES */}
          <div className="absolute -top-24 -left-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_6s_infinite_alternate]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="absolute -bottom-24 -right-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_8s_infinite_alternate_2s]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-pink-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity={0.8} />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full relative z-10">
            <LeaderboardView theme={theme} onClose={() => setActiveOverlay('none')} />
          </div>
        </div>
      )}

      {/* 6. IMMERSIVE FULL-PAGE SETTINGS */}
      {activeOverlay === 'settings' && (
        <div className={`fixed inset-0 z-50 flex flex-col p-6 ${theme.bg} overflow-hidden select-none text-white animate-fadeIn`}>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          {/* BACKGROUND CONCENTRIC COSMIC CIRCLES */}
          <div className="absolute -top-24 -left-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_6s_infinite_alternate]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="absolute -bottom-24 -right-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_8s_infinite_alternate_2s]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-pink-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity={0.8} />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex-1 flex flex-col justify-start max-w-sm mx-auto w-full relative z-10 overflow-y-auto pb-4">
            <div className="flex items-center justify-between w-full mb-8 shrink-0 relative z-30">
              <button 
                onClick={() => { sounds.playClick(); setActiveOverlay('none'); }}
                className="w-10 h-10 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-center text-white active:scale-95 hover:bg-zinc-800 transition-all shadow-md shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-300" />
              </button>

              <div className="text-center flex-1 mx-2">
                <h2 className="text-xl font-black tracking-[0.2em] text-white leading-none uppercase">
                  Preferences
                </h2>
                <p className="text-[8px] text-zinc-500 uppercase tracking-[0.15em] mt-1.5">
                  Customize Settings
                </p>
              </div>

              <div className="w-10 h-10 shrink-0 opacity-0" />
            </div>

            {profile && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
                  <p className="text-[9px] font-black uppercase tracking-wider text-blue-400 mb-2">👤 Nickname Settings</p>
                  <form onSubmit={handleUpdateName} className="flex gap-2">
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      maxLength={30}
                      minLength={2}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
                      placeholder="Edit nickname"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                    >
                      Save
                    </button>
                  </form>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
                  <p className="text-[9px] font-black uppercase tracking-wider text-pink-400 mb-2">🔗 Social Profile Link (X, Insta, Linkedin)</p>
                  <form onSubmit={handleUpdateSocialLink} className="flex gap-2">
                    <input
                      type="text"
                      value={socialLinkInput}
                      onChange={(e) => setSocialLinkInput(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none font-mono"
                      placeholder="e.g. instagram.com/username"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95"
                    >
                      Save
                    </button>
                  </form>
                </div>

                <ChallengeShare score={profile.highScore} difficulty={selectedDifficulty} theme={theme} />

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-400 mb-0.5">☁️ Account Cloud Sync</p>
                    <p className="text-[11px] font-bold text-white uppercase truncate">{user ? user.displayName : 'Guest User'}</p>
                    <p className="text-[9px] text-zinc-400 truncate">{user ? user.email : 'Local Cache Storage Only'}</p>
                  </div>
                  {user ? (
                    <button
                      onClick={async () => {
                        sounds.playClick();
                        await logout();
                        sounds.playSuccess();
                        setActiveOverlay('none');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-red-950/10 hover:border-red-500/50 text-[9px] uppercase font-black tracking-wider text-red-400 hover:text-red-300 transition shrink-0 active:scale-95"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        await handleGoogleSync();
                        setActiveOverlay('none');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-blue-950/20 text-[9px] uppercase font-black tracking-wider text-blue-400 hover:text-blue-300 transition shrink-0 active:scale-95"
                    >
                      Sync Cloud
                    </button>
                  )}
                </div>

                <div className="flex justify-center pt-2">
                  <PWAInstallButton theme={theme} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. IMMERSIVE FULL-PAGE LEVELS MAP SELECTOR */}
      {activeOverlay === 'levels' && (
        <div className={`fixed inset-0 z-50 flex flex-col p-6 ${theme.bg} overflow-hidden select-none`}>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          {/* BACKGROUND CONCENTRIC COSMIC CIRCLES */}
          <div className="absolute -top-24 -left-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_6s_infinite_alternate]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="absolute -bottom-24 -right-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_8s_infinite_alternate_2s]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-pink-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity={0.8} />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full relative z-10">
            <LevelSelector theme={theme} onClose={() => { setActiveOverlay('none'); setMenuView('main'); }} onSelectLevel={(lvl) => handleStartLevelGame(lvl)} />
          </div>
        </div>
      )}

      {/* 8. IMMERSIVE REAL-TIME MULTIPLAYER LOBBY (PLAY ONLINE) */}
      {activeOverlay === 'online_lobby' && (
        <div className={`fixed inset-0 z-50 flex flex-col p-6 ${theme.bg} overflow-hidden select-none`}>
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          {/* BACKGROUND CONCENTRIC COSMIC CIRCLES */}
          <div className="absolute -top-24 -left-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_6s_infinite_alternate]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="absolute -bottom-24 -right-24 w-[360px] h-[360px] pointer-events-none opacity-40 mix-blend-screen animate-[pulse_8s_infinite_alternate_2s]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-pink-500">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity={0.8} />
              <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>

          <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full relative z-10">
            <OnlineLobby 
              user={user} 
              profile={profile} 
              theme={theme} 
              onClose={() => setActiveOverlay('none')} 
            />
          </div>
        </div>
      )}

      {/* Connection Monitor banners */}
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <GameDashboard />
    </FirebaseProvider>
  );
}
