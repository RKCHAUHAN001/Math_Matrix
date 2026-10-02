/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FormulaTemplate {
  size: number;
  display: string;
  evaluate: (operands: number[]) => number;
}

export interface LevelConfig {
  number: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isBoss: boolean;
  title?: string;
}

export interface LevelDetail {
  number: number;
  title: string;
  isBoss: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  grid: number[];
  formula: FormulaTemplate;
  target: number;
  timeLimit: number;
}

// Key for storing stars per level: Record<number, number>
export const LEVEL_STARS_KEY = 'math_matrix_level_stars';

// Seeded PRNG (Mulberry32) for deterministic, reproducible generation
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------------------------------------------------------------
// 🏆 HANDCRAFTED MILESTONE / BOSS LEVELS (MULTIPLES OF 5)
// -------------------------------------------------------------
const HANDCRAFTED_LEVELS: Record<number, LevelDetail> = {
  5: {
    number: 5,
    title: "Milestone: Sum Sprint",
    isBoss: true,
    difficulty: "easy",
    timeLimit: 25,
    formula: { size: 2, display: "[A] + [B]", evaluate: (op) => op[0] + op[1] },
    target: 17,
    grid: [
      3, 8, 4, 2,
      9, 6, 1, 5,
      7, 2, 8, 3,
      5, 4, 6, 9
    ] // Solution: 9 + 8 = 17
  },
  10: {
    number: 10,
    title: "Milestone: Difference Duel",
    isBoss: true,
    difficulty: "easy",
    timeLimit: 25,
    formula: { size: 2, display: "[A] - [B]", evaluate: (op) => op[0] - op[1] },
    target: 9,
    grid: [
      5, 12, 3, 7,
      14, 2, 8, 6,
      15, 4, 11, 1,
      6, 13, 2, 5
    ] // Solution: 15 - 6 = 9 (or 12 - 3 = 9)
  },
  15: {
    number: 15,
    title: "Milestone: Product Peak",
    isBoss: true,
    difficulty: "easy",
    timeLimit: 25,
    formula: { size: 2, display: "[A] * [B]", evaluate: (op) => op[0] * op[1] },
    target: 42,
    grid: [
      4, 9, 3, 5,
      6, 2, 8, 7,
      5, 3, 4, 6,
      8, 7, 2, 9
    ] // Solution: 6 * 7 = 42
  },
  20: {
    number: 20,
    title: "Milestone: Trio Balance",
    isBoss: true,
    difficulty: "medium",
    timeLimit: 30,
    formula: { size: 3, display: "[A] + [B] - [C]", evaluate: (op) => op[0] + op[1] - op[2] },
    target: 14,
    grid: [
      4, 9, 2, 7,
      8, 3, 6, 5,
      7, 8, 1, 9,
      2, 5, 3, 4
    ] // Solution: 8 + 9 - 3 = 14
  },
  25: {
    number: 25,
    title: "Milestone: Product & Sum",
    isBoss: true,
    difficulty: "medium",
    timeLimit: 30,
    formula: { size: 3, display: "[A] * [B] + [C]", evaluate: (op) => op[0] * op[1] + op[2] },
    target: 31,
    grid: [
      5, 2, 8, 3,
      6, 1, 4, 7,
      9, 3, 6, 2,
      4, 5, 1, 8
    ] // Solution: 5 * 6 + 1 = 31
  },
  30: {
    number: 30,
    title: "Milestone: Division Gate",
    isBoss: true,
    difficulty: "medium",
    timeLimit: 30,
    formula: { size: 3, display: "[A] * [B] / [C]", evaluate: (op) => (op[2] !== 0 ? Math.floor((op[0] * op[1]) / op[2]) : op[0]) },
    target: 12,
    grid: [
      3, 8, 2, 5,
      6, 4, 9, 1,
      7, 2, 6, 3,
      4, 5, 8, 2
    ] // Solution: 6 * 4 / 2 = 12
  },
  35: {
    number: 35,
    title: "Milestone: Parentheses Trial",
    isBoss: true,
    difficulty: "medium",
    timeLimit: 30,
    formula: { size: 3, display: "([A] - [B]) * [C]", evaluate: (op) => (op[0] - op[1]) * op[2] },
    target: 28,
    grid: [
      9, 3, 7, 2,
      4, 6, 8, 5,
      2, 9, 3, 4,
      7, 1, 6, 5
    ] // Solution: (9 - 2) * 4 = 28
  },
  40: {
    number: 40,
    title: "Milestone: Subtraction Forge",
    isBoss: true,
    difficulty: "medium",
    timeLimit: 30,
    formula: { size: 3, display: "[A] * [B] - [C]", evaluate: (op) => op[0] * op[1] - op[2] },
    target: 47,
    grid: [
      7, 3, 8, 4,
      2, 7, 5, 6,
      9, 2, 4, 3,
      8, 5, 6, 7
    ] // Solution: 7 * 7 - 2 = 47
  },
  45: {
    number: 45,
    title: "Milestone: High Volt Grid",
    isBoss: true,
    difficulty: "medium",
    timeLimit: 30,
    formula: { size: 3, display: "[A] * [B] + [C]", evaluate: (op) => op[0] * op[1] + op[2] },
    target: 53,
    grid: [
      8, 2, 7, 3,
      6, 5, 9, 4,
      5, 8, 3, 2,
      7, 4, 6, 1
    ] // Solution: 8 * 6 + 5 = 53
  },
  50: {
    number: 50,
    title: "Halfway Boss: Power of 8",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 35,
    formula: { size: 3, display: "([A] + [B]) * [C]", evaluate: (op) => (op[0] + op[1]) * op[2] },
    target: 64,
    grid: [
      5, 2, 8, 4,
      3, 7, 6, 9,
      8, 1, 4, 5,
      2, 3, 7, 6
    ] // Solution: (5 + 3) * 8 = 64
  },
  55: {
    number: 55,
    title: "Milestone: Prime Hunter",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 32,
    formula: { size: 3, display: "[A] * [B] - [C]", evaluate: (op) => op[0] * op[1] - op[2] },
    target: 69,
    grid: [
      9, 4, 7, 2,
      8, 3, 5, 6,
      4, 9, 2, 8,
      3, 7, 5, 1
    ] // Solution: 9 * 8 - 3 = 69
  },
  60: {
    number: 60,
    title: "Milestone: Triple Multiplier",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 35,
    formula: { size: 3, display: "[A] * [B] * [C]", evaluate: (op) => op[0] * op[1] * op[2] },
    target: 60,
    grid: [
      3, 8, 2, 7,
      4, 5, 6, 1,
      2, 3, 9, 4,
      5, 6, 1, 8
    ] // Solution: 3 * 4 * 5 = 60
  },
  65: {
    number: 65,
    title: "Milestone: Quad Equation",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 35,
    formula: { size: 4, display: "[A] * [B] + [C] * [D]", evaluate: (op) => op[0] * op[1] + op[2] * op[3] },
    target: 50,
    grid: [
      6, 2, 8, 3,
      5, 4, 7, 1,
      5, 6, 2, 4,
      3, 7, 8, 9
    ] // Solution: 6 * 5 + 5 * 4 = 50
  },
  70: {
    number: 70,
    title: "Milestone: Order of Chaos",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 35,
    formula: { size: 4, display: "([A] + [B]) * [C] - [D]", evaluate: (op) => (op[0] + op[1]) * op[2] - op[3] },
    target: 46,
    grid: [
      5, 2, 8, 3,
      3, 6, 4, 7,
      6, 1, 9, 2,
      4, 5, 8, 3
    ] // Solution: (5 + 3) * 6 - 2 = 46
  },
  75: {
    number: 75,
    title: "Milestone: Diamond Matrix",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 32,
    formula: { size: 4, display: "[A] * [B] + [C] * [D]", evaluate: (op) => op[0] * op[1] + op[2] * op[3] },
    target: 74,
    grid: [
      8, 2, 7, 4,
      7, 6, 3, 5,
      6, 3, 9, 1,
      4, 8, 5, 2
    ] // Solution: 8 * 7 + 6 * 3 = 74
  },
  80: {
    number: 80,
    title: "Milestone: Calculation Core",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 30,
    formula: { size: 4, display: "[A] * [B] - [C] * [D]", evaluate: (op) => op[0] * op[1] - op[2] * op[3] },
    target: 37,
    grid: [
      7, 2, 9, 4,
      8, 3, 5, 6,
      3, 9, 2, 1,
      5, 7, 8, 4
    ] // Solution: 7 * 8 - 9 * 2 = 38 (or 9 * 5 - 2 * 4 = 37)
  },
  85: {
    number: 85,
    title: "Milestone: Hyper Speed",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 28,
    formula: { size: 4, display: "[A] * [B] + [C] * [D]", evaluate: (op) => op[0] * op[1] + op[2] * op[3] },
    target: 83,
    grid: [
      9, 2, 8, 4,
      7, 5, 6, 3,
      8, 4, 9, 1,
      5, 7, 3, 6
    ] // Solution: 9 * 7 + 5 * 4 = 83
  },
  90: {
    number: 90,
    title: "Milestone: Titan's Trial",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 28,
    formula: { size: 4, display: "([A] + [B]) * [C] - [D]", evaluate: (op) => (op[0] + op[1]) * op[2] - op[3] },
    target: 65,
    grid: [
      6, 2, 9, 3,
      4, 7, 5, 8,
      7, 1, 8, 2,
      3, 6, 4, 9
    ] // Solution: (6 + 4) * 7 - 5 = 65
  },
  95: {
    number: 95,
    title: "Milestone: Grandmaster Gate",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 25,
    formula: { size: 4, display: "[A] * [B] - [C] * [D]", evaluate: (op) => op[0] * op[1] - op[2] * op[3] },
    target: 41,
    grid: [
      8, 2, 9, 3,
      7, 5, 4, 6,
      5, 9, 3, 1,
      4, 8, 7, 2
    ] // Solution: 8 * 7 - 5 * 3 = 41
  },
  100: {
    number: 100,
    title: "FINAL BOSS: THE MATRIX GOD",
    isBoss: true,
    difficulty: "hard",
    timeLimit: 30,
    formula: { size: 4, display: "[A] * [B] + [C] * [D]", evaluate: (op) => op[0] * op[1] + op[2] * op[3] },
    target: 99,
    grid: [
      9, 2, 8, 4,
      9, 6, 7, 3,
      6, 3, 5, 1,
      4, 9, 8, 7
    ] // Solution: 9 * 9 + 6 * 3 = 99
  }
};

