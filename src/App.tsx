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
  MapPin,
  Sparkles,
  AlertTriangle,
  Award
} from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { MathMatrixBoard } from './components/MathMatrixBoard';
import { AdvanceModeBoard } from './components/AdvanceModeBoard';
import { LeaderboardView } from './components/LeaderboardView';
import { LevelSelector } from './components/LevelSelector';
import { OnlineLobby } from './components/OnlineLobby';
import { ChallengeShare } from './components/ChallengeShare';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AdMobSimulator } from './components/AdMobSimulator';
import { PlayerBadge } from './components/PlayerBadge';
import { TiersModal } from './components/TiersModal';
import { SignInView } from './components/SignInView';
import { getTierProgress } from './utils/tiers';
import { THEMES } from './utils/themes';
import sounds from './utils/audio';
import { parseAndValidateSocialUrl, getSocialInfo } from './utils/social';

function GameDashboard() {
  const { 
    user, 
    profile, 
    loading,
    isOnline, 
    loginWithGoogle, 
    loginWithEmail,
    logout,
    updateProfileDisplayName,
    updateProfileSocialLink,
    authError,
    clearAuthError,
    localLeaderboard
  } = useFirebase();

  const isSignedIn = Boolean(user && !user.isAnonymous);
  // Guest bypass allows continuing to explore offline as a guest if user chooses
  const [guestBypass, setGuestBypass] = useState<boolean>(false);

  // Floating Toast state for offline alerts
  const [offlineToast, setOfflineToast] = useState<string | null>(null);

  const showNoInternetToast = (msg: string) => {
    sounds.playFailure();
    setOfflineToast(msg);
    setTimeout(() => {
      setOfflineToast(null);
    }, 3500);
  };

  // Social link validation & feedback states
  const [socialLinkError, setSocialLinkError] = useState<string | null>(null);
  const [socialLinkSuccess, setSocialLinkSuccess] = useState<boolean>(false);

  // Nickname update feedback states
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState<string | null>(null);
  const [nameUpdateError, setNameUpdateError] = useState<string | null>(null);
  const [nameUpdateLoading, setNameUpdateLoading] = useState<boolean>(false);

  // Math Quiz Tiers modal state
  const [showTiersModal, setShowTiersModal] = useState<boolean>(false);

  // Sign In / Sync Modal state
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);

  // Unified standard premium theme
  const theme = THEMES.matrix;

  // Dialog/Modal overlays
  const [activeOverlay, setActiveOverlay] = useState<'none' | 'rankings' | 'settings' | 'levels' | 'online_lobby' | 'play_advance'>('none');
  const [authHelpTab, setAuthHelpTab] = useState<'netlify_env' | 'permission_info'>('netlify_env');
  
  // Menu navigation state: 'main' displays (Play Offline, Play Online, Level)
  // 'play_offline' displays (Easy, Medium, Hard, Back)
  const [menuView, setMenuView] = useState<'main' | 'play_offline'>('main');

  // Game states
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'insane'>('easy');
  const [selectedLevelNumber, setSelectedLevelNumber] = useState<number | undefined>(undefined);
  const [isOnlineMode, setIsOnlineMode] = useState<boolean>(false);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [gameOverScore, setGameOverScore] = useState<number | null>(null);
  const [gameOverOffline, setGameOverOffline] = useState<{ score: number, difficulty: 'easy' | 'medium' | 'hard' | 'insane' } | null>(null);
  const [initialScore, setInitialScore] = useState<number>(0);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);

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

  // Listen for native Android hardware back button presses
  useEffect(() => {
    let handler: any;

    const setupBackButton = async () => {
      const isNative = typeof (window as any).Capacitor !== 'undefined' && 
        typeof (window as any).Capacitor.isNativePlatform === 'function' && 
        (window as any).Capacitor.isNativePlatform();

      if (!isNative) return;

      try {
        handler = await CapacitorApp.addListener('backButton', () => {
          sounds.playClick();
          if (activeOverlay !== 'none') {
            setActiveOverlay('none');
          } else if (gameActive) {
            setGameActive(false);
          } else if (menuView === 'play_offline') {
            setMenuView('main');
          } else {
            // No active screen/overlay, safe to minimize or exit the app
            CapacitorApp.exitApp();
          }
        });
      } catch (err) {
        console.warn("Capacitor App backButton listener error:", err);
      }
    };

    setupBackButton();

    return () => {
      if (handler && typeof handler.remove === 'function') {
        handler.remove();
      }
    };
  }, [activeOverlay, gameActive, menuView]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    setNameUpdateError(null);
    setNameUpdateSuccess(null);

    const trimmed = displayNameInput.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      sounds.playFailure();
      setNameUpdateError("Nickname must be between 2 and 30 characters.");
      return;
    }

    try {
      setNameUpdateLoading(true);
      const res = await updateProfileDisplayName(trimmed);
      setNameUpdateLoading(false);
      if (res.success) {
        sounds.playSuccess();
        setNameUpdateSuccess(
          res.recordsUpdated > 0
            ? `✓ Nickname updated & ${res.recordsUpdated} previous ${res.recordsUpdated === 1 ? 'record' : 'records'} updated!`
            : `✓ Nickname updated successfully!`
        );
        setTimeout(() => setNameUpdateSuccess(null), 4000);
      } else {
        sounds.playFailure();
        setNameUpdateError(res.error || "Failed to update nickname.");
      }
    } catch (err: any) {
      setNameUpdateLoading(false);
      sounds.playFailure();
      setNameUpdateError(err?.message || "Failed to update nickname.");
    }
  };

  const handleUpdateSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    setSocialLinkError(null);
    setSocialLinkSuccess(false);

    const validation = parseAndValidateSocialUrl(socialLinkInput);
    if (!validation.valid) {
      sounds.playFailure();
      setSocialLinkError(validation.error || 'Invalid link format');
      return;
    }

    if (!profile) return;
    try {
      const clean = validation.cleanUrl || '';
      await updateProfileSocialLink(clean);
      setSocialLinkInput(clean);
      setSocialLinkSuccess(true);
      sounds.playSuccess();
      setTimeout(() => setSocialLinkSuccess(false), 3500);
    } catch (err) {
      console.error("Error writing social link update:", err);
      setSocialLinkError("Failed to save link. Please try again.");
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
    setInitialScore(0); // Reset score to 0 on standard launch
    setSelectedDifficulty(difficulty);
    setSelectedLevelNumber(undefined); // Clear Level Mode
    setIsOnlineMode(false); // Play Offline
    setGameOverScore(null);
    setGameActive(true);
  };

  const handleStartOnlineGame = () => {
    sounds.playClick();
    if (!isOnline) {
      showNoInternetToast("No Internet Connection. Connect to internet to play online.");
      return;
    }
    // Allow immediate entry into the online matchmaking lobby using guest or synced account
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

  // Wait for initial Firebase auth check before rendering to prevent UI flash
  if (loading) {
    return (
      <div 
        className="h-screen max-h-screen overflow-hidden flex flex-col justify-center items-center bg-[#f7f7f7] text-zinc-900 select-none relative p-6"
        style={{ backgroundColor: '#f7f7f7' }}
      >
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-indigo-600 animate-spin mb-4" />
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-600">MATH MATRIX</h2>
        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1 font-mono">Initializing...</p>
      </div>
    );
  }

  return (
    <div 
      className="h-screen max-h-screen overflow-hidden flex flex-col justify-between bg-[#f7f7f7] text-zinc-900 font-sans transition-colors duration-500 relative select-none p-6"
      style={{ backgroundColor: '#f7f7f7' }}
    >
      
      {/* Crisp coordinate blueprint background grid decoration */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]"></div>

      {/* 1. LAYERED CONCENTRIC CIRCLE DECORATIONS */}
      <div className="absolute -top-24 -left-24 w-[360px] h-[360px] pointer-events-none opacity-20 mix-blend-multiply animate-[pulse_6s_infinite_alternate]">
        <svg viewBox="0 0 100 100" className="w-full h-full text-blue-400">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      <div className="absolute -bottom-24 -right-24 w-[360px] h-[360px] pointer-events-none opacity-20 mix-blend-multiply animate-[pulse_8s_infinite_alternate_2s]">
        <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-400">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity={0.8} />
          <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="20" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>

      {/* 2. TOP HEADER ROW */}
      <header className="w-full flex justify-between items-start z-10 shrink-0">
        <button
          onClick={() => { sounds.playClick(); setShowTiersModal(true); }}
          className="flex flex-col items-start text-left group active:scale-95 transition-all select-none focus:outline-none"
          title="Open Math Quiz Tiers & Title Progress"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-wide text-zinc-900 leading-none font-sans truncate max-w-[170px] group-hover:text-indigo-600 transition-colors">
              {profile ? profile.displayName : 'Player'}
            </span>
            <span className="text-[10px] text-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity">
              ↗
            </span>
          </div>
          <div className="mt-1.5 flex items-center">
            <PlayerBadge 
              points={profile?.tierPoints || 0} 
              size="sm" 
              showIcon={true}
            />
          </div>
        </button>

        {/* Status badges in top-right */}
        {profile && (
          <div className="flex items-center gap-2">
            <div 
              className="flex items-center gap-1.5 bg-white border border-zinc-200/90 rounded-full px-3 py-1.5 shadow-sm text-xs"
              title="Sticks (Earned in Advance Mode)"
            >
              <Flame className="w-4 h-4 text-amber-500 fill-current" />
              <span className="font-extrabold font-mono text-zinc-800">{profile.streak}</span>
            </div>

            <div 
              className="flex items-center gap-1.5 bg-white border border-zinc-200/90 rounded-full px-3 py-1.5 shadow-sm text-xs"
              title="Trophies"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="font-extrabold font-mono text-amber-700">{profile.highScore}</span>
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
              initialScore={initialScore}
              onExitLevelMode={() => {
                setSelectedLevelNumber(undefined);
                setGameActive(false);
                setActiveOverlay('levels');
              }}
              onGameOver={(final) => {
                setGameOverOffline({ score: final, difficulty: selectedDifficulty });
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
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-1">
                  Select Game Mode
                </span>

                {/* PLAY OFFLINE (REVEALS DIFFICULTIES SUBMENU) */}
                <button
                  onClick={() => { sounds.playClick(); setMenuView('play_offline'); }}
                  className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm tracking-widest shadow-[0_4px_14px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.35)] transform active:scale-95 transition-all text-center border border-sky-400/20 uppercase flex items-center justify-center gap-2"
                >
                  <WifiOff className="w-4 h-4" /> Play Offline
                </button>

                {/* PLAY ONLINE (LAUNCHES REAL-TIME MULTIPLAYER LOBBY) */}
                <button
                  onClick={handleStartOnlineGame}
                  className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm tracking-widest shadow-[0_4px_14px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.35)] transform active:scale-95 transition-all text-center border border-sky-400/20 uppercase flex items-center justify-center gap-2"
                >
                  <Globe className="w-4 h-4" /> Play Online
                </button>

                {/* PLAY ADVANCE (NEW SYMBOLS PUZZLE SPEEDRUN MODE) */}
                <button
                  onClick={() => { sounds.playClick(); setActiveOverlay('play_advance'); }}
                  className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm tracking-widest shadow-[0_4px_14px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.35)] transform active:scale-95 transition-all text-center border border-sky-400/20 uppercase flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-sky-200" /> Play Advance
                </button>

                {/* LEVEL (100 STAGES GRID MAP SELECTOR) */}
                <button
                  onClick={() => { sounds.playClick(); setActiveOverlay('levels'); }}
                  className="w-full py-4.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-sm tracking-widest shadow-[0_4px_14px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_20px_rgba(14,165,233,0.35)] transform active:scale-95 transition-all text-center border border-sky-400/20 uppercase flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" /> Level
                </button>
              </>
            ) : (
              /* PLAY OFFLINE: EASY, MEDIUM, AND HARD DIFFICULTIES SUB-MENU */
              <div className="w-full flex flex-col items-center space-y-3 w-full animate-fadeIn">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-1">
                  Offline Difficulties
                </span>

                {/* EASY SUB-MODE */}
                <button
                  onClick={() => handleStartGame('easy')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs tracking-widest shadow-[0_4px_12px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_18px_rgba(14,165,233,0.35)] transition-all uppercase text-center active:scale-95 border border-sky-400/20"
                >
                  Easy Mode
                </button>

                {/* MEDIUM SUB-MODE */}
                <button
                  onClick={() => handleStartGame('medium')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs tracking-widest shadow-[0_4px_12px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_18px_rgba(14,165,233,0.35)] transition-all uppercase text-center active:scale-95 border border-sky-400/20"
                >
                  Medium Mode
                </button>

                {/* HARD SUB-MODE */}
                <button
                  onClick={() => handleStartGame('hard')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs tracking-widest shadow-[0_4px_12px_rgba(14,165,233,0.25)] hover:shadow-[0_6px_18px_rgba(14,165,233,0.35)] transition-all uppercase text-center active:scale-95 border border-sky-400/20"
                >
                  Hard Mode
                </button>

                {/* BACK BUTTON */}
                <button
                  onClick={() => { sounds.playClick(); setMenuView('main'); }}
                  className="w-full py-2.5 px-6 rounded-xl text-[9px] text-zinc-500 hover:text-zinc-800 uppercase font-black tracking-widest flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to modes
                </button>
              </div>
            )}

            {gameOverScore !== null && (
              <div className="mt-4 px-4 py-2 rounded-xl bg-white border border-zinc-200/90 shadow-sm text-center animate-pulse shrink-0">
                <span className="text-[9px] uppercase tracking-wider text-zinc-400">Last Score:</span>
                <span className="text-sm font-bold font-mono text-emerald-600 ml-1">{gameOverScore} pts</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. BOTTOM CONTROLS ROW - ONLY VISIBLE AND ACCESSIBLE FROM MAIN PAGE */}
      {!gameActive && activeOverlay === 'none' && menuView === 'main' && (
        <footer className="w-full flex justify-center gap-3 z-20 shrink-0 select-none pb-2 animate-fadeIn">
          <button
            onClick={() => { sounds.playClick(); setActiveOverlay('rankings'); }}
            className="flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-white border border-zinc-200/90 text-xs font-black uppercase text-zinc-800 shadow-sm active:scale-95 hover:bg-zinc-50 hover:border-zinc-300 transition-all min-w-[130px] tracking-widest"
          >
            🏆 Rankings
          </button>

          <button
            onClick={() => { sounds.playClick(); setActiveOverlay('settings'); }}
            className="flex items-center justify-center gap-2 rounded-full px-5 py-3 bg-white border border-zinc-200/90 text-xs font-black uppercase text-zinc-800 shadow-sm active:scale-95 hover:bg-zinc-50 hover:border-zinc-300 transition-all min-w-[130px] tracking-widest"
          >
            ⚙️ Settings
          </button>
        </footer>
      )}

      {/* 5. IMMERSIVE FULL-PAGE HALL OF FAME LEADERBOARD */}
      {activeOverlay === 'rankings' && (
        <div 
          className="fixed inset-0 z-50 flex flex-col p-4 sm:p-6 bg-[#f7f7f7] overflow-hidden select-none animate-fadeIn"
          style={{ backgroundColor: '#f7f7f7' }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]"></div>

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
        <div 
          className="fixed inset-0 z-50 flex flex-col p-6 bg-[#f7f7f7] overflow-hidden select-none text-zinc-900 animate-fadeIn"
          style={{ backgroundColor: '#f7f7f7' }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          {/* BACKGROUND CONCENTRIC CIRCLES */}
          <div className="absolute -top-24 -left-24 w-[360px] h-[360px] pointer-events-none opacity-20 mix-blend-multiply animate-[pulse_6s_infinite_alternate]">
            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-400">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.2" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.3" />
            </svg>
          </div>

          <div className="flex-1 flex flex-col justify-start max-w-sm mx-auto w-full relative z-10 overflow-y-auto pb-4">
            <div className="flex items-center justify-between w-full mb-6 shrink-0 relative z-30">
              <button 
                onClick={() => { sounds.playClick(); setActiveOverlay('none'); }}
                className="w-10 h-10 rounded-2xl bg-white border border-zinc-200/90 flex items-center justify-center text-zinc-700 active:scale-95 hover:bg-zinc-100 transition-all shadow-sm shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-zinc-700" />
              </button>

              <div className="text-center flex-1 mx-2">
                <h2 className="text-xl font-black tracking-[0.2em] text-zinc-900 leading-none uppercase">
                  Preferences
                </h2>
                <p className="text-[8px] text-zinc-500 uppercase tracking-[0.15em] mt-1.5 font-bold">
                  Customize Settings
                </p>
              </div>

              <div className="w-10 h-10 shrink-0 opacity-0" />
            </div>

            {profile ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-600">👤 Nickname & Records</p>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Syncs Past Records</span>
                  </div>
                  <form onSubmit={handleUpdateName} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => {
                          setDisplayNameInput(e.target.value);
                          if (nameUpdateError) setNameUpdateError(null);
                        }}
                        maxLength={30}
                        minLength={2}
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                        placeholder="Edit nickname"
                      />
                      <button
                        type="submit"
                        disabled={nameUpdateLoading}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {nameUpdateLoading ? 'Updating...' : 'Save'}
                      </button>
                    </div>

                    {nameUpdateError && (
                      <p className="text-[10px] text-rose-600 font-bold leading-tight flex items-center gap-1 animate-fadeIn">
                        ⚠️ {nameUpdateError}
                      </p>
                    )}

                    {nameUpdateSuccess && (
                      <p className="text-[10px] text-emerald-600 font-bold leading-tight flex items-center gap-1 animate-fadeIn">
                        {nameUpdateSuccess}
                      </p>
                    )}
                  </form>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-wider text-pink-600">🔗 Social Media Profile Link</p>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">FB • X • Insta • LinkedIn • YouTube</span>
                  </div>

                  <form onSubmit={handleUpdateSocialLink} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={socialLinkInput}
                        onChange={(e) => {
                          setSocialLinkInput(e.target.value);
                          if (socialLinkError) setSocialLinkError(null);
                        }}
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-900 focus:bg-white focus:border-pink-500 focus:outline-none font-mono placeholder:text-zinc-400"
                        placeholder="e.g. https://www.instagram.com/..."
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 shrink-0"
                      >
                        Save
                      </button>
                    </div>

                    {socialLinkError && (
                      <p className="text-[10px] text-rose-600 font-bold leading-tight flex items-center gap-1 animate-fadeIn">
                        ⚠️ {socialLinkError}
                      </p>
                    )}

                    {socialLinkSuccess && (
                      <p className="text-[10px] text-emerald-600 font-bold leading-tight flex items-center gap-1 animate-fadeIn">
                        ✓ Social link saved and linked to your ranking records!
                      </p>
                    )}

                    {/* Preview active link if present */}
                    {(() => {
                      const activeInfo = getSocialInfo(socialLinkInput || profile.socialLink);
                      if (!activeInfo) return null;
                      return (
                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${activeInfo.bgColor} ${activeInfo.borderColor} ${activeInfo.color} uppercase tracking-wider`}>
                            {activeInfo.label} Linked
                          </span>
                          <a
                            href={activeInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-bold text-pink-600 hover:text-pink-700 underline flex items-center gap-1"
                          >
                            Test Link ↗
                          </a>
                        </div>
                      );
                    })()}
                  </form>
                </div>

                <ChallengeShare score={profile.highScore} difficulty={selectedDifficulty} theme={theme} />

                <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-sm flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-600 mb-0.5">☁️ Account Cloud Sync</p>
                    <p className="text-[11px] font-bold text-zinc-900 uppercase truncate">
                      {user && !user.isAnonymous ? (user.email || user.displayName || 'Synced User') : 'Guest Explorer'}
                    </p>
                    <p className="text-[9px] text-zinc-500 truncate">
                      {user && !user.isAnonymous ? 'All high scores saved safely to cloud' : 'Local Cache Storage Only'}
                    </p>
                  </div>
                  {user && !user.isAnonymous ? (
                    <button
                      onClick={async () => {
                        sounds.playClick();
                        if (!isOnline) {
                          showNoInternetToast("No Internet Connection. Connect to internet to sign out.");
                          return;
                        }
                        await logout();
                        setGuestBypass(false);
                        sounds.playSuccess();
                        setActiveOverlay('none');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-[9px] uppercase font-black tracking-wider text-red-600 transition shrink-0 active:scale-95"
                    >
                      Sign Out
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        sounds.playClick();
                        if (!isOnline) {
                          showNoInternetToast("No Internet Connection. Connect to internet to sign in or sync.");
                          return;
                        }
                        setShowSyncModal(true);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-[9px] uppercase font-black tracking-wider text-indigo-600 transition shrink-0 active:scale-95"
                    >
                      Sync Cloud
                    </button>
                  )}
                </div>

                {/* ⚖️ LEGAL AND PRIVACY DOCUMENT SELECTOR */}
                <div className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-sm space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-wider text-teal-600">⚖️ Legal & Agreements</p>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/privacy.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => sounds.playClick()}
                      className="py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-700 rounded-xl transition active:scale-95 text-center flex items-center justify-center font-bold"
                    >
                      Privacy Policy
                    </a>
                    <a
                      href="/terms.html"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => sounds.playClick()}
                      className="py-2.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-700 rounded-xl transition active:scale-95 text-center flex items-center justify-center font-bold"
                    >
                      Terms of Use
                    </a>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <PWAInstallButton theme={theme} />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mb-4" />
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Loading Settings Profile...
                </p>
                <p className="text-[10px] text-zinc-400 mt-2 max-w-[240px]">
                  Setting up offline local storage fallback.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. FULL-PAGE LEVELS VIEW */}
      {activeOverlay === 'levels' && (
        <div 
          className="fixed inset-0 z-50 flex flex-col bg-[#f7f7f7] overflow-hidden select-none text-zinc-900 animate-fadeIn"
          style={{ backgroundColor: '#f7f7f7' }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          <div className="flex-1 flex flex-col max-w-md mx-auto w-full h-full relative z-10 overflow-hidden shadow-2xl">
            <LevelSelector theme={theme} onClose={() => { setActiveOverlay('none'); setMenuView('main'); }} onSelectLevel={(lvl) => handleStartLevelGame(lvl)} />
          </div>
        </div>
      )}

      {/* 8. IMMERSIVE REAL-TIME MULTIPLAYER LOBBY (PLAY ONLINE) */}
      {activeOverlay === 'online_lobby' && (
        <div 
          className="fixed inset-0 z-50 flex flex-col p-6 bg-[#f7f7f7] overflow-hidden select-none"
          style={{ backgroundColor: '#f7f7f7' }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]"></div>

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
              user={user || { uid: profile?.uid || 'guest_user', displayName: profile?.displayName || 'Guest Explorer' }} 
              profile={profile} 
              theme={theme} 
              onClose={() => setActiveOverlay('none')} 
            />
          </div>
        </div>
      )}

      {/* 9. PLAY ADVANCE OFFLINE GAMEPLAY SYSTEM SCREEN */}
      {activeOverlay === 'play_advance' && (
        <div 
          className="fixed inset-0 z-50 flex flex-col p-6 bg-[#f7f7f7] overflow-hidden select-none"
          style={{ backgroundColor: '#f7f7f7' }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]"></div>

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

          <div className="flex-1 flex flex-col justify-between max-w-sm mx-auto w-full relative z-10 text-white">
            <AdvanceModeBoard theme={theme} onExit={() => setActiveOverlay('none')} />
          </div>
        </div>
      )}

      {/* Sleek Floating No-Internet Toast */}
      {offlineToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[250] max-w-sm w-[90%] px-4 py-3 rounded-2xl bg-zinc-950/95 border border-amber-500/50 text-white shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fadeIn">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-amber-400">No Internet Connection</p>
            <p className="text-[9px] text-zinc-300 leading-tight mt-0.5 truncate">{offlineToast}</p>
          </div>
        </div>
      )}

      {/* AUTH ERROR / PRODUCTION-READY MODAL */}
      {authError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn text-white">
          <div className="max-w-sm w-full rounded-3xl bg-zinc-950 border border-red-500/30 p-6 shadow-2xl relative text-center flex flex-col items-center">
            <button 
              onClick={clearAuthError}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h3 className="text-sm font-black tracking-widest text-red-400 uppercase mb-3">
              Google Authentication
            </h3>

            <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-4 w-full mb-6 text-zinc-300 text-xs text-left leading-relaxed break-words max-h-48 overflow-y-auto">
              {authError}
            </div>

            <button
              onClick={clearAuthError}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
            >
              Got it, Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Offline Game Over Stats Overlay */}
      {gameOverOffline !== null && (
        <div 
          className="fixed inset-0 z-50 flex flex-col p-6 bg-[#f7f7f7] overflow-hidden select-none text-zinc-900 animate-fadeIn"
          style={{ backgroundColor: '#f7f7f7' }}
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]"></div>

          <div className="flex-1 flex flex-col justify-center items-center max-w-sm mx-auto w-full relative z-10">
            <div className="w-full rounded-3xl border border-zinc-200/90 bg-[#f7f7f7] p-6 text-center shadow-xl flex flex-col items-center">
              
              <div className="w-14 h-14 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-500 mb-4 animate-shake">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>

              <h3 className="text-xl font-black tracking-widest text-red-500 uppercase leading-none mb-1">
                GAME OVER
              </h3>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-6">
                Difficulty: {gameOverOffline.difficulty.toUpperCase()} Mode
              </p>

              {/* CURRENT RUN SCORE */}
              <div className="p-4 bg-white border border-zinc-200/90 rounded-2xl w-full mb-5 text-center font-mono relative overflow-hidden shadow-sm">
                <div className="text-[9px] uppercase tracking-wider text-zinc-400">Your Score This Run</div>
                <div className="text-3xl font-black text-zinc-900 mt-1">{gameOverOffline.score} <span className="text-xs font-normal text-zinc-400 font-sans">pts</span></div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="w-full space-y-2.5">
                <button
                  onClick={() => {
                    sounds.playClick();
                    setIsAdPlaying(true);
                  }}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border border-amber-400/20"
                >
                  📺 Watch Ad to Resume Game
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setInitialScore(0);
                    setGameOverOffline(null);
                    setGameOverScore(null);
                    setGameActive(true);
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 border border-sky-400/20"
                >
                  Play Again (Restart)
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setGameOverOffline(null);
                    setGameOverScore(null);
                    setMenuView('main');
                  }}
                  className="w-full py-3 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 text-[10px] uppercase font-black tracking-widest transition-all active:scale-95 shadow-sm"
                >
                  Back to Main Menu
                </button>
              </div>

            </div>
          </div>

          <AdMobSimulator 
            isOpen={isAdPlaying}
            adType="rewarded_resume"
            onAdCompleted={() => {
              setIsAdPlaying(false);
              if (gameOverOffline) {
                setInitialScore(gameOverOffline.score);
                setGameOverOffline(null);
                setGameOverScore(null);
                setGameActive(true);
                sounds.playSuccess();
              }
            }}
            onAdCancelled={() => {
              setIsAdPlaying(false);
              sounds.playFailure();
            }}
          />

        </div>
      )}

      {/* SIGN IN / LOGIN PAGE (SHOWN TO NEW PLAYERS ON GAME LAUNCH, OR WHEN SIGNED OUT, OR VIA SYNC CLOUD) */}
      {((!isSignedIn && !guestBypass) || showSyncModal) && (
        <SignInView
          theme={theme}
          canDismiss={isSignedIn || guestBypass}
          onClose={() => setShowSyncModal(false)}
          onSuccess={() => {
            setShowSyncModal(false);
            setGuestBypass(false);
          }}
          onContinueAsGuest={() => {
            setGuestBypass(true);
            setShowSyncModal(false);
          }}
        />
      )}

      {/* 10. MATH QUIZ TIERS & ACHIEVEMENTS MODAL */}
      {showTiersModal && (
        <TiersModal
          currentPoints={profile?.tierPoints || 0}
          theme={theme}
          onClose={() => setShowTiersModal(false)}
        />
      )}

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
