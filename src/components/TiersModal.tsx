/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Check, Lock, Sparkles, ChevronRight } from 'lucide-react';
import { MATH_TIERS, getTierProgress } from '../utils/tiers';
import sounds from '../utils/audio';

interface TiersModalProps {
  currentPoints: number;
  onClose: () => void;
  theme: any;
}

export const TiersModal: React.FC<TiersModalProps> = ({ currentPoints, onClose }) => {
  const progress = getTierProgress(currentPoints);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div 
        className="w-full max-w-md max-h-[88vh] flex flex-col rounded-t-[32px] sm:rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl overflow-hidden animate-slideUp sm:animate-scaleUp"
      >
        {/* Drag Handle Bar (matching Google Play reference image) */}
        <div className="pt-3 pb-2 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-black tracking-wide text-white font-sans">
              Math Quiz Tiers
            </h2>
            <p className="text-[11px] text-zinc-400 font-medium">
              Total Score: <span className="text-amber-400 font-bold font-mono">{currentPoints.toLocaleString()} pts</span>
            </p>
          </div>
          <button
            onClick={() => { sounds.playClick(); onClose(); }}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition active:scale-95 border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vertical Timeline Stepper (Matching Screenshot reference) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0">
          {MATH_TIERS.map((tier, index) => {
            const isUnlocked = currentPoints >= tier.pointsRequired;
            const isCurrent = progress.currentTier.tier === tier.tier;
            const isLast = index === MATH_TIERS.length - 1;
            const nextTier = !isLast ? MATH_TIERS[index + 1] : null;

            // Determine line status to next node
            let lineActive = false;
            let partialPercent = 0;
            if (nextTier) {
              if (currentPoints >= nextTier.pointsRequired) {
                lineActive = true;
              } else if (isCurrent) {
                partialPercent = progress.percentage;
              }
            }

            return (
              <div key={tier.tier} className="relative flex items-start gap-4">
                {/* Column 1: Vertical Track & Node */}
                <div className="flex flex-col items-center shrink-0">
                  {/* Icon Node */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl transition-all relative z-10 ${
                      isCurrent
                        ? `${tier.badgeBg} ${tier.badgeBorder} border-2 ${tier.glowClass} scale-105 ring-2 ring-white/30`
                        : isUnlocked
                        ? 'bg-zinc-900 border border-white/20 text-white'
                        : 'bg-zinc-950 border border-white/10 text-zinc-600 grayscale opacity-40'
                    }`}
                  >
                    <span>{tier.icon}</span>

                    {/* Unlocked checkmark pill */}
                    {isUnlocked && !isCurrent && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[9px] font-black shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Current Tier indicator */}
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[8px] font-black shadow-sm animate-pulse">
                        ★
                      </div>
                    )}
                  </div>

                  {/* Vertical Connector Line (matching screenshot track) */}
                  {!isLast && (
                    <div className="w-1 h-16 bg-zinc-800/80 rounded-full relative my-1 overflow-hidden">
                      {lineActive ? (
                        <div className="w-full h-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                      ) : isCurrent ? (
                        <div
                          className="w-full bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                          style={{ height: `${Math.max(15, partialPercent)}%` }}
                        />
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Column 2: Milestone Details */}
                <div className={`flex-1 pt-1 pb-4 min-w-0 ${!isLast ? 'min-h-[76px]' : ''}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        className={`text-sm font-black tracking-wide uppercase font-sans ${
                          isCurrent
                            ? `${tier.badgeText} text-base font-extrabold`
                            : isUnlocked
                            ? 'text-white'
                            : 'text-zinc-500'
                        }`}
                      >
                        {tier.name}
                      </h3>

                      {isCurrent && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                          Active Tier
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-mono font-bold shrink-0 ${
                        isCurrent
                          ? 'text-cyan-400'
                          : isUnlocked
                          ? 'text-zinc-400'
                          : 'text-zinc-600'
                      }`}
                    >
                      {tier.pointsRequired === 0
                        ? 'Starting (0 pts)'
                        : tier.tier === 11
                        ? 'MAX LEVEL'
                        : `${tier.pointsRequired.toLocaleString()} pts`}
                    </span>
                  </div>

                  {/* Progress display in current tier (matching reference screenshot) */}
                  {isCurrent && nextTier && (
                    <div className="mt-1.5 p-2 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                      <span className="text-[10px] text-cyan-300 font-medium">
                        Progress to <span className="font-bold text-white">{nextTier.name}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-cyan-300">
                        {progress.pointsInTier} / {nextTier.pointsRequired - tier.pointsRequired} pts ({progress.percentage}%)
                      </span>
                    </div>
                  )}

                  <p
                    className={`text-[10.5px] mt-1 leading-relaxed ${
                      isCurrent
                        ? 'text-zinc-300 font-medium'
                        : isUnlocked
                        ? 'text-zinc-400'
                        : 'text-zinc-600'
                    }`}
                  >
                    {tier.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/90 text-center shrink-0">
          <button
            onClick={() => { sounds.playClick(); onClose(); }}
            className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-widest transition active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