// -------------------------------------------------------------
// 🎲 DETERMINISTIC PROCEDURAL GENERATOR FOR LEVELS 1..99
// -------------------------------------------------------------
export function generateProceduralLevel(levelNum: number): LevelDetail {
  const prng = mulberry32(levelNum * 10007 + 73);

  // Progressive difficulty curve
  let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  let timeLimit = 25;
  let formula: FormulaTemplate;
  let minCell = 1;
  let maxCell = 9;

  if (levelNum < 6) {
    // 1 to 4: Pure Addition (+), gentle
    difficulty = 'easy';
    timeLimit = 25;
    formula = { size: 2, display: "[A] + [B]", evaluate: (op) => op[0] + op[1] };
    minCell = 1;
    maxCell = 8 + levelNum;
  } else if (levelNum < 11) {
    // 6 to 9: Subtraction (-)
    difficulty = 'easy';
    timeLimit = 25;
    formula = { size: 2, display: "[A] - [B]", evaluate: (op) => op[0] - op[1] };
    minCell = 1;
    maxCell = 12;
  } else if (levelNum < 16) {
    // 11 to 14: Mix Addition & Subtraction
    difficulty = 'easy';
    timeLimit = 25;
    const isAdd = prng() > 0.5;
    formula = isAdd 
      ? { size: 2, display: "[A] + [B]", evaluate: (op) => op[0] + op[1] }
      : { size: 2, display: "[A] - [B]", evaluate: (op) => op[0] - op[1] };
    minCell = 2;
    maxCell = 15;
  } else if (levelNum < 21) {
    // 16 to 19: Multiplication (*)
    difficulty = 'easy';
    timeLimit = 25;
    formula = { size: 2, display: "[A] * [B]", evaluate: (op) => op[0] * op[1] };
    minCell = 2;
    maxCell = 9;
  } else if (levelNum < 31) {
    // 21 to 29: 3 Operands (Addition / Subtraction / Mult)
    difficulty = 'medium';
    timeLimit = 30;
    const formulas: FormulaTemplate[] = [
      { size: 3, display: "[A] + [B] - [C]", evaluate: (op) => op[0] + op[1] - op[2] },
      { size: 3, display: "[A] - [B] + [C]", evaluate: (op) => op[0] - op[1] + op[2] },
      { size: 3, display: "[A] * [B] + [C]", evaluate: (op) => op[0] * op[1] + op[2] },
      { size: 3, display: "[A] * [B] - [C]", evaluate: (op) => op[0] * op[1] - op[2] }
    ];
    formula = formulas[Math.floor(prng() * formulas.length)];
    minCell = 1;
    maxCell = 10;
  } else if (levelNum < 51) {
    // 31 to 49: 3 Operands with Division & Parentheses
    difficulty = 'medium';
    timeLimit = 30;
    const formulas: FormulaTemplate[] = [
      { size: 3, display: "([A] - [B]) * [C]", evaluate: (op) => (op[0] - op[1]) * op[2] },
      { size: 3, display: "([A] + [B]) * [C]", evaluate: (op) => (op[0] + op[1]) * op[2] },
      { size: 3, display: "[A] * [B] - [C]", evaluate: (op) => op[0] * op[1] - op[2] },
      { size: 3, display: "[A] * [B] / [C]", evaluate: (op) => (op[2] !== 0 ? Math.floor((op[0] * op[1]) / op[2]) : op[0]) }
    ];
    formula = formulas[Math.floor(prng() * formulas.length)];
    minCell = 2;
    maxCell = 12;
  } else if (levelNum < 76) {
    // 51 to 74: Hard 3 to 4 Operands
    difficulty = 'hard';
    timeLimit = 30;
    const formulas: FormulaTemplate[] = [
      { size: 3, display: "([A] + [B]) * [C]", evaluate: (op) => (op[0] + op[1]) * op[2] },
      { size: 4, display: "[A] * [B] + [C] * [D]", evaluate: (op) => op[0] * op[1] + op[2] * op[3] },
      { size: 4, display: "([A] + [B]) * [C] - [D]", evaluate: (op) => (op[0] + op[1]) * op[2] - op[3] }
    ];
    formula = formulas[Math.floor(prng() * formulas.length)];
    minCell = 1;
    maxCell = 12;
  } else {
    // 76 to 99: Master levels
    difficulty = 'hard';
    timeLimit = 26;
    const formulas: FormulaTemplate[] = [
      { size: 4, display: "[A] * [B] + [C] * [D]", evaluate: (op) => op[0] * op[1] + op[2] * op[3] },
      { size: 4, display: "[A] * [B] - [C] * [D]", evaluate: (op) => op[0] * op[1] - op[2] * op[3] },
      { size: 4, display: "([A] + [B]) * ([C] - [D])", evaluate: (op) => (op[0] + op[1]) * (op[2] - op[3]) }
    ];
    formula = formulas[Math.floor(prng() * formulas.length)];
    minCell = 1;
    maxCell = 12;
  }

  // Generate 4x4 (16 cells) deterministic grid
  const grid: number[] = [];
  for (let i = 0; i < 16; i++) {
    let val = Math.floor(prng() * (maxCell - minCell + 1)) + minCell;
    if (val === 0) val = 2;
    grid.push(val);
  }

  // Pick deterministic unique indices for the guaranteed solution
  const solutionIndices: number[] = [];
  while (solutionIndices.length < formula.size) {
    const idx = Math.floor(prng() * 16);
    if (!solutionIndices.includes(idx)) {
      solutionIndices.push(idx);
    }
  }

  // Calculate target based on the chosen solution cells
  const operands = solutionIndices.map((idx) => grid[idx]);
  const target = formula.evaluate(operands);

  return {
    number: levelNum,
    title: `Level ${levelNum}`,
    isBoss: false,
    difficulty,
    grid,
    formula,
    target,
    timeLimit
  };
}

