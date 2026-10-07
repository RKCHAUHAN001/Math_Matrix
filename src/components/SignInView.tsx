/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Globe, X, UserCheck, LogIn, ArrowRight } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import sounds from '../utils/audio';

interface SignInViewProps {
  theme: any;
  onSuccess?: () => void;
  onContinueAsGuest?: () => void;
  canDismiss?: boolean;
  onClose?: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({
  theme,
  onSuccess,
  onContinueAsGuest,
  canDismiss = false,
  onClose
}) => {
  const { isOnline, loginWithGoogle, loginWithEmail, authError, clearAuthError } = useFirebase();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const displayError = localError || authError;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();

    if (!isOnline) {
      sounds.playFailure();
      setLocalError("No Internet Connection. Connect to the internet to sign in.");
      return;
    }

    if (!email.trim() || !password) {
      setLocalError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    clearAuthError();

    try {
      await loginWithEmail(email.trim(), password);
      sounds.playSuccess();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setLocalError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    sounds.playClick();

    if (!isOnline) {
      sounds.playFailure();
      setLocalError("No Internet Connection. Connect to the internet to sign in with Google.");
      return;
    }

    setIsLoading(true);
    setLocalError(null);
    clearAuthError();

    try {
      await loginWithGoogle();
      sounds.playSuccess();
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setLocalError("Google Sign-In was cancelled or failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn text-white select-none">
      
      {/* Background Cosmic Blueprint Circles Decoration */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:28px_28px]"></div>
      
      <div className="absolute -top-24 -left-24 w-[340px] h-[340px] pointer-events-none opacity-30 mix-blend-screen animate-[pulse_6s_infinite_alternate]">
        <svg viewBox="0 0 100 100" className="w-full h-full text-blue-500">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.2" />
          <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="0.8" />
        </svg>
      </div>

      <div className="max-w-sm w-full rounded-3xl bg-zinc-950 border border-blue-500/30 p-6 shadow-2xl relative text-center z-10 animate-scaleUp">
        
        {/* Optional Dismiss button if opened from settings/guest mode */}
        {canDismiss && onClose && (
          <button 
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Glow Header Icon */}
        <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 mx-auto shadow-[0_0_20px_rgba(59,130,246,0.3)]">
          <Sparkles className="w-6 h-6 text-blue-400" />
        </div>

        <h2 className="text-base font-black tracking-widest text-blue-400 uppercase mb-1">
          Sign In / Login
        </h2>
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-4">
          Save progress, earn sticks & join rankings
        </p>

        {/* Error message card */}
        {displayError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-[10px] text-left leading-normal mb-4 font-semibold animate-fadeIn">
            {displayError}
          </div>
        )}

        {/* 1. Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-2.5 text-left mb-4">
          <div>
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-1">
              Password (Min 6 chars)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none font-mono"
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-1"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </>
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="relative flex py-1.5 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-3 text-[8px] font-black uppercase tracking-widest text-zinc-500">
            OR
          </span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        {/* 2. Google Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="mt-2 w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 disabled:opacity-50 text-zinc-200 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Globe className="w-3.5 h-3.5 text-zinc-400" />
          Sign in with Google
        </button>

        {/* 3. Continue as Guest Option */}
        {onContinueAsGuest && (
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              onContinueAsGuest();
            }}
            className="mt-3.5 w-full py-2 bg-transparent hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-zinc-200 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <UserCheck className="w-3 h-3 text-zinc-500" />
            <span>Continue as Guest (Play Offline)</span>
            <ArrowRight className="w-2.5 h-2.5 text-zinc-500" />
          </button>
        )}

        <p className="text-[7.5px] text-zinc-500 mt-3 leading-relaxed">
          * Email Sync is 100% crash-proof and works natively. Google Sign-In requires configured Google Play Services.
        </p>

      </div>
    </div>
  );
};
