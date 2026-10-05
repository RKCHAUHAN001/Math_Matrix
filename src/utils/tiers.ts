/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MathTier {
  tier: number;
  name: string;
  shortName: string;
  pointsRequired: number;
  badgeStyle: string;
  description: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  glowClass?: string;
  icon: string;
}

export const MATH_TIERS: MathTier[] = [
  {
    tier: 1,
    name: "On Your Way",
    shortName: "On Your Way",
    pointsRequired: 0,
    badgeStyle: "Sky Cyan / Wing",
    description: "Starting out; embarking on your mathematical quiz journey.",
    badgeBg: "bg-sky-950/40",
    badgeBorder: "border-sky-500/40",
    badgeText: "text-sky-300",
    glowClass: "shadow-[0_0_8px_rgba(56,189,248,0.25)]",
    icon: "🪶"
  },
  {
    tier: 2,
    name: "Number Cadet",
    shortName: "Cadet",
    pointsRequired: 100,
    badgeStyle: "Slate / Light Gray",
    description: "Getting familiar with basic arithmetic and quiz timing.",
    badgeBg: "bg-slate-700/35",
    badgeBorder: "border-slate-400/50",
    badgeText: "text-slate-200",
    glowClass: "shadow-[0_0_8px_rgba(148,163,184,0.25)]",
    icon: "🛡️"
  },
  {
    tier: 3,
    name: "Math Apprentice",
    shortName: "Apprentice",
    pointsRequired: 200,
    badgeStyle: "Silver Gray",
    description: "Building confidence with core rules, operations, and problem structures.",
    badgeBg: "bg-zinc-700/40",
    badgeBorder: "border-zinc-300/50",
    badgeText: "text-zinc-100",
    glowClass: "shadow-[0_0_10px_rgba(228,228,231,0.3)]",
    icon: "🛡️"
  },
  {
    tier: 4,
    name: "Equation Explorer",
    shortName: "Explorer",
    pointsRequired: 400,
    badgeStyle: "Bronze / Coral",
    description: "Grasps foundational concepts well, navigating multi-step equations.",
    badgeBg: "bg-orange-950/40",
    badgeBorder: "border-orange-500/50",
    badgeText: "text-orange-300",
    glowClass: "shadow-[0_0_10px_rgba(249,115,22,0.3)]",
    icon: "🎖️"
  },
  {
    tier: 5,
    name: "Number Cruncher",
    shortName: "Cruncher",
    pointsRequired: 800,
    badgeStyle: "Amber Orange",
    description: "Fast on basic arithmetic and word problems, working on higher-level problem solving.",
    badgeBg: "bg-amber-950/45",
    badgeBorder: "border-amber-500/60",
    badgeText: "text-amber-400",
    glowClass: "shadow-[0_0_12px_rgba(245,158,11,0.35)]",
    icon: "🎖️"
  },
  {
    tier: 6,
    name: "Calculation Ace",
    shortName: "Ace",
    pointsRequired: 1600,
    badgeStyle: "Bright Yellow",
    description: "Reliable computation, high accuracy on competitive level math.",
    badgeBg: "bg-yellow-950/45",
    badgeBorder: "border-yellow-400/60",
    badgeText: "text-yellow-300",
    glowClass: "shadow-[0_0_14px_rgba(250,204,21,0.35)]",
    icon: "🏅"
  },
  {
    tier: 7,
    name: "Theorem Specialist",
    shortName: "Specialist",
    pointsRequired: 2400,
    badgeStyle: "Jade Green",
    description: "Solid understanding of geometry, proofs, and core mathematical concepts.",
    badgeBg: "bg-emerald-950/45",
    badgeBorder: "border-emerald-400/60",
    badgeText: "text-emerald-300",
    glowClass: "shadow-[0_0_14px_rgba(52,211,153,0.35)]",
    icon: "🏅"
  },
  {
    tier: 8,
    name: "Pattern Master",
    shortName: "Master",
    pointsRequired: 3200,
    badgeStyle: "Emerald / Cyan",
    description: "Quick to spot numerical patterns, equations, and algebra tricks efficiently.",
    badgeBg: "bg-cyan-950/45",
    badgeBorder: "border-cyan-400/60",
    badgeText: "text-cyan-300",
    glowClass: "shadow-[0_0_16px_rgba(34,211,238,0.4)]",
    icon: "🏆"
  },
  {
    tier: 9,
    name: "Formula Strategist",
    shortName: "Strategist",
    pointsRequired: 4000,
    badgeStyle: "Royal Purple",
    description: "Strong grasp of advanced formulas and problem shortcuts under time pressure.",
    badgeBg: "bg-purple-950/45",
    badgeBorder: "border-purple-400/60",
    badgeText: "text-purple-300",
    glowClass: "shadow-[0_0_16px_rgba(192,132,252,0.4)]",
    icon: "🏆"
  },
  {
    tier: 10,
    name: "Logic Architect",
    shortName: "Architect",
    pointsRequired: 5000,
    badgeStyle: "Deep Sapphire",
    description: "Exceptional reasoning, highly precise, rarely makes analytical or calculation errors.",
    badgeBg: "bg-blue-950/50",
    badgeBorder: "border-blue-400/70",
    badgeText: "text-blue-300",
    glowClass: "shadow-[0_0_18px_rgba(96,165,250,0.45)]",
    icon: "👑"
  },
  {
    tier: 11,
    name: "Math Prodigy / Grandmaster",
    shortName: "Grandmaster",
    pointsRequired: 6000,
    badgeStyle: "Glowing Gold / Diamond",
    description: "Flawless accuracy, lightning speed, tackles complex multi-step problems with ease.",
    badgeBg: "bg-gradient-to-r from-amber-500/25 via-yellow-400/30 to-amber-500/25",
    badgeBorder: "border-yellow-300",
    badgeText: "text-yellow-200 font-extrabold animate-pulse",
    glowClass: "shadow-[0_0_22px_rgba(253,224,71,0.6)] ring-1 ring-yellow-400/60",
    icon: "💎"
  }
];