// -------------------------------------------------------------
// 🎯 MAIN API: GET ANY LEVEL (HYBRID ROUTER)
// -------------------------------------------------------------
export function getLevelDetail(levelNum: number): LevelDetail {
  if (levelNum % 5 === 0 && HANDCRAFTED_LEVELS[levelNum]) {
    return HANDCRAFTED_LEVELS[levelNum];
  }
  return generateProceduralLevel(levelNum);
}

// Deterministic list of all 100 level configurations
export const LEVELS: LevelConfig[] = Array.from({ length: 100 }, (_, i) => {
  const num = i + 1;
  const isBoss = num % 5 === 0;
  const detail = getLevelDetail(num);
  return {
    number: num,
    difficulty: detail.difficulty,
    isBoss,
    title: detail.title
  };
});

// -------------------------------------------------------------
// ⭐ 3-STAR RATING SYSTEM HELPERS
// -------------------------------------------------------------
export function calculateLevelStars(
  timeLeft: number,
  maxTime: number,
  livesLeft: number
): number {
  // If player maintained all 3 lives and solved in top half of time limit
  if (livesLeft === 3 && timeLeft >= maxTime * 0.4) {
    return 3;
  }
  // If player finished with at least 2 lives
  if (livesLeft >= 2 && timeLeft >= maxTime * 0.15) {
    return 2;
  }
  // Cleared
  return 1;
}

export function getAllLevelStars(): Record<number, number> {
  try {
    const raw = localStorage.getItem(LEVEL_STARS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

export function getLevelStars(levelNum: number): number {
  const all = getAllLevelStars();
  return all[levelNum] || 0;
}

export function saveLevelStars(levelNum: number, starsEarned: number): {
  starsAwarded: number;
  totalStars: number;
  isNewBest: boolean;
} {
  const all = getAllLevelStars();
  const currentBest = all[levelNum] || 0;
  const isNewBest = starsEarned > currentBest;
  
  if (isNewBest) {
    all[levelNum] = starsEarned;
    localStorage.setItem(LEVEL_STARS_KEY, JSON.stringify(all));
  }

  const totalStars = Object.values(all).reduce((sum, s) => sum + s, 0);

  return {
    starsAwarded: Math.max(starsEarned, currentBest),
    totalStars,
    isNewBest
  };
}

export function getTotalStars(): number {
  const all = getAllLevelStars();
  return Object.values(all).reduce((sum, s) => sum + s, 0);
}
