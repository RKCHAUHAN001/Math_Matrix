/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ThemeConfig {
  id: 'monochrome' | 'oled' | 'matrix' | 'cyberpunk' | 'solarized';
  name: string;
  bg: string;
  cardBg: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  border: string;
  borderAccent: string;
  glow: string;
  fontFamily: string;
  unlockCondition: string;
  unlockedByDefault: boolean;
  checkUnlocked: (streak: number, highScore: number) => boolean;
}

export const THEMES: Record<ThemeConfig['id'], ThemeConfig> = {
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome Silver',
    bg: 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black',
    cardBg: 'bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/40',
    text: 'text-zinc-100',
    textMuted: 'text-zinc-500',
    accent: 'bg-zinc-100 hover:bg-zinc-200 text-black',
    accentText: 'text-zinc-100',
    border: 'border-zinc-800',
    borderAccent: 'border-zinc-400',
    glow: 'shadow-[0_0_15px_rgba(255,255,255,0.07)]',
    fontFamily: 'font-sans',
    unlockCondition: 'Unlocked by default',
    unlockedByDefault: true,
    checkUnlocked: () => true
  },
  oled: {
    id: 'oled',
    name: 'OLED Midnight Blue',
    bg: 'bg-black',
    cardBg: 'bg-[#050914]',
    text: 'text-blue-100',
    textMuted: 'text-blue-500/80',
    accent: 'bg-blue-600 hover:bg-blue-500 text-white',
    accentText: 'text-blue-400',
    border: 'border-blue-950',
    borderAccent: 'border-blue-500',
    glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]',
    fontFamily: 'font-sans',
    unlockCondition: 'Unlocked by default',
    unlockedByDefault: true,
    checkUnlocked: () => true
  },
  matrix: {
    id: 'matrix',
    name: 'Dark Blue Gradient',
    bg: 'bg-gradient-to-br from-[#030712] via-[#091e3a] to-[#020617]',
    cardBg: 'bg-slate-900/70 backdrop-blur-xl border border-blue-950/80',
    text: 'text-blue-100',
    textMuted: 'text-blue-400/60',
    accent: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-extrabold',
    accentText: 'text-sky-400',
    border: 'border-blue-900/40',
    borderAccent: 'border-blue-500',
    glow: 'shadow-[0_0_25px_rgba(59,130,246,0.2)]',
    fontFamily: 'font-sans',
    unlockCondition: 'Unlocked by default',
    unlockedByDefault: true,
    checkUnlocked: () => true
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon Pink',
    bg: 'bg-black',
    cardBg: 'bg-[#0f0412]',
    text: 'text-pink-400',
    textMuted: 'text-amber-500/70',
    accent: 'bg-pink-600 hover:bg-pink-500 text-white font-bold',
    accentText: 'text-amber-400',
    border: 'border-pink-950',
    borderAccent: 'border-pink-500',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.25)]',
    fontFamily: 'font-mono',
    unlockCondition: 'High Score 100+ points',
    unlockedByDefault: false,
    checkUnlocked: (_, score) => score >= 100
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized Teal',
    bg: 'bg-[#002b36]',
    cardBg: 'bg-[#073642]',
    text: 'text-[#93a1a1]',
    textMuted: 'text-[#586e75]',
    accent: 'bg-[#2aa198] hover:bg-[#34b7ac] text-[#002b36] font-bold',
    accentText: 'text-[#2aa198]',
    border: 'border-[#073642] border-2',
    borderAccent: 'border-[#2aa198]',
    glow: 'shadow-[0_0_15px_rgba(42,161,152,0.15)]',
    fontFamily: 'font-sans',
    unlockCondition: 'High Score 300+ points',
    unlockedByDefault: false,
    checkUnlocked: (_, score) => score >= 300
  }
};
