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
    badgeBg: "bg-sky-50",
    badgeBorder: "border-sky-300",
    badgeText: "text-sky-700",
    glowClass: "shadow-xs",
    icon: "🪶"
  },
  {
    tier: 2,
    name: "Number Cadet",
    shortName: "Cadet",
    pointsRequired: 100,
    badgeStyle: "Slate / Light Gray",
    description: "Getting familiar with basic arithmetic and quiz timing.",
    badgeBg: "bg-slate-100",
    badgeBorder: "border-slate-300",
    badgeText: "text-slate-700",
    glowClass: "shadow-xs",
    icon: "🛡️"
  },
  {
    tier: 3,
    name: "Math Apprentice",
    shortName: "Apprentice",
    pointsRequired: 200,
    badgeStyle: "Silver Gray",
    description: "Building confidence with core rules, operations, and problem structures.",
    badgeBg: "bg-zinc-100",
    badgeBorder: "border-zinc-300",
    badgeText: "text-zinc-800",
    glowClass: "shadow-xs",
    icon: "🛡️"
  },
  {
    tier: 4,
    name: "Equation Explorer",
    shortName: "Explorer",
    pointsRequired: 400,
    badgeStyle: "Bronze / Coral",
    description: "Grasps foundational concepts well, navigating multi-step equations.",
    badgeBg: "bg-orange-50",
    badgeBorder: "border-orange-300",
    badgeText: "text-orange-700",
    glowClass: "shadow-xs",
    icon: "🎖️"
  },
  {
    tier: 5,
    name: "Number Cruncher",
    shortName: "Cruncher",
    pointsRequired: 800,
    badgeStyle: "Amber Orange",
    description: "Fast on basic arithmetic and word problems, working on higher-level problem solving.",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-300",
    badgeText: "text-amber-800",
    glowClass: "shadow-xs",
    icon: "🎖️"
  },
  {
    tier: 6,
    name: "Calculation Ace",
    shortName: "Ace",
    pointsRequired: 1600,
    badgeStyle: "Bright Yellow",
    description: "Reliable computation, high accuracy on competitive level math.",
    badgeBg: "bg-yellow-50",
    badgeBorder: "border-yellow-300",
    badgeText: "text-yellow-800",
    glowClass: "shadow-xs",
    icon: "🏅"
  },
  {
    tier: 7,
    name: "Theorem Specialist",
    shortName: "Specialist",
    pointsRequired: 2400,
    badgeStyle: "Jade Green",
    description: "Solid understanding of geometry, proofs, and core mathematical concepts.",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-300",
    badgeText: "text-emerald-800",
    glowClass: "shadow-xs",
    icon: "🏅"
  },
  {
    tier: 8,
    name: "Pattern Master",
    shortName: "Master",
    pointsRequired: 3200,
    badgeStyle: "Emerald / Cyan",
    description: "Quick to spot numerical patterns, equations, and algebra tricks efficiently.",
    badgeBg: "bg-teal-50",
    badgeBorder: "border-teal-300",
    badgeText: "text-teal-800",
    glowClass: "shadow-xs",
    icon: "🏆"
  },
  {
    tier: 9,
    name: "Formula Strategist",
    shortName: "Strategist",
    pointsRequired: 4000,
    badgeStyle: "Royal Purple",
    description: "Strong grasp of advanced formulas and problem shortcuts under time pressure.",
    badgeBg: "bg-purple-50",
    badgeBorder: "border-purple-300",
    badgeText: "text-purple-800",
    glowClass: "shadow-xs",
    icon: "🏆"
  },
  {
    tier: 10,
    name: "Logic Architect",
    shortName: "Architect",
    pointsRequired: 5000,
    badgeStyle: "Deep Sapphire",
    description: "Exceptional reasoning, highly precise, rarely makes analytical or calculation errors.",
    badgeBg: "bg-blue-50",
    badgeBorder: "border-blue-300",
    badgeText: "text-blue-800",
    glowClass: "shadow-xs",
    icon: "👑"
  },
  {
    tier: 11,
    name: "Math Prodigy / Grandmaster",
    shortName: "Grandmaster",
    pointsRequired: 6000,
    badgeStyle: "Glowing Gold / Diamond",
    description: "Flawless accuracy, lightning speed, tackles complex multi-step problems with ease.",
    badgeBg: "bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-100",
    badgeBorder: "border-amber-400",
    badgeText: "text-amber-900 font-extrabold animate-pulse",
    glowClass: "shadow-xs ring-1 ring-amber-300/80",
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
