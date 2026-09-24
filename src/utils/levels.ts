/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LevelConfig {
  number: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const DIFFICULTIES: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

// Deterministic mix of difficulties for 100 levels (easy, medium, hard only)
export const LEVELS: LevelConfig[] = Array.from({ length: 100 }, (_, i) => {
  const num = i + 1;
  // Pseudorandom difficulty index distribution across the 3 main modes
  const seedIndex = (num * 37 + 13) % 3;
  return {
    number: num,
    difficulty: DIFFICULTIES[seedIndex]
  };
});