/**
 * Returns the highest tier achieved for a given point score.
 */
export function getTierByPoints(points: number = 0): MathTier {
  const safePoints = Math.max(0, points || 0);
  for (let i = MATH_TIERS.length - 1; i >= 0; i--) {
    if (safePoints >= MATH_TIERS[i].pointsRequired) {
      return MATH_TIERS[i];
    }
  }
  return MATH_TIERS[0];
}

/**
 * Returns the next tier to unlock, or null if maximum tier is reached.
 */
export function getNextTier(points: number = 0): MathTier | null {
  const currentTier = getTierByPoints(points);
  const nextIndex = MATH_TIERS.findIndex(t => t.tier === currentTier.tier + 1);
  return nextIndex !== -1 ? MATH_TIERS[nextIndex] : null;
}

/**
 * Returns progress data towards the next tier.
 */
export function getTierProgress(points: number = 0): {
  currentTier: MathTier;
  nextTier: MathTier | null;
  pointsInTier: number;
  pointsForNextTier: number;
  percentage: number;
} {
  const currentTier = getTierByPoints(points);
  const nextTier = getNextTier(points);

  if (!nextTier) {
    return {
      currentTier,
      nextTier: null,
      pointsInTier: points - currentTier.pointsRequired,
      pointsForNextTier: 0,
      percentage: 100
    };
  }

  const tierSpan = nextTier.pointsRequired - currentTier.pointsRequired;
  const pointsIntoCurrent = Math.max(0, points - currentTier.pointsRequired);
  const percentage = Math.min(100, Math.max(0, Math.floor((pointsIntoCurrent / tierSpan) * 100)));

  return {
    currentTier,
    nextTier,
    pointsInTier: pointsIntoCurrent,
    pointsForNextTier: nextTier.pointsRequired - points,
    percentage
  };
}
