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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="w-full max-w-md max-h-[88vh] flex flex-col rounded-t-[32px] sm:rounded-3xl border border-zinc-200/90 bg-[#f7f7f7] shadow-2xl overflow-hidden animate-slideUp sm:animate-scaleUp relative text-zinc-900"
        style={{ backgroundColor: '#f7f7f7' }}
      >
        {/* Subtle coordinate blueprint grid matching game theme */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000000_1px,transparent_1px),linear-gradient(to_bottom,#000000_1px,transparent_1px)] bg-[size:28px_28px]" />

        {/* Drag Handle Bar */}
        <div className="pt-3 pb-2 flex justify-center shrink-0 relative z-10">
          <div className="w-10 h-1 bg-zinc-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-zinc-200/90 flex items-center justify-between shrink-0 relative z-10 shadow-xs">
          <div>
            <h2 className="text-base font-black tracking-wider text-zinc-900 font-sans uppercase">
              Math Quiz Tiers
            </h2>
            <p className="text-[11px] text-zinc-500 font-medium">
              Total Score: <span className="text-amber-600 font-bold font-mono">{currentPoints.toLocaleString()} pts</span>
            </p>
          </div>
          <button
            onClick={() => { sounds.playClick(); onClose(); }}
            className="w-9 h-9 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900 flex items-center justify-center transition active:scale-95 border border-zinc-200/90 shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Vertical Timeline Stepper */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0 relative z-10">
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
                        ? `${tier.badgeBg} ${tier.badgeBorder} border-2 ${tier.glowClass} scale-105 ring-2 ring-indigo-500/30`
                        : isUnlocked
                        ? `${tier.badgeBg} ${tier.badgeBorder} border shadow-xs`
                        : 'bg-zinc-200/60 border border-zinc-300/80 text-zinc-400 grayscale opacity-45'
                    }`}
                  >
                    <span>{tier.icon}</span>

                    {/* Unlocked checkmark pill */}
                    {isUnlocked && !isCurrent && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black shadow-xs">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Current Tier indicator */}
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[8px] font-black shadow-xs animate-pulse">
                        ★
                      </div>
                    )}
                  </div>

                  {/* Vertical Connector Line */}
                  {!isLast && (
                    <div className="w-1 h-16 bg-zinc-200 rounded-full relative my-1 overflow-hidden">
                      {lineActive ? (
                        <div className="w-full h-full bg-indigo-500 rounded-full shadow-xs" />
                      ) : isCurrent ? (
                        <div
                          className="w-full bg-gradient-to-b from-indigo-500 to-blue-500 rounded-full transition-all duration-500 shadow-xs"
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
                            ? 'text-zinc-900'
                            : 'text-zinc-400'
                        }`}
                      >
                        {tier.name}
                      </h3>

                      {isCurrent && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Active Tier
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-mono font-bold shrink-0 ${
                        isCurrent
                          ? 'text-indigo-600 font-extrabold'
                          : isUnlocked
                          ? 'text-zinc-600'
                          : 'text-zinc-400'
                      }`}
                    >
                      {tier.pointsRequired === 0
                        ? 'Starting (0 pts)'
                        : tier.tier === 11
                        ? 'MAX LEVEL'
                        : `${tier.pointsRequired.toLocaleString()} pts`}
                    </span>
                  </div>

                  {/* Progress display in current tier */}
                  {isCurrent && nextTier && (
                    <div className="mt-2 p-2.5 rounded-xl bg-white border border-indigo-100/90 shadow-sm flex items-center justify-between">
                      <span className="text-[10px] text-zinc-600 font-medium">
                        Progress to <span className="font-bold text-zinc-900">{nextTier.name}</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-indigo-600">
                        {progress.pointsInTier} / {nextTier.pointsRequired - tier.pointsRequired} pts ({progress.percentage}%)
                      </span>
                    </div>
                  )}

                  <p
                    className={`text-[10.5px] mt-1 leading-relaxed ${
                      isCurrent
                        ? 'text-zinc-700 font-medium'
                        : isUnlocked
                        ? 'text-zinc-500'
                        : 'text-zinc-400'
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
        <div className="p-4 border-t border-zinc-200/90 bg-white/95 backdrop-blur-md text-center shrink-0 relative z-10">
          <button
            onClick={() => { sounds.playClick(); onClose(); }}
            className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest transition active:scale-95 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
